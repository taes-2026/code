<script setup lang="ts">
import { useRouter } from 'vue-router'
import { signOut } from 'firebase/auth'
import { auth } from '@/firebase'

const router = useRouter()
const user = auth.currentUser

async function logout() {
  await signOut(auth)
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="dashboard">
    <header>
      <h1>Dashboard</h1>
      <button class="secondary" @click="logout">Sair</button>
    </header>

    <main>
      <p>Bem-vindo, {{ user?.email }}</p>
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

main {
  padding: 1rem;
}

@media (min-width: 768px) {
  .dashboard {
    max-width: 960px;
    margin: 0 auto;
  }
}
</style>
