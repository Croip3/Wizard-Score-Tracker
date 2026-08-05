<script setup>
import { computed, onMounted } from 'vue'
import GameSummary from './components/GameSummary.vue'
import GameView from './components/GameView.vue'
import HomeView from './components/HomeView.vue'
import PlayerSetup from './components/PlayerSetup.vue'
import StatsView from './components/StatsView.vue'
import { useGame } from './store/gameStore.js'

const { state, init, goTo } = useGame()

onMounted(init)

const views = {
  home: HomeView,
  setup: PlayerSetup,
  game: GameView,
  summary: GameSummary,
  stats: StatsView
}

const currentView = computed(() => views[state.view] ?? HomeView)

/** Aus dem laufenden Spiel heraus kann man kurz auf die Startseite wechseln. */
const showHomeButton = computed(() => state.view === 'game')
</script>

<template>
  <header class="app-header">
    <div class="container-narrow d-flex align-items-center gap-2 py-2">
      <span class="app-title fw-semibold flex-grow-1">
        WIZARD <span class="fw-normal opacity-75">- F&amp;E Version</span>
      </span>
      <button
        v-if="showHomeButton"
        type="button"
        class="btn btn-sm btn-outline-light"
        @click="goTo('home')"
      >
        Start
      </button>
    </div>
  </header>

  <main class="app-main">
    <div class="container-narrow">
      <div v-if="state.error" class="alert alert-danger d-flex align-items-center gap-2" role="alert">
        <span class="flex-grow-1">{{ state.error }}</span>
        <button
          type="button"
          class="btn-close"
          aria-label="Meldung schließen"
          @click="state.error = null"
        ></button>
      </div>

      <p v-if="!state.ready" class="empty-state">Lade gespeicherte Daten …</p>
      <component v-else :is="currentView" />
    </div>
  </main>
</template>
