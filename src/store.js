/**
 * store.js — localStorage を使ったデータ永続化層
 *
 * データモデル:
 *   Player  { id, name, group: 'A'|'B'|'C'|'D'|'E'|null, status: 'waiting'|'playing'|'break'|'left' }
 *   Table   { id, label, size: 2|3|4, status: 'empty'|'playing', playerIds: string[], x, y }
 *   Match   { id, tableId, playerIds: string[], timestamp }
 */

const KEYS = {
  PLAYERS: 'mg_players',
  TABLES:  'mg_tables',
  MATCHES: 'mg_matches',
}

function load(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// ── Players ──────────────────────────────────────────────

export function getPlayers() {
  return load(KEYS.PLAYERS)
}

export function addPlayer(name, group = null) {
  const players = getPlayers()
  const player = {
    id: generateId(),
    name,
    group: group || null,
    status: 'waiting',
  }
  players.push(player)
  save(KEYS.PLAYERS, players)
  return player
}

export function updatePlayer(id, updates) {
  const players = getPlayers()
  const idx = players.findIndex(p => p.id === id)
  if (idx === -1) return null
  players[idx] = { ...players[idx], ...updates }
  save(KEYS.PLAYERS, players)
  return players[idx]
}

export function deletePlayer(id) {
  save(KEYS.PLAYERS, getPlayers().filter(p => p.id !== id))
}

// ── Tables ───────────────────────────────────────────────

export function getTables() {
  return load(KEYS.TABLES)
}

export function addTable(label, size = 4) {
  const tables = getTables()
  const table = {
    id: generateId(),
    label,
    size,
    status: 'empty',
    playerIds: [],
    x: 40 + (tables.length % 5) * 260,
    y: 40 + Math.floor(tables.length / 5) * 260,
  }
  tables.push(table)
  save(KEYS.TABLES, tables)
  return table
}

export function updateTable(id, updates) {
  const tables = getTables()
  const idx = tables.findIndex(t => t.id === id)
  if (idx === -1) return null
  tables[idx] = { ...tables[idx], ...updates }
  save(KEYS.TABLES, tables)
  return tables[idx]
}

export function deleteTable(id) {
  save(KEYS.TABLES, getTables().filter(t => t.id !== id))
}

// ── Matches ──────────────────────────────────────────────

export function getMatches() {
  return load(KEYS.MATCHES)
}

export function addMatch(tableId, playerIds) {
  const matches = getMatches()
  const match = {
    id: generateId(),
    tableId,
    playerIds,
    timestamp: Date.now(),
    scores: null,
  }
  matches.push(match)
  save(KEYS.MATCHES, matches)
  return match
}

export function updateMatchScores(matchId, scores) {
  const matches = getMatches()
  const idx = matches.findIndex(m => m.id === matchId)
  if (idx === -1) return null
  matches[idx].scores = scores
  save(KEYS.MATCHES, matches)
  return matches[idx]
}

export function clearMatches() {
  save(KEYS.MATCHES, [])
}
