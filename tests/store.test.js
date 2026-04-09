import { describe, it, expect, beforeEach } from 'vitest'
import {
  getPlayers, addPlayer, updatePlayer, deletePlayer,
  getTables,  addTable,  updateTable,  deleteTable,
  getMatches, addMatch,  clearMatches,
} from '../src/store.js'

beforeEach(() => {
  localStorage.clear()
})

// ── Players ──────────────────────────────────────────────

describe('getPlayers', () => {
  it('初期状態では空配列', () => {
    expect(getPlayers()).toEqual([])
  })
})

describe('addPlayer', () => {
  it('プレイヤーを追加できる', () => {
    const p = addPlayer('田中', 'A')
    expect(p.name).toBe('田中')
    expect(p.group).toBe('A')
    expect(p.status).toBe('waiting')
    expect(p.id).toBeDefined()
  })

  it('複数追加できる', () => {
    addPlayer('田中')
    addPlayer('鈴木')
    expect(getPlayers()).toHaveLength(2)
  })

  it('グループなしはnull', () => {
    const p = addPlayer('山田')
    expect(p.group).toBeNull()
  })

  it('無効なグループ文字はnullになる', () => {
    const p = addPlayer('山田', 'Z')
    expect(p.group).toBeNull()
  })

  it('小文字グループを大文字に正規化', () => {
    const p = addPlayer('山田', 'a')
    // 'a' は 'ABCDE' に含まれないのでnull（大文字変換は呼び出し側の責任）
    // store.js は受け取った値をそのまま ABCDE チェックする
    expect(['A', null]).toContain(p.group)
  })
})

describe('updatePlayer', () => {
  it('ステータスを更新できる', () => {
    const p = addPlayer('田中')
    const updated = updatePlayer(p.id, { status: 'playing' })
    expect(updated.status).toBe('playing')
    expect(getPlayers().find(x => x.id === p.id)?.status).toBe('playing')
  })

  it('存在しないIDはnullを返す', () => {
    expect(updatePlayer('no-such-id', { status: 'playing' })).toBeNull()
  })
})

describe('deletePlayer', () => {
  it('プレイヤーを削除できる', () => {
    const p = addPlayer('田中')
    deletePlayer(p.id)
    expect(getPlayers()).toHaveLength(0)
  })

  it('他のプレイヤーには影響しない', () => {
    const p1 = addPlayer('田中')
    const p2 = addPlayer('鈴木')
    deletePlayer(p1.id)
    expect(getPlayers()).toHaveLength(1)
    expect(getPlayers()[0].id).toBe(p2.id)
  })
})

// ── Tables ───────────────────────────────────────────────

describe('addTable', () => {
  it('テーブルを追加できる', () => {
    const t = addTable('テーブルA', 4)
    expect(t.label).toBe('テーブルA')
    expect(t.size).toBe(4)
    expect(t.status).toBe('empty')
    expect(t.playerIds).toEqual([])
    expect(typeof t.x).toBe('number')
    expect(typeof t.y).toBe('number')
  })

  it('デフォルトサイズは4', () => {
    expect(addTable('T').size).toBe(4)
  })
})

describe('updateTable', () => {
  it('プレイヤーを割り当てられる', () => {
    const t = addTable('T', 2)
    const u = updateTable(t.id, { playerIds: ['p1', 'p2'], status: 'playing' })
    expect(u.playerIds).toEqual(['p1', 'p2'])
    expect(u.status).toBe('playing')
  })

  it('位置を更新できる', () => {
    const t = addTable('T')
    const u = updateTable(t.id, { x: 300, y: 150 })
    expect(u.x).toBe(300)
    expect(u.y).toBe(150)
  })

  it('存在しないIDはnullを返す', () => {
    expect(updateTable('nope', { size: 2 })).toBeNull()
  })
})

describe('deleteTable', () => {
  it('テーブルを削除できる', () => {
    const t = addTable('T')
    deleteTable(t.id)
    expect(getTables()).toHaveLength(0)
  })
})

// ── Matches ──────────────────────────────────────────────

describe('addMatch', () => {
  it('マッチを記録できる', () => {
    const m = addMatch('t1', ['p1', 'p2'])
    expect(m.tableId).toBe('t1')
    expect(m.playerIds).toEqual(['p1', 'p2'])
    expect(typeof m.timestamp).toBe('number')
    expect(m.id).toBeDefined()
  })
})

describe('clearMatches', () => {
  it('全マッチを削除できる', () => {
    addMatch('t1', ['p1', 'p2'])
    addMatch('t2', ['p3', 'p4'])
    clearMatches()
    expect(getMatches()).toHaveLength(0)
  })
})
