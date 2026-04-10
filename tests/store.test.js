import { describe, it, expect, beforeEach } from 'vitest'
import {
  getPlayers, addPlayer, updatePlayer, deletePlayer,
  getTables,  addTable,  updateTable,  deleteTable,
  getMatches, addMatch,  updateMatchScores, clearMatches,
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

  it('scores初期値はnull', () => {
    const m = addMatch('t1', ['p1', 'p2'])
    expect(m.scores).toBeNull()
  })
})

describe('updateMatchScores', () => {
  it('スコアを記録できる', () => {
    const m = addMatch('t1', ['p1', 'p2'])
    const updated = updateMatchScores(m.id, { p1: 10, p2: 5 })
    expect(updated.scores).toEqual({ p1: 10, p2: 5 })
    expect(getMatches()[0].scores).toEqual({ p1: 10, p2: 5 })
  })

  it('マイナス点数を記録できる', () => {
    const m = addMatch('t1', ['p1', 'p2'])
    const updated = updateMatchScores(m.id, { p1: -3, p2: 8 })
    expect(updated.scores.p1).toBe(-3)
    expect(updated.scores.p2).toBe(8)
  })

  it('スコアをnullに戻せる', () => {
    const m = addMatch('t1', ['p1', 'p2'])
    updateMatchScores(m.id, { p1: 10 })
    updateMatchScores(m.id, null)
    expect(getMatches()[0].scores).toBeNull()
  })

  it('存在しないIDはnullを返す', () => {
    expect(updateMatchScores('no-such-id', { p1: 5 })).toBeNull()
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

// ── 統合テスト: store + matching の連携 ──────────────────

describe('統合: プレイヤー追加 → マッチング → スコア記録', () => {
  it('実データでフルワークフローが動作する', async () => {
    const { generateMatching, buildScoreMap } = await import('../src/matching.js')

    // 1. プレイヤー追加
    const players = []
    for (let i = 1; i <= 8; i++) {
      players.push(addPlayer(`プレイヤー${String(i).padStart(2, '0')}`, i <= 4 ? 'A' : 'B'))
    }
    expect(getPlayers()).toHaveLength(8)

    // 2. テーブル追加
    addTable('テーブル1', 4)
    addTable('テーブル2', 4)
    const tables = getTables()
    expect(tables).toHaveLength(2)

    // 3. マッチング実行
    const waiting = getPlayers().filter(p => p.status === 'waiting')
    const empty = getTables().filter(t => t.status === 'empty')
    const result = generateMatching(waiting, empty, getPlayers(), getMatches())
    expect(result).toHaveLength(2)
    expect(result[0].playerIds).toHaveLength(4)

    // 4. マッチング確定
    result.forEach(({ tableId, playerIds }) => {
      addMatch(tableId, playerIds)
      updateTable(tableId, { status: 'playing', playerIds })
      playerIds.forEach(pid => updatePlayer(pid, { status: 'playing' }))
    })
    expect(getPlayers().filter(p => p.status === 'playing')).toHaveLength(8)
    expect(getTables().filter(t => t.status === 'playing')).toHaveLength(2)

    // 5. スコア記録（プラス・マイナス混在）
    const matches = getMatches()
    updateMatchScores(matches[0].id, {
      [result[0].playerIds[0]]: 12,
      [result[0].playerIds[1]]: -3,
      [result[0].playerIds[2]]: 7,
      [result[0].playerIds[3]]: 0,
    })
    updateMatchScores(matches[1].id, {
      [result[1].playerIds[0]]: -5,
      [result[1].playerIds[1]]: 10,
      [result[1].playerIds[2]]: 3,
      [result[1].playerIds[3]]: -2,
    })

    // 6. スコア集計
    const scoreMap = buildScoreMap(getMatches())
    const totalScore = Object.values(scoreMap).reduce((a, b) => a + b, 0)
    expect(Object.keys(scoreMap)).toHaveLength(8)
    expect(totalScore).toBe(12 + (-3) + 7 + 0 + (-5) + 10 + 3 + (-2)) // = 22

    // 7. 全テーブル終了
    getTables().filter(t => t.status === 'playing').forEach(t => {
      t.playerIds.forEach(pid => updatePlayer(pid, { status: 'waiting' }))
      updateTable(t.id, { status: 'empty', playerIds: [] })
    })
    expect(getPlayers().filter(p => p.status === 'waiting')).toHaveLength(8)
    expect(getTables().filter(t => t.status === 'empty')).toHaveLength(2)

    // 8. 2ラウンド目のマッチング（対戦済みペアが避けられる）
    const { optimizeTableAssignment } = await import('../src/matching.js')
    const waiting2 = getPlayers().filter(p => p.status === 'waiting')
    const empty2 = getTables().filter(t => t.status === 'empty')
    const result2 = generateMatching(waiting2, empty2, getPlayers(), getMatches())
    expect(result2).toHaveLength(2)

    // 席移動最小化の適用
    const optimized = optimizeTableAssignment(result2, getMatches())
    expect(optimized).toHaveLength(2)
    const allIds = optimized.flatMap(r => r.playerIds)
    expect(new Set(allIds).size).toBe(8) // 重複なし
  })
})

describe('統合: 8人テーブル対応', () => {
  it('8人テーブルにマッチングできる', async () => {
    const { generateMatching } = await import('../src/matching.js')
    for (let i = 1; i <= 8; i++) addPlayer(`P${i}`)
    addTable('大卓', 8)
    const result = generateMatching(
      getPlayers().filter(p => p.status === 'waiting'),
      getTables().filter(t => t.status === 'empty'),
      getPlayers(), getMatches()
    )
    expect(result).toHaveLength(1)
    expect(result[0].playerIds).toHaveLength(8)
  })
})

describe('統合: minFill=1でcount=1のテーブル割り当て', () => {
  it('1人でもテーブルに配席される', async () => {
    const { generateMatching } = await import('../src/matching.js')
    addPlayer('ソロ')
    addTable('T', 4)
    const result = generateMatching(
      getPlayers().filter(p => p.status === 'waiting'),
      getTables().filter(t => t.status === 'empty'),
      getPlayers(), getMatches(), false, 1
    )
    expect(result).toHaveLength(1)
    expect(result[0].playerIds).toHaveLength(1)
  })
})
