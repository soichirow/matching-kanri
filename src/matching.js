/**
 * matching.js — マッチングアルゴリズム
 *
 * スコアベースの貪欲法:
 *   同グループペア         +5点 (ペナルティ)
 *   過去に対戦済みペア     +(対戦回数 × 10)点
 *   点数差ペナルティ       +(差 / 5)点 (vpMap指定時)
 *   スコアが低い組み合わせを優先する
 */

// ── ペアカウントMap・プレイヤーMap事前構築 (O(1) ルックアップ) ──

export function buildPairCountMap(matches) {
  const map = new Map()
  for (const m of matches) {
    const pids = m.playerIds
    for (let i = 0; i < pids.length; i++)
      for (let j = i + 1; j < pids.length; j++) {
        const key = pids[i] < pids[j] ? pids[i] + ':' + pids[j] : pids[j] + ':' + pids[i]
        map.set(key, (map.get(key) ?? 0) + 1)
      }
  }
  return map
}

export function buildPlayerMap(players) {
  const map = new Map()
  for (const p of players) map.set(p.id, p)
  return map
}

export function getPairCount(a, b, pairMap) {
  const key = a < b ? a + ':' + b : b + ':' + a
  return pairMap.get(key) ?? 0
}

// ── ペナルティ計算 ──

export function pairPenalty(a, b, players, matches, vpMap = null, _cache = null) {
  let count, pa, pb
  if (_cache) {
    count = getPairCount(a, b, _cache.pairMap)
    pa = _cache.playerMap.get(a)
    pb = _cache.playerMap.get(b)
  } else {
    count = matches.filter(m => m.playerIds.includes(a) && m.playerIds.includes(b)).length
    pa = players.find(p => p.id === a)
    pb = players.find(p => p.id === b)
  }
  const groupPen = (pa && pb && pa.group && pa.group === pb.group) ? 5 : 0
  let vpPen = 0
  if (vpMap) {
    const diff = Math.abs((vpMap[a] ?? 0) - (vpMap[b] ?? 0))
    vpPen = Math.floor(diff / 5)
  }
  return count * 10 + groupPen + vpPen
}

export function groupPenalty(playerIds, players, matches, vpMap = null, _cache = null) {
  let total = 0
  for (let i = 0; i < playerIds.length; i++)
    for (let j = i + 1; j < playerIds.length; j++)
      total += pairPenalty(playerIds[i], playerIds[j], players, matches, vpMap, _cache)
  return total
}

// ── ショートマッチプレイヤー検出 ──

export function getShortMatchPlayerIds(matches, tables) {
  const ids = new Set()
  const lastMatch = {}
  matches.forEach(m => {
    m.playerIds.forEach(pid => {
      if (!lastMatch[pid] || m.timestamp > lastMatch[pid].timestamp) lastMatch[pid] = m
    })
  })
  Object.entries(lastMatch).forEach(([pid, m]) => {
    const t = tables.find(x => x.id === m.tableId)
    if (t && m.playerIds.length < t.size) ids.add(pid)
  })
  return ids
}

// ── マッチング生成 ──

export function generateMatching(waitingPlayers, emptyTables, allPlayers, matches, shuffle = false, minFill = 0, vpMap = null, shortPlayerIds = null) {
  if (!waitingPlayers.length || !emptyTables.length) return []
  let pool = shuffle ? shuffleArray(waitingPlayers) : [...waitingPlayers]

  // 事前キャッシュ構築 (O(1) ルックアップ)
  const _cache = { pairMap: buildPairCountMap(matches), playerMap: buildPlayerMap(allPlayers) }

  // 満席テーブルを先に、端数テーブルを末尾に配置するため
  // まず満席分を割り当て、余りを最後のテーブルに回す
  const fullTables = []
  let partialTable = null
  let remaining = pool.length

  for (const table of emptyTables) {
    const minRequired = minFill > 0 ? minFill : table.size
    if (remaining >= table.size) {
      fullTables.push(table)
      remaining -= table.size
    } else if (remaining >= minRequired) {
      partialTable = table
      remaining = 0
    }
  }
  const orderedTables = [...fullTables, ...(partialTable ? [partialTable] : [])]

  const assignments = []
  for (const table of orderedTables) {
    const actualSize = Math.min(pool.length, table.size)
    if (actualSize < 1) continue
    let best = null
    // 規定人数未満の卓では、前回もショートだったプレイヤーを避ける
    if (shortPlayerIds && actualSize < table.size) {
      const nonShortPool = pool.filter(p => !shortPlayerIds.has(p.id))
      if (nonShortPool.length >= actualSize) {
        best = findBestGroup(nonShortPool, actualSize, allPlayers, matches, vpMap, _cache)
      }
    }
    if (!best) best = findBestGroup(pool, actualSize, allPlayers, matches, vpMap, _cache)
    if (!best) continue
    assignments.push({ tableId: table.id, playerIds: best })
    pool = pool.filter(p => !best.includes(p.id))
  }
  return assignments
}

export function optimizeTableAssignment(assignments, matches) {
  if (assignments.length <= 1) return assignments
  // 各プレイヤーの直近テーブルを構築
  const lastTable = {}
  matches.forEach(m => {
    m.playerIds.forEach(pid => { lastTable[pid] = m.tableId })
  })
  // テーブルIDリストとグループリストを分離
  const tableIds = assignments.map(a => a.tableId)
  const groups   = assignments.map(a => a.playerIds)

  // 9テーブル以上は greedy fallback（9! = 362,880 は重い）
  if (tableIds.length > 8) {
    // 各グループに最も相性の良いテーブルを貪欲に割り当て
    const usedTables = new Set()
    const result = []
    for (let gi = 0; gi < groups.length; gi++) {
      let bestTid = null, bestStay = -1
      for (const tid of tableIds) {
        if (usedTables.has(tid)) continue
        const stay = groups[gi].filter(pid => lastTable[pid] === tid).length
        if (stay > bestStay) { bestStay = stay; bestTid = tid }
      }
      usedTables.add(bestTid)
      result.push({ tableId: bestTid, playerIds: groups[gi] })
    }
    return result
  }

  // 全順列を試して移動数が最小のものを採用
  const perms = permutations(tableIds)
  let bestPerm  = tableIds
  let bestMoves = Infinity
  for (const perm of perms) {
    let moves = 0
    perm.forEach((tid, gi) => {
      groups[gi].forEach(pid => {
        if (lastTable[pid] && lastTable[pid] !== tid) moves++
      })
    })
    if (moves < bestMoves) { bestMoves = moves; bestPerm = perm }
  }
  return bestPerm.map((tid, i) => ({ tableId: tid, playerIds: groups[i] }))
}

export function buildScoreMap(matches) {
  const map = {}
  matches.forEach(m => {
    if (!m.scores) return
    Object.entries(m.scores).forEach(([pid, score]) => {
      map[pid] = (map[pid] ?? 0) + (score ?? 0)
    })
  })
  return map
}

/** buildVpMap — buildScoreMap のエイリアス（admin.html で使用される名前） */
export const buildVpMap = buildScoreMap

// ── 内部関数 ──────────────────────────────────────────────

function findBestGroup(players, size, allPlayers, matches, vpMap = null, _cache = null) {
  if (players.length < size) return null
  const ids = players.map(p => p.id)

  if (ids.length <= 20) {
    let best = null, bestScore = Infinity
    combinations(ids, size).forEach(combo => {
      const score = groupPenalty(combo, allPlayers, matches, vpMap, _cache)
      if (score < bestScore) { bestScore = score; best = combo }
    })
    return best
  }

  // 貪欲法
  const result = [ids[0]]
  const remaining = ids.slice(1)
  while (result.length < size && remaining.length > 0) {
    let bestIdx = 0, bScore = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const s = groupPenalty([...result, remaining[i]], allPlayers, matches, vpMap, _cache)
      if (s < bScore) { bScore = s; bestIdx = i }
    }
    result.push(remaining[bestIdx])
    remaining.splice(bestIdx, 1)
  }
  return result
}

function combinations(arr, size) {
  if (size === 0) return [[]]
  if (arr.length < size) return []
  const [first, ...rest] = arr
  return [
    ...combinations(rest, size - 1).map(c => [first, ...c]),
    ...combinations(rest, size)
  ]
}

function permutations(arr) {
  if (arr.length <= 1) return [arr]
  const result = []
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const p of permutations(rest)) result.push([arr[i], ...p])
  }
  return result
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
