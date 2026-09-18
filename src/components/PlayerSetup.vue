<script setup>
import { computed, onMounted, ref } from 'vue'
import NumberStepper from './NumberStepper.vue'
import { listKnownPlayers } from '../db/repository.js'
import {
  DEFAULT_START_CARD_COUNT,
  GAME_MODES,
  GameMode,
  MAX_CARDS_PER_ROUND,
  MAX_PLAYERS,
  MIN_PLAYERS,
  totalRounds
} from '../lib/rules.js'
import { useGame } from '../store/gameStore.js'

const { startGame, goTo } = useGame()

const names = ref([])
const draft = ref('')
const hint = ref('')
const knownPlayers = ref([])
const starting = ref(false)
const startCards = ref(DEFAULT_START_CARD_COUNT)
const selectedMode = ref(GameMode.FE)

const isFull = computed(() => names.value.length >= MAX_PLAYERS)
const canStart = computed(() => names.value.length >= MIN_PLAYERS && !starting.value)

/** Bereits bekannte Namen, die noch nicht am Tisch sitzen. */
const suggestions = computed(() => {
  const taken = new Set(names.value.map((name) => name.toLowerCase()))
  return knownPlayers.value.filter((player) => !taken.has(player.name.toLowerCase())).slice(0, 12)
})

onMounted(async () => {
  knownPlayers.value = await listKnownPlayers()
})

function addName(rawName) {
  const name = rawName.trim().replace(/\s+/g, ' ')
  if (!name) return
  if (isFull.value) {
    hint.value = `Es können höchstens ${MAX_PLAYERS} Spieler mitspielen.`
    return
  }
  if (names.value.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
    hint.value = `„${name}“ sitzt schon am Tisch.`
    return
  }
  names.value.push(name)
  draft.value = ''
  hint.value = ''
}

function removeName(index) {
  names.value.splice(index, 1)
  hint.value = ''
}

/** Sitzreihenfolge ändern – sie bestimmt, wie der Geber reihum wandert. */
function move(index, delta) {
  const target = index + delta
  if (target < 0 || target >= names.value.length) return
  const [name] = names.value.splice(index, 1)
  names.value.splice(target, 0, name)
}

/** In Amigo Wizard gibt die Regel die Rundenfolge vor. */
const fixedRounds = computed(() =>
  names.value.length >= MIN_PLAYERS ? totalRounds(selectedMode.value, names.value.length) : null
)

async function onStart() {
  if (!canStart.value) return
  starting.value = true
  try {
    await startGame(names.value, startCards.value, selectedMode.value)
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <section>
    <h1 class="h4 mb-1">Neues Spiel</h1>
    <p class="text-body-secondary">
      Spieler in Sitzreihenfolge eintragen – der Geber rotiert später genau in dieser Reihenfolge.
    </p>

    <form class="mb-3" @submit.prevent="addName(draft)">
      <div class="input-group input-group-lg">
        <input
          v-model="draft"
          type="text"
          class="form-control"
          placeholder="Spielername"
          maxlength="24"
          autocomplete="off"
          :disabled="isFull"
          aria-label="Spielername"
        />
        <button class="btn btn-primary" type="submit" :disabled="isFull || !draft.trim()">
          Hinzufügen
        </button>
      </div>
      <div class="form-text">{{ names.length }} von {{ MAX_PLAYERS }} Spielern</div>
    </form>

    <div v-if="hint" class="alert alert-warning py-2">{{ hint }}</div>

    <div v-if="suggestions.length && !isFull" class="mb-3">
      <div class="form-text mb-1">Zuletzt gespielt:</div>
      <div class="d-flex flex-wrap gap-2">
        <button
          v-for="player in suggestions"
          :key="player.id"
          type="button"
          class="btn btn-sm btn-outline-secondary rounded-pill"
          @click="addName(player.name)"
        >
          + {{ player.name }}
        </button>
      </div>
    </div>

    <ul v-if="names.length" class="list-group mb-3">
      <li
        v-for="(name, index) in names"
        :key="name"
        class="list-group-item d-flex align-items-center gap-2"
      >
        <span class="badge text-bg-secondary rank-badge">{{ index + 1 }}</span>
        <span class="player-name flex-grow-1">{{ name }}</span>
        <div class="btn-group btn-group-sm" role="group" aria-label="Sitzplatz verschieben">
          <button
            type="button"
            class="btn btn-outline-secondary"
            :disabled="index === 0"
            :aria-label="`${name} nach oben`"
            @click="move(index, -1)"
          >
            ↑
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary"
            :disabled="index === names.length - 1"
            :aria-label="`${name} nach unten`"
            @click="move(index, 1)"
          >
            ↓
          </button>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-outline-danger"
          :aria-label="`${name} entfernen`"
          @click="removeName(index)"
        >
          ✕
        </button>
      </li>
    </ul>
    <p v-else class="empty-state">Noch keine Spieler eingetragen.</p>

    <div class="card mb-3">
      <div class="card-body">
        <div class="form-label fw-semibold">Spielmodus</div>
        <div class="list-group">
          <label
            v-for="gameMode in GAME_MODES"
            :key="gameMode.id"
            class="list-group-item d-flex gap-2"
            :class="{ 'list-group-item-primary': selectedMode === gameMode.id }"
          >
            <input
              v-model="selectedMode"
              class="form-check-input flex-shrink-0 mt-1"
              type="radio"
              name="game-mode"
              :value="gameMode.id"
            />
            <span>
              <span class="fw-semibold">{{ gameMode.name }}</span>
              <span class="d-block small">
                Getroffen: {{ gameMode.hitRule }} · Verfehlt: {{ gameMode.missRule }}
              </span>
              <span class="d-block small opacity-75">{{ gameMode.extraRule }}</span>
            </span>
          </label>
        </div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-body">
        <template v-if="selectedMode === GameMode.AMIGO">
          <div class="form-label fw-semibold">Rundenfolge</div>
          <p class="mb-0 text-body-secondary small">
            Amigo Wizard gibt die Kartenanzahl vor: Runde 1 mit einer Karte, danach je eine mehr.
            <template v-if="fixedRounds">
              Bei {{ names.length }} Spielern sind das <strong>{{ fixedRounds }} Runden</strong>,
              die letzte mit {{ fixedRounds }} Karten. Danach ist das Spiel zu Ende.
            </template>
            <template v-else>Die Rundenzahl ergibt sich aus der Spieleranzahl.</template>
          </p>
        </template>

        <template v-else>
          <label class="form-label fw-semibold" for="start-cards">Karten in Runde 1</label>
          <div class="d-flex align-items-center gap-3" id="start-cards">
            <NumberStepper
              v-model="startCards"
              :min="1"
              :max="MAX_CARDS_PER_ROUND"
              large
              label="Karten in Runde 1"
              variant="outline-primary"
            />
            <span class="text-body-secondary">
              {{ startCards === 1 ? 'Karte' : 'Karten' }} pro Spieler
            </span>
          </div>
          <div class="form-text">
            Ab Runde 2 wird jeweils eine Karte weniger vorgeschlagen – in jeder Runde anpassbar.
          </div>
        </template>
      </div>
    </div>

    <div class="action-bar">
      <div class="container-narrow d-flex gap-2">
        <button type="button" class="btn btn-outline-secondary" @click="goTo('home')">
          Zurück
        </button>
        <button type="button" class="btn btn-primary btn-lg flex-grow-1" :disabled="!canStart" @click="onStart">
          Spiel starten
        </button>
      </div>
    </div>
  </section>
</template>
