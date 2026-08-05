<script setup>
import { computed, ref } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import RoundBidding from './RoundBidding.vue'
import RoundTricks from './RoundTricks.vue'
import ScoreTable from './ScoreTable.vue'
import { RoundPhase } from '../db/index.js'
import { useGame } from '../store/gameStore.js'

const { state, currentRound, finishedRounds, totals, standings, endGame } = useGame()

const showEndDialog = ref(false)

const leader = computed(() => (finishedRounds.value.length ? standings.value[0] : null))

const isBidding = computed(() => currentRound.value?.phase === RoundPhase.BIDDING)

async function confirmEnd() {
  showEndDialog.value = false
  await endGame()
}
</script>

<template>
  <section>
    <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
      <div>
        <h1 class="h5 mb-0">{{ state.players.map((player) => player.name).join(' · ') }}</h1>
        <p class="mb-0 text-body-secondary small">
          <template v-if="leader">
            Führung: {{ leader.player.name }} ({{ leader.total }} Punkte)
          </template>
          <template v-else>Noch keine Runde gewertet</template>
        </p>
      </div>
      <button type="button" class="btn btn-sm btn-outline-danger" @click="showEndDialog = true">
        Beenden
      </button>
    </div>

    <RoundBidding v-if="isBidding" />
    <RoundTricks v-else />

    <div class="mt-4">
      <ScoreTable
        :players="state.players"
        :rounds="finishedRounds"
        :totals="totals"
        :standings="finishedRounds.length ? standings : []"
      />
    </div>

    <ConfirmDialog
      v-if="showEndDialog"
      title="Spiel beenden?"
      message="Die laufende Runde wird verworfen. Danach siehst du die Auswertung."
      confirm-label="Spiel beenden"
      confirm-variant="danger"
      @confirm="confirmEnd"
      @cancel="showEndDialog = false"
    />
  </section>
</template>
