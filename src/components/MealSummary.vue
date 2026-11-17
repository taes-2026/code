<script setup lang="ts">
import { computed } from 'vue'
import { buildMealSummary } from '@/domain/mealSummary'
import type { RecipeDetails } from '@/services/recipes'

const props = defineProps<{ recipe: RecipeDetails }>()

const summary = computed(() => buildMealSummary(props.recipe))
const hasNutrition = computed(() => summary.value.nutrients.length > 0)

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}%`
}
</script>

<template>
  <section class="meal-summary" aria-label="Resumo da refeição">
    <header class="summary-header">
      <h3>Resumo da refeição</h3>
      <p class="recipe-name">{{ summary.title }}</p>
      <ul class="facts">
        <li>
          <strong>{{ summary.servings }}</strong>
          <span>Porções</span>
        </li>
        <li>
          <strong>{{ summary.readyInMinutes }} min</strong>
          <span>Tempo total</span>
        </li>
        <li v-if="summary.calories">
          <strong>{{ summary.calories.amount }} {{ summary.calories.unit }}</strong>
          <span>Calorias / porção</span>
        </li>
      </ul>
    </header>

    <section class="block">
      <h4>Ingredientes</h4>
      <ul v-if="summary.ingredients.length" class="ingredient-list">
        <li
          v-for="(ingredient, index) in summary.ingredients"
          :key="`${ingredient.name}-${index}`"
        >
          {{ ingredient.original }}
        </li>
      </ul>
      <p v-else class="muted">Sem ingredientes disponíveis.</p>
    </section>

    <section class="block">
      <h4>Informação nutricional <small>por porção</small></h4>
      <table v-if="hasNutrition" class="nutrition-table">
        <thead>
          <tr>
            <th scope="col">Nutriente</th>
            <th scope="col">Quantidade</th>
            <th scope="col">% diário</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="nutrient in summary.nutrients" :key="nutrient.name">
            <td>{{ nutrient.name }}</td>
            <td>{{ nutrient.amount }} {{ nutrient.unit }}</td>
            <td>{{ formatPercent(nutrient.percentOfDailyNeeds) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">Informação nutricional indisponível para esta receita.</p>
    </section>
  </section>
</template>

<style scoped>
.meal-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  text-align: left;
}

.summary-header h3 {
  margin: 0 0 4px;
  font-size: 1.15rem;
  color: #198754;
}

.recipe-name {
  margin: 0;
  font-weight: 600;
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.facts li {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 88px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  background: #fff;
}

.facts span {
  font-size: 0.75rem;
  color: #6b7280;
}

.block {
  padding: 14px 16px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 12px;
  background: #fff;
}

.block h4 {
  margin: 0 0 10px;
  font-size: 0.95rem;
  color: #198754;
}

.block h4 small {
  color: #6b7280;
  font-weight: 400;
}

.ingredient-list {
  margin: 0;
  padding-left: 20px;
  line-height: 1.6;
}

.muted {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.nutrition-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.nutrition-table th,
.nutrition-table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border, #eee);
  text-align: left;
}

.nutrition-table th:not(:first-child),
.nutrition-table td:not(:first-child) {
  text-align: right;
}

.nutrition-table th {
  color: #6b7280;
  font-weight: 600;
}
</style>
