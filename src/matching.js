/**
 * matching.js — マッチングアルゴリズム
 *
 * スコアベースの貪欲法:
 *   同グループペア         +5点 (ペナルティ)
 *   過去に対戦済みペア     +(対戦回数 × 10)点
 *   スコアが低い組み合わせを優先する
 */

/**
 * 2プレイヤー間のペナルティスコア
 * @param {string} a
 * @param {string} b
 * @param {Array} players
 * @param {Array} matches
 * @returns {number}
 */
export function pairPenalty(a, b, players, matches) {
  let score = 0

  // 過去の対戦回数
  const count = matches.filter(m => m.playerIds.includes(a) && m.playerIds.includes(b)).length
  score += count * 10

  // 同グループ
  const pa = players.find(p => p.id === a)
  const pb = players.find(p => p.id === b)
  if (pa && pb && pa.group && pa.group === pb.group) {
    score += 5
  }

  return score
}

/**
 * グループ(テーブル1卓分)の合計ペナルティ
 * @param {string[]} playerIds
 * @param {Array} players
 * @param {Array} matches
 * @returns {number}
 */
export function groupPenalty(playerIds, players, matches) {
  let total = 0
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      total += pairPenalty(playerIds[i], playerIds[j], players, matches)
    }
  }
  return total
}

/**
 * 待機プレイヤーを空テーブルに割り当てる
 *
 * @param {Array} waitingPlayers  status='waiting' のプレイヤー
 * @param {Array} emptyTables     割り当て対象の空テーブル
 * @param {Array} allPlayers      全プレイヤー (グループ情報参照用)
 * @param {Array} matches         対戦履歴
 * @param {boolean} shuffle       true なら入力をシャッフルして別解を探す
 * @returns {{ tableId: string, playerIds: string[] }[]}
 */
export function generateMatching(waitingPlayers, emptyTables, allPlayers, matches, shuffle = false) {
  if (!waitingPlayers.length || !emptyTables.length) return []

  let pool = shuffle ? shuffleArray([...waitingPlayers]) : [...waitingPlayers]
  const assignments = []

  for (const table of emptyTables) {
    if (pool.length < table.size) break

    const best = findBestGroup(pool, table.size, allPlayers, matches)
    if (!best) break

    assignments.push({ tableId: table.id, playerIds: best })
    pool = pool.filter(p => !best.includes(p.id))
  }

  return assignments
}

// ── 内部関数 ──────────────────────────────────────────────

function findBestGroup(players, size, allPlayers, matches) {
  if (players.length < size) return null

  const ids = players.map(p => p.id)

  // プレイヤー数が少ない場合は全組み合わせを試す
  if (ids.length <= 20) {
    const combos = combinations(ids, size)
    let best = null
    let bestScore = Infinity
    for (const combo of combos) {
      const score = groupPenalty(combo, allPlayers, matches)
      if (score < bestScore) {
        bestScore = score
        best = combo
      }
    }
    return best
  }

  // 大人数の場合は貪欲法
  return greedyGroup(ids, size, allPlayers, matches)
}

function greedyGroup(ids, size, allPlayers, matches) {
  const result = [ids[0]]
  const remaining = ids.slice(1)

  while (result.length < size && remaining.length > 0) {
    let bestIdx = 0
    let bestScore = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const score = groupPenalty([...result, remaining[i]], allPlayers, matches)
      if (score < bestScore) {
        bestScore = score
        bestIdx = i
      }
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

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
