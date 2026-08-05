/**
 * Spielregeln für "Stiche Raten" (Wizard-Variante).
 *
 * Wertung (Standardvariante, nur der Bonus ist von 10 auf 5 abgeändert):
 *   - Jeder gewonnene Stich zählt 1 Punkt.
 *   - Wer seine Ansage trifft, bekommt zusätzlich 5 Bonuspunkte.
 *   - Wer seine Ansage verfehlt, verliert nur den Bonus – Punktabzug gibt es
 *     nicht, der Punktestand kann also nie negativ werden.
 *
 * Die Bonuspunkte sind bewusst fest codiert – sie sind nicht konfigurierbar.
 */

/** Fester Bonus für eine korrekt angesagte Stichzahl. */
export const BONUS_POINTS = 5

/** Punkte pro gewonnenem Stich. */
export const POINTS_PER_TRICK = 1

/** Maximale Anzahl Spieler pro Spiel. */
export const MAX_PLAYERS = 6

/** Minimale Anzahl Spieler pro Spiel. */
export const MIN_PLAYERS = 2

/** Obergrenze für die Kartenanzahl einer Runde (bewusst großzügig gewählt). */
export const MAX_CARDS_PER_ROUND = 30

/** Kartenanzahl eines üblichen Wizard-Decks. */
export const DECK_SIZE = 60

/**
 * Kartenanzahl der ersten Runde: so viele Karten, wie sich gleichmäßig
 * austeilen lassen. Von dort wird Runde für Runde heruntergezählt.
 * Der Wert ist nur ein Vorschlag und lässt sich in jeder Runde anpassen.
 *
 * @param {number} playerCount Anzahl Spieler
 */
export function startingCardCount(playerCount) {
  if (!Number.isInteger(playerCount) || playerCount < 1) {
    throw new RangeError('Es muss mindestens einen Spieler geben.')
  }
  const perPlayer = Math.floor(DECK_SIZE / playerCount)
  return Math.min(Math.max(perPlayer, 1), MAX_CARDS_PER_ROUND)
}

/**
 * Kartenanzahl der Folgerunde: eine Karte weniger als in der Vorrunde,
 * mindestens aber eine.
 *
 * @param {number} cardCount Kartenanzahl der abgeschlossenen Runde
 */
export function nextCardCount(cardCount) {
  return Math.max(cardCount - 1, 1)
}

/**
 * Punkte eines Spielers für eine Runde.
 *
 * @param {number} bid Angesagte Stiche
 * @param {number} tricksWon Tatsächlich gewonnene Stiche
 * @returns {number} Rundenpunkte (nie negativ)
 */
export function calculatePoints(bid, tricksWon) {
  if (!Number.isInteger(bid) || !Number.isInteger(tricksWon)) {
    throw new TypeError('Ansage und Stiche müssen ganze Zahlen sein.')
  }
  if (bid < 0 || tricksWon < 0) {
    throw new RangeError('Ansage und Stiche dürfen nicht negativ sein.')
  }

  const trickPoints = tricksWon * POINTS_PER_TRICK
  return bid === tricksWon ? BONUS_POINTS + trickPoints : trickPoints
}

/**
 * Index des Gebers in der Sitzreihenfolge. Der Geber rotiert reihum: in Runde 1
 * gibt der erste Spieler der Liste, in Runde 2 der zweite usw.
 *
 * @param {number} roundNumber 1-basierte Rundennummer
 * @param {number} playerCount Anzahl Spieler
 */
export function dealerIndexForRound(roundNumber, playerCount) {
  if (!Number.isInteger(playerCount) || playerCount < 1) {
    throw new RangeError('Es muss mindestens einen Spieler geben.')
  }
  return (roundNumber - 1) % playerCount
}

/**
 * Geber einer Runde.
 *
 * @template {{ id: number }} P
 * @param {P[]} players Spieler in Sitzreihenfolge
 * @param {number} roundNumber 1-basierte Rundennummer
 * @returns {P}
 */
export function dealerForRound(players, roundNumber) {
  return players[dealerIndexForRound(roundNumber, players.length)]
}

/**
 * Ansage-Reihenfolge einer Runde: links vom Geber wird begonnen, der Geber
 * sagt zuletzt an.
 *
 * @template {{ id: number }} P
 * @param {P[]} players Spieler in Sitzreihenfolge
 * @param {number} roundNumber 1-basierte Rundennummer
 * @returns {P[]}
 */
export function biddingOrder(players, roundNumber) {
  const dealerIndex = dealerIndexForRound(roundNumber, players.length)
  return players.map((_, i) => players[(dealerIndex + 1 + i) % players.length])
}

/**
 * Endstand eines Spiels: Spieler nach Punkten absteigend sortiert, inklusive
 * Platzierung. Punktgleiche Spieler teilen sich einen Platz.
 *
 * @param {{ id: number, name: string }[]} players
 * @param {Record<number, number>} totals Punkte je Spieler-ID
 */
export function buildStandings(players, totals) {
  const sorted = [...players]
    .map((player) => ({ player, total: totals[player.id] ?? 0 }))
    .sort((a, b) => b.total - a.total || a.player.name.localeCompare(b.player.name, 'de'))

  let lastTotal = null
  let lastRank = 0
  return sorted.map((entry, index) => {
    const rank = entry.total === lastTotal ? lastRank : index + 1
    lastTotal = entry.total
    lastRank = rank
    return { ...entry, rank }
  })
}

/**
 * Gewinner eines Spiels (mehrere bei Punktgleichheit).
 *
 * @param {{ id: number, name: string }[]} players
 * @param {Record<number, number>} totals Punkte je Spieler-ID
 */
export function determineWinners(players, totals) {
  const standings = buildStandings(players, totals)
  return standings.filter((entry) => entry.rank === 1).map((entry) => entry.player)
}
