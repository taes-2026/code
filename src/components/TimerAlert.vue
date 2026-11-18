<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { CountdownTimer } from '@/composables/useTimers'

defineProps<{ timers: CountdownTimer[] }>()

const emit = defineEmits<{
  dismiss: []
  restart: [timer: CountdownTimer]
}>()

const dismissButton = ref<HTMLButtonElement | null>(null)

onMounted(() => {
  dismissButton.value?.focus()
})
</script>

<template>
  <div v-if="timers.length" class="timer-alert">
    <div
      class="timer-alert-card"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="timer-alert-title"
      aria-describedby="timer-alert-description"
    >
      <span class="timer-alert-icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2 2" />
          <path d="M5 3 2 6" />
          <path d="M19 3l3 3" />
        </svg>
      </span>
      <h2 id="timer-alert-title">Tempo terminado!</h2>
      <p id="timer-alert-description" class="timer-alert-description">
        {{
          timers.length === 1 ? 'Um temporizador chegou ao fim.' : 'Temporizadores chegaram ao fim.'
        }}
      </p>

      <ul class="timer-alert-list">
        <li v-for="timer in timers" :key="timer.id">
          <span class="timer-alert-details">
            <strong>{{ timer.label }}</strong>
            <span>Passo {{ timer.stepNumber }}</span>
          </span>
          <button
            type="button"
            class="timer-alert-restart"
            :aria-label="`Repetir temporizador de ${timer.label}, passo ${timer.stepNumber}`"
            @click="emit('restart', timer)"
          >
            Repetir
          </button>
        </li>
      </ul>

      <button
        ref="dismissButton"
        type="button"
        class="timer-alert-dismiss"
        @click="emit('dismiss')"
      >
        OK, continuar
      </button>
    </div>
  </div>
</template>

<style scoped>
.timer-alert {
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgb(17 24 39 / 55%);
  animation: timer-alert-fade-in 0.18s ease-out;
}

.timer-alert-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(420px, 100%);
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  padding: 28px 24px 24px;
  border: 2px solid #dc3545;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 60px rgb(15 23 42 / 35%);
  text-align: center;
  animation: timer-alert-pop-in 0.22s ease-out;
}

.timer-alert-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin-bottom: 12px;
  border-radius: 50%;
  background: #fdecee;
  color: #b02a37;
  animation: timer-alert-ring 1.1s ease-in-out infinite;
}

.timer-alert-icon svg {
  width: 36px;
  height: 36px;
}

.timer-alert-card h2 {
  margin: 0;
  font-size: 1.55rem;
  color: #b02a37;
}

.timer-alert-description {
  margin: 6px 0 0;
  color: #4b5563;
}

.timer-alert-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin: 18px 0 20px;
  padding: 0;
  list-style: none;
}

.timer-alert-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #f3c2c8;
  border-radius: 12px;
  background: #fff7f8;
  text-align: left;
}

.timer-alert-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.timer-alert-details strong {
  font-size: 1.05rem;
  color: #1f2937;
}

.timer-alert-details span {
  font-size: 0.8rem;
  color: #6b7280;
}

.timer-alert-restart {
  width: auto;
  min-height: 38px;
  padding: 0 14px;
  flex: none;
  border: 1px solid #dc3545;
  border-radius: 999px;
  background: #fff;
  color: #b02a37;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
}

.timer-alert-restart:hover {
  background: #fdecee;
}

.timer-alert-dismiss {
  width: 100%;
  min-height: 48px;
  border-radius: 12px;
  background: #dc3545;
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

.timer-alert-dismiss:hover {
  background: #b02a37;
}

@keyframes timer-alert-fade-in {
  from {
    opacity: 0;
  }
}

@keyframes timer-alert-pop-in {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
}

@keyframes timer-alert-ring {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(220 53 69 / 35%);
  }

  50% {
    box-shadow: 0 0 0 12px rgb(220 53 69 / 0%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .timer-alert,
  .timer-alert-card,
  .timer-alert-icon {
    animation: none;
  }
}
</style>
