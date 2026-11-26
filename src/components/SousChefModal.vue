<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { compareByExpiration, formatExpirationDate, getExpirationState } from '@/domain/expiration'
import { GENERATION_STEPS, generationStep } from '@/domain/sousChef'
import { findAll } from '@/services/items'
import { generateRecipe } from '@/services/sousChef'
import type { InventoryItem } from '@/types/item'
import type { SousChefResponse } from '@/types/sousChef'

const emit = defineEmits<{
  close: []
  generated: [response: SousChefResponse]
}>()

const items = ref<InventoryItem[]>(findAll())
const selectedIds = ref<Set<string>>(new Set())
const servings = ref(2)
const maxMinutes = ref<number | null>(null)
const generating = ref(false)
const error = ref('')
const elapsed = ref(0)
const now = new Date()

let ticker: ReturnType<typeof setInterval> | null = null
let controller: AbortController | null = null

const sortedItems = computed(() => [...items.value].sort(compareByExpiration))
const selectedCount = computed(() => selectedIds.value.size)
const allSelected = computed(
  () => items.value.length > 0 && selectedIds.value.size === items.value.length,
)
const currentStep = computed(() => generationStep(elapsed.value))

function toggle(id: string) {
  const selection = selectedIds.value
  if (!selection.delete(id)) selection.add(id)
}

function toggleAll() {
  selectedIds.value = allSelected.value ? new Set() : new Set(items.value.map((item) => item.id))
}

function stopTicker() {
  if (ticker !== null) {
    clearInterval(ticker)
    ticker = null
  }
}

function startTicker() {
  stopTicker()
  elapsed.value = 0
  ticker = setInterval(() => {
    elapsed.value += 1
  }, 1000)
}

async function generate() {
  const selected = items.value.filter((item) => selectedIds.value.has(item.id))

  if (selected.length === 0) {
    error.value = 'Escolhe pelo menos um ingrediente.'
    return
  }

  const minutes = Number(maxMinutes.value)
  controller = new AbortController()
  generating.value = true
  error.value = ''
  startTicker()

  try {
    const response = await generateRecipe(
      selected,
      servings.value,
      { maxMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : undefined },
      controller.signal,
    )
    emit('generated', response)
  } catch (cause) {
    if (controller?.signal.aborted) return
    error.value = cause instanceof Error ? cause.message : 'Não foi possível gerar a receita.'
  } finally {
    generating.value = false
    stopTicker()
  }
}

function close() {
  if (!generating.value) emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  stopTicker()
  controller?.abort()
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Sous-Chef">
      <header class="header">
        <h2>Sous-Chef</h2>
        <button class="close-btn" aria-label="Fechar" :disabled="generating" @click="close">
          ×
        </button>
      </header>

      <div v-if="generating" class="generating" aria-live="polite">
        <div class="spinner" aria-hidden="true"></div>
        <p class="generating-title">A preparar a tua receita…</p>
        <p class="generating-time">{{ elapsed }} s</p>

        <ul class="generation-steps">
          <li
            v-for="(label, index) in GENERATION_STEPS"
            :key="label"
            :class="{ done: index < currentStep, active: index === currentStep }"
          >
            <span class="dot" aria-hidden="true"></span>
            {{ label }}
          </li>
        </ul>

        <p class="generating-hint">Pode demorar até 25 segundos. Não feches esta janela.</p>
      </div>

      <template v-else>
        <p class="intro">
          Escolhe os ingredientes que queres aproveitar. A receita segue o perfil ativo e as
          respetivas restrições.
        </p>

        <p v-if="!items.length" class="status">A despensa está vazia.</p>

        <template v-else>
          <label class="select-all">
            <input type="checkbox" :checked="allSelected" @change="toggleAll" />
            Selecionar tudo ({{ selectedCount }}/{{ items.length }})
          </label>

          <ul class="item-list">
            <li v-for="item in sortedItems" :key="item.id">
              <label :class="['item', { selected: selectedIds.has(item.id) }]">
                <input
                  type="checkbox"
                  :checked="selectedIds.has(item.id)"
                  @change="toggle(item.id)"
                />
                <span class="name">{{ item.name }}</span>
                <span :class="['date', getExpirationState(item.expirationDate, now)]">{{
                  formatExpirationDate(item.expirationDate)
                }}</span>
              </label>
            </li>
          </ul>

          <div class="controls">
            <label>
              Dose
              <input v-model.number="servings" type="number" min="1" max="12" />
            </label>
            <label>
              Tempo máximo (min)
              <input
                v-model.number="maxMinutes"
                type="number"
                min="5"
                max="240"
                placeholder="sem limite"
              />
            </label>
          </div>
        </template>

        <p v-if="error" class="error">{{ error }}</p>
      </template>

      <footer class="footer">
        <button class="btn btn-secondary" :disabled="generating" @click="close">Cancelar</button>
        <button
          v-if="!generating"
          class="btn btn-primary"
          :disabled="selectedCount === 0"
          @click="generate"
        >
          Gerar receita
        </button>
      </footer>
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
  max-width: 480px;
  max-height: 90vh;
  background: var(--color-background, #fff);
  color: var(--color-text, #222);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #ddd);
}

.header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.close-btn {
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

.close-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.08);
}

.close-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.intro {
  margin: 0;
  padding: 12px 20px 0;
  font-size: 0.9rem;
  color: #666;
}

.select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 0.9rem;
  color: #666;
  cursor: pointer;
}

.item-list {
  list-style: none;
  margin: 0;
  padding: 0 12px;
  overflow-y: auto;
  flex: 1;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
}

.item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.item.selected {
  background: rgba(25, 135, 84, 0.1);
}

.item input,
.select-all input {
  accent-color: #198754;
  width: 18px;
  height: 18px;
}

.name {
  flex: 1;
}

.date {
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  color: #666;
}

.date.expiring {
  color: #b45309;
  font-weight: 600;
}

.date.expired {
  color: #dc3545;
  font-weight: 600;
}

.controls {
  display: flex;
  gap: 16px;
  padding: 12px 20px;
  border-top: 1px solid var(--color-border, #ddd);
}

.controls label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: #666;
}

.controls input {
  width: 120px;
  padding: 6px 8px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 6px;
}

.status {
  text-align: center;
  padding: 40px 16px;
  color: #666;
}

.error {
  margin: 0;
  padding: 12px 20px;
  color: #dc3545;
  font-size: 0.9rem;
}

.generating {
  padding: 24px 20px 8px;
  text-align: center;
}

.spinner {
  width: 36px;
  height: 36px;
  margin: 0 auto 14px;
  border: 3px solid rgba(25, 135, 84, 0.18);
  border-top-color: #198754;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.generating-title {
  margin: 0;
  font-weight: 600;
}

.generating-time {
  margin: 4px 0 16px;
  font-variant-numeric: tabular-nums;
  color: #198754;
  font-weight: 600;
}

.generation-steps {
  list-style: none;
  margin: 0 auto;
  padding: 0;
  max-width: 320px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.generation-steps li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.88rem;
  color: #9aa0a6;
  transition:
    background-color 0.25s ease,
    color 0.25s ease;
}

.generation-steps li.active {
  background: rgba(25, 135, 84, 0.1);
  color: #146c43;
  font-weight: 600;
}

.generation-steps li.done {
  color: #198754;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  flex: none;
}

.generation-steps li.active .dot {
  animation: pulse 1.1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.45;
  }
}

.generating-hint {
  margin: 16px 0 8px;
  font-size: 0.8rem;
  color: #888;
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

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e9ecef;
  color: #333;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
