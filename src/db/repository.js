import { db, GameStatus, RoundPhase, toNameKey } from './index.js'

/* ------------------------------------------------------------------ Spieler */

/**
 * Legt Spieler an bzw. findet vorhandene über den normalisierten Namen wieder,
 * damit sich Statistiken über mehrere Spiele hinweg zusammenführen lassen.
 *
 * @param {string[]} names
 * @returns {Promise<{id: number, name: string}[]>} Spieler in Eingabereihenfolge
 */
export async function ensurePlayers(names) {
  return db.transaction('rw', db.players, async () => {
    const players = []
    for (const rawName of names) {
      const name = rawName.trim()
      const nameKey = toNameKey(name)
      const existing = await db.players.where('nameKey').equals(nameKey).first()
      if (existing) {
        // Schreibweise des letzten Spiels übernehmen.
        if (existing.name !== name) {
          await db.players.update(existing.id, { name })
        }
        players.push({ ...existing, name })
      } else {
        const id = await db.players.add({ name, nameKey, createdAt: new Date().toISOString() })
        players.push({ id, name, nameKey })
      }
    }
    return players
  })
}

/** Alle jemals verwendeten Spieler (für Schnellauswahl beim Spielstart). */
export async function listKnownPlayers() {
  const players = await db.players.toArray()
  return players.sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

/* ------------------------------------------------------------------- Spiele */

/**
 * Neues Spiel mit fester Sitzreihenfolge anlegen.
 *
 * @param {number[]} playerIds Spieler in Sitzreihenfolge
 * @param {number} firstDealerIndex Ausgeloster Geber der ersten Runde
 */
export async function createGame(playerIds, firstDealerIndex = 0) {
  const game = {
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: GameStatus.RUNNING,
    playerIds: [...playerIds],
    firstDealerIndex,
    winnerPlayerIds: []
  }
  game.id = await db.games.add(game)
  return game
}

/** Alle noch nicht abgeschlossenen Spiele, neuestes zuerst. */
export async function listRunningGames() {
  const running = await db.games.where('status').equals(GameStatus.RUNNING).toArray()
  return running.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

/** Laufendes Spiel (falls vorhanden), um es nach einem Neustart fortzusetzen. */
export async function findRunningGame() {
  const running = await listRunningGames()
  return running[0] ?? null
}

/**
 * Vollständiger Spielstand inklusive Runden und Einträgen.
 *
 * @returns {Promise<null | {game: object, players: object[], rounds: object[]}>}
 */
export async function loadGame(gameId) {
  const game = await db.games.get(gameId)
  if (!game) return null

  const [playerRows, roundRows, entryRows] = await Promise.all([
    db.players.bulkGet(game.playerIds),
    db.rounds.where('gameId').equals(gameId).toArray(),
    db.roundEntries.where('gameId').equals(gameId).toArray()
  ])

  // Sitzreihenfolge des Spiels beibehalten; gelöschte Spieler überspringen.
  const players = playerRows.filter(Boolean)
  const orderByPlayerId = new Map(game.playerIds.map((id, index) => [id, index]))

  const rounds = roundRows
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map((round) => ({
      ...round,
      entries: entryRows
        .filter((entry) => entry.roundId === round.id)
        .sort(
          (a, b) =>
            (orderByPlayerId.get(a.playerId) ?? 0) - (orderByPlayerId.get(b.playerId) ?? 0)
        )
    }))

  return { game, players, rounds }
}

/** Spiel abschließen und Gewinner festhalten. */
export async function finishGame(gameId, winnerPlayerIds) {
  const endedAt = new Date().toISOString()
  await db.games.update(gameId, {
    status: GameStatus.FINISHED,
    endedAt,
    winnerPlayerIds: [...winnerPlayerIds]
  })
  return endedAt
}

/** Spiel samt Runden und Einträgen löschen. */
export async function deleteGame(gameId) {
  await db.transaction('rw', db.games, db.rounds, db.roundEntries, async () => {
    await db.roundEntries.where('gameId').equals(gameId).delete()
    await db.rounds.where('gameId').equals(gameId).delete()
    await db.games.delete(gameId)
  })
}

/* ------------------------------------------------------------------ Runden */

/**
 * Neue Runde inklusive leerer Einträge (Ansage 0 / Stiche 0) anlegen.
 *
 * @returns {Promise<object>} Runde mit `entries`
 */
export async function createRound({ gameId, roundNumber, cardCount, dealerPlayerId, playerIds }) {
  return db.transaction('rw', db.rounds, db.roundEntries, async () => {
    const round = {
      gameId,
      roundNumber,
      cardCount,
      dealerPlayerId,
      phase: RoundPhase.BIDDING,
      completedAt: null
    }
    round.id = await db.rounds.add(round)

    const entries = playerIds.map((playerId) => ({
      roundId: round.id,
      gameId,
      playerId,
      bid: 0,
      tricksWon: 0,
      points: 0
    }))
    const ids = await db.roundEntries.bulkAdd(entries, { allKeys: true })
    entries.forEach((entry, index) => {
      entry.id = ids[index]
    })

    return { ...round, entries }
  })
}

export async function updateRound(roundId, changes) {
  await db.rounds.update(roundId, changes)
}

export async function updateEntry(entryId, changes) {
  await db.roundEntries.update(entryId, changes)
}

/** Mehrere Einträge in einer Transaktion speichern (Rundenabschluss). */
export async function updateEntries(updates) {
  await db.transaction('rw', db.roundEntries, async () => {
    for (const { id, ...changes } of updates) {
      await db.roundEntries.update(id, changes)
    }
  })
}

/** Noch nicht gespielte Runde verwerfen (z. B. beim Beenden des Spiels). */
export async function deleteRound(roundId) {
  await db.transaction('rw', db.rounds, db.roundEntries, async () => {
    await db.roundEntries.where('roundId').equals(roundId).delete()
    await db.rounds.delete(roundId)
  })
}

/* -------------------------------------------------------------- Statistiken */

/**
 * Kompakte Übersicht aller Spiele für die Statistik-Ansicht.
 *
 * @returns {Promise<object[]>} Neueste Spiele zuerst
 */
export async function listGameSummaries() {
  const games = await db.games.toArray()
  if (games.length === 0) return []

  const [players, rounds, entries] = await Promise.all([
    db.players.toArray(),
    db.rounds.toArray(),
    db.roundEntries.toArray()
  ])

  const playersById = new Map(players.map((player) => [player.id, player]))
  const doneRoundIds = new Set(
    rounds.filter((round) => round.phase === RoundPhase.DONE).map((round) => round.id)
  )

  return games
    .map((game) => {
      const gameEntries = entries.filter(
        (entry) => entry.gameId === game.id && doneRoundIds.has(entry.roundId)
      )
      const totals = {}
      const hits = {}
      const played = {}
      for (const entry of gameEntries) {
        totals[entry.playerId] = (totals[entry.playerId] ?? 0) + entry.points
        played[entry.playerId] = (played[entry.playerId] ?? 0) + 1
        if (entry.bid === entry.tricksWon) {
          hits[entry.playerId] = (hits[entry.playerId] ?? 0) + 1
        }
      }

      return {
        game,
        players: game.playerIds.map((id) => playersById.get(id)).filter(Boolean),
        roundsPlayed: rounds.filter(
          (round) => round.gameId === game.id && round.phase === RoundPhase.DONE
        ).length,
        totals,
        hits,
        played
      }
    })
    .sort((a, b) => b.game.startedAt.localeCompare(a.game.startedAt))
}

/**
 * Spielerstatistik über alle abgeschlossenen Spiele hinweg.
 */
export async function computePlayerStats() {
  const summaries = await listGameSummaries()
  const finished = summaries.filter((summary) => summary.game.status === GameStatus.FINISHED)

  const stats = new Map()
  const statFor = (player) => {
    if (!stats.has(player.id)) {
      stats.set(player.id, {
        player,
        games: 0,
        wins: 0,
        totalPoints: 0,
        rounds: 0,
        hits: 0,
        bestGame: null
      })
    }
    return stats.get(player.id)
  }

  for (const summary of finished) {
    for (const player of summary.players) {
      const stat = statFor(player)
      const points = summary.totals[player.id] ?? 0
      stat.games += 1
      stat.totalPoints += points
      stat.rounds += summary.played[player.id] ?? 0
      stat.hits += summary.hits[player.id] ?? 0
      if (stat.bestGame === null || points > stat.bestGame) {
        stat.bestGame = points
      }
      if (summary.game.winnerPlayerIds?.includes(player.id)) {
        stat.wins += 1
      }
    }
  }

  return [...stats.values()].sort(
    (a, b) => b.wins - a.wins || b.totalPoints - a.totalPoints || a.player.name.localeCompare(b.player.name, 'de')
  )
}
