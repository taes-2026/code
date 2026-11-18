<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ExpirationAlert from '@/components/ExpirationAlert.vue'
import { CATEGORIES, UNITS } from '@/domain/items'
import { DIETS } from '@/domain/diet'
import { findAll as findAllProfiles, getActiveProfile, switchProfile } from '@/services/profiles'
import { findAll, subscribe } from '@/services/items'
import type { InventoryItem } from '@/types/item'
import type { Profile } from '@/types/profile'

const router = useRouter()
const profiles = ref<Profile[]>(findAllProfiles())
const profile = ref<Profile | null>(getActiveProfile())
const items = ref<InventoryItem[]>(findAll())
const now = ref(new Date())

let unsubscribe: (() => void) | undefined
let clock: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  unsubscribe = subscribe((value) => {
    items.value = value
  })
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

function onSwitchProfile(event: Event) {
  const target = event.target as HTMLSelectElement
  if (!target.value) return
  const switched = switchProfile(target.value)
  profile.value = switched
}

function newProfile() {
  router.push({ name: 'setup', query: { new: 'true' } })
}

function editProfile() {
  if (profile.value) {
    router.push({ name: 'setup', query: { id: profile.value.id } })
  } else {
    router.push({ name: 'setup' })
  }
}

function addProduct() {
  router.push({ name: 'product-entry' })
}

function addCategory() {
  router.push({ name: 'category-entry' })
}

function recipies() {
  router.push({ name: 'recipes' })
}

function bookmarks() {
  router.push({ name: 'bookmarks' })
}
</script>

<template>
  <div class="dashboard">
    <header>
      <h1>Dashboard</h1>
      <div class="profile-controls">
        <label for="profile-select" class="profile-label">Perfil:</label>
        <select
          id="profile-select"
          class="profile-select"
          :value="profile?.id"
          @change="onSwitchProfile"
        >
          <option v-for="p in profiles" :key="p.id" :value="p.id">
            {{ p.name }} ({{ DIETS[p.diet] ?? p.diet }})
          </option>
        </select>
        <button class="secondary btn-profile" @click="newProfile">+ Novo</button>
        <button class="secondary btn-profile" @click="editProfile">Editar</button>
      </div>
    </header>

    <main>
      <ExpirationAlert :items="items" :now="now" />

      <p class="welcome-text">
        Bem-vindo, <strong>{{ profile?.name }}</strong>
        <span v-if="profile" class="profile-diet-badge">({{ DIETS[profile.diet] ?? profile.diet }})</span>
      </p>

      <div class="action-buttons" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
        <button class="add" @click="addProduct">Adicionar produto</button>
        <button class="add" @click="addCategory">Adicionar categoria</button>
        <button class="recipe" @click="recipies">Procurar receitas</button>
        <button class="recipe" @click="bookmarks">Receitas guardadas</button>
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
  gap: 1rem;
  flex-wrap: wrap;
}

h1 {
  font-size: 1.25rem;
}

.profile-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.profile-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.profile-select {
  width: auto;
  min-height: 36px;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.btn-profile {
  width: auto;
  min-height: 36px;
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
}

.welcome-text {
  margin-bottom: 1rem;
}

.profile-diet-badge {
  color: #6b7280;
  font-size: 0.9rem;
  margin-left: 0.25rem;
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

.recipe {
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
