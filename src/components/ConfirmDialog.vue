<script setup>
/** Schlanker Bestätigungsdialog im Bootstrap-Look (ohne Bootstrap-JS). */
defineProps({
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Bestätigen' },
  cancelLabel: { type: String, default: 'Abbrechen' },
  confirmVariant: { type: String, default: 'primary' }
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div
    class="dialog-backdrop"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
    @click.self="emit('cancel')"
  >
    <div class="card shadow-lg w-100" style="max-width: 26rem">
      <div class="card-body">
        <h2 class="h5 card-title">{{ title }}</h2>
        <p v-if="message" class="card-text text-body-secondary">{{ message }}</p>
        <slot />
        <div class="d-flex gap-2 justify-content-end mt-3">
          <button type="button" class="btn btn-outline-secondary" @click="emit('cancel')">
            {{ cancelLabel }}
          </button>
          <button type="button" class="btn" :class="`btn-${confirmVariant}`" @click="emit('confirm')">
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
