<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { DIETS } from '@/domain/diet'
import { deleteProfile, findAll, getActiveProfileId } from '@/services/profiles'
import type { Profile } from '@/types/profile'

const router = useRouter()
const profiles = ref<Profile[]>(findAll())
const activeProfileId = ref<string | null>(getActiveProfileId())
const message = ref('')

function refresh() {
  profiles.value = findAll()
  activeProfileId.value = getActiveProfileId()
}

function editProfile(profile: Profile) {
  router.push({ name: 'setup', query: { id: profile.id, from: 'settings' } })
}

function newProfile() {
  router.push({ name: 'setup', query: { new: 'true', from: 'settings' } })
}

function goBack() {
  router.push({ name: 'dashboard' })
}

function removeProfile(profile: Profile) {
  if (profiles.value.length === 1) {
    message.value = 'Não é possível eliminar o último perfil.'
    return
  }

  if (!window.confirm(`Eliminar o perfil "${profile.name}"?`)) return

  const result = deleteProfile(profile.id)

  if (result.status === 'last-profile') {
    message.value = 'Não é possível eliminar o último perfil.'
  } else if (result.status === 'not-found') {
    message.value = 'O perfil já não existe.'
  } else if (result.activeProfileChanged) {
    const next = profiles.value.find((p) => p.id === result.newActiveProfileId)
    message.value = `Perfil eliminado. O perfil ativo passou a ser "${next?.name ?? ''}".`
  } else {
    message.value = 'Perfil eliminado.'
  }

  refresh()
}
</script>

<template>
  <main class="page-container">
    <header class="page-header">
      <h2>Definições</h2>
      <button type="button" class="back-link" @click="goBack">Voltar</button>
    </header>

    <p v-if="message" class="alert" role="status">{{ message }}</p>

    <ul class="profile-list">
      <li v-for="profile in profiles" :key="profile.id" class="profile-item">
        <div class="profile-info">
          <span class="profile-name">
            {{ profile.name }}
            <span v-if="profile.id === activeProfileId" class="badge">Ativo</span>
          </span>
          <span class="profile-diet">{{ DIETS[profile.diet] ?? profile.diet }}</span>
        </div>

        <div class="profile-actions">
          <button type="button" class="btn-edit" @click="editProfile(profile)">Editar</button>
          <button
            type="button"
            class="btn-delete"
            :class="{ 'is-disabled': profiles.length === 1 }"
            :aria-disabled="profiles.length === 1"
            @click="removeProfile(profile)"
          >
            Eliminar
          </button>
        </div>
      </li>
    </ul>

    <button type="button" class="btn-new" @click="newProfile">Novo perfil</button>
  </main>
</template>

<style scoped>
.page-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.back-link {
  width: auto;
  color: #198754;
  text-decoration: underline;
  cursor: pointer;
  background: none;
  border: none;
  font-size: 0.95rem;
  padding: 0;
}

.alert {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.profile-list {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.profile-name {
  font-size: 1rem;
  font-weight: 500;
}

.profile-diet {
  font-size: 0.875rem;
  color: #64748b;
}

.badge {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  background: #dcfce7;
  color: #166534;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.profile-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-edit,
.btn-delete {
  width: auto;
  min-height: 36px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-edit {
  background: transparent;
  color: #475569;
  border: 1px solid #94a3b8;
}

.btn-delete {
  background: transparent;
  color: #dc2626;
  border: 1px solid #fca5a5;
}

.btn-delete:hover:not(.is-disabled) {
  background: #fee2e2;
}

.btn-delete.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-new {
  width: auto;
  padding-inline: 1.25rem;
}
</style>
