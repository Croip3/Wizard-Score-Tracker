<script setup>
import { computed } from 'vue'
import NumberStepper from './NumberStepper.vue'
import { MAX_CARDS_PER_ROUND, biddingOrder } from '../lib/rules.js'
import { useGame } from '../store/gameStore.js'

const { state, currentRound, currentDealer, bidTotal, setCardCount, setBid, confirmBids } = useGame()

/** Angesagt wird links vom Geber – der Geber ist zuletzt dran. */
const orderedPlayers = computed(() =>
  currentRound.value ? biddingOrder(state.players, currentRound.value.roundNumber) : []
)

function bidOf(playerId) {
  return currentRound.value?.entries.find((entry) => entry.playerId === playerId)?.bid ?? 0
}

const bidDifference = computed(() => bidTotal.value - (currentRound.value?.cardCount ?? 0))

const bidSummary = computed(() => {
  if (bidDifference.value === 0) return { text: 'genau angesagt', variant: 'text-bg-secondary' }
  if (bidDifference.value > 0)
    return { text: `${bidDifference.value} zu viel angesagt`, variant: 'text-bg-warning' }
  return { text: `${Math.abs(bidDifference.value)} zu wenig angesagt`, variant: 'text-bg-info' }
})
</script>

<template>
  <section v-if="currentRound">
    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h2 class="h5 mb-1">Runde {{ currentRound.roundNumber }} · Ansagen</h2>
            <p class="mb-0 text-body-secondary">
              Geber: <strong>{{ currentDealer?.name ?? '–' }}</strong>
            </p>
          </div>
          <span class="badge text-bg-primary align-self-center">Ansage-Phase</span>
        </div>

        <label class="form-label fw-semibold" for="card-count">Karten in dieser Runde</label>
        <div class="d-flex align-items-center gap-3" id="card-count">
          <NumberStepper
            :model-value="currentRound.cardCount"
            :min="1"
            :max="MAX_CARDS_PER_ROUND"
            large
            label="Kartenanzahl"
            variant="outline-primary"
            @update:model-value="setCardCount"
          />
          <span class="text-body-secondary">
            {{ currentRound.cardCount === 1 ? 'Karte' : 'Karten' }} pro Spieler
          </span>
        </div>
      </div>
    </div>

    <ul class="list-group mb-3">
      <li
        v-for="(player, index) in orderedPlayers"
        :key="player.id"
        class="list-group-item player-row py-3"
      >
        <span class="badge text-bg-secondary rank-badge">{{ index + 1 }}</span>
        <span class="player-name flex-grow-1">
          {{ player.name }}
          <span
            v-if="player.id === currentRound.dealerPlayerId"
            class="badge text-bg-dark ms-1 align-middle"
            >Geber</span
          >
        </span>
        <NumberStepper
          :model-value="bidOf(player.id)"
          :min="0"
          :max="currentRound.cardCount"
          :label="`Ansage ${player.name}`"
          @update:model-value="(value) => setBid(player.id, value)"
        />
      </li>
    </ul>

    <div class="d-flex align-items-center gap-2 mb-3">
      <span class="text-body-secondary">
        Ansagen gesamt: <strong>{{ bidTotal }}</strong> / {{ currentRound.cardCount }}
      </span>
      <span class="badge" :class="bidSummary.variant">{{ bidSummary.text }}</span>
    </div>

    <div class="action-bar">
      <div class="container-narrow">
        <button type="button" class="btn btn-primary btn-lg w-100" @click="confirmBids">
          Ansagen übernehmen → Stiche eintragen
        </button>
      </div>
    </div>
  </section>
</template>
