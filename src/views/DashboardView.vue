<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ExpirationAlert from '@/components/ExpirationAlert.vue'
import { CATEGORIES, UNITS } from '@/domain/items'
import { find } from '@/services/profiles'
import { findAll, subscribe } from '@/services/items'
import type { InventoryItem } from '@/types/item'
import { getCategories } from '@/services/categories'

const router = useRouter()
const profile = find()
const items = ref<InventoryItem[]>(findAll())
const now = ref(new Date())
const categoriesList = getCategories()

let unsubscribe: (() => void) | undefined
let clock: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  unsubscribe = subscribe((value) => {
    items.value = value
  })
  // Atualiza o "agora" para os alertas mudarem com o passar do tempo.
  clock = setInterval(() => {
    now.value = new Date()
  }, 60_000)
})

onUnmounted(() => {
  unsubscribe?.()
  clearInterval(clock)
})

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-PT')
}

function addProduct() {
  router.push({ name: 'product-entry' })
}

function editProfile() {
  router.push({ name: 'setup' })
}

function addCategory(){
  router.push({name: 'category-entry'})
}

</script>

<template>
  <div class="dashboard">
    <header>
      <h1>Dashboard</h1>
      <button class="secondary" @click="editProfile">Editar perfil</button>
    </header>

    <main>
      <ExpirationAlert :items="items" :now="now" />

      <p>Bem-vindo, {{ profile?.name }}</p>

      <div class="action-buttons" style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button class="add" @click="addProduct">Adicionar produto</button>
        <button class="add" @click="addCategory">Adicionar categoria</button>
      </div>

      <h2>Dispensa</h2>
      <p v-if="items.length === 0">Sem comida na sua dispensa</p>
      <table v-else>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Categoria</th>
            <th>Quantidade</th>
            <th>Validade</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ CATEGORIES[item.category] ?? item.category }}</td>
            <td>{{ item.quantity }} {{ UNITS[item.unit] ?? item.unit }}</td>
            <td>{{ formatDate(item.expirationDate) }}</td>
          </tr>
        </tbody>
      </table>
    </main>
  </div>
</template>

<style scoped>
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

h1 {
  font-size: 1.25rem;
}

h2 {
  font-size: 1.1rem;
  margin-top: 1.5rem;
}

main {
  padding: 1rem;
}

.add {
  width: auto;
  margin-top: 1rem;
  padding-inline: 1.25rem;
}

.error {
  color: var(--color-error);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  padding: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

@media (min-width: 768px) {
  .dashboard {
    max-width: 960px;
    margin: 0 auto;
  }
}
</style>
