<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CookModeModal from '@/components/CookModeModal.vue'
import { formatQuantity, totalMinutes, unitLabel } from '@/domain/sousChef'
import { formatClock } from '@/domain/timers'
import { toRecipeDetails } from '@/services/sousChef'
import type { SousChefResponse } from '@/types/sousChef'

const props = defineProps<{ response: SousChefResponse }>()
const emit = defineEmits<{ close: [] }>()

const recipe = computed(() => props.response.recipe)
const total = computed(() => totalMinutes(recipe.value.prepMinutes, recipe.value.cookMinutes))
const details = toRecipeDetails(props.response)
const showCookMode = ref(false)

function close() {
  if (!showCookMode.value) emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="modal" role="dialog" aria-modal="true" :aria-label="recipe.title">
      <header class="header">
        <div class="titles">
          <p class="eyebrow">Sous-Chef</p>
          <h2>{{ recipe.title }}</h2>
        </div>
        <button class="close-btn" aria-label="Fechar" @click="close">×</button>
      </header>

      <div class="body">
        <p v-if="recipe.summary" class="summary">{{ recipe.summary }}</p>

        <ul class="stats">
          <li>
            <strong>{{ recipe.servings }}</strong
            ><span>doses</span>
          </li>
          <li>
            <strong>{{ recipe.prepMinutes }} min</strong><span>preparação</span>
          </li>
          <li>
            <strong>{{ recipe.cookMinutes }} min</strong><span>cozedura</span>
          </li>
          <li>
            <strong>{{ total }} min</strong><span>total</span>
          </li>
        </ul>

        <section class="section">
          <h3>Ingredientes</h3>
          <ul class="ingredients">
            <li
              v-for="ingredient in recipe.ingredients"
              :key="ingredient.name"
              :class="{ missing: !ingredient.fromPantry }"
            >
              <span class="name">
                {{ ingredient.name }}
                <em v-if="ingredient.optional">opcional</em>
              </span>
              <span class="quantity"
                >{{ formatQuantity(ingredient.quantity) }} {{ unitLabel(ingredient.unit) }}</span
              >
              <span class="badge" :class="ingredient.fromPantry ? 'in-stock' : 'missing'">
                {{ ingredient.fromPantry ? 'em despensa' : 'em falta' }}
              </span>
            </li>
          </ul>
        </section>

        <section class="section">
          <h3>Preparação</h3>
          <ol class="steps">
            <li v-for="step in recipe.steps" :key="step.n">
              <div class="step-head">
                <span class="step-number">{{ step.n }}</span>
                <span v-if="step.timerSeconds" class="timer"
                  >⏱ {{ formatClock(step.timerSeconds) }}</span
                >
              </div>
              <p class="step-text">{{ step.text }}</p>
              <div v-if="step.uses.length" class="uses">
                <span v-for="name in step.uses" :key="name" class="chip">{{ name }}</span>
              </div>
            </li>
          </ol>
        </section>

        <section v-if="recipe.tips.length" class="section">
          <h3>Dicas</h3>
          <ul class="tips">
            <li v-for="tip in recipe.tips" :key="tip">{{ tip }}</li>
          </ul>
        </section>

        <p class="source">
          Gerada por IA · {{ response.meta.model }} · {{ response.meta.attempts }}
          {{ response.meta.attempts === 1 ? 'tentativa' : 'tentativas' }}
        </p>
      </div>

      <footer class="footer">
        <button class="btn btn-secondary" @click="close">Fechar</button>
        <button class="btn btn-primary" @click="showCookMode = true">Modo de preparação</button>
      </footer>

      <CookModeModal v-if="showCookMode" :recipe="details" @close="showCookMode = false" />
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1000;
}

.modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  background: var(--color-background, #fff);
  color: var(--color-text, #222);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #ddd);
}

.titles {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 2px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #198754;
  font-weight: 600;
}

.header h2 {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.3;
}

.close-btn {
  flex: none;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.summary {
  margin: 0 0 12px;
  color: #555;
  line-height: 1.45;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
}

.stats li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  background: #f6f8f7;
  border-radius: 8px;
}

.stats strong {
  font-size: 1rem;
}

.stats span {
  font-size: 0.72rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.section {
  margin-bottom: 16px;
}

.section h3 {
  margin: 0 0 8px;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #666;
}

.ingredients,
.tips {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ingredients li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.95rem;
}

.ingredients li:last-child {
  border-bottom: none;
}

.name {
  flex: 1;
}

.name em {
  margin-left: 6px;
  font-size: 0.7rem;
  font-style: normal;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #999;
}

.quantity {
  color: #444;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.badge {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge.in-stock {
  background: rgba(25, 135, 84, 0.12);
  color: #146c43;
}

.badge.missing {
  background: rgba(220, 53, 69, 0.12);
  color: #b02a37;
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  counter-reset: step;
}

.steps li {
  padding: 10px 0 12px;
  border-bottom: 1px solid #f0f0f0;
}

.steps li:last-child {
  border-bottom: none;
}

.step-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #198754;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
}

.timer {
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eef1f0;
  color: #444;
}

.step-text {
  margin: 0;
  line-height: 1.5;
}

.uses {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.chip {
  padding: 2px 8px;
  border-radius: 999px;
  background: #f1f3f2;
  color: #555;
  font-size: 0.75rem;
}

.tips li {
  position: relative;
  padding: 4px 0 4px 16px;
  color: #555;
  font-size: 0.9rem;
}

.tips li::before {
  content: '•';
  position: absolute;
  left: 2px;
  color: #198754;
}

.source {
  margin: 8px 0 0;
  font-size: 0.75rem;
  color: #999;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--color-border, #ddd);
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
}

.btn-primary {
  background: #198754;
  color: #fff;
}

.btn-secondary {
  background: #e9ecef;
  color: #333;
}
</style>
