/**
 * matching.js — マッチングアルゴリズム
 *
 * スコアベースの貪欲法:
 *   同グループペア         +5点 (ペナルティ)
 *   過去に対戦済みペア     +(対戦回数 × 10)点
 *   点数差ペナルティ       +(差 / 5)点 (vpMap指定時)
 *   スコアが低い組み合わせを優先する
 */

export function pairPenalty(a, b, players, matches, vpMap = null) {
  const count = matches.filter(m => m.playerIds.includes(a) && m.playerIds.includes(b)).length
  const pa = players.find(p => p.id === a)
  const pb = players.find(p => p.id === b)
  const groupPen = (pa && pb && pa.group && pa.group === pb.group) ? 5 : 0
  let vpPen = 0
  if (vpMap) {
    const diff = Math.abs((vpMap[a] ?? 0) - (vpMap[b] ?? 0))
    vpPen = Math.floor(diff / 5)
  }
  return count * 10 + groupPen + vpPen
}

export function groupPenalty(playerIds, players, matches, vpMap = null) {
  let total = 0
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      total += pairPenalty(playerIds[i], playerIds[j], players, matches, vpMap)
    }
  }
  return total
}

export function generateMatching(waitingPlayers, emptyTables, allPlayers, matches, shuffle = false, minFill = 0, vpMap = null) {
  if (!waitingPlayers.length || !emptyTables.length) return []

  let pool = shuffle ? shuffleArray([...waitingPlayers]) : [...waitingPlayers]

  // 満席テーブルを先に、端数テーブルを末尾に配置
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
    const best = findBestGroup(pool, actualSize, allPlayers, matches, vpMap)
    if (!best) continue
    assignments.push({ tableId: table.id, playerIds: best })
    pool = pool.filter(p => !best.includes(p.id))
  }

  return assignments
}

export function optimizeTableAssignment(assignments, matches) {
  if (assignments.length <= 1) return assignments

  const lastTable = {}
  matches.forEach(m => {
    m.playerIds.forEach(pid => { lastTable[pid] = m.tableId })
  })

  const tableIds = assignments.map(a => a.tableId)
  const groups = assignments.map(a => a.playerIds)

  if (tableIds.length > 8) {
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

  const perms = permutations(tableIds)
  let bestPerm = tableIds
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

// ── 内部関数 ──────────────────────────────────────────────

function findBestGroup(players, size, allPlayers, matches, vpMap = null) {
  if (players.length < size) return null
  const ids = players.map(p => p.id)

  if (ids.length <= 20) {
    const combos = combinations(ids, size)
    let best = null
    let bestScore = Infinity
    for (const combo of combos) {
      const score = groupPenalty(combo, allPlayers, matches, vpMap)
      if (score < bestScore) { bestScore = score; best = combo }
    }
    return best
  }

  return greedyGroup(ids, size, allPlayers, matches, vpMap)
}

function greedyGroup(ids, size, allPlayers, matches, vpMap) {
  const result = [ids[0]]
  const remaining = ids.slice(1)

  while (result.length < size && remaining.length > 0) {
    let bestIdx = 0
    let bestScore = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const score = groupPenalty([...result, remaining[i]], allPlayers, matches, vpMap)
      if (score < bestScore) { bestScore = score; bestIdx = i }
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
    ...combinations(rest, size),
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
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
