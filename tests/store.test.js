import { describe, it, expect, beforeEach } from 'vitest'
import {
  getPlayers, addPlayer, updatePlayer, deletePlayer,
  getTables, addTable, updateTable, deleteTable,
  getMatches, addMatch, updateMatchScores, clearMatches,
  buildVpMap, deleteMatchByTable,
  getSettings, saveSettings,
  getRoomObjects, addRoomObject, updateRoomObject, deleteRoomObject,
  _clearCache,
} from '../src/store.js'

beforeEach(() => {
  localStorage.clear()
  _clearCache()
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
    updateMatchScores(m.id, { p1: 10, p2: 5 })
    const updated = getMatches().find(x => x.id === m.id)
    expect(updated.scores).toEqual({ p1: 10, p2: 5 })
  })

  it('スコア記録(マイナス)', () => {
    const m = addMatch('t1', ['p1', 'p2'])
    updateMatchScores(m.id, { p1: -3, p2: -7 })
    const updated = getMatches().find(x => x.id === m.id)
    expect(updated.scores).toEqual({ p1: -3, p2: -7 })
  })

  it('スコア上書き', () => {
    const m = addMatch('t1', ['p1', 'p2'])
    updateMatchScores(m.id, { p1: 10, p2: 5 })
    updateMatchScores(m.id, { p1: 20, p2: 15 })
    const updated = getMatches().find(x => x.id === m.id)
    expect(updated.scores).toEqual({ p1: 20, p2: 15 })
  })

  it('スコアをnullに戻す', () => {
    const m = addMatch('t1', ['p1', 'p2'])
    updateMatchScores(m.id, { p1: 10, p2: 5 })
    updateMatchScores(m.id, null)
    const updated = getMatches().find(x => x.id === m.id)
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

  it('存在しないmatchId→undefinedで例外なし', () => {
    expect(updateMatchScores('no-such-id', { p1: 10 })).toBeUndefined()
  })
})

// ── buildVpMap ──────────────────────────────────────────

describe('buildVpMap', () => {
  it('空配列 → 空オブジェクト', () => {
    expect(buildVpMap([])).toEqual({})
  })

  it('scoresなし → スキップ', () => {
    const matches = [{ playerIds: ['p1', 'p2'], tableId: 't1', scores: null }]
    expect(buildVpMap(matches)).toEqual({})
  })

  it('累積計算', () => {
    const matches = [
      { playerIds: ['p1', 'p2'], tableId: 't1', scores: { p1: 10, p2: 5 } },
      { playerIds: ['p1', 'p3'], tableId: 't2', scores: { p1: 8, p3: 12 } },
    ]
    expect(buildVpMap(matches)).toEqual({ p1: 18, p2: 5, p3: 12 })
  })

  it('null値は0扱い', () => {
    const matches = [
      { playerIds: ['p1'], tableId: 't1', scores: { p1: null } },
      { playerIds: ['p1'], tableId: 't2', scores: { p1: 7 } },
    ]
    expect(buildVpMap(matches)).toEqual({ p1: 7 })
  })
})

// ── deleteMatchByTable ──────────────────────────────────

describe('deleteMatchByTable', () => {
  it('直近1件のみ削除', () => {
    addMatch('t1', ['p1', 'p2'])
    addMatch('t1', ['p1', 'p3'])
    addMatch('t2', ['p3', 'p4'])
    expect(getMatches()).toHaveLength(3)
    deleteMatchByTable('t1')
    const remaining = getMatches()
    expect(remaining).toHaveLength(2)
    // t1の最初のマッチは残り、2番目が削除される
    expect(remaining.filter(m => m.tableId === 't1')).toHaveLength(1)
  })

  it('存在しないtableId → 変化なし', () => {
    addMatch('t1', ['p1', 'p2'])
    deleteMatchByTable('no-such')
    expect(getMatches()).toHaveLength(1)
  })

  it('空配列 → 例外なし', () => {
    expect(() => deleteMatchByTable('t1')).not.toThrow()
  })
})

// ── Settings ────────────────────────────────────────────

describe('Settings', () => {
  it('初期状態は空オブジェクト', () => {
    expect(getSettings()).toEqual({})
  })

  it('保存→取得', () => {
    saveSettings({ enableVP: true, theme: 'dark' })
    const s = getSettings()
    expect(s.enableVP).toBe(true)
    expect(s.theme).toBe('dark')
  })

  it('上書き保存', () => {
    saveSettings({ a: 1 })
    saveSettings({ b: 2 })
    expect(getSettings()).toEqual({ b: 2 })
  })

  it('不正JSONでも空オブジェクト', () => {
    localStorage.setItem('mg_settings', '{broken')
    expect(getSettings()).toEqual({})
  })
})

// ── Room Objects ────────────────────────────────────────

describe('Room Objects CRUD', () => {
  it('追加でid/label/color/座標/サイズ設定', () => {
    const obj = addRoomObject('壁', '#ff0000', 200, 100)
    expect(obj.id).toBeTruthy()
    expect(obj.label).toBe('壁')
    expect(obj.color).toBe('#ff0000')
    expect(obj.w).toBe(200)
    expect(obj.h).toBe(100)
    expect(typeof obj.x).toBe('number')
    expect(typeof obj.y).toBe('number')
  })

  it('デフォルトcolor/w/h', () => {
    const obj = addRoomObject('柱')
    expect(obj.color).toBe('#4fc3f7')
    expect(obj.w).toBe(240)
    expect(obj.h).toBe(130)
  })

  it('更新', () => {
    const obj = addRoomObject('壁')
    const updated = updateRoomObject(obj.id, { label: '大壁', w: 500 })
    expect(updated.label).toBe('大壁')
    expect(updated.w).toBe(500)
    expect(updated.color).toBe('#4fc3f7') // 他フィールド保持
  })

  it('存在しないID→null', () => {
    expect(updateRoomObject('no-such', { label: 'x' })).toBeNull()
  })

  it('削除', () => {
    const o1 = addRoomObject('A')
    const o2 = addRoomObject('B')
    deleteRoomObject(o1.id)
    const remaining = getRoomObjects()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(o2.id)
  })
})
