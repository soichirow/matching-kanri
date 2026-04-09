/**
 * main.js — UI イベント処理・描画
 */
import {
  getPlayers, addPlayer, updatePlayer, deletePlayer,
  getTables,  addTable,  updateTable,  deleteTable,
  getMatches, addMatch,  clearMatches,
} from './store.js'
import { generateMatching } from './matching.js'
import { enableDrag, applyPosition } from './layout.js'

// ── アプリ状態 ───────────────────────────────────────────
let pendingMatches  = []          // [{tableId, playerIds}]
let selectedTables  = new Set()   // 空テーブルの選択
let monitorInterval = null

// ── 描画 ─────────────────────────────────────────────────

export function render() {
  renderPlayerStats()
  renderPlayers()
  renderTables()
  renderMatchingBar()
}

function renderPlayerStats() {
  const el = document.getElementById('player-stats')
  if (!el) return
  const players = getPlayers()
  const c = (s) => players.filter(p => p.status === s).length
  el.textContent = `待機 ${c('waiting')} / 対戦中 ${c('playing')} / 休憩 ${c('break')} / 退出 ${c('left')}`
}

function renderPlayers() {
  const list = document.getElementById('player-list')
  if (!list) return
  const players = getPlayers()

  if (players.length === 0) {
    list.innerHTML = '<p class="empty-hint">プレイヤーを追加してください</p>'
    return
  }

  list.innerHTML = players.map(p => `
    <div class="player-item status-${p.status}" data-id="${p.id}">
      <span class="player-name">${esc(p.name)}</span>
      ${p.group ? `<span class="group-badge">${esc(p.group)}</span>` : ''}
      <button class="status-btn" data-action="cycle" data-id="${p.id}">${statusLabel(p.status)}</button>
      <button class="delete-btn" data-action="del-player" data-id="${p.id}" title="削除">×</button>
    </div>
  `).join('')
}

function renderTables() {
  const canvas = document.getElementById('canvas')
  if (!canvas) return

  const tables = getTables()
  const newIds = new Set(tables.map(t => t.id))

  // 削除されたカードを除去
  canvas.querySelectorAll('.table-card').forEach(el => {
    if (!newIds.has(el.dataset.id)) el.remove()
  })

  // 追加・更新
  tables.forEach(t => {
    let el = canvas.querySelector(`.table-card[data-id="${t.id}"]`)
    if (!el) {
      el = createTableCard(t)
      canvas.appendChild(el)
    }
    refreshTableCard(el, t)
    applyPosition(el, t.x, t.y)
  })
}

function createTableCard(table) {
  const el = document.createElement('div')
  el.className = 'table-card'
  el.dataset.id = table.id

  enableDrag(el, (x, y) => {
    updateTable(table.id, { x, y })
    syncMonitorCanvas()
  })

  return el
}

function refreshTableCard(el, table) {
  const players = getPlayers()
  const seated  = table.playerIds.map(id => players.find(p => p.id === id)).filter(Boolean)
  const sel     = selectedTables.has(table.id)

  el.className = `table-card status-${table.status}${sel ? ' selected' : ''}`

  const sizeOptions = [2, 3, 4]
  const nextSize    = sizeOptions[(sizeOptions.indexOf(table.size) + 1) % sizeOptions.length]

  el.innerHTML = `
    <div class="table-header">
      <span class="table-label">${esc(table.label)}</span>
      <span class="table-size">${table.size}人</span>
      <div class="table-actions no-drag">
        <button data-action="rename"    data-id="${table.id}" title="名前変更">✏</button>
        <button data-action="chg-size"  data-id="${table.id}" data-next="${nextSize}" title="${nextSize}人に変更">${nextSize}人</button>
        <button data-action="del-table" data-id="${table.id}" title="削除">×</button>
      </div>
    </div>
    <div class="table-players">
      ${seated.map(p => `<div class="table-player">${esc(p.name)}</div>`).join('')}
      ${seated.length === 0 ? '<div class="table-empty">空席</div>' : ''}
    </div>
    <div class="table-footer no-drag">
      ${table.status === 'playing'
        ? `<button class="btn-finish" data-action="finish" data-id="${table.id}">終了</button>`
        : `<label class="select-check">
             <input type="checkbox" data-action="select" data-id="${table.id}" ${sel ? 'checked' : ''}>
             選択
           </label>`
      }
    </div>
  `
}

function renderMatchingBar() {
  const preview    = document.getElementById('match-preview')
  const confirmBtn = document.getElementById('btn-confirm-match')
  const cancelBtn  = document.getElementById('btn-cancel-match')
  const regenBtn   = document.getElementById('btn-regen-match')
  if (!preview) return

  if (pendingMatches.length === 0) {
    preview.innerHTML = ''
    confirmBtn && (confirmBtn.style.display = 'none')
    cancelBtn  && (cancelBtn.style.display  = 'none')
    regenBtn   && (regenBtn.style.display   = 'none')
    return
  }

  const tables  = getTables()
  const players = getPlayers()

  preview.innerHTML = pendingMatches.map(m => {
    const tbl   = tables.find(t => t.id === m.tableId)
    const names = m.playerIds.map(id => players.find(p => p.id === id)?.name ?? '?')
    return `
      <div class="match-preview-item">
        <strong>${esc(tbl?.label ?? '?')}</strong>: ${names.map(esc).join(' vs ')}
      </div>
    `
  }).join('')

  confirmBtn && (confirmBtn.style.display = '')
  cancelBtn  && (cancelBtn.style.display  = '')
  regenBtn   && (regenBtn.style.display   = '')
}

// ── プレイヤー操作 ───────────────────────────────────────

function cycleStatus(playerId) {
  const player = getPlayers().find(p => p.id === playerId)
  if (!player) return
  const cycle = { waiting: 'break', break: 'left', left: 'waiting', playing: 'waiting' }
  updatePlayer(playerId, { status: cycle[player.status] ?? 'waiting' })
  render()
}

function showAddPlayerModal() {
  const name = prompt('プレイヤー名を入力')
  if (!name?.trim()) return
  const g = prompt('グループ（A〜E）を入力、なしはそのままEnter', '')
  addPlayer(name.trim(), g?.trim().toUpperCase() || null)
  render()
}

// ── テーブル操作 ─────────────────────────────────────────

function showAddTableModal() {
  const label = prompt('テーブル名を入力', `テーブル${getTables().length + 1}`)
  if (!label?.trim()) return
  const s = prompt('テーブルサイズ（2 / 3 / 4）', '4')
  const size = [2, 3, 4].includes(Number(s)) ? Number(s) : 4
  addTable(label.trim(), size)
  render()
}

function renameTable(tableId) {
  const table = getTables().find(t => t.id === tableId)
  if (!table) return
  const name = prompt('テーブル名を変更', table.label)
  if (!name?.trim()) return
  updateTable(tableId, { label: name.trim() })
  render()
}

function finishTable(tableId) {
  const table = getTables().find(t => t.id === tableId)
  if (!table) return
  table.playerIds.forEach(pid => updatePlayer(pid, { status: 'waiting' }))
  updateTable(tableId, { status: 'empty', playerIds: [] })
  render()
  syncMonitorCanvas()
}

function toggleTableSelect(tableId, checked) {
  checked ? selectedTables.add(tableId) : selectedTables.delete(tableId)
  pendingMatches = []
  renderTables()
  renderMatchingBar()
}

// ── マッチング ───────────────────────────────────────────

function doGenerateMatching(shuffle = false) {
  const allPlayers   = getPlayers()
  const allTables    = getTables()
  const matches      = getMatches()
  const waiting      = allPlayers.filter(p => p.status === 'waiting')
  const targets      = allTables.filter(t => selectedTables.has(t.id) && t.status === 'empty')

  if (targets.length === 0) {
    alert('マッチングするテーブルを選択してください')
    return
  }
  if (waiting.length === 0) {
    alert('待機中のプレイヤーがいません')
    return
  }

  pendingMatches = generateMatching(waiting, targets, allPlayers, matches, shuffle)

  if (pendingMatches.length === 0) {
    alert('プレイヤーが足りないか、テーブルサイズが大きすぎます')
    return
  }

  renderMatchingBar()
}

function doConfirmMatching() {
  pendingMatches.forEach(({ tableId, playerIds }) => {
    addMatch(tableId, playerIds)
    updateTable(tableId, { status: 'playing', playerIds })
    playerIds.forEach(pid => updatePlayer(pid, { status: 'playing' }))
    selectedTables.delete(tableId)
  })
  pendingMatches = []
  render()
  syncMonitorCanvas()
}

function doCancelMatching() {
  pendingMatches = []
  renderTables()
  renderMatchingBar()
}

// ── モニターモード ───────────────────────────────────────

function enterMonitorMode() {
  document.getElementById('monitor-overlay').classList.remove('hidden')
  syncMonitorCanvas()
  monitorInterval = setInterval(syncMonitorCanvas, 2000)
}

function exitMonitorMode() {
  document.getElementById('monitor-overlay').classList.add('hidden')
  clearInterval(monitorInterval)
  monitorInterval = null
}

export function syncMonitorCanvas() {
  const overlay = document.getElementById('monitor-overlay')
  if (!overlay || overlay.classList.contains('hidden')) return

  const canvas  = document.getElementById('monitor-canvas')
  const tables  = getTables()
  const players = getPlayers()

  canvas.innerHTML = tables.map(t => {
    const seated = t.playerIds.map(id => players.find(p => p.id === id)).filter(Boolean)
    return `
      <div class="monitor-table status-${t.status}" style="left:${t.x}px;top:${t.y}px;">
        <div class="monitor-label">${esc(t.label)}</div>
        <div class="monitor-players">
          ${seated.map(p => `<div>${esc(p.name)}</div>`).join('')}
          ${seated.length === 0 ? '<div class="monitor-empty">空席</div>' : ''}
        </div>
      </div>
    `
  }).join('')
}

// ── イベント委譲 ─────────────────────────────────────────

function handleCanvasClick(e) {
  const btn = e.target.closest('[data-action]')
  if (!btn) return
  const { action, id, next } = btn.dataset

  switch (action) {
    case 'rename':    renameTable(id); break
    case 'chg-size':  updateTable(id, { size: Number(next) }); render(); break
    case 'del-table':
      if (confirm(`「${getTables().find(t=>t.id===id)?.label}」を削除しますか？`)) {
        deleteTable(id)
        selectedTables.delete(id)
        render()
      }
      break
    case 'finish':  finishTable(id); break
    case 'select':  toggleTableSelect(id, btn.checked); break
  }
}

function handlePlayerListClick(e) {
  const btn = e.target.closest('[data-action]')
  if (!btn) return
  const { action, id } = btn.dataset

  switch (action) {
    case 'cycle':
      cycleStatus(id)
      break
    case 'del-player':
      if (confirm(`「${getPlayers().find(p=>p.id===id)?.name}」を削除しますか？`)) {
        deletePlayer(id)
        render()
      }
      break
  }
}

// ── 初期化 ────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function statusLabel(s) {
  return { waiting: '待機', playing: '対戦中', break: '休憩', left: '退出' }[s] ?? s
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-add-player')
    ?.addEventListener('click', showAddPlayerModal)
  document.getElementById('btn-add-table')
    ?.addEventListener('click', showAddTableModal)
  document.getElementById('btn-match')
    ?.addEventListener('click', () => doGenerateMatching(false))
  document.getElementById('btn-regen-match')
    ?.addEventListener('click', () => doGenerateMatching(true))
  document.getElementById('btn-confirm-match')
    ?.addEventListener('click', doConfirmMatching)
  document.getElementById('btn-cancel-match')
    ?.addEventListener('click', doCancelMatching)
  document.getElementById('btn-monitor')
    ?.addEventListener('click', enterMonitorMode)
  document.getElementById('btn-exit-monitor')
    ?.addEventListener('click', exitMonitorMode)
  document.getElementById('btn-clear-matches')
    ?.addEventListener('click', () => {
      if (confirm('対戦履歴を全クリアしますか？\n（テーブル割り当ては変わりません）')) {
        clearMatches()
        render()
      }
    })

  document.getElementById('canvas')
    ?.addEventListener('click', handleCanvasClick)
  document.getElementById('canvas')
    ?.addEventListener('change', handleCanvasClick)
  document.getElementById('player-list')
    ?.addEventListener('click', handlePlayerListClick)

  render()
})
