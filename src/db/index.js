import Dexie from 'dexie'

/**
 * Offline-Datenbank (IndexedDB via Dexie).
 *
 * players      { id, name, nameKey, createdAt }
 * games        { id, startedAt, endedAt, status, playerIds, winnerPlayerIds }
 * rounds       { id, gameId, roundNumber, cardCount, dealerPlayerId, phase, completedAt }
 * roundEntries { id, roundId, gameId, playerId, bid, tricksWon, points }
 *
 * `gameId` liegt zusätzlich auf roundEntries, damit die Statistik alle
 * Einträge eines Spiels ohne Umweg über die Runden laden kann.
 */
// Der Datenbankname bleibt bewusst unverändert, damit Spiele aus älteren
// Versionen der App erhalten bleiben.
export const db = new Dexie('stiche-raten')

db.version(1).stores({
  players: '++id, &nameKey, name',
  games: '++id, status, startedAt',
  rounds: '++id, gameId, [gameId+roundNumber]',
  roundEntries: '++id, roundId, gameId, playerId, [roundId+playerId]'
})

export const GameStatus = Object.freeze({
  RUNNING: 'running',
  FINISHED: 'finished'
})

export const RoundPhase = Object.freeze({
  BIDDING: 'bidding',
  TRICKS: 'tricks',
  DONE: 'done'
})

/** Normalisierter Name, über den Spieler zwischen Spielen wiedererkannt werden. */
export function toNameKey(name) {
  return name.trim().toLowerCase()
}
