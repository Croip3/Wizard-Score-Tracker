<script setup>
import { computed } from 'vue'
import NumberStepper from './NumberStepper.vue'
import { calculatePoints } from '../lib/rules.js'
import { useGame } from '../store/gameStore.js'

const {
  state,
  currentRound,
  currentDealer,
  trickTotal,
  tricksRemaining,
  setTricks,
  resetTricks,
  resetAllTricks,
  backToBidding,
  completeRound
} = useGame()

const entries = computed(() => {
  if (!currentRound.value) return []
  return state.players.map((player) => {
    const entry = currentRound.value.entries.find((item) => item.playerId === player.id)
    return {
      player,
      bid: entry?.bid ?? 0,
      tricksWon: entry?.tricksWon ?? 0,
      preview: calculatePoints(entry?.bid ?? 0, entry?.tricksWon ?? 0)
    }
  })
})

const matchesCardCount = computed(() => tricksRemaining.value === 0)

const tricksWord = (count) => (Math.abs(count) === 1 ? 'Stich' : 'Stiche')

/** Reiner Hinweis – die Summe darf von der Kartenanzahl abweichen. */
const remainderText = computed(() => {
  const remaining = tricksRemaining.value
  if (remaining === 0) return 'Alle Stiche verteilt'
  if (remaining > 0) return `${remaining} ${tricksWord(remaining)} weniger als Karten`
  return `${Math.abs(remaining)} ${tricksWord(remaining)} mehr als Karten`
})
</script>

<template>
  <section v-if="currentRound">
    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <h2 class="h5 mb-1">Runde {{ currentRound.roundNumber }} · Stiche</h2>
            <p class="mb-0 text-body-secondary">
              {{ currentRound.cardCount }} Karten · Geber: <strong>{{ currentDealer?.name ?? '–' }}</strong>
            </p>
          </div>
          <span class="badge text-bg-success align-self-center">Stich-Phase</span>
        </div>
      </div>
    </div>

    <ul class="list-group mb-3">
      <li v-for="row in entries" :key="row.player.id" class="list-group-item py-3">
        <div class="player-row">
          <div class="player-info">
            <div class="player-name">{{ row.player.name }}</div>
            <div class="text-body-secondary small">
              Ansage <strong>{{ row.bid }}</strong> ·
              <span :class="{ 'points-positive': row.preview > 0 }" title="Punkte für diese Runde">
                {{ row.preview > 0 ? '+' : '' }}{{ row.preview }} P
              </span>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <NumberStepper
              :model-value="row.tricksWon"
              :min="0"
              :max="currentRound.cardCount"
              :label="`Stiche ${row.player.name}`"
              variant="outline-success"
              @update:model-value="(value) => setTricks(row.player.id, value)"
            />
            <button
              type="button"
              class="btn btn-outline-secondary stepper-side-btn"
              :disabled="row.tricksWon === 0"
              :aria-label="`Stiche von ${row.player.name} zurücksetzen`"
              title="Auf 0 zurücksetzen"
              @click="resetTricks(row.player.id)"
            >
              ⟲
            </button>
          </div>
        </div>
      </li>
    </ul>

    <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
      <span class="badge" :class="matchesCardCount ? 'text-bg-success' : 'text-bg-secondary'">
        {{ trickTotal }} / {{ currentRound.cardCount }} Stiche
      </span>
      <span class="text-body-secondary flex-grow-1">{{ remainderText }}</span>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary"
        :disabled="trickTotal === 0"
        @click="resetAllTricks"
      >
        Alle zurücksetzen
      </button>
    </div>

    <div class="action-bar">
      <div class="container-narrow d-flex gap-2">
        <button type="button" class="btn btn-outline-secondary" @click="backToBidding">
          Ansagen
        </button>
        <button type="button" class="btn btn-success btn-lg flex-grow-1" @click="completeRound">
          Runde abschließen
        </button>
      </div>
    </div>
  </section>
</template>
