import { describe, it, expect } from 'vitest'
import {
  pairPenalty,
  groupPenalty,
  generateMatching,
  optimizeTableAssignment,
  buildScoreMap,
} from '../src/matching.js'

// ── テスト用プレイヤーデータ ──────────────────────────────────
const P = [
  { id: 'p1', name: 'P1', group: 'A', status: 'waiting' },
  { id: 'p2', name: 'P2', group: 'A', status: 'waiting' },
  { id: 'p3', name: 'P3', group: 'B', status: 'waiting' },
  { id: 'p4', name: 'P4', group: 'B', status: 'waiting' },
  { id: 'p5', name: 'P5', group: 'A', status: 'waiting' },
  { id: 'p6', name: 'P6', group: 'B', status: 'waiting' },
  { id: 'p7', name: 'P7', group: 'C', status: 'waiting' },
  { id: 'p8', name: 'P8', group: 'C', status: 'waiting' },
]

// ── pairPenalty ───────────────────────────────────────────────
describe('pairPenalty', () => {
  it('履歴なし異グループ → 0', () => {
    expect(pairPenalty('p1', 'p3', P, [])).toBe(0)
  })

  it('同グループ → +5', () => {
    expect(pairPenalty('p1', 'p2', P, [])).toBe(5)
  })

  it('1回対戦済み → +10', () => {
    const matches = [{ playerIds: ['p1', 'p3'], tableId: 't1' }]
    expect(pairPenalty('p1', 'p3', P, matches)).toBe(10)
  })

  it('2回対戦済み → +20', () => {
    const matches = [
      { playerIds: ['p1', 'p3'], tableId: 't1' },
      { playerIds: ['p1', 'p3'], tableId: 't2' },
    ]
    expect(pairPenalty('p1', 'p3', P, matches)).toBe(20)
  })

  it('同グループ + 1回対戦 → 15', () => {
    const matches = [{ playerIds: ['p1', 'p2'], tableId: 't1' }]
    expect(pairPenalty('p1', 'p2', P, matches)).toBe(15)
  })

  it('VP差10 → floor(10/5) = 2', () => {
    const vpMap = { p1: 20, p3: 10 }
    expect(pairPenalty('p1', 'p3', P, [], vpMap)).toBe(2)
  })

  it('VP差4 → 0（境界）', () => {
    const vpMap = { p1: 10, p3: 6 }
    expect(pairPenalty('p1', 'p3', P, [], vpMap)).toBe(0)
  })

  it('VP差5 → 1（境界）', () => {
    const vpMap = { p1: 10, p3: 5 }
    expect(pairPenalty('p1', 'p3', P, [], vpMap)).toBe(1)
  })

  it('group未設定(null) → ペナルティなし', () => {
    const players = [
      { id: 'x1', name: 'X1', group: null, status: 'waiting' },
      { id: 'x2', name: 'X2', group: null, status: 'waiting' },
    ]
    expect(pairPenalty('x1', 'x2', players, [])).toBe(0)
  })

  it('3要素(グループ+対戦+VP)全合算', () => {
    // 同グループ(5) + 1回対戦(10) + VP差10→2 = 17
    const matches = [{ playerIds: ['p1', 'p2'], tableId: 't1' }]
    const vpMap = { p1: 20, p2: 10 }
    expect(pairPenalty('p1', 'p2', P, matches, vpMap)).toBe(17)
  })
})

// ── groupPenalty ──────────────────────────────────────────────
describe('groupPenalty', () => {
  it('2人異グループ → 0', () => {
    expect(groupPenalty(['p1', 'p3'], P, [])).toBe(0)
  })

  it('2人同グループ → 5', () => {
    expect(groupPenalty(['p1', 'p2'], P, [])).toBe(5)
  })

  it('4人(A,A,B,B) → 10', () => {
    // p1-p2同グループ(5), p3-p4同グループ(5), 他は異グループ(0)
    expect(groupPenalty(['p1', 'p2', 'p3', 'p4'], P, [])).toBe(10)
  })
})

// ── generateMatching ─────────────────────────────────────────
describe('generateMatching', () => {
  const tables4 = [{ id: 't1', size: 4 }]
  const tables4x2 = [{ id: 't1', size: 4 }, { id: 't2', size: 4 }]

  it('待機0人 → 空配列', () => {
    expect(generateMatching([], tables4, P, [])).toEqual([])
  })

  it('テーブル0 → 空配列', () => {
    expect(generateMatching(P.slice(0, 4), [], P, [])).toEqual([])
  })

  it('4人1卓満席', () => {
    const result = generateMatching(P.slice(0, 4), tables4, P, [])
    expect(result).toHaveLength(1)
    expect(result[0].tableId).toBe('t1')
    expect(result[0].playerIds).toHaveLength(4)
  })

  it('8人2卓分配', () => {
    const result = generateMatching(P, tables4x2, P, [])
    expect(result).toHaveLength(2)
    expect(result[0].playerIds).toHaveLength(4)
    expect(result[1].playerIds).toHaveLength(4)
  })

  it('minFill=0で1人不足 → 不成立', () => {
    // 3人で4人卓1つ、minFill=0 → minRequired=table.size=4 なので不成立
    const result = generateMatching(P.slice(0, 3), tables4, P, [], false, 0)
    expect(result).toEqual([])
  })

  it('minFill=2で端数OK', () => {
    // 3人で4人卓、minFill=2 → 3 >= 2 なので成立
    const result = generateMatching(P.slice(0, 3), tables4, P, [], false, 2)
    expect(result).toHaveLength(1)
    expect(result[0].playerIds).toHaveLength(3)
  })

  it('minFill=3のちょうど', () => {
    // 3人で4人卓、minFill=3 → 3 >= 3 成立
    const result = generateMatching(P.slice(0, 3), tables4, P, [], false, 3)
    expect(result).toHaveLength(1)
    expect(result[0].playerIds).toHaveLength(3)
  })

  it('minFill=3の未満', () => {
    // 2人で4人卓、minFill=3 → 2 < 3 不成立
    const result = generateMatching(P.slice(0, 2), tables4, P, [], false, 3)
    expect(result).toEqual([])
  })

  it('同グループ回避', () => {
    // p1(A), p2(A), p3(B), p4(B) を2人卓×2に配る → 異グループペアが選ばれるはず
    const tables2x2 = [{ id: 't1', size: 2 }, { id: 't2', size: 2 }]
    const result = generateMatching(P.slice(0, 4), tables2x2, P, [])
    expect(result).toHaveLength(2)
    // 各テーブルのペアは異グループになるはず
    for (const a of result) {
      const p = a.playerIds.map(id => P.find(pl => pl.id === id))
      // 同グループのペアにならないことを検証
      expect(p[0].group).not.toBe(p[1].group)
    }
  })

  it('全員同グループでも割り当て成立', () => {
    const samePlayers = [
      { id: 's1', name: 'S1', group: 'X', status: 'waiting' },
      { id: 's2', name: 'S2', group: 'X', status: 'waiting' },
      { id: 's3', name: 'S3', group: 'X', status: 'waiting' },
      { id: 's4', name: 'S4', group: 'X', status: 'waiting' },
    ]
    const result = generateMatching(samePlayers, tables4, samePlayers, [])
    expect(result).toHaveLength(1)
    expect(result[0].playerIds).toHaveLength(4)
  })

  it('対戦済み回避', () => {
    // p1-p2が対戦済み → 2人卓×2で別テーブルに割り振られるはず
    const tables2x2 = [{ id: 't1', size: 2 }, { id: 't2', size: 2 }]
    const matches = [{ playerIds: ['p1', 'p2'], tableId: 't1' }]
    const pool = P.slice(0, 4) // p1(A), p2(A), p3(B), p4(B)
    const result = generateMatching(pool, tables2x2, P, matches)
    expect(result).toHaveLength(2)
    // p1とp2が同卓にならないことを検証
    for (const a of result) {
      const ids = a.playerIds
      expect(ids.includes('p1') && ids.includes('p2')).toBe(false)
    }
  })

  it('shuffle=true動作', () => {
    // shuffle=trueの場合でも結果が返ること（順序は不定だが有効な割り当て）
    const result = generateMatching(P, tables4x2, P, [], true)
    expect(result).toHaveLength(2)
    const allIds = result.flatMap(a => a.playerIds)
    expect(allIds).toHaveLength(8)
    // 全プレイヤーが割り当てられている
    for (const p of P) {
      expect(allIds).toContain(p.id)
    }
  })

  it('フィルタ済みプールでの動作（ブラケット想定）', () => {
    // waitingPlayersがallPlayersのサブセット
    const pool = P.slice(0, 4) // p1-p4のみ待機
    const result = generateMatching(pool, tables4, P, [])
    expect(result).toHaveLength(1)
    expect(result[0].playerIds).toHaveLength(4)
    // poolに含まれるプレイヤーだけ割り当て
    for (const id of result[0].playerIds) {
      expect(pool.some(p => p.id === id)).toBe(true)
    }
  })

  it('20人で全探索パス', () => {
    const players20 = Array.from({ length: 20 }, (_, i) => ({
      id: `a${i}`, name: `A${i}`, group: i % 2 === 0 ? 'X' : 'Y', status: 'waiting',
    }))
    const tables = [{ id: 't1', size: 4 }]
    const result = generateMatching(players20, tables, players20, [])
    expect(result).toHaveLength(1)
    expect(result[0].playerIds).toHaveLength(4)
  })

  it('21人以上で貪欲法', () => {
    const players21 = Array.from({ length: 21 }, (_, i) => ({
      id: `b${i}`, name: `B${i}`, group: i % 3 === 0 ? 'X' : 'Y', status: 'waiting',
    }))
    const tables = [{ id: 't1', size: 4 }]
    const result = generateMatching(players21, tables, players21, [])
    expect(result).toHaveLength(1)
    expect(result[0].playerIds).toHaveLength(4)
  })

  it('複数テーブルで余りが出る場合', () => {
    // 6人、4人卓×2、minFill=2 → 1卓満席(4人) + 1卓端数(2人)
    const pool = P.slice(0, 6)
    const result = generateMatching(pool, tables4x2, P, [], false, 2)
    expect(result).toHaveLength(2)
    expect(result[0].playerIds).toHaveLength(4)
    expect(result[1].playerIds).toHaveLength(2)
  })
})

// ── optimizeTableAssignment ──────────────────────────────────
describe('optimizeTableAssignment', () => {
  it('1卓 → そのまま', () => {
    const assignments = [{ tableId: 't1', playerIds: ['p1', 'p2'] }]
    const result = optimizeTableAssignment(assignments, [])
    expect(result).toEqual(assignments)
  })

  it('前回同テーブル → 移動最小化', () => {
    const matches = [
      { tableId: 't1', playerIds: ['p1', 'p2'] },
      { tableId: 't2', playerIds: ['p3', 'p4'] },
    ]
    // 今回のグループ分けは同じだが tableId が逆
    const assignments = [
      { tableId: 't2', playerIds: ['p1', 'p2'] },
      { tableId: 't1', playerIds: ['p3', 'p4'] },
    ]
    const result = optimizeTableAssignment(assignments, matches)
    // 最適化で元のテーブルに戻るはず
    expect(result).toContainEqual({ tableId: 't1', playerIds: ['p1', 'p2'] })
    expect(result).toContainEqual({ tableId: 't2', playerIds: ['p3', 'p4'] })
  })

  it('履歴なし → 安全に返る', () => {
    const assignments = [
      { tableId: 't1', playerIds: ['p1', 'p2'] },
      { tableId: 't2', playerIds: ['p3', 'p4'] },
    ]
    const result = optimizeTableAssignment(assignments, [])
    expect(result).toHaveLength(2)
    // playerIds がそのまま保持されている
    const allIds = result.flatMap(a => a.playerIds).sort()
    expect(allIds).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('全員同テーブル (移動0ケース)', () => {
    const matches = [
      { tableId: 't1', playerIds: ['p1', 'p2'] },
      { tableId: 't2', playerIds: ['p3', 'p4'] },
    ]
    // 今回も同じ配置
    const assignments = [
      { tableId: 't1', playerIds: ['p1', 'p2'] },
      { tableId: 't2', playerIds: ['p3', 'p4'] },
    ]
    const result = optimizeTableAssignment(assignments, matches)
    expect(result).toContainEqual({ tableId: 't1', playerIds: ['p1', 'p2'] })
    expect(result).toContainEqual({ tableId: 't2', playerIds: ['p3', 'p4'] })
  })

  it('9卓以上 → 貪欲法で結果が返る', () => {
    const matches = []
    const assignments = Array.from({ length: 9 }, (_, i) => ({
      tableId: `t${i}`,
      playerIds: [`q${i * 2}`, `q${i * 2 + 1}`],
    }))
    // 前回のマッチ履歴を作る
    for (const a of assignments) {
      matches.push({ tableId: a.tableId, playerIds: a.playerIds })
    }
    const result = optimizeTableAssignment(assignments, matches)
    expect(result).toHaveLength(9)
    // テーブルIDがすべてユニーク
    const tableIds = result.map(r => r.tableId)
    expect(new Set(tableIds).size).toBe(9)
  })

  it('プレイヤー構成不変', () => {
    const matches = [
      { tableId: 't1', playerIds: ['p1', 'p3'] },
      { tableId: 't2', playerIds: ['p2', 'p4'] },
    ]
    const assignments = [
      { tableId: 't1', playerIds: ['p1', 'p2'] },
      { tableId: 't2', playerIds: ['p3', 'p4'] },
    ]
    const result = optimizeTableAssignment(assignments, matches)
    const allIds = result.flatMap(a => a.playerIds).sort()
    expect(allIds).toEqual(['p1', 'p2', 'p3', 'p4'])
  })
})

// ── buildScoreMap ────────────────────────────────────────────
describe('buildScoreMap', () => {
  it('空 → 空', () => {
    expect(buildScoreMap([])).toEqual({})
  })

  it('scoresなしスキップ', () => {
    const matches = [{ playerIds: ['p1', 'p2'], tableId: 't1' }]
    expect(buildScoreMap(matches)).toEqual({})
  })

  it('1試合マップ', () => {
    const matches = [
      { playerIds: ['p1', 'p2'], tableId: 't1', scores: { p1: 10, p2: 7 } },
    ]
    expect(buildScoreMap(matches)).toEqual({ p1: 10, p2: 7 })
  })

  it('3試合以上累積', () => {
    const matches = [
      { playerIds: ['p1', 'p2'], tableId: 't1', scores: { p1: 10, p2: 5 } },
      { playerIds: ['p1', 'p3'], tableId: 't2', scores: { p1: 8, p3: 12 } },
      { playerIds: ['p2', 'p3'], tableId: 't3', scores: { p2: 6, p3: 3 } },
    ]
    expect(buildScoreMap(matches)).toEqual({ p1: 18, p2: 11, p3: 15 })
  })

  it('null → 0扱い', () => {
    const matches = [
      { playerIds: ['p1', 'p2'], tableId: 't1', scores: { p1: null, p2: 5 } },
      { playerIds: ['p1'], tableId: 't2', scores: { p1: 3 } },
    ]
    const map = buildScoreMap(matches)
    expect(map.p1).toBe(3) // null(=0) + 3
    expect(map.p2).toBe(5)
  })
})
