<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { signOut } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { CATEGORIES, UNITS } from '@/domain/items'
import type { InventoryItem } from '@/types/item'

const router = useRouter()
const user = auth.currentUser
const items = ref<InventoryItem[]>([])
const loading = ref(true)
const error = ref('')

// Os items de cada utilizador ficam em users/{uid}/items
async function loadItems() {
  if (!user) return
  try {
    const data = await getDocs(collection(db, 'users', user.uid, 'items'))
    items.value = data.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as InventoryItem)
  } catch {
    error.value = 'Não foi possível carregar o inventário.'
  } finally {
    loading.value = false
  }
}

function addProduct() {
  router.push({ name: 'product-entry' })
}

async function logout() {
  await signOut(auth)
  router.push({ name: 'login' })
}

onMounted(loadItems)
</script>

<template>
  <div class="dashboard">
    <header>
      <h1>Dashboard</h1>
      <button class="secondary" @click="logout">Sair</button>
    </header>

    <main>
      <p>Bem-vindo, {{ user?.email }}</p>

      <button class="add" @click="addProduct">Adicionar produto</button>

      <h2>Inventário</h2>
      <p v-if="loading">A carregar...</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-else-if="items.length === 0">Sem comida no seu inventário</p>
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
            <td>{{ item.expirationDate.toDate().toLocaleDateString('pt-PT') }}</td>
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
