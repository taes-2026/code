<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { CATEGORIES, UNITS } from '@/domain/items'
import { find } from '@/services/profiles'
import { findAll } from '@/services/items'
import type { InventoryItem } from '@/types/item'

const router = useRouter()
const profile = find()
const items = ref<InventoryItem[]>(findAll())

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-PT')
}

function addProduct() {
  router.push({ name: 'product-entry' })
}

function editProfile() {
  router.push({ name: 'setup' })
}
</script>

<template>
  <div class="dashboard">
    <header>
      <h1>Dashboard</h1>
      <button class="secondary" @click="editProfile">Editar perfil</button>
    </header>

    <main>
      <p>Bem-vindo, {{ profile?.name }}</p>

      <button class="add" @click="addProduct">Adicionar produto</button>

      <h2>Inventário</h2>
      <p v-if="items.length === 0">Sem comida no seu inventário</p>
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
