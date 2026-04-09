import { describe, it, expect } from 'vitest'
import { pairPenalty, groupPenalty, generateMatching } from '../src/matching.js'

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
    // p1-p2: 5, p1-p3: 0, p1-p4: 0, p2-p3: 0, p2-p4: 0, p3-p4: 5
    expect(groupPenalty(['p1', 'p2', 'p3', 'p4'], P, [])).toBe(10)
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

  it('同グループ同士を避ける（異グループペアが優先）', () => {
    // p1(A), p2(A), p3(B) の3人から2人テーブル
    // p1-p3(0) か p2-p3(0) を選ぶはず → p1-p2(5) にはならない
    const result = generateMatching(
      [P[0], P[1], P[2]],
      [{ id: 't1', size: 2, status: 'empty' }],
      P, []
    )
    const ids = result[0].playerIds
    expect(ids.includes('p1') && ids.includes('p2')).toBe(false)
  })

  it('対戦済みの組み合わせを避ける', () => {
    // p1 と p3 は対戦済み → p1-p5 が選ばれるはず
    const matches = [{ playerIds: ['p1', 'p3'] }]
    const result = generateMatching(
      [P[0], P[2], P[4]], // p1, p3, p5
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
    expect(new Set(all).size).toBe(all.length) // 重複なし
  })

  it('プレイヤーが足りないテーブルはスキップ', () => {
    // 待機3人で2人テーブル×2 → 1テーブルのみ割り当て可能
    const result = generateMatching(P.slice(0, 3), T2, P, [])
    expect(result).toHaveLength(1)
  })

  it('shuffle=trueで再生成できる（別解が生まれる）', () => {
    // シャッフルで例外が発生しないことを確認
    expect(() => generateMatching(P, T2, P, [], true)).not.toThrow()
    const r = generateMatching(P, T2, P, [], true)
    expect(r.length).toBeGreaterThan(0)
  })
})
