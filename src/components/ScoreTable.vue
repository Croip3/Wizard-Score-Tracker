<script setup>
import { computed } from 'vue'

/** Punkteübersicht: eine Zeile pro Runde, eine Spalte pro Spieler. */
const props = defineProps({
  players: { type: Array, required: true },
  rounds: { type: Array, required: true },
  totals: { type: Object, required: true },
  standings: { type: Array, default: () => [] }
})

const rankByPlayerId = computed(() => {
  const map = {}
  for (const entry of props.standings) map[entry.player.id] = entry.rank
  return map
})

function entryFor(round, playerId) {
  return round.entries.find((entry) => entry.playerId === playerId) ?? null
}

function pointsClass(points) {
  if (points > 0) return 'points-positive'
  if (points < 0) return 'points-negative'
  return ''
}

function formatPoints(points) {
  return points > 0 ? `+${points}` : `${points}`
}
</script>

<template>
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
      <span class="fw-semibold">Punktestand</span>
      <span class="text-body-secondary small">
        {{ rounds.length }} {{ rounds.length === 1 ? 'Runde' : 'Runden' }}
      </span>
    </div>
    <div class="table-responsive">
      <table class="table table-sm table-striped score-table align-middle mb-0">
        <thead>
          <tr>
            <th scope="col" class="sticky-col">Runde</th>
            <th v-for="player in players" :key="player.id" scope="col" class="text-center">
              {{ player.name }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="round in rounds" :key="round.id">
            <th scope="row" class="sticky-col">
              {{ round.roundNumber }}
              <div class="score-cell-detail">{{ round.cardCount }} Karten</div>
            </th>
            <td v-for="player in players" :key="player.id" class="text-center">
              <template v-if="entryFor(round, player.id)">
                <span class="fw-semibold" :class="pointsClass(entryFor(round, player.id).points)">
                  {{ formatPoints(entryFor(round, player.id).points) }}
                </span>
                <div class="score-cell-detail">
                  {{ entryFor(round, player.id).bid }} → {{ entryFor(round, player.id).tricksWon }}
                </div>
              </template>
              <span v-else class="text-body-secondary">–</span>
            </td>
          </tr>
          <tr v-if="rounds.length === 0">
            <td :colspan="players.length + 1" class="text-center text-body-secondary py-4">
              Noch keine Runde abgeschlossen.
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" class="sticky-col">Gesamt</th>
            <td v-for="player in players" :key="player.id" class="text-center fw-bold">
              <span :class="pointsClass(totals[player.id] ?? 0)">{{ totals[player.id] ?? 0 }}</span>
              <div v-if="rankByPlayerId[player.id]" class="score-cell-detail">
                Platz {{ rankByPlayerId[player.id] }}
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>
