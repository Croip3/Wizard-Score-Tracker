<script setup>
import { onMounted, ref } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { GameStatus } from '../db/index.js'
import { computePlayerStats, listGameSummaries } from '../db/repository.js'
import { useGame } from '../store/gameStore.js'

const { goTo, openGameSummary, removeGame } = useGame()

const summaries = ref([])
const playerStats = ref([])
const loading = ref(true)
const gameToDelete = ref(null)

const dateFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' })

async function load() {
  loading.value = true
  try {
    const [games, stats] = await Promise.all([listGameSummaries(), computePlayerStats()])
    summaries.value = games
    playerStats.value = stats
  } finally {
    loading.value = false
  }
}

onMounted(load)

function formatDate(iso) {
  return iso ? dateFormat.format(new Date(iso)) : '–'
}

function winnerNames(summary) {
  const ids = summary.game.winnerPlayerIds ?? []
  const names = summary.players.filter((player) => ids.includes(player.id)).map((p) => p.name)
  return names.length ? names.join(' & ') : '–'
}

function averagePoints(stat) {
  return stat.games > 0 ? Math.round((stat.totalPoints / stat.games) * 10) / 10 : 0
}

function hitRate(stat) {
  return stat.rounds > 0 ? `${Math.round((stat.hits / stat.rounds) * 100)} %` : '–'
}

async function confirmDelete() {
  const game = gameToDelete.value
  gameToDelete.value = null
  if (!game) return
  await removeGame(game.id)
  await load()
}
</script>

<template>
  <section>
    <h1 class="h4 mb-3">Statistiken</h1>

    <p v-if="loading" class="text-body-secondary">Lade Daten …</p>

    <template v-else>
      <div v-if="playerStats.length" class="card mb-4">
        <div class="card-header fw-semibold">Spieler (abgeschlossene Spiele)</div>
        <div class="table-responsive">
          <table class="table table-sm table-striped score-table align-middle mb-0">
            <thead>
              <tr>
                <th scope="col" class="sticky-col">Spieler</th>
                <th scope="col" class="text-center">Spiele</th>
                <th scope="col" class="text-center">Siege</th>
                <th scope="col" class="text-center">Punkte</th>
                <th scope="col" class="text-center">Ø/Spiel</th>
                <th scope="col" class="text-center">Trefferquote</th>
                <th scope="col" class="text-center">Bestes Spiel</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stat in playerStats" :key="stat.player.id">
                <th scope="row" class="sticky-col">{{ stat.player.name }}</th>
                <td class="text-center">{{ stat.games }}</td>
                <td class="text-center fw-semibold">{{ stat.wins }}</td>
                <td class="text-center">{{ stat.totalPoints }}</td>
                <td class="text-center">{{ averagePoints(stat) }}</td>
                <td class="text-center">{{ hitRate(stat) }}</td>
                <td class="text-center">{{ stat.bestGame ?? '–' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <h2 class="h6 text-body-secondary">Spiele</h2>
      <ul v-if="summaries.length" class="list-group mb-3">
        <li v-for="summary in summaries" :key="summary.game.id" class="list-group-item">
          <div class="d-flex align-items-start gap-2">
            <div class="flex-grow-1">
              <div class="d-flex align-items-center gap-2">
                <span class="fw-semibold">{{ formatDate(summary.game.startedAt) }}</span>
                <span
                  class="badge"
                  :class="
                    summary.game.status === GameStatus.RUNNING ? 'text-bg-primary' : 'text-bg-secondary'
                  "
                >
                  {{ summary.game.status === GameStatus.RUNNING ? 'läuft' : 'beendet' }}
                </span>
              </div>
              <div class="small text-body-secondary">
                {{ summary.players.map((player) => player.name).join(' · ') }}
              </div>
              <div class="small">
                {{ summary.roundsPlayed }} {{ summary.roundsPlayed === 1 ? 'Runde' : 'Runden' }} ·
                <template v-if="summary.game.status === GameStatus.FINISHED">
                  Sieg: <strong>{{ winnerNames(summary) }}</strong>
                </template>
                <template v-else>noch nicht gewertet</template>
              </div>
            </div>
            <div class="btn-group btn-group-sm">
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="summary.roundsPlayed === 0"
                @click="openGameSummary(summary.game.id)"
              >
                Details
              </button>
              <button
                type="button"
                class="btn btn-outline-danger"
                aria-label="Spiel löschen"
                @click="gameToDelete = summary.game"
              >
                ✕
              </button>
            </div>
          </div>
        </li>
      </ul>
      <p v-else class="empty-state">Noch keine Spiele gespeichert.</p>
    </template>

    <div class="action-bar">
      <div class="container-narrow">
        <button type="button" class="btn btn-outline-secondary w-100" @click="goTo('home')">
          Zurück
        </button>
      </div>
    </div>

    <ConfirmDialog
      v-if="gameToDelete"
      title="Spiel löschen?"
      message="Alle Runden und Punkte dieses Spiels werden dauerhaft entfernt."
      confirm-label="Löschen"
      confirm-variant="danger"
      @confirm="confirmDelete"
      @cancel="gameToDelete = null"
    />
  </section>
</template>
