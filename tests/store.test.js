import { describe, it, expect, beforeEach } from 'vitest'
import {
  getPlayers, addPlayer, updatePlayer, deletePlayer,
  getTables, addTable, updateTable, deleteTable,
  getMatches, addMatch, updateMatchScores, clearMatches,
} from '../src/store.js'

beforeEach(() => {
  localStorage.clear()
})

// ── Players CRUD ────────────────────────────────────────

describe('Players CRUD', () => {
  it('追加でid/name/group/status設定', () => {
    const p = addPlayer('Alice', 'A')
    expect(p.id).toBeTruthy()
    expect(p.name).toBe('Alice')
    expect(p.group).toBe('A')
    expect(p.status).toBe('waiting')
  })

  it('group省略→null', () => {
    const p = addPlayer('Bob')
    expect(p.group).toBeNull()
  })

  it('group空文字→null', () => {
    const p = addPlayer('Carol', '')
    expect(p.group).toBeNull()
  })

  it('bracket設定', () => {
    const p = addPlayer('Dave')
    const updated = updatePlayer(p.id, { bracket: '1' })
    expect(updated.bracket).toBe('1')
  })

  it('bracket解除', () => {
    const p = addPlayer('Eve')
    updatePlayer(p.id, { bracket: '1' })
    const updated = updatePlayer(p.id, { bracket: null })
    expect(updated.bracket).toBeNull()
  })

  it('更新で既存フィールド保持', () => {
    const p = addPlayer('Frank', 'X')
    const updated = updatePlayer(p.id, { status: 'playing' })
    expect(updated.name).toBe('Frank')
    expect(updated.group).toBe('X')
    expect(updated.status).toBe('playing')
  })

  it('存在しないID→null', () => {
    expect(updatePlayer('no-such-id', { name: 'Ghost' })).toBeNull()
  })

  it('削除、他に影響なし', () => {
    const p1 = addPlayer('A')
    const p2 = addPlayer('B')
    deletePlayer(p1.id)
    const remaining = getPlayers()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(p2.id)
  })
})

// ── Tables CRUD ─────────────────────────────────────────

describe('Tables CRUD', () => {
  it('追加でlabel/size/status/playerIds/座標設定', () => {
    const t = addTable('Table1', 6)
    expect(t.id).toBeTruthy()
    expect(t.label).toBe('Table1')
    expect(t.size).toBe(6)
    expect(t.status).toBe('empty')
    expect(t.playerIds).toEqual([])
    expect(typeof t.x).toBe('number')
    expect(typeof t.y).toBe('number')
  })

  it('size省略→4', () => {
    const t = addTable('Default')
    expect(t.size).toBe(4)
  })

  it('size境界値: 2人テーブル', () => {
    const t = addTable('Small', 2)
    expect(t.size).toBe(2)
  })

  it('size境界値: 8人テーブル', () => {
    const t = addTable('Big', 8)
    expect(t.size).toBe(8)
  })

  it('更新', () => {
    const t = addTable('T1')
    const updated = updateTable(t.id, { label: 'T1-renamed', status: 'playing' })
    expect(updated.label).toBe('T1-renamed')
    expect(updated.status).toBe('playing')
  })

  it('削除', () => {
    const t1 = addTable('A')
    const t2 = addTable('B')
    deleteTable(t1.id)
    const remaining = getTables()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(t2.id)
  })

  it('存在しないID→null', () => {
    expect(updateTable('no-such-id', { label: 'X' })).toBeNull()
  })
})

// ── Matches ─────────────────────────────────────────────

describe('Matches', () => {
  it('記録でtableId/playerIds/timestamp/scores(null)保存', () => {
    const m = addMatch('t1', ['p1', 'p2'])
    expect(m.id).toBeTruthy()
    expect(m.tableId).toBe('t1')
    expect(m.playerIds).toEqual(['p1', 'p2'])
    expect(typeof m.timestamp).toBe('number')
    expect(m.scores).toBeNull()
  })

  it('スコア記録(プラス)', () => {
    const m = addMatch('t1', ['p1', 'p2'])
    const updated = updateMatchScores(m.id, { p1: 10, p2: 5 })
    expect(updated.scores).toEqual({ p1: 10, p2: 5 })
  })

  it('スコア記録(マイナス)', () => {
    const m = addMatch('t1', ['p1', 'p2'])
    const updated = updateMatchScores(m.id, { p1: -3, p2: -7 })
    expect(updated.scores).toEqual({ p1: -3, p2: -7 })
  })

  it('スコア上書き', () => {
    const m = addMatch('t1', ['p1', 'p2'])
    updateMatchScores(m.id, { p1: 10, p2: 5 })
    const updated = updateMatchScores(m.id, { p1: 20, p2: 15 })
    expect(updated.scores).toEqual({ p1: 20, p2: 15 })
  })

  it('スコアをnullに戻す', () => {
    const m = addMatch('t1', ['p1', 'p2'])
    updateMatchScores(m.id, { p1: 10, p2: 5 })
    const updated = updateMatchScores(m.id, null)
    expect(updated.scores).toBeNull()
  })

  it('全クリア（プレイヤー・テーブルに影響なし）', () => {
    addPlayer('Alice')
    addTable('T1')
    addMatch('t1', ['p1'])
    addMatch('t2', ['p2'])
    clearMatches()
    expect(getMatches()).toEqual([])
    expect(getPlayers()).toHaveLength(1)
    expect(getTables()).toHaveLength(1)
  })

  it('存在しないmatchId→null', () => {
    expect(updateMatchScores('no-such-id', { p1: 10 })).toBeNull()
  })
})
