<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  normalizeConsumedAmount,
  stepConsumedAmount,
  type ConsumedQuantityRow,
} from '@/domain/consumption'

const props = defineProps<{ rows: readonly ConsumedQuantityRow[]; title: string }>()
const emit = defineEmits<{ confirm: [rows: ConsumedQuantityRow[]]; cancel: [] }>()

const draft = ref<ConsumedQuantityRow[]>(props.rows.map((row) => ({ ...row })))

const deductibleCount = computed(
  () =>
    draft.value.filter(
      (row) => row.pantryQuantity !== null && normalizeConsumedAmount(row.amount) > 0,
    ).length,
)

function step(row: ConsumedQuantityRow, direction: 1 | -1) {
  row.amount = stepConsumedAmount(row.amount, direction, row.unit)
}

function reset() {
  draft.value.forEach((row) => {
    row.amount = row.recipeAmount
  })
}

function isAdjusted(row: ConsumedQuantityRow): boolean {
  return normalizeConsumedAmount(row.amount) !== row.recipeAmount
}

function formatQuantity(value: number): string {
  return String(Number(value.toFixed(2)))
}

function unitLabel(unit: string): string {
  return unit || 'un'
}

function confirm() {
  emit(
    'confirm',
    draft.value.map((row) => ({ ...row, amount: normalizeConsumedAmount(row.amount) })),
  )
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('cancel')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="overlay" @click.self="emit('cancel')">
    <div
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consumed-quantities-title"
    >
      <header class="header">
        <div>
          <h2 id="consumed-quantities-title">Quantidades consumidas</h2>
          <p class="subtitle">{{ title }}</p>
        </div>
        <button type="button" class="close-btn" aria-label="Fechar" @click="emit('cancel')">
          ×
        </button>
      </header>

      <div class="body">
        <p class="intro">
          Ajusta quanto usaste de cada ingrediente. A despensa só é descontada depois de
          confirmares. Os ingredientes sem correspondência na despensa não são descontados.
        </p>

        <p v-if="draft.length === 0" class="empty">Esta receita não tem ingredientes.</p>

        <template v-else>
          <div class="toolbar">
            <span class="deductible">
              {{ deductibleCount }}
              {{ deductibleCount === 1 ? 'ingrediente será descontado' : 'ingredientes serão descontados' }}
            </span>
            <button type="button" class="reset-btn" @click="reset">Repor receita</button>
          </div>

          <ul class="ingredient-list">
            <li v-for="row in draft" :key="row.key" class="ingredient-row">
              <div class="ingredient-info">
                <span class="ingredient-name">
                  {{ row.original || row.name }}
                  <span v-if="isAdjusted(row)" class="adjusted">Ajustado</span>
                </span>
                <span v-if="row.pantryQuantity === null" class="stock missing">
                  Não está na despensa — não será descontado
                </span>
                <span v-else class="stock">
                  Na despensa: {{ formatQuantity(row.pantryQuantity) }} {{ unitLabel(row.unit) }}
                </span>
              </div>

              <div v-if="row.pantryQuantity !== null" class="quantity-control">
                <button
                  type="button"
                  class="step-btn"
                  :aria-label="`Diminuir quantidade de ${row.name}`"
                  @click="step(row, -1)"
                >
                  −
                </button>
                <input
                  v-model.number="row.amount"
                  type="number"
                  class="quantity-input"
                  min="0"
                  step="any"
                  inputmode="decimal"
                  :aria-label="`Quantidade de ${row.name}`"
                />
                <span class="unit">{{ unitLabel(row.unit) }}</span>
                <button
                  type="button"
                  class="step-btn"
                  :aria-label="`Aumentar quantidade de ${row.name}`"
                  @click="step(row, 1)"
                >
                  +
                </button>
              </div>
            </li>
          </ul>
        </template>
      </div>

      <footer class="footer">
        <button type="button" class="btn-secondary" @click="emit('cancel')">Cancelar</button>
        <button type="button" class="btn-primary" @click="confirm">Confirmar refeição</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.55);
}

.dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 540px;
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

.header h2 {
  margin: 0;
  font-size: 1.2rem;
}

.subtitle {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: #6b7280;
}

.close-btn {
  width: 40px;
  height: 40px;
  min-height: 0;
  padding: 0;
  flex: none;
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
  padding: 14px 20px;
  overflow-y: auto;
}

.intro {
  margin: 0 0 12px;
  color: #4b5563;
  font-size: 0.9rem;
  line-height: 1.5;
}

.empty {
  margin: 8px 0;
  color: #6b7280;
  font-size: 0.9rem;
  text-align: center;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.deductible {
  font-size: 0.8rem;
  color: #6b7280;
}

.reset-btn {
  width: auto;
  min-height: 0;
  padding: 4px 8px;
  background: transparent;
  color: #198754;
  font-size: 0.85rem;
  text-decoration: underline;
}

.ingredient-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ingredient-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 10px;
  background: #fff;
}

.ingredient-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ingredient-name {
  font-weight: 500;
}

.adjusted {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: 0.7rem;
  font-weight: 600;
  vertical-align: middle;
}

.stock {
  font-size: 0.78rem;
  color: #6b7280;
}

.stock.missing {
  color: #b45309;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.step-btn {
  width: 36px;
  height: 36px;
  min-height: 0;
  padding: 0;
  flex: none;
  border: 1px solid #94a3b8;
  border-radius: 50%;
  background: #fff;
  color: #1f2937;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}

.quantity-input {
  width: 88px;
  min-height: 36px;
  padding: 4px 8px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.unit {
  min-width: 24px;
  font-size: 0.85rem;
  color: #6b7280;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--color-border, #ddd);
}

.footer button {
  width: auto;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 8px;
}

.btn-secondary {
  background: #e9ecef;
  color: #333;
}

.btn-primary {
  background: #198754;
  color: #fff;
}

@media (min-width: 600px) {
  .ingredient-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
}
</style>
