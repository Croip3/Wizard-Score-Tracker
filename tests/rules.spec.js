import { describe, expect, it } from 'vitest'
import {
  BONUS_POINTS,
  MAX_CARDS_PER_ROUND,
  biddingOrder,
  buildStandings,
  calculatePoints,
  dealerForRound,
  dealerIndexForRound,
  determineWinners,
  nextCardCount,
  startingCardCount
} from '../src/lib/rules.js'

describe('calculatePoints', () => {
  it('gibt bei getroffener Ansage 5 Bonuspunkte plus einen Punkt je Stich', () => {
    expect(BONUS_POINTS).toBe(5)
    expect(calculatePoints(0, 0)).toBe(5)
    expect(calculatePoints(1, 1)).toBe(6)
    expect(calculatePoints(3, 3)).toBe(8)
    expect(calculatePoints(10, 10)).toBe(15)
  })

  it('wertet bei verfehlter Ansage nur die gewonnenen Stiche, ohne Bonus', () => {
    expect(calculatePoints(0, 1)).toBe(1)
    expect(calculatePoints(3, 1)).toBe(1)
    expect(calculatePoints(1, 4)).toBe(4)
    expect(calculatePoints(5, 0)).toBe(0)
  })

  it('zieht nie Punkte ab', () => {
    for (let bid = 0; bid <= 10; bid++) {
      for (let tricksWon = 0; tricksWon <= 10; tricksWon++) {
        expect(calculatePoints(bid, tricksWon)).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('weist ungültige Eingaben zurück', () => {
    expect(() => calculatePoints(1.5, 1)).toThrow(TypeError)
    expect(() => calculatePoints(-1, 0)).toThrow(RangeError)
    expect(() => calculatePoints(0, -2)).toThrow(RangeError)
  })
})

describe('Dealer-Rotation', () => {
  const players = [
    { id: 1, name: 'Anna' },
    { id: 2, name: 'Ben' },
    { id: 3, name: 'Cem' }
  ]

  it('startet beim ersten Spieler und rotiert reihum', () => {
    expect(dealerIndexForRound(1, 3)).toBe(0)
    expect(dealerIndexForRound(2, 3)).toBe(1)
    expect(dealerIndexForRound(3, 3)).toBe(2)
    expect(dealerIndexForRound(4, 3)).toBe(0)
  })

  it('liefert den passenden Spieler', () => {
    expect(dealerForRound(players, 1).name).toBe('Anna')
    expect(dealerForRound(players, 5).name).toBe('Ben')
  })

  it('lässt links vom Geber ansagen, der Geber ist zuletzt dran', () => {
    expect(biddingOrder(players, 1).map((player) => player.name)).toEqual(['Ben', 'Cem', 'Anna'])
    expect(biddingOrder(players, 2).map((player) => player.name)).toEqual(['Cem', 'Anna', 'Ben'])
  })
})

describe('Kartenanzahl je Runde', () => {
  it('schlägt so viele Startkarten vor, wie sich gleichmäßig austeilen lassen', () => {
    expect(startingCardCount(3)).toBe(20)
    expect(startingCardCount(4)).toBe(15)
    expect(startingCardCount(5)).toBe(12)
    expect(startingCardCount(6)).toBe(10)
  })

  it('bleibt innerhalb der erlaubten Kartenanzahl', () => {
    expect(startingCardCount(2)).toBeLessThanOrEqual(MAX_CARDS_PER_ROUND)
    expect(startingCardCount(60)).toBe(1)
    expect(() => startingCardCount(0)).toThrow(RangeError)
  })

  it('zählt Runde für Runde herunter und stoppt bei einer Karte', () => {
    expect(nextCardCount(10)).toBe(9)
    expect(nextCardCount(2)).toBe(1)
    expect(nextCardCount(1)).toBe(1)
  })

  it('ergibt eine absteigende Rundenfolge', () => {
    const counts = [startingCardCount(4)]
    for (let round = 1; round < 5; round++) counts.push(nextCardCount(counts.at(-1)))
    expect(counts).toEqual([15, 14, 13, 12, 11])
  })
})

describe('Endstand', () => {
  const players = [
    { id: 1, name: 'Anna' },
    { id: 2, name: 'Ben' },
    { id: 3, name: 'Cem' }
  ]

  it('sortiert nach Punkten und vergibt bei Gleichstand denselben Platz', () => {
    const standings = buildStandings(players, { 1: 12, 2: 12, 3: -3 })
    expect(standings.map((entry) => [entry.player.name, entry.rank])).toEqual([
      ['Anna', 1],
      ['Ben', 1],
      ['Cem', 3]
    ])
  })

  it('behandelt fehlende Punktestände als 0', () => {
    const standings = buildStandings(players, { 1: 4 })
    expect(standings.map((entry) => entry.total)).toEqual([4, 0, 0])
  })

  it('meldet bei Punktgleichheit mehrere Gewinner', () => {
    expect(determineWinners(players, { 1: 9, 2: 9, 3: 1 }).map((p) => p.name)).toEqual([
      'Anna',
      'Ben'
    ])
    expect(determineWinners(players, { 1: 9, 2: 3, 3: 1 }).map((p) => p.name)).toEqual(['Anna'])
  })
})

describe('Beispielrunde', () => {
  it('rechnet eine komplette Runde korrekt ab', () => {
    // 4 Karten, Ansagen 2/1/1/0, tatsächlich 2/0/1/1
    const round = [
      { bid: 2, tricksWon: 2 },
      { bid: 1, tricksWon: 0 },
      { bid: 1, tricksWon: 1 },
      { bid: 0, tricksWon: 1 }
    ]
    const points = round.map((entry) => calculatePoints(entry.bid, entry.tricksWon))
    expect(points).toEqual([7, 0, 6, 1])
    expect(round.reduce((sum, entry) => sum + entry.tricksWon, 0)).toBe(4)
  })
})
