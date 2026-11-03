<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function login() {
  error.value = ''
  loading.value = true
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push({ name: 'dashboard' })
  } catch {
    error.value = 'Email ou palavra-passe inválidos.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth">
    <h1>SmartPantry</h1>

    <form @submit.prevent="login">
      <label>
        Email
        <input v-model="email" type="email" autocomplete="email" required />
      </label>

      <label>
        Palavra-passe
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? 'A entrar...' : 'Entrar' }}
      </button>
    </form>

    <p class="switch">
      Ainda não tens conta? <RouterLink :to="{ name: 'register' }">Criar conta</RouterLink>
    </p>
  </main>
</template>

