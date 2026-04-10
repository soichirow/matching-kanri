import { describe, it, expect } from 'vitest'
import { pairPenalty, groupPenalty, generateMatching, optimizeTableAssignment, buildScoreMap } from '../src/matching.js'

// テスト用プレイヤー
const P = [
  { id: 'p1', name: '田中', group: 'A', status: 'waiting' },
  { id: 'p2', name: '鈴木', group: 'A', status: 'waiting' },
  { id: 'p3', name: '佐藤', group: 'B', status: 'waiting' },
  { id: 'p4', name: '伊藤', group: 'B', status: 'waiting' },
  { id: 'p5', name: '加藤', group: 'C', status: 'waiting' },
  { id: 'p6', name: '山田', group: 'C', status: 'waiting' },
  { id: 'p7', name: '中村', group: 'D', status: 'waiting' },
  { id: 'p8', name: '小林', group: 'D', status: 'waiting' },
]

// ── pairPenalty ──────────────────────────────────────────

describe('pairPenalty', () => {
  it('対戦履歴なし・異グループ → 0', () => {
    expect(pairPenalty('p1', 'p3', P, [])).toBe(0)
  })

  it('同グループのみ → 5', () => {
    expect(pairPenalty('p1', 'p2', P, [])).toBe(5)
  })

  it('1回対戦済み・異グループ → 10', () => {
    const matches = [{ playerIds: ['p1', 'p3'] }]
    expect(pairPenalty('p1', 'p3', P, matches)).toBe(10)
  })

  it('2回対戦済み → 20', () => {
    const matches = [
      { playerIds: ['p1', 'p3'] },
      { playerIds: ['p1', 'p3'] },
    ]
    expect(pairPenalty('p1', 'p3', P, matches)).toBe(20)
  })

  it('同グループ＋1回対戦済み → 15', () => {
    const matches = [{ playerIds: ['p1', 'p2'] }]
    expect(pairPenalty('p1', 'p2', P, matches)).toBe(15)
  })

  it('グループなしプレイヤーは同グループペナルティなし', () => {
    const noGroup = [
      { id: 'x1', group: null },
      { id: 'x2', group: null },
    ]
    expect(pairPenalty('x1', 'x2', noGroup, [])).toBe(0)
  })

  it('片方だけグループありでもペナルティなし', () => {
    const mixed = [
      { id: 'x1', group: 'A' },
      { id: 'x2', group: null },
    ]
    expect(pairPenalty('x1', 'x2', mixed, [])).toBe(0)
  })

  // 点数ペナルティ
  it('vpMap指定なしなら点数ペナルティ0', () => {
    expect(pairPenalty('p1', 'p3', P, [])).toBe(0)
    expect(pairPenalty('p1', 'p3', P, [], null)).toBe(0)
  })

  it('vpMapで点数差0 → 追加ペナルティ0', () => {
    const vpMap = { p1: 10, p3: 10 }
    expect(pairPenalty('p1', 'p3', P, [], vpMap)).toBe(0)
  })

  it('vpMapで点数差10 → 追加ペナルティ2 (floor(10/5))', () => {
    const vpMap = { p1: 20, p3: 10 }
    expect(pairPenalty('p1', 'p3', P, [], vpMap)).toBe(2)
  })

  it('vpMapでマイナス点数対応', () => {
    const vpMap = { p1: -5, p3: 10 }
    // 差=15, floor(15/5)=3
    expect(pairPenalty('p1', 'p3', P, [], vpMap)).toBe(3)
  })

  it('vpMapに片方のプレイヤーがない場合は0扱い', () => {
    const vpMap = { p1: 10 }
    // 差=10, floor(10/5)=2
    expect(pairPenalty('p1', 'p3', P, [], vpMap)).toBe(2)
  })
})

// ── groupPenalty ─────────────────────────────────────────

describe('groupPenalty', () => {
  it('2人・異グループ → 0', () => {
    expect(groupPenalty(['p1', 'p3'], P, [])).toBe(0)
  })

  it('2人・同グループ → 5', () => {
    expect(groupPenalty(['p1', 'p2'], P, [])).toBe(5)
  })

  it('4人テーブル(A,A,B,B)のペアは p1-p2(5) + p3-p4(5) = 10', () => {
    expect(groupPenalty(['p1', 'p2', 'p3', 'p4'], P, [])).toBe(10)
  })

  it('vpMap付きでペナルティが加算される', () => {
    const vpMap = { p1: 0, p3: 10 }
    // 異グループ(0) + 点数差10→2 = 2
    expect(groupPenalty(['p1', 'p3'], P, [], vpMap)).toBe(2)
  })
})

// ── generateMatching ─────────────────────────────────────

const T2 = [
  { id: 't1', size: 2, status: 'empty' },
  { id: 't2', size: 2, status: 'empty' },
]
const T4 = [{ id: 't3', size: 4, status: 'empty' }]

describe('generateMatching', () => {
  it('待機プレイヤーなし → []', () => {
    expect(generateMatching([], T2, P, [])).toEqual([])
  })

  it('空テーブルなし → []', () => {
    expect(generateMatching(P, [], P, [])).toEqual([])
  })

  it('2人テーブル1卓に2人割り当てる', () => {
    const result = generateMatching(P.slice(0, 2), [T2[0]], P, [])
    expect(result).toHaveLength(1)
    expect(result[0].tableId).toBe('t1')
    expect(result[0].playerIds).toHaveLength(2)
  })

  it('4人テーブル1卓に4人割り当てる', () => {
    const result = generateMatching(P.slice(0, 4), T4, P, [])
    expect(result[0].playerIds).toHaveLength(4)
  })

  it('同グループ同士を避ける', () => {
    const result = generateMatching(
      [P[0], P[1], P[2]],
      [{ id: 't1', size: 2, status: 'empty' }],
      P, []
    )
    const ids = result[0].playerIds
    expect(ids.includes('p1') && ids.includes('p2')).toBe(false)
  })

  it('対戦済みの組み合わせを避ける', () => {
    const matches = [{ playerIds: ['p1', 'p3'] }]
    const result = generateMatching(
      [P[0], P[2], P[4]],
      [{ id: 't1', size: 2, status: 'empty' }],
      P, matches
    )
    const ids = result[0].playerIds
    expect(ids.includes('p1') && ids.includes('p3')).toBe(false)
  })

  it('複数テーブルに重複なく割り当てる', () => {
    const result = generateMatching(P, T2, P, [])
    expect(result).toHaveLength(2)
    const all = result.flatMap(r => r.playerIds)
    expect(new Set(all).size).toBe(all.length)
  })

  it('プレイヤーが足りないテーブルはスキップ', () => {
    const result = generateMatching(P.slice(0, 3), T2, P, [])
    expect(result).toHaveLength(1)
  })

  it('shuffle=trueで例外なく動作', () => {
    expect(() => generateMatching(P, T2, P, [], true)).not.toThrow()
    const r = generateMatching(P, T2, P, [], true)
    expect(r.length).toBeGreaterThan(0)
  })

  // minFill テスト
  it('minFill=1でプレイヤー不足でも配席する', () => {
    // 3人で4人テーブル → minFill=0ならスキップ、minFill=1なら配席
    const result0 = generateMatching(P.slice(0, 3), T4, P, [], false, 0)
    expect(result0).toHaveLength(0)

    const result1 = generateMatching(P.slice(0, 3), T4, P, [], false, 1)
    expect(result1).toHaveLength(1)
    expect(result1[0].playerIds).toHaveLength(3)
  })

  it('minFill=2で1人しかいない場合はスキップ', () => {
    const result = generateMatching(P.slice(0, 1), T4, P, [], false, 2)
    expect(result).toHaveLength(0)
  })

  // vpMap テスト
  it('vpMap指定時に点数が近いプレイヤー同士を優先', () => {
    // p1=100点, p2=0点, p3=95点 → p1とp3が組まれやすい
    const vpMap = { p1: 100, p2: 0, p3: 95 }
    const result = generateMatching(
      [P[0], P[1], P[2]],
      [{ id: 't1', size: 2, status: 'empty' }],
      P, [], false, 0, vpMap
    )
    const ids = result[0].playerIds
    expect(ids).toContain('p1')
    expect(ids).toContain('p3')
  })
})

// ── optimizeTableAssignment ──────────────────────────────

describe('optimizeTableAssignment', () => {
  it('1卓の場合はそのまま返す', () => {
    const input = [{ tableId: 't1', playerIds: ['p1', 'p2'] }]
    expect(optimizeTableAssignment(input, [])).toEqual(input)
  })

  it('履歴なしの場合は元の割り当てを返す', () => {
    const input = [
      { tableId: 't1', playerIds: ['p1', 'p2'] },
      { tableId: 't2', playerIds: ['p3', 'p4'] },
    ]
    const result = optimizeTableAssignment(input, [])
    // 全プレイヤーが含まれている
    const all = result.flatMap(r => r.playerIds)
    expect(new Set(all)).toEqual(new Set(['p1', 'p2', 'p3', 'p4']))
  })

  it('前回と同じテーブルのプレイヤーが多い割り当てを選ぶ', () => {
    // 前回: p1,p2はt1、p3,p4はt2にいた
    const history = [
      { tableId: 't1', playerIds: ['p1', 'p2'] },
      { tableId: 't2', playerIds: ['p3', 'p4'] },
    ]
    // 今回のグループ分け結果が逆順で渡された場合
    const input = [
      { tableId: 't1', playerIds: ['p3', 'p4'] }, // p3,p4は前回t2にいた
      { tableId: 't2', playerIds: ['p1', 'p2'] }, // p1,p2は前回t1にいた
    ]
    const result = optimizeTableAssignment(input, history)
    // 最適化後: p1,p2→t1、p3,p4→t2 になるはず
    const t1 = result.find(r => r.tableId === 't1')
    const t2 = result.find(r => r.tableId === 't2')
    expect(new Set(t1.playerIds)).toEqual(new Set(['p1', 'p2']))
    expect(new Set(t2.playerIds)).toEqual(new Set(['p3', 'p4']))
  })

  it('3卓以上でも最適化できる', () => {
    const history = [
      { tableId: 'tA', playerIds: ['p1', 'p2'] },
      { tableId: 'tB', playerIds: ['p3', 'p4'] },
      { tableId: 'tC', playerIds: ['p5', 'p6'] },
    ]
    // ローテーション: A→B→C→A
    const input = [
      { tableId: 'tA', playerIds: ['p5', 'p6'] },
      { tableId: 'tB', playerIds: ['p1', 'p2'] },
      { tableId: 'tC', playerIds: ['p3', 'p4'] },
    ]
    const result = optimizeTableAssignment(input, history)
    expect(result.find(r => r.tableId === 'tA').playerIds).toEqual(expect.arrayContaining(['p1', 'p2']))
    expect(result.find(r => r.tableId === 'tB').playerIds).toEqual(expect.arrayContaining(['p3', 'p4']))
    expect(result.find(r => r.tableId === 'tC').playerIds).toEqual(expect.arrayContaining(['p5', 'p6']))
  })
})

// ── buildScoreMap ────────────────────────────────────────

describe('buildScoreMap', () => {
  it('スコアなしのマッチ → 空マップ', () => {
    const matches = [
      { playerIds: ['p1', 'p2'], scores: null },
    ]
    expect(buildScoreMap(matches)).toEqual({})
  })

  it('単一マッチのスコアを返す', () => {
    const matches = [
      { playerIds: ['p1', 'p2'], scores: { p1: 10, p2: 5 } },
    ]
    expect(buildScoreMap(matches)).toEqual({ p1: 10, p2: 5 })
  })

  it('複数マッチのスコアを累計する', () => {
    const matches = [
      { playerIds: ['p1', 'p2'], scores: { p1: 10, p2: 5 } },
      { playerIds: ['p1', 'p3'], scores: { p1: -3, p3: 8 } },
    ]
    expect(buildScoreMap(matches)).toEqual({ p1: 7, p2: 5, p3: 8 })
  })

  it('マイナス点数の累計が正しい', () => {
    const matches = [
      { playerIds: ['p1'], scores: { p1: -10 } },
      { playerIds: ['p1'], scores: { p1: -5 } },
    ]
    expect(buildScoreMap(matches)).toEqual({ p1: -15 })
  })

  it('スコア0を正しく記録', () => {
    const matches = [{ playerIds: ['p1', 'p2'], scores: { p1: 0, p2: 0 } }]
    expect(buildScoreMap(matches)).toEqual({ p1: 0, p2: 0 })
  })

  it('スコアありとなしが混在', () => {
    const matches = [
      { playerIds: ['p1', 'p2'], scores: { p1: 10, p2: 5 } },
      { playerIds: ['p1', 'p3'], scores: null },
      { playerIds: ['p2', 'p3'], scores: { p2: 3, p3: -2 } },
    ]
    expect(buildScoreMap(matches)).toEqual({ p1: 10, p2: 8, p3: -2 })
  })
})

// ── カスタムグループ名 ──────────────────────────────────

describe('カスタムグループ名', () => {
  const CP = [
    { id: 'c1', name: 'Alice', group: 'チームX', status: 'waiting' },
    { id: 'c2', name: 'Bob',   group: 'チームX', status: 'waiting' },
    { id: 'c3', name: 'Carol', group: 'チームY', status: 'waiting' },
  ]

  it('同カスタムグループ → ペナルティ5', () => {
    expect(pairPenalty('c1', 'c2', CP, [])).toBe(5)
  })

  it('異カスタムグループ → ペナルティ0', () => {
    expect(pairPenalty('c1', 'c3', CP, [])).toBe(0)
  })
})

// ── 8人テーブル ──────────────────────────────────────────

describe('8人テーブル', () => {
  const P8 = Array.from({ length: 8 }, (_, i) => ({
    id: `q${i}`, name: `P${i}`, group: null, status: 'waiting'
  }))

  it('8人テーブルに8人を割り当て', () => {
    const result = generateMatching(P8, [{ id: 'big', size: 8, status: 'empty' }], P8, [])
    expect(result).toHaveLength(1)
    expect(result[0].playerIds).toHaveLength(8)
  })

  it('8人テーブルでminFill=1、7人で配席', () => {
    const result = generateMatching(P8.slice(0, 7), [{ id: 'big', size: 8, status: 'empty' }], P8, [], false, 1)
    expect(result).toHaveLength(1)
    expect(result[0].playerIds).toHaveLength(7)
  })
})

// ── pairPenalty 追加エッジケース ──────────────────────────

describe('pairPenalty 追加', () => {
  it('3回対戦済み → 30', () => {
    const matches = [
      { playerIds: ['p1', 'p3'] },
      { playerIds: ['p1', 'p3'] },
      { playerIds: ['p1', 'p3'] },
    ]
    expect(pairPenalty('p1', 'p3', P, matches)).toBe(30)
  })

  it('vpMap={}（空マップ）でペナルティ0', () => {
    expect(pairPenalty('p1', 'p3', P, [], {})).toBe(0)
  })
})

// ── optimizeTableAssignment 9卓以上 ──────────────────────

describe('optimizeTableAssignment 9卓以上', () => {
  it('10卓でgreedy fallbackが動作する', () => {
    const assignments = Array.from({ length: 10 }, (_, i) => ({
      tableId: `t${i}`, playerIds: [`p${i * 2}`, `p${i * 2 + 1}`]
    }))
    const matches = [
      { tableId: 't0', playerIds: ['p0', 'p1'] },
      { tableId: 't1', playerIds: ['p2', 'p3'] },
    ]
    const result = optimizeTableAssignment(assignments, matches)
    expect(result).toHaveLength(10)
    const all = result.flatMap(r => r.playerIds)
    expect(new Set(all).size).toBe(20)
  })
})

// ── generateMatching 端数テーブル配置順 ──────────────────

describe('generateMatching 端数配置', () => {
  it('13人×4人卓4つ → 満席3卓が先、端数1卓が末尾', () => {
    const players = Array.from({ length: 13 }, (_, i) => ({
      id: `r${i}`, name: `R${i}`, group: null, status: 'waiting'
    }))
    const tables = Array.from({ length: 4 }, (_, i) => ({
      id: `rt${i}`, size: 4, status: 'empty'
    }))
    const result = generateMatching(players, tables, players, [], true, 1)
    // 最初の3卓は4人、最後の1卓は1人
    expect(result).toHaveLength(4)
    expect(result[0].playerIds).toHaveLength(4)
    expect(result[1].playerIds).toHaveLength(4)
    expect(result[2].playerIds).toHaveLength(4)
    expect(result[3].playerIds).toHaveLength(1)
  })
})
