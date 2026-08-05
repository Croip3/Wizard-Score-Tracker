<script setup>
import { computed, ref } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { BONUS_POINTS, MAX_PLAYERS } from '../lib/rules.js'
import { useGame } from '../store/gameStore.js'

const { state, goTo, resumeRunningGame } = useGame()

const showNewGameDialog = ref(false)

const hasRunningGame = computed(() => state.runningGameId !== null)

/** Namen nur anzeigen, wenn das laufende Spiel gerade geladen ist. */
const runningPlayers = computed(() =>
  state.game?.id === state.runningGameId ? state.players.map((player) => player.name).join(' · ') : ''
)

function onNewGame() {
  if (hasRunningGame.value) {
    showNewGameDialog.value = true
    return
  }
  goTo('setup')
}

function confirmNewGame() {
  showNewGameDialog.value = false
  goTo('setup')
}
</script>

<template>
  <section>
    <div class="text-center mb-4">
      <h1 class="h3 mb-1">Stiche Raten</h1>
      <p class="text-body-secondary mb-0">Punkte-Tracker für eure Runde – offline, ohne Konto.</p>
    </div>

    <div v-if="hasRunningGame" class="card border-primary mb-3">
      <div class="card-body d-flex align-items-center gap-3">
        <div class="flex-grow-1">
          <h2 class="h6 mb-1">Laufendes Spiel</h2>
          <p v-if="runningPlayers" class="mb-0 text-body-secondary small">{{ runningPlayers }}</p>
        </div>
        <button type="button" class="btn btn-primary" @click="resumeRunningGame">Weiter</button>
      </div>
    </div>

    <div class="d-grid gap-2 mb-4">
      <button type="button" class="btn btn-primary btn-lg" @click="onNewGame">
        Neues Spiel starten
      </button>
      <button type="button" class="btn btn-outline-secondary btn-lg" @click="goTo('stats')">
        Statistiken
      </button>
    </div>

    <div class="card">
      <div class="card-body">
        <h2 class="h6 card-title">So wird gewertet</h2>
        <ul class="mb-0 ps-3 text-body-secondary">
          <li>Jeder gewonnene Stich zählt <strong>1 Punkt</strong></li>
          <li>Ansage getroffen: zusätzlich <strong>{{ BONUS_POINTS }} Bonuspunkte</strong></li>
          <li>Ansage verfehlt: nur der Bonus entfällt – <strong>kein Punktabzug</strong></li>
          <li>
            Die Ansagen einer Runde dürfen <strong>nicht</strong> genau die Kartenanzahl ergeben
          </li>
          <li>Bis zu {{ MAX_PLAYERS }} Spieler, beliebig viele Runden</li>
          <li>Start mit 6 Karten pro Spieler, danach je Runde eine weniger – jederzeit anpassbar</li>
          <li>Der Geber rotiert automatisch reihum</li>
        </ul>
      </div>
    </div>

    <ConfirmDialog
      v-if="showNewGameDialog"
      title="Neues Spiel starten?"
      message="Das laufende Spiel wird dabei beendet und mit dem aktuellen Punktestand in die Statistik übernommen."
      confirm-label="Neues Spiel"
      @confirm="confirmNewGame"
      @cancel="showNewGameDialog = false"
    />
  </section>
</template>
