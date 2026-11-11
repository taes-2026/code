<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { buildCookingSteps } from '@/domain/cooking'
import type { RecipeDetails } from '@/services/recipes'

const props = defineProps<{ recipe: RecipeDetails }>()
const emit = defineEmits<{ close: [] }>()

const steps = computed(() => buildCookingSteps(props.recipe))
const current = ref(0)

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

      <template v-else>
        <div class="carousel" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
          <div class="track" :style="{ transform: `translateX(-${current * 100}%)` }">
            <section
              v-for="(step, index) in steps"
              :key="index"
              class="slide"
              :aria-hidden="index !== current"
            >
              <p class="step-count">Passo {{ index + 1 }} de {{ steps.length }}</p>

              <div class="slide-grid">
                <p class="step-text">
                  <template v-for="(segment, segmentIndex) in step.segments" :key="segmentIndex">
                    <mark v-if="segment.highlight">{{ segment.text }}</mark>
                    <template v-else>{{ segment.text }}</template>
                  </template>
                </p>

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
              </div>
            </section>
          </div>
        </div>

        <footer class="cook-footer">
          <button type="button" class="nav secondary" :disabled="current === 0" @click="previous">
            ← Anterior
          </button>

          <span class="position">{{ current + 1 }} / {{ steps.length }}</span>

          <button v-if="!isLast" type="button" class="nav primary" @click="next">Seguinte →</button>
          <button v-else type="button" class="nav primary" @click="emit('close')">Terminar</button>
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
