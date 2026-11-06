<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import DateInput from '@/components/DateInput.vue'
import { getExpirationDateRange, parseDateOnly } from '@/domain/expiration'
import { UNITS, type ItemCategory, type ItemUnit } from '@/domain/items' // Removed CATEGORIES
import { getCategories } from '@/services/categories' // ADD THIS
import { create } from '@/services/items'

interface ItemEntryForm {
  name: string
  category: ItemCategory
  quantity: number
  unit: ItemUnit
  expirationDate: string
}

const router = useRouter()
const form = reactive<ItemEntryForm>({
  name: '',
  category: 'other',
  quantity: 1,
  unit: 'unit',
  expirationDate: '',
})
const dateRange = getExpirationDateRange(new Date())
const error = ref('')
const loading = ref(false)
const categoriesList = getCategories()

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-PT')
}

async function save() {
  error.value = ''

  if (!form.name.trim()) {
    error.value = 'Indica o nome do produto.'

    return
  }

  if (!Number.isFinite(form.quantity) || form.quantity <= 0) {
    error.value = 'A quantidade deve ser maior do que zero.'

    return
  }

  if (!parseDateOnly(form.expirationDate)) {
    error.value = 'Indica uma data de validade válida.'

    return
  }

  if (form.expirationDate < dateRange.min || form.expirationDate > dateRange.max) {
    error.value = `A data de validade tem de estar entre ${formatDate(dateRange.min)} e ${formatDate(dateRange.max)}.`

    return
  }

  loading.value = true

  try {
    create({
      name: form.name.trim(),
      category: form.category,
      quantity: form.quantity,
      unit: form.unit,
      expirationDate: form.expirationDate,
    })
    await router.push({ name: 'dashboard' })
  } catch {
    error.value = 'Não foi possível guardar o produto.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="entry">
    <header>
      <h1>Introduzir produto</h1>
      <RouterLink :to="{ name: 'product-entry' }" class="back">Voltar</RouterLink>
    </header>

    <form @submit.prevent="save">
      <label>
        Nome do produto
        <input v-model.trim="form.name" type="text" autocomplete="off" maxlength="80" required />
      </label>

      <label>
        Categoria
        <select v-model="form.category" required>
          <option v-for="(label, id) in categoriesList" :key="id" :value="id">{{ label }}</option>
        </select>
      </label>

      <label>
        Quantidade
        <input v-model.number="form.quantity" type="number" min="0.01" step="0.01" required />
      </label>

      <label>
        Unidade
        <select v-model="form.unit" required>
          <option v-for="(label, id) in UNITS" :key="id" :value="id">{{ label }}</option>
        </select>
      </label>

      <label>
        Data de validade
        <DateInput
          v-model="form.expirationDate"
          :min="dateRange.min"
          :max="dateRange.max"
          required
        />
      </label>

      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? 'A guardar...' : 'Guardar produto' }}
      </button>
    </form>
  </main>
</template>

<style scoped>
.entry {
  min-height: 100dvh;
  padding: 1.5rem;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

h1 {
  font-size: 1.25rem;
}

.back {
  font-size: 0.875rem;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.error {
  color: var(--color-error);
  font-size: 0.875rem;
}

@media (min-width: 768px) {
  .entry {
    max-width: 480px;
    margin: 0 auto;
  }
}
</style>
