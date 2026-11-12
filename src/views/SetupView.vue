<script setup lang="ts">
import '@/assets/setup.css'

import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ALLERGIES, DIETS, RESTRICTIONS } from '@/domain/diet'
import { create, findAll, find, hasProfile, save } from '@/services/profiles'
import type { ProfileForm } from '@/types/profile'

const router = useRouter()
const route = useRoute()

const isNew = route.query.new === 'true' || !hasProfile()
const profileId = typeof route.query.id === 'string' ? route.query.id : undefined
const existing = !isNew
  ? (profileId ? findAll().find((p) => p.id === profileId) ?? find() : find())
  : null
const isEditing = existing !== null

const form = reactive<ProfileForm>(
  existing
    ? {
        name: existing.name,
        diet: existing.diet,
        allergies: [...existing.allergies],
        restrictions: [...existing.restrictions],
      }
    : {
        name: '',
        diet: 'omnivore',
        allergies: [],
        restrictions: [],
      },
)
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''

  if (!form.name.trim()) {
    error.value = 'Indica o nome do perfil.'

    return
  }

  loading.value = true

  try {
    if (isNew) {
      create({ ...form, name: form.name.trim() }, true)
    } else {
      save({ ...form, name: form.name.trim() }, existing?.id)
    }
    await router.push({ name: 'dashboard' })
  } catch {
    error.value = 'Não foi possível guardar o perfil.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth setup">
    <h1>{{ isEditing ? 'Editar perfil' : 'Novo perfil' }}</h1>

    <form @submit.prevent="submit">
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
        {{ loading ? '...' : isEditing ? 'Guardar alterações' : 'Começar' }}
      </button>

      <router-link v-if="hasProfile()" to="/dashboard" class="switch">
        Cancelar e voltar à dashboard
      </router-link>
    </form>
  </main>
</template>
