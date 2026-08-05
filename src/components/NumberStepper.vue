<script setup>
import { computed } from 'vue'

/**
 * Zahleneingabe über +/- Buttons – bewusst ohne Zahlenfeld, damit während des
 * Spiels keine Tastatur aufgeht.
 */
const props = defineProps({
  modelValue: { type: Number, required: true },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 99 },
  disabled: { type: Boolean, default: false },
  large: { type: Boolean, default: false },
  label: { type: String, default: 'Wert' },
  variant: { type: String, default: 'outline-secondary' }
})

const emit = defineEmits(['update:modelValue'])

const canDecrease = computed(() => !props.disabled && props.modelValue > props.min)
const canIncrease = computed(() => !props.disabled && props.modelValue < props.max)

function change(delta) {
  const next = Math.min(Math.max(props.modelValue + delta, props.min), props.max)
  if (next !== props.modelValue) emit('update:modelValue', next)
}
</script>

<template>
  <div class="stepper btn-group" :class="{ 'stepper-lg': large }" role="group" :aria-label="label">
    <button
      type="button"
      class="btn"
      :class="`btn-${variant}`"
      :disabled="!canDecrease"
      :aria-label="`${label} verringern`"
      @click="change(-1)"
    >
      −
    </button>
    <span
      class="btn btn-light disabled stepper-value d-flex align-items-center justify-content-center"
      aria-live="polite"
      :aria-label="`${label}: ${modelValue}`"
    >
      {{ modelValue }}
    </span>
    <button
      type="button"
      class="btn"
      :class="`btn-${variant}`"
      :disabled="!canIncrease"
      :aria-label="`${label} erhöhen`"
      @click="change(1)"
    >
      +
    </button>
  </div>
</template>
