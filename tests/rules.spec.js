import { describe, expect, it } from 'vitest'
import {
  BONUS_POINTS,
  DEFAULT_START_CARD_COUNT,
  GameMode,
  MAX_CARDS_PER_ROUND,
  biddingOrder,
  bidsAreAllowed,
  buildStandings,
  calculatePoints,
  dealerForRound,
  dealerIndexForRound,
  describeMode,
  determineWinners,
  firstCardCount,
  nextCardCount,
  pickRandomDealerIndex,
  totalRounds
} from '../src/lib/rules.js'

describe('calculatePoints · Classic Wizard', () => {
  const classic = (bid, tricksWon) => calculatePoints(bid, tricksWon, GameMode.CLASSIC)

  it('gibt bei getroffener Ansage 20 Punkte plus 10 je Stich', () => {
    expect(classic(0, 0)).toBe(20)
    expect(classic(1, 1)).toBe(30)
    expect(classic(3, 3)).toBe(50)
    expect(classic(6, 6)).toBe(80)
  })

  it('zieht bei verfehlter Ansage 10 Punkte je Stich Abweichung ab', () => {
    expect(classic(0, 1)).toBe(-10)
    expect(classic(3, 1)).toBe(-20)
    expect(classic(1, 4)).toBe(-30)
    expect(classic(5, 0)).toBe(-50)
  })

  it('unterscheidet sich von der F&E Version', () => {
    expect(calculatePoints(3, 3, GameMode.FE)).toBe(8)
    expect(calculatePoints(3, 3, GameMode.CLASSIC)).toBe(50)
    expect(calculatePoints(3, 1, GameMode.FE)).toBe(1)
    expect(calculatePoints(3, 1, GameMode.CLASSIC)).toBe(-20)
  })
})

describe('Amigo Wizard', () => {
  it('rechnet wie Classic Wizard', () => {
    for (const bid of [0, 1, 3, 6]) {
      for (const tricks of [0, 1, 3, 6]) {
        expect(calculatePoints(bid, tricks, GameMode.AMIGO)).toBe(
          calculatePoints(bid, tricks, GameMode.CLASSIC)
        )
      }
    }
    expect(calculatePoints(3, 3, GameMode.AMIGO)).toBe(50)
    expect(calculatePoints(3, 1, GameMode.AMIGO)).toBe(-20)
  })

  it('kennt keine Zwangsverfehlung', () => {
    expect(bidsAreAllowed(6, 6, GameMode.AMIGO)).toBe(true)
  })

  it('spielt 60 ÷ Spieleranzahl Runden', () => {
    expect(totalRounds(GameMode.AMIGO, 3)).toBe(20)
    expect(totalRounds(GameMode.AMIGO, 4)).toBe(15)
    expect(totalRounds(GameMode.AMIGO, 5)).toBe(12)
    expect(totalRounds(GameMode.AMIGO, 6)).toBe(10)
  })

  it('lässt die anderen Modi offen laufen', () => {
    expect(totalRounds(GameMode.FE, 4)).toBeNull()
    expect(totalRounds(GameMode.CLASSIC, 4)).toBeNull()
  })

  it('startet mit einer Karte und zählt aufwärts', () => {
    expect(firstCardCount(GameMode.AMIGO, 6)).toBe(1)
    expect(firstCardCount(GameMode.CLASSIC, 6)).toBe(6)
    expect(firstCardCount(GameMode.FE, 9)).toBe(9)

    expect(nextCardCount(1, GameMode.AMIGO)).toBe(2)
    expect(nextCardCount(9, GameMode.AMIGO)).toBe(10)
    expect(nextCardCount(MAX_CARDS_PER_ROUND, GameMode.AMIGO)).toBe(MAX_CARDS_PER_ROUND)
  })

  it('ergibt die offizielle Rundenfolge für vier Spieler', () => {
    const rounds = totalRounds(GameMode.AMIGO, 4)
    const counts = [firstCardCount(GameMode.AMIGO)]
    for (let round = 1; round < rounds; round++) {
      counts.push(nextCardCount(counts.at(-1), GameMode.AMIGO))
    }
    expect(counts).toHaveLength(15)
    expect(counts[0]).toBe(1)
    expect(counts.at(-1)).toBe(15)
    expect(counts.reduce((sum, count) => sum + count * 4, 0)).toBe(480)
  })
})

describe('describeMode', () => {
  it('findet beide Modi und fällt sonst auf die F&E Version zurück', () => {
    expect(describeMode(GameMode.CLASSIC).name).toBe('Classic Wizard')
    expect(describeMode(GameMode.FE).name).toBe('F&E Version')
    expect(describeMode(undefined).id).toBe(GameMode.FE)
    expect(describeMode('gibtsnicht').id).toBe(GameMode.FE)
  })
})

describe('calculatePoints · F&E Version', () => {
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

describe('bidsAreAllowed', () => {
  it('verbietet in der F&E Version Ansagen genau in Höhe der Kartenanzahl', () => {
    expect(bidsAreAllowed(6, 6)).toBe(false)
    expect(bidsAreAllowed(1, 1)).toBe(false)
    expect(bidsAreAllowed(0, 0)).toBe(false)
  })

  it('erlaubt Über- und Unteransagen', () => {
    expect(bidsAreAllowed(7, 6)).toBe(true)
    expect(bidsAreAllowed(5, 6)).toBe(true)
    expect(bidsAreAllowed(0, 6)).toBe(true)
    expect(bidsAreAllowed(12, 6)).toBe(true)
  })

  it('kennt in Classic Wizard keine Einschränkung', () => {
    expect(bidsAreAllowed(6, 6, GameMode.CLASSIC)).toBe(true)
    expect(bidsAreAllowed(0, 0, GameMode.CLASSIC)).toBe(true)
    expect(bidsAreAllowed(7, 6, GameMode.CLASSIC)).toBe(true)
  })
})

describe('Dealer-Rotation', () => {
  const players = [
    { id: 1, name: 'Anna' },
    { id: 2, name: 'Ben' },
    { id: 3, name: 'Cem' }
  ]

  it('rotiert reihum, beginnend beim ausgelosten Geber', () => {
    expect(dealerIndexForRound(1, 3)).toBe(0)
    expect(dealerIndexForRound(2, 3)).toBe(1)
    expect(dealerIndexForRound(4, 3)).toBe(0)

    expect(dealerIndexForRound(1, 3, 2)).toBe(2)
    expect(dealerIndexForRound(2, 3, 2)).toBe(0)
    expect(dealerIndexForRound(3, 3, 2)).toBe(1)
    expect(dealerIndexForRound(4, 3, 2)).toBe(2)
  })

  it('liefert den passenden Spieler', () => {
    expect(dealerForRound(players, 1).name).toBe('Anna')
    expect(dealerForRound(players, 5).name).toBe('Ben')
    expect(dealerForRound(players, 1, 1).name).toBe('Ben')
    expect(dealerForRound(players, 3, 1).name).toBe('Anna')
  })

  it('lässt links vom Geber ansagen, der Geber ist zuletzt dran', () => {
    expect(biddingOrder(players, 1).map((player) => player.name)).toEqual(['Ben', 'Cem', 'Anna'])
    expect(biddingOrder(players, 3).map((player) => player.name)).toEqual(['Anna', 'Ben', 'Cem'])
  })

  it('beginnt bei unbekanntem Geber vorne in der Liste', () => {
    expect(biddingOrder(players, 999).map((player) => player.name)).toEqual(['Anna', 'Ben', 'Cem'])
  })
})

describe('Auslosung des ersten Gebers', () => {
  it('liefert einen gültigen Index innerhalb der Spielerzahl', () => {
    expect(pickRandomDealerIndex(4, () => 0)).toBe(0)
    expect(pickRandomDealerIndex(4, () => 0.5)).toBe(2)
    // Math.random() liefert nie genau 1, der Randfall darf trotzdem nicht
    // aus der Liste laufen.
    expect(pickRandomDealerIndex(4, () => 0.999999)).toBe(3)
    expect(pickRandomDealerIndex(4, () => 1)).toBe(0)
  })

  it('kann jeden Spieler treffen', () => {
    const seen = new Set()
    for (let i = 0; i < 500; i++) seen.add(pickRandomDealerIndex(6))
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('weist ungültige Spielerzahlen zurück', () => {
    expect(() => pickRandomDealerIndex(0)).toThrow(RangeError)
  })
})

describe('Kartenanzahl je Runde', () => {
  it('startet mit sechs Karten pro Spieler', () => {
    expect(DEFAULT_START_CARD_COUNT).toBe(6)
    expect(DEFAULT_START_CARD_COUNT).toBeLessThanOrEqual(MAX_CARDS_PER_ROUND)
  })

  it('zählt Runde für Runde herunter und stoppt bei einer Karte', () => {
    expect(nextCardCount(10)).toBe(9)
    expect(nextCardCount(2)).toBe(1)
    expect(nextCardCount(1)).toBe(1)
  })

  it('ergibt eine absteigende Rundenfolge ab dem Startwert', () => {
    const counts = [DEFAULT_START_CARD_COUNT]
    for (let round = 1; round < 6; round++) counts.push(nextCardCount(counts.at(-1)))
    expect(counts).toEqual([6, 5, 4, 3, 2, 1])
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
