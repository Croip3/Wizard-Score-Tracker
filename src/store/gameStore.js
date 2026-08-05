import { computed, reactive } from 'vue'
import { GameStatus, RoundPhase } from '../db/index.js'
import * as repo from '../db/repository.js'
import {
  MAX_CARDS_PER_ROUND,
  buildStandings,
  calculatePoints,
  dealerForRound,
  determineWinners
} from '../lib/rules.js'

/**
 * Zentraler Spielzustand. Alle Änderungen werden sofort nach IndexedDB
 * geschrieben, damit ein Reload (oder ein geschlossener Browser-Tab) mitten in
 * der Runde nichts verliert.
 */
const state = reactive({
  ready: false,
  view: 'home',
  game: null,
  players: [],
  rounds: [],
  // ID des noch laufenden Spiels – auch dann gesetzt, wenn gerade ein anderes
  // (abgeschlossenes) Spiel zur Ansicht geladen ist.
  runningGameId: null,
  error: null
})

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

function reportError(error) {
  console.error(error)
  state.error = error?.message ?? String(error)
}

/* ---------------------------------------------------------- abgeleitet */

const finishedRounds = computed(() => state.rounds.filter((round) => round.phase === RoundPhase.DONE))

const currentRound = computed(
  () => state.rounds.find((round) => round.phase !== RoundPhase.DONE) ?? null
)

const totals = computed(() => {
  const result = {}
  for (const player of state.players) result[player.id] = 0
  for (const round of finishedRounds.value) {
    for (const entry of round.entries) {
      result[entry.playerId] = (result[entry.playerId] ?? 0) + entry.points
    }
  }
  return result
})

const standings = computed(() => buildStandings(state.players, totals.value))

const winners = computed(() => determineWinners(state.players, totals.value))

const currentDealer = computed(() => {
  if (!currentRound.value) return null
  return state.players.find((player) => player.id === currentRound.value.dealerPlayerId) ?? null
})

const bidTotal = computed(() =>
  currentRound.value ? currentRound.value.entries.reduce((sum, entry) => sum + entry.bid, 0) : 0
)

const trickTotal = computed(() =>
  currentRound.value
    ? currentRound.value.entries.reduce((sum, entry) => sum + entry.tricksWon, 0)
    : 0
)

/** Stiche, die in der laufenden Runde noch zu verteilen sind. */
const tricksRemaining = computed(() =>
  currentRound.value ? currentRound.value.cardCount - trickTotal.value : 0
)

/* ------------------------------------------------------------- Aktionen */

/** Beim App-Start ein noch laufendes Spiel fortsetzen. */
async function init() {
  try {
    const running = await repo.findRunningGame()
    if (running) {
      state.runningGameId = running.id
      await loadGameIntoState(running.id)
      state.view = 'game'
    }
  } catch (error) {
    reportError(error)
  } finally {
    state.ready = true
  }
}

/** Laufendes Spiel wieder in den Vordergrund holen. */
async function resumeRunningGame() {
  if (!state.runningGameId) return
  try {
    if (state.game?.id !== state.runningGameId) {
      if (!(await loadGameIntoState(state.runningGameId))) {
        state.runningGameId = null
        return
      }
    }
    goTo('game')
  } catch (error) {
    reportError(error)
  }
}

async function loadGameIntoState(gameId) {
  const loaded = await repo.loadGame(gameId)
  if (!loaded) return false
  state.game = loaded.game
  state.players = loaded.players
  state.rounds = loaded.rounds
  return true
}

function goTo(view) {
  state.error = null
  state.view = view
}

/**
 * Neues Spiel starten.
 *
 * @param {string[]} names Spielernamen in Sitzreihenfolge
 */
async function startGame(names) {
  try {
    await closeRunningGames()
    const players = await repo.ensurePlayers(names)
    const game = await repo.createGame(players.map((player) => player.id))
    state.game = game
    state.players = players
    state.rounds = []
    state.runningGameId = game.id
    await addRound(1, 1)
    goTo('game')
  } catch (error) {
    reportError(error)
  }
}

/**
 * Noch offene Spiele abschließen, damit beim Start eines neuen Spiels keine
 * Karteileichen im Status „läuft“ zurückbleiben.
 */
async function closeRunningGames() {
  const running = await repo.listRunningGames()
  for (const game of running) {
    const loaded = await repo.loadGame(game.id)
    if (!loaded) continue

    const pending = loaded.rounds.find((round) => round.phase !== RoundPhase.DONE)
    if (pending) await repo.deleteRound(pending.id)

    const playedRounds = loaded.rounds.filter((round) => round.phase === RoundPhase.DONE)
    const gameTotals = {}
    for (const round of playedRounds) {
      for (const entry of round.entries) {
        gameTotals[entry.playerId] = (gameTotals[entry.playerId] ?? 0) + entry.points
      }
    }
    const winnerIds = playedRounds.length
      ? determineWinners(loaded.players, gameTotals).map((player) => player.id)
      : []
    await repo.finishGame(game.id, winnerIds)
  }
  state.runningGameId = null
}

async function addRound(roundNumber, cardCount) {
  const dealer = dealerForRound(state.players, roundNumber)
  const round = await repo.createRound({
    gameId: state.game.id,
    roundNumber,
    cardCount,
    dealerPlayerId: dealer.id,
    playerIds: state.players.map((player) => player.id)
  })
  state.rounds.push(round)
  return round
}

/** Kartenanzahl der laufenden Runde setzen (Ansagen/Stiche werden mitgeführt). */
async function setCardCount(value) {
  const round = currentRound.value
  if (!round) return
  const cardCount = clamp(Math.round(value), 1, MAX_CARDS_PER_ROUND)
  if (cardCount === round.cardCount) return
  round.cardCount = cardCount

  try {
    await repo.updateRound(round.id, { cardCount })
    // Ansagen/Stiche, die über der neuen Kartenzahl liegen, nachziehen.
    for (const entry of round.entries) {
      const changes = {}
      if (entry.bid > cardCount) changes.bid = cardCount
      if (entry.tricksWon > cardCount) changes.tricksWon = cardCount
      if (Object.keys(changes).length > 0) {
        Object.assign(entry, changes)
        await repo.updateEntry(entry.id, changes)
      }
    }
  } catch (error) {
    reportError(error)
  }
}

function entryFor(playerId) {
  return currentRound.value?.entries.find((entry) => entry.playerId === playerId) ?? null
}

async function setBid(playerId, value) {
  const round = currentRound.value
  const entry = entryFor(playerId)
  if (!round || !entry) return
  const bid = clamp(Math.round(value), 0, round.cardCount)
  if (bid === entry.bid) return
  entry.bid = bid
  try {
    await repo.updateEntry(entry.id, { bid })
  } catch (error) {
    reportError(error)
  }
}

async function setTricks(playerId, value) {
  const round = currentRound.value
  const entry = entryFor(playerId)
  if (!round || !entry) return
  const tricksWon = clamp(Math.round(value), 0, round.cardCount)
  if (tricksWon === entry.tricksWon) return
  entry.tricksWon = tricksWon
  try {
    await repo.updateEntry(entry.id, { tricksWon })
  } catch (error) {
    reportError(error)
  }
}

/** Stiche eines Spielers auf 0 zurücksetzen. */
async function resetTricks(playerId) {
  await setTricks(playerId, 0)
}

/** Stiche aller Spieler auf 0 zurücksetzen. */
async function resetAllTricks() {
  const round = currentRound.value
  if (!round) return
  for (const entry of round.entries) {
    await setTricks(entry.playerId, 0)
  }
}

/** Von der Ansage- in die Stich-Phase wechseln. */
async function confirmBids() {
  const round = currentRound.value
  if (!round) return
  round.phase = RoundPhase.TRICKS
  try {
    await repo.updateRound(round.id, { phase: RoundPhase.TRICKS })
  } catch (error) {
    reportError(error)
  }
}

/** Zurück zur Ansage (Tippfehler korrigieren). */
async function backToBidding() {
  const round = currentRound.value
  if (!round) return
  round.phase = RoundPhase.BIDDING
  try {
    await repo.updateRound(round.id, { phase: RoundPhase.BIDDING })
  } catch (error) {
    reportError(error)
  }
}

/**
 * Runde abschließen: Punkte berechnen, speichern und die nächste Runde
 * vorbereiten. Die Summe der Stiche muss der Kartenanzahl entsprechen.
 */
async function completeRound() {
  const round = currentRound.value
  if (!round) return false
  if (trickTotal.value !== round.cardCount) {
    state.error = `Es müssen genau ${round.cardCount} Stiche verteilt werden.`
    return false
  }

  try {
    const updates = round.entries.map((entry) => {
      entry.points = calculatePoints(entry.bid, entry.tricksWon)
      return { id: entry.id, points: entry.points }
    })
    await repo.updateEntries(updates)

    const completedAt = new Date().toISOString()
    round.phase = RoundPhase.DONE
    round.completedAt = completedAt
    await repo.updateRound(round.id, { phase: RoundPhase.DONE, completedAt })

    // Übliche Voreinstellung: eine Karte mehr als in der Vorrunde.
    const nextCardCount = clamp(round.cardCount + 1, 1, MAX_CARDS_PER_ROUND)
    await addRound(round.roundNumber + 1, nextCardCount)
    state.error = null
    return true
  } catch (error) {
    reportError(error)
    return false
  }
}

/** Spiel beenden und zur Auswertung wechseln. */
async function endGame() {
  if (!state.game) return
  try {
    // Die vorbereitete, noch nicht gespielte Runde nicht mitspeichern.
    const pending = currentRound.value
    if (pending) {
      await repo.deleteRound(pending.id)
      state.rounds = state.rounds.filter((round) => round.id !== pending.id)
    }

    const winnerIds = winners.value.map((player) => player.id)
    const endedAt = await repo.finishGame(state.game.id, winnerIds)
    state.game.status = GameStatus.FINISHED
    state.game.endedAt = endedAt
    state.game.winnerPlayerIds = winnerIds
    if (state.runningGameId === state.game.id) state.runningGameId = null
    goTo('summary')
  } catch (error) {
    reportError(error)
  }
}

/** Spielzustand verwerfen und zurück zum Start. */
function clearGame() {
  state.game = null
  state.players = []
  state.rounds = []
  goTo('home')
}

/** Abgeschlossenes Spiel aus der Statistik heraus öffnen. */
async function openGameSummary(gameId) {
  try {
    if (await loadGameIntoState(gameId)) {
      goTo('summary')
    }
  } catch (error) {
    reportError(error)
  }
}

/** Spiel aus der Datenbank entfernen. */
async function removeGame(gameId) {
  try {
    await repo.deleteGame(gameId)
    if (state.runningGameId === gameId) state.runningGameId = null
    if (state.game?.id === gameId) clearGame()
  } catch (error) {
    reportError(error)
  }
}

export function useGame() {
  return {
    state,
    // abgeleitete Werte
    currentRound,
    currentDealer,
    finishedRounds,
    totals,
    standings,
    winners,
    bidTotal,
    trickTotal,
    tricksRemaining,
    // Aktionen
    init,
    goTo,
    startGame,
    resumeRunningGame,
    setCardCount,
    setBid,
    setTricks,
    resetTricks,
    resetAllTricks,
    confirmBids,
    backToBidding,
    completeRound,
    endGame,
    clearGame,
    openGameSummary,
    removeGame
  }
}
