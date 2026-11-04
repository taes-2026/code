<script setup lang="ts">
import '@/assets/setup.css'

import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ALLERGIES, DIETS, RESTRICTIONS } from '@/domain/diet'
import { auth } from '@/firebase'
import { createProfile } from '@/services/profiles'
import type { ProfileForm } from '@/types/profile'

const router = useRouter()
const form = reactive<ProfileForm>({
  name: '',
  diet: 'omnivore',
  allergies: [],
  restrictions: [],
})
const error = ref('')
const loading = ref(false)

async function save() {
  error.value = ''

  const user = auth.currentUser

  if (!user) {
    await router.replace({ name: 'login' })

    return
  }

  loading.value = true

  try {
    await createProfile(user.uid, { ...form })
    await router.push({ name: 'dashboard' })
  } catch {
    error.value = 'ERRO: Erro ao salvar o perfil'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth setup">
    <h1>Configurar perfil</h1>

    <form @submit.prevent="save">
      <label>
        Nome do perfil
        <input v-model.trim="form.name" type="text" autocomplete="name" maxlength="80" required />
      </label>

      <label>
        Dieta
        <select v-model="form.diet" required>
          <option v-for="(label, id) in DIETS" :key="id" :value="id">
            {{ label }}
          </option>
        </select>
      </label>

      <fieldset>
        <legend>Alergias</legend>
        <label v-for="(label, id) in ALLERGIES" :key="id" class="check">
          <input v-model="form.allergies" type="checkbox" :value="id" />
          {{ label }}
        </label>
      </fieldset>

      <fieldset>
        <legend>Restricoes</legend>
        <label v-for="(label, id) in RESTRICTIONS" :key="id" class="check">
          <input v-model="form.restrictions" type="checkbox" :value="id" />
          {{ label }}
        </label>
      </fieldset>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? '...' : 'Começar' }}
      </button>
    </form>
  </main>
</template>
