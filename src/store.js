/**
 * store.js — localStorage を使ったデータ永続化層
 *
 * データモデル:
 *   Player  { id, name, group: string|null, status: 'waiting'|'playing'|'excluded' }
 *   Table   { id, label, size: 2-8, status: 'empty'|'playing', playerIds: string[], x, y }
 *   Match   { id, tableId, playerIds: string[], timestamp, scores: {[pid]:number}|null }
 */

const KEYS = {
  PLAYERS: 'mg_players',
  TABLES:  'mg_tables',
  MATCHES: 'mg_matches',
}

function load(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// ── Players ──────────────────────────────────────────────

export function getPlayers() {
  return load(KEYS.PLAYERS)
}

export function addPlayer(name, group = null) {
  const players = getPlayers()
  const player = {
    id: generateId(),
    name,
    group: group || null,
    status: 'waiting',
  }
  players.push(player)
  save(KEYS.PLAYERS, players)
  return player
}

export function updatePlayer(id, updates) {
  const players = getPlayers()
  const idx = players.findIndex(p => p.id === id)
  if (idx === -1) return null
  players[idx] = { ...players[idx], ...updates }
  save(KEYS.PLAYERS, players)
  return players[idx]
}

export function deletePlayer(id) {
  save(KEYS.PLAYERS, getPlayers().filter(p => p.id !== id))
}

// ── Tables ───────────────────────────────────────────────

export function getTables() {
  return load(KEYS.TABLES)
}

export function addTable(label, size = 4) {
  const tables = getTables()
  const table = {
    id: generateId(),
    label,
    size,
    status: 'empty',
    playerIds: [],
    x: 40 + (tables.length % 5) * 260,
    y: 40 + Math.floor(tables.length / 5) * 260,
  }
  tables.push(table)
  save(KEYS.TABLES, tables)
  return table
}

export function updateTable(id, updates) {
  const tables = getTables()
  const idx = tables.findIndex(t => t.id === id)
  if (idx === -1) return null
  tables[idx] = { ...tables[idx], ...updates }
  save(KEYS.TABLES, tables)
  return tables[idx]
}

export function deleteTable(id) {
  save(KEYS.TABLES, getTables().filter(t => t.id !== id))
}

// ── Matches ──────────────────────────────────────────────

export function getMatches() {
  return load(KEYS.MATCHES)
}

export function addMatch(tableId, playerIds) {
  const matches = getMatches()
  const match = {
    id: generateId(),
    tableId,
    playerIds,
    timestamp: Date.now(),
    scores: null,
  }
  matches.push(match)
  save(KEYS.MATCHES, matches)
  return match
}

export function updateMatchScores(matchId, scores) {
  const matches = getMatches()
  const idx = matches.findIndex(m => m.id === matchId)
  if (idx === -1) return null
  matches[idx].scores = scores
  save(KEYS.MATCHES, matches)
  return matches[idx]
}

export function clearMatches() {
  save(KEYS.MATCHES, [])
}

export function buildVpMap(matches) {
  const map = {}
  matches.forEach(m => {
    if (!m.scores) return
    Object.entries(m.scores).forEach(([pid, vp]) => {
      map[pid] = (map[pid] ?? 0) + (vp ?? 0)
    })
  })
  return map
}

export function deleteMatchByTable(tableId) {
  // そのテーブルで記録された直近1件のマッチを削除
  const matches = getMatches()
  const idx = matches.map((m,i) => [m,i]).reverse().find(([m]) => m.tableId === tableId)?.[1]
  if (idx !== undefined) {
    matches.splice(idx, 1)
    save(KEYS.MATCHES, matches)
  }
}

// ── Settings ────────────────────────────────────────────

export function getSettings() {
  try {
    const r = localStorage.getItem('mg_settings')
    return r ? JSON.parse(r) : {}
  } catch {
    return {}
  }
}

export function saveSettings(s) {
  localStorage.setItem('mg_settings', JSON.stringify(s))
}

// ── Room Objects ────────────────────────────────────────

export function getRoomObjects() {
  return load('mg_objects')
}

export function addRoomObject(label, color = '#4fc3f7', w = 240, h = 130) {
  const objs = getRoomObjects()
  const obj = {
    id: generateId(),
    label,
    color,
    x: 60 + (objs.length % 5) * 60,
    y: 60 + Math.floor(objs.length / 5) * 60,
    w,
    h,
  }
  objs.push(obj)
  save('mg_objects', objs)
  return obj
}

export function updateRoomObject(id, updates) {
  const objs = getRoomObjects()
  const idx = objs.findIndex(o => o.id === id)
  if (idx === -1) return null
  objs[idx] = { ...objs[idx], ...updates }
  save('mg_objects', objs)
  return objs[idx]
}

export function deleteRoomObject(id) {
  save('mg_objects', getRoomObjects().filter(o => o.id !== id))
}
