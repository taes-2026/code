<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { FirebaseError } from 'firebase/app'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'

const router = useRouter()
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

const errorMessages: Record<string, string> = {
  'auth/email-already-in-use': 'Já existe uma conta com este email.',
  'auth/invalid-email': 'Email inválido.',
  'auth/weak-password': 'A palavra-passe deve ter pelo menos 6 caracteres.',
}

async function register() {
  error.value = ''
  if (password.value !== confirmPassword.value) {
    error.value = 'As palavras-passe não coincidem.'
    return
  }

  loading.value = true
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email.value, password.value)
    // Cria o documento users/{uid}, onde fica a subcoleção items
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      createdAt: serverTimestamp(),
    })
    router.push({ name: 'dashboard' })
  } catch (e) {
    const code = e instanceof FirebaseError ? e.code : ''
    error.value = errorMessages[code] ?? 'Não foi possível criar a conta.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth">
    <h1>Criar conta</h1>

    <form @submit.prevent="register">
      <label>
        Email
        <input v-model="email" type="email" autocomplete="email" required />
      </label>

      <label>
        Palavra-passe
        <input v-model="password" type="password" autocomplete="new-password" minlength="6" required />
      </label>

      <label>
        Confirmar palavra-passe
        <input v-model="confirmPassword" type="password" autocomplete="new-password" required />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? 'A criar...' : 'Criar conta' }}
      </button>
    </form>

    <p class="switch">
      Já tens conta? <RouterLink :to="{ name: 'login' }">Entrar</RouterLink>
    </p>
  </main>
</template>
