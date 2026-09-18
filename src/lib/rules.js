/**
 * Spielregeln für Wizard in drei Spielmodi.
 *
 * "F&E Version" (Hausvariante, abgeleitet von Stiche-Raten):
 *   - Jeder gewonnene Stich zählt 1 Punkt.
 *   - Wer seine Ansage trifft, bekommt zusätzlich 5 Bonuspunkte.
 *   - Wer verfehlt, verliert nur den Bonus – kein Punktabzug.
 *   - Die Summe der Ansagen darf nicht der Kartenanzahl entsprechen.
 *
 * "Classic Wizard" (offizielle Wertung, freie Rundenfolge):
 *   - Ansage getroffen: 20 Punkte + 10 Punkte pro gewonnenem Stich.
 *   - Ansage verfehlt: 10 Minuspunkte pro Stich Abweichung.
 *   - Keine Einschränkung für die Summe der Ansagen.
 *
 * "Amigo Wizard" (offizielle Regeln der Amigo-Ausgabe):
 *   - Wertung wie Classic Wizard.
 *   - Runde 1 wird mit einer Karte gespielt, danach je eine Karte mehr.
 *   - Das Deck hat 60 Karten, gespielt werden 60 ÷ Spieleranzahl Runden;
 *     danach ist das Spiel zu Ende.
 *
 * Die Punktwerte sind bewusst fest codiert – sie sind nicht konfigurierbar.
 */

/** Verfügbare Spielmodi. */
export const GameMode = Object.freeze({
  FE: 'fe',
  CLASSIC: 'classic',
  AMIGO: 'amigo'
})

/* --- F&E Version --- */

/** Fester Bonus für eine korrekt angesagte Stichzahl. */
export const BONUS_POINTS = 5

/** Punkte pro gewonnenem Stich. */
export const POINTS_PER_TRICK = 1

/* --- Classic Wizard und Amigo Wizard --- */

/** Grundpunkte für eine korrekt angesagte Stichzahl. */
export const CLASSIC_BONUS_POINTS = 20

/** Punkte pro gewonnenem Stich bei getroffener Ansage. */
export const CLASSIC_POINTS_PER_TRICK = 10

/** Minuspunkte pro Stich Abweichung bei verfehlter Ansage. */
export const CLASSIC_PENALTY_PER_TRICK = 10

/** Kartenanzahl eines Wizard-Decks (52 Zahlenkarten, 4 Zauberer, 4 Narren). */
export const DECK_SIZE = 60

/** Beschreibung der Modi für die Anzeige. */
export const GAME_MODES = [
  {
    id: GameMode.FE,
    name: 'F&E Version',
    shortName: 'F&E',
    hitRule: `${BONUS_POINTS} Punkte + ${POINTS_PER_TRICK} je Stich`,
    missRule: 'nur der Bonus entfällt, kein Abzug',
    extraRule: 'Ansagen dürfen nicht genau die Kartenanzahl ergeben'
  },
  {
    id: GameMode.CLASSIC,
    name: 'Classic Wizard',
    shortName: 'Classic',
    hitRule: `${CLASSIC_BONUS_POINTS} Punkte + ${CLASSIC_POINTS_PER_TRICK} je Stich`,
    missRule: `${CLASSIC_PENALTY_PER_TRICK} Minuspunkte je Stich Abweichung`,
    extraRule: 'Ansagen sind frei, Kartenanzahl wie in der F&E Version wählbar'
  },
  {
    id: GameMode.AMIGO,
    name: 'Amigo Wizard',
    shortName: 'Amigo',
    hitRule: `${CLASSIC_BONUS_POINTS} Punkte + ${CLASSIC_POINTS_PER_TRICK} je Stich`,
    missRule: `${CLASSIC_PENALTY_PER_TRICK} Minuspunkte je Stich Abweichung`,
    extraRule: `Offizielle Rundenfolge: ab 1 Karte aufsteigend, ${DECK_SIZE} ÷ Spieler Runden`
  }
]

/**
 * Beschreibung eines Modus; unbekannte oder fehlende Werte (Spiele aus
 * früheren Versionen) fallen auf die F&E Version zurück.
 */
export function describeMode(mode) {
  return GAME_MODES.find((entry) => entry.id === mode) ?? GAME_MODES[0]
}

/** Modi, die nach der offiziellen Wizard-Wertung rechnen. */
function usesClassicScoring(mode) {
  return mode === GameMode.CLASSIC || mode === GameMode.AMIGO
}

/**
 * Anzahl der Runden eines Spiels.
 *
 * @param {string} mode Spielmodus
 * @param {number} playerCount Anzahl Spieler
 * @returns {number|null} Feste Rundenzahl, oder `null` wenn das Spiel läuft,
 *   bis es von Hand beendet wird.
 */
export function totalRounds(mode, playerCount) {
  if (mode !== GameMode.AMIGO) return null
  if (!Number.isInteger(playerCount) || playerCount < 1) {
    throw new RangeError('Es muss mindestens einen Spieler geben.')
  }
  return Math.max(Math.floor(DECK_SIZE / playerCount), 1)
}

/** Maximale Anzahl Spieler pro Spiel. */
export const MAX_PLAYERS = 6

/** Minimale Anzahl Spieler pro Spiel. */
export const MIN_PLAYERS = 2

/** Obergrenze für die Kartenanzahl einer Runde (bewusst großzügig gewählt). */
export const MAX_CARDS_PER_ROUND = 30

/**
 * Karten pro Spieler in der ersten Runde. Von hier wird Runde für Runde
 * heruntergezählt; der Wert lässt sich beim Spielstart und in jeder Runde
 * von Hand anpassen. In Amigo Wizard beginnt jedes Spiel mit einer Karte.
 */
export const DEFAULT_START_CARD_COUNT = 6

/**
 * Kartenanzahl der ersten Runde.
 *
 * @param {string} mode Spielmodus
 * @param {number} chosenCardCount Im Setup gewählter Wert (außer bei Amigo)
 */
export function firstCardCount(mode, chosenCardCount = DEFAULT_START_CARD_COUNT) {
  return mode === GameMode.AMIGO ? 1 : chosenCardCount
}

/**
 * Kartenanzahl der Folgerunde: in Amigo Wizard eine Karte mehr als in der
 * Vorrunde, sonst eine weniger (mindestens aber eine).
 *
 * @param {number} cardCount Kartenanzahl der abgeschlossenen Runde
 * @param {string} mode Spielmodus
 */
export function nextCardCount(cardCount, mode = GameMode.FE) {
  if (mode === GameMode.AMIGO) {
    return Math.min(cardCount + 1, MAX_CARDS_PER_ROUND)
  }
  return Math.max(cardCount - 1, 1)
}

/**
 * Nur in der F&E Version darf die Summe aller Ansagen nicht genau der
 * Kartenanzahl entsprechen – mindestens ein Spieler muss seine Ansage
 * verfehlen. Die Wizard-Modi kennen diese Einschränkung nicht.
 *
 * @param {number} bidTotal Summe aller Ansagen
 * @param {number} cardCount Karten in dieser Runde
 * @param {string} mode Spielmodus
 */
export function bidsAreAllowed(bidTotal, cardCount, mode = GameMode.FE) {
  if (usesClassicScoring(mode)) return true
  return bidTotal !== cardCount
}

/**
 * Punkte eines Spielers für eine Runde.
 *
 * @param {number} bid Angesagte Stiche
 * @param {number} tricksWon Tatsächlich gewonnene Stiche
 * @param {string} mode Spielmodus
 * @returns {number} Rundenpunkte (in den Wizard-Modi auch negativ)
 */
export function calculatePoints(bid, tricksWon, mode = GameMode.FE) {
  if (!Number.isInteger(bid) || !Number.isInteger(tricksWon)) {
    throw new TypeError('Ansage und Stiche müssen ganze Zahlen sein.')
  }
  if (bid < 0 || tricksWon < 0) {
    throw new RangeError('Ansage und Stiche dürfen nicht negativ sein.')
  }

  const hit = bid === tricksWon

  if (usesClassicScoring(mode)) {
    return hit
      ? CLASSIC_BONUS_POINTS + tricksWon * CLASSIC_POINTS_PER_TRICK
      : -Math.abs(bid - tricksWon) * CLASSIC_PENALTY_PER_TRICK
  }

  const trickPoints = tricksWon * POINTS_PER_TRICK
  return hit ? BONUS_POINTS + trickPoints : trickPoints
}

/**
 * Losentscheid, wer die erste Runde austeilt.
 *
 * @param {number} playerCount Anzahl Spieler
 * @param {() => number} random Zufallsquelle (für Tests austauschbar)
 * @returns {number} Index in der Sitzreihenfolge
 */
export function pickRandomDealerIndex(playerCount, random = Math.random) {
  if (!Number.isInteger(playerCount) || playerCount < 1) {
    throw new RangeError('Es muss mindestens einen Spieler geben.')
  }
  return Math.floor(random() * playerCount) % playerCount
}

/**
 * Index des Gebers in der Sitzreihenfolge. Der Geber rotiert reihum, beginnend
 * beim ausgelosten Spieler der ersten Runde.
 *
 * @param {number} roundNumber 1-basierte Rundennummer
 * @param {number} playerCount Anzahl Spieler
 * @param {number} firstDealerIndex Geber der ersten Runde
 */
export function dealerIndexForRound(roundNumber, playerCount, firstDealerIndex = 0) {
  if (!Number.isInteger(playerCount) || playerCount < 1) {
    throw new RangeError('Es muss mindestens einen Spieler geben.')
  }
  return (firstDealerIndex + roundNumber - 1) % playerCount
}

/**
 * Geber einer Runde.
 *
 * @template {{ id: number }} P
 * @param {P[]} players Spieler in Sitzreihenfolge
 * @param {number} roundNumber 1-basierte Rundennummer
 * @param {number} firstDealerIndex Geber der ersten Runde
 * @returns {P}
 */
export function dealerForRound(players, roundNumber, firstDealerIndex = 0) {
  return players[dealerIndexForRound(roundNumber, players.length, firstDealerIndex)]
}

/**
 * Ansage-Reihenfolge einer Runde: links vom Geber wird begonnen, der Geber
 * sagt zuletzt an.
 *
 * @template {{ id: number }} P
 * @param {P[]} players Spieler in Sitzreihenfolge
 * @param {number} dealerPlayerId Geber dieser Runde
 * @returns {P[]}
 */
export function biddingOrder(players, dealerPlayerId) {
  const dealerIndex = players.findIndex((player) => player.id === dealerPlayerId)
  const firstToBid = dealerIndex === -1 ? 0 : dealerIndex + 1
  return players.map((_, i) => players[(firstToBid + i) % players.length])
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
