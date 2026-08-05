<script setup>
import { computed } from 'vue'
import ScoreTable from './ScoreTable.vue'
import { useGame } from '../store/gameStore.js'

const { state, finishedRounds, totals, standings, winners, goTo, clearGame } = useGame()

const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }

const roundsWord = computed(() => (finishedRounds.value.length === 1 ? 'Runde' : 'Runden'))

/** Trefferquote: wie oft lag ein Spieler mit seiner Ansage richtig? */
const hitRates = computed(() => {
  const result = {}
  for (const player of state.players) result[player.id] = { hits: 0, rounds: 0 }
  for (const round of finishedRounds.value) {
    for (const entry of round.entries) {
      const stat = result[entry.playerId]
      if (!stat) continue
      stat.rounds += 1
      if (entry.bid === entry.tricksWon) stat.hits += 1
    }
  }
  return result
})

const winnerText = computed(() => {
  if (finishedRounds.value.length === 0) return 'Keine gewertete Runde'
  const names = winners.value.map((player) => player.name)
  if (names.length === 1) return `${names[0]} gewinnt!`
  return `Unentschieden: ${names.join(' & ')}`
})

const startedAt = computed(() =>
  state.game?.startedAt
    ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(state.game.startedAt)
      )
    : ''
)

function hitRateText(playerId) {
  const stat = hitRates.value[playerId]
  if (!stat || stat.rounds === 0) return '–'
  return `${stat.hits}/${stat.rounds} (${Math.round((stat.hits / stat.rounds) * 100)} %)`
}
</script>

<template>
  <section>
    <div class="card text-center mb-3 border-primary">
      <div class="card-body">
        <div class="display-6">🏆</div>
        <h1 class="h4 mb-1">{{ winnerText }}</h1>
        <p class="text-body-secondary mb-0">
          {{ finishedRounds.length }} {{ roundsWord }} · gestartet am {{ startedAt }}
        </p>
      </div>
    </div>

    <ul class="list-group mb-3">
      <li
        v-for="entry in standings"
        :key="entry.player.id"
        class="list-group-item d-flex align-items-center gap-2"
        :class="{ 'list-group-item-warning': entry.rank === 1 }"
      >
        <span class="fs-5 rank-badge text-center">{{ medals[entry.rank] ?? `${entry.rank}.` }}</span>
        <div class="flex-grow-1">
          <div class="player-name">{{ entry.player.name }}</div>
          <div class="score-cell-detail">Ansage getroffen: {{ hitRateText(entry.player.id) }}</div>
        </div>
        <span class="fs-5 fw-bold" :class="entry.total >= 0 ? 'points-positive' : 'points-negative'">
          {{ entry.total }}
        </span>
      </li>
    </ul>

    <ScoreTable
      :players="state.players"
      :rounds="finishedRounds"
      :totals="totals"
      :standings="standings"
    />

    <div class="action-bar">
      <div class="container-narrow d-flex gap-2">
        <button type="button" class="btn btn-outline-secondary" @click="goTo('stats')">
          Statistik
        </button>
        <button type="button" class="btn btn-primary btn-lg flex-grow-1" @click="clearGame">
          Fertig
        </button>
      </div>
    </div>
  </section>
</template>
