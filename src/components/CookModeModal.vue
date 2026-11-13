<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { buildCookingSteps, type TimedAction } from '@/domain/cooking'
import { formatClock } from '@/domain/timers'
import { useTimers } from '@/composables/useTimers'
import { useBookmarks } from '@/stores/bookmarks'
import type { RecipeDetails } from '@/services/recipes'
import type { RecipeReference } from '@/types/bookmark'

const props = defineProps<{ recipe: RecipeDetails }>()
const emit = defineEmits<{ close: [] }>()

const steps = computed(() => buildCookingSteps(props.recipe))
const current = ref(0)
const completed = ref(false)

const { timers, finishedTimers, addTimer, toggleTimer, resetTimer, dismissTimer, dismissFinished } =
  useTimers()
const { isBookmarked, toggle } = useBookmarks()

const reference = computed<RecipeReference>(() => ({
  id: props.recipe.id,
  title: props.recipe.title,
  image: props.recipe.image,
}))
const saved = computed(() => isBookmarked(props.recipe.id))

function startStepTimer(action: TimedAction, stepNumber: number) {
  addTimer({ seconds: action.seconds, label: action.label, stepNumber })
}

const isLast = computed(() => current.value >= steps.value.length - 1)
const progress = computed(() =>
  steps.value.length > 0 ? ((current.value + 1) / steps.value.length) * 100 : 0,
)

function next() {
  if (current.value < steps.value.length - 1) current.value += 1
}

function previous() {
  if (current.value > 0) current.value -= 1
}

function finish() {
  completed.value = true
}

function saveRecipe() {
  if (!saved.value) toggle(reference.value)
}

let touchStart: { x: number; y: number } | null = null

function onTouchStart(event: TouchEvent) {
  const touch = event.changedTouches[0]

  touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null
}

function onTouchEnd(event: TouchEvent) {
  const start = touchStart
  const touch = event.changedTouches[0]

  touchStart = null

  if (!start || !touch) return

  const dx = touch.clientX - start.x
  const dy = touch.clientY - start.y

  if (Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy)) return

  if (dx < 0) next()
  else previous()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    next()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    previous()
  }
}

let previousOverflow = ''

onMounted(() => {
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="cook-overlay" role="dialog" aria-modal="true" aria-label="Modo cozinha">
    <div class="cook">
      <header class="cook-header">
        <div class="heading">
          <span class="eyebrow">Modo cozinha</span>
          <h2 :title="recipe.title">{{ recipe.title }}</h2>
        </div>
        <button
          type="button"
          class="close-btn"
          aria-label="Sair do modo cozinha"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <div
        v-if="steps.length"
        class="progress-track"
        role="progressbar"
        aria-label="Progresso da receita"
        :aria-valuenow="current + 1"
        :aria-valuemin="1"
        :aria-valuemax="steps.length"
      >
        <div class="progress-fill" :style="{ width: `${progress}%` }" />
      </div>

      <div v-if="steps.length === 0" class="empty">
        <p>Esta receita não tem instruções disponíveis.</p>
        <button type="button" class="nav primary" @click="emit('close')">Fechar</button>
      </div>

      <div v-else-if="completed" class="complete">
        <span class="complete-check" aria-hidden="true">✓</span>
        <h2>Refeição concluída!</h2>
        <p class="complete-text">Guarda esta receita para a voltares a cozinhar mais tarde.</p>

        <p v-if="saved" class="saved-note" role="status">
          Receita guardada nas tuas receitas.
        </p>

        <div class="complete-actions">
          <button v-if="!saved" type="button" class="nav primary" @click="saveRecipe">
            Guardar receita
          </button>
          <button type="button" class="nav secondary" @click="emit('close')">
            {{ saved ? 'Concluir' : 'Agora não' }}
          </button>
        </div>
      </div>

      <template v-else>
        <div class="carousel" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
          <div class="track" :style="{ transform: `translateX(-${current * 100}%)` }">
            <section
              v-for="(step, index) in steps"
              :key="index"
              class="slide"
              :aria-hidden="index !== current"
              :inert="index !== current"
            >
              <p class="step-count">Passo {{ index + 1 }} de {{ steps.length }}</p>

              <div class="slide-grid">
                <p class="step-text">
                  <template v-for="(segment, segmentIndex) in step.segments" :key="segmentIndex">
                    <mark v-if="segment.highlight">{{ segment.text }}</mark>
                    <template v-else>{{ segment.text }}</template>
                  </template>
                </p>

                <div class="slide-aside">
                  <aside class="ingredients">
                    <h3>Ingredientes deste passo</h3>
                    <ul v-if="step.ingredients.length">
                      <li
                        v-for="(ingredient, ingredientIndex) in step.ingredients"
                        :key="`${ingredient.id}-${ingredientIndex}`"
                      >
                        {{ ingredient.original }}
                      </li>
                    </ul>
                    <p v-else class="muted">Sem ingredientes específicos neste passo.</p>
                  </aside>

                  <aside v-if="step.timedActions.length" class="timers">
                    <h3>Temporizadores</h3>
                    <div class="timer-presets">
                      <button
                        v-for="action in step.timedActions"
                        :key="action.seconds"
                        type="button"
                        class="timer-preset"
                        @click="startStepTimer(action, index + 1)"
                      >
                        <span aria-hidden="true">▶</span> {{ action.label }}
                      </button>
                    </div>
                  </aside>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div v-if="finishedTimers.length" class="timer-banner" role="alert">
          <span>Tempo terminado: {{ finishedTimers.map((timer) => timer.label).join(', ') }}</span>
          <button type="button" @click="dismissFinished">Parar</button>
        </div>

        <div v-if="timers.length" class="timer-panel" role="group" aria-label="Temporizadores ativos">
          <div
            v-for="timer in timers"
            :key="timer.id"
            class="timer-row"
            :class="{ finished: timer.finished }"
          >
            <div class="timer-main">
              <span class="timer-clock">{{ formatClock(timer.remaining) }}</span>
              <span class="timer-meta">{{ timer.label }} · Passo {{ timer.stepNumber }}</span>
            </div>

            <div class="timer-actions">
              <button
                type="button"
                class="timer-btn"
                :aria-label="
                  timer.running
                    ? 'Pausar temporizador'
                    : timer.finished
                      ? 'Reiniciar temporizador'
                      : 'Retomar temporizador'
                "
                :title="timer.running ? 'Pausar' : timer.finished ? 'Reiniciar' : 'Retomar'"
                @click="toggleTimer(timer)"
              >
                {{ timer.running ? '‖' : '▶' }}
              </button>
              <button
                type="button"
                class="timer-btn"
                aria-label="Reiniciar temporizador"
                title="Reiniciar"
                @click="resetTimer(timer)"
              >
                ↺
              </button>
              <button
                type="button"
                class="timer-btn"
                aria-label="Fechar temporizador"
                title="Fechar"
                @click="dismissTimer(timer)"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <footer class="cook-footer">
          <button type="button" class="nav secondary" :disabled="current === 0" @click="previous">
            ← Anterior
          </button>

          <span class="position">{{ current + 1 }} / {{ steps.length }}</span>

          <button v-if="!isLast" type="button" class="nav primary" @click="next">Seguinte →</button>
          <button v-else type="button" class="nav primary" @click="finish">Concluir refeição</button>
        </footer>
      </template>
    </div>
  </div>
</template>

<style scoped>
.cook-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: #f4f8f5;
  color: var(--color-text, #1f2937);
}

.cook {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 16px;
}

.cook-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0 12px;
}

.heading {
  min-width: 0;
}

.eyebrow {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #198754;
}

.cook-header h2 {
  margin: 2px 0 0;
  font-size: 1.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-btn {
  width: 44px;
  height: 44px;
  min-height: 0;
  padding: 0;
  flex: none;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 50%;
  background: #fff;
  color: inherit;
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
}

.progress-track {
  height: 6px;
  border-radius: 999px;
  background: #dfe8e2;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: #198754;
  transition: width 0.3s ease;
}

.carousel {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.track {
  display: flex;
  height: 100%;
  transition: transform 0.35s ease;
}

.slide {
  flex: 0 0 100%;
  height: 100%;
  overflow-y: auto;
  padding: 20px 2px 24px;
}

.step-count {
  margin: 0 0 16px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #198754;
}

.slide-grid {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.step-text {
  margin: 0;
  font-size: clamp(1.35rem, 2.4vw, 1.75rem);
  font-weight: 500;
  line-height: 1.6;
}

.step-text mark {
  padding: 0 3px;
  border-radius: 5px;
  background: #d1e7dd;
  color: #0f5132;
  font-weight: 700;
}

.ingredients {
  padding: 16px 18px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 12px;
  background: #fff;
}

.ingredients h3 {
  margin: 0 0 10px;
  font-size: 0.95rem;
  color: #198754;
}

.ingredients ul {
  margin: 0;
  padding-left: 20px;
  line-height: 1.7;
}

.muted {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.slide-aside {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timers {
  padding: 16px 18px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 12px;
  background: #fff;
}

.timers h3 {
  margin: 0 0 10px;
  font-size: 0.95rem;
  color: #198754;
}

.timer-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.timer-preset {
  width: auto;
  min-height: 40px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #198754;
  border-radius: 999px;
  background: #eaf5ef;
  color: #0f5132;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.timer-preset:hover {
  background: #d1e7dd;
}

.timer-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #dc3545;
  color: #fff;
  font-weight: 600;
  animation: timer-pulse 1.1s infinite;
}

.timer-banner button {
  width: auto;
  min-height: 38px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: #fff;
  color: #b02a37;
  font-weight: 700;
  cursor: pointer;
}

.timer-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 32vh;
  overflow-y: auto;
  padding-top: 10px;
}

.timer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 10px;
  background: #fff;
}

.timer-row.finished {
  border-color: #dc3545;
  background: #fdecee;
  animation: timer-pulse 1.1s infinite;
}

.timer-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.timer-clock {
  font-size: 1.45rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.timer-row.finished .timer-clock {
  color: #b02a37;
}

.timer-meta {
  font-size: 0.78rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timer-actions {
  display: flex;
  gap: 6px;
  flex: none;
}

.timer-btn {
  width: 40px;
  height: 40px;
  min-height: 0;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 50%;
  background: #fff;
  color: #1f2937;
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
}

.timer-btn:hover {
  background: #f1f5f3;
}

@keyframes timer-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4);
  }

  50% {
    box-shadow: 0 0 0 6px rgba(220, 53, 69, 0);
  }
}

.cook-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0 max(20px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border, #ddd);
}

.position {
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  color: #6b7280;
}

.nav {
  width: auto;
  min-height: 48px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
}

.nav.primary {
  background: #198754;
  color: #fff;
}

.nav.primary:hover {
  background: #157347;
}

.nav.secondary {
  background: #fff;
  color: var(--color-text, #1f2937);
  border: 1px solid var(--color-border, #ddd);
}

.nav:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  color: #6b7280;
}

.complete {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px 8px;
  text-align: center;
}

.complete-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #198754;
  color: #fff;
  font-size: 2.1rem;
  font-weight: 700;
}

.complete h2 {
  margin: 0;
  font-size: 1.5rem;
}

.complete-text {
  margin: 0;
  max-width: 38ch;
  color: #4b5563;
  line-height: 1.5;
}

.saved-note {
  margin: 0;
  padding: 8px 14px;
  border-radius: 999px;
  background: #d1e7dd;
  color: #0f5132;
  font-weight: 600;
}

.complete-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 6px;
}

.complete-actions .nav {
  min-width: 150px;
}

@media (min-width: 600px) {
  .slide {
    padding: 24px 4px 32px;
  }

  .nav {
    padding: 0 20px;
    font-size: 1rem;
  }
}

@media (min-width: 900px) {
  .slide-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    align-items: start;
    gap: 32px;
  }
}
</style>
