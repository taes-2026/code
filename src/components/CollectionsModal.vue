<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useBookmarks } from '@/stores/bookmarks'
import type { RecipeReference } from '@/types/bookmark'

const props = defineProps<{ recipe?: RecipeReference }>()
const emit = defineEmits<{ close: [] }>()

const { state, setCollections, createCollection, deleteCollection } = useBookmarks()

const newName = ref('')
const error = ref('')

const selectedIds = computed(() => {
  if (!props.recipe) return []

  return state.bookmarks.find((bookmark) => bookmark.id === props.recipe?.id)?.collectionIds ?? []
})

function countIn(collectionId: string): number {
  return state.bookmarks.filter((bookmark) => bookmark.collectionIds.includes(collectionId)).length
}

function toggleCollection(collectionId: string) {
  if (!props.recipe) return

  const next = selectedIds.value.includes(collectionId)
    ? selectedIds.value.filter((id) => id !== collectionId)
    : [...selectedIds.value, collectionId]

  setCollections(props.recipe.id, next)
}

function create() {
  error.value = ''

  try {
    const collection = createCollection(newName.value)

    if (props.recipe) {
      setCollections(props.recipe.id, [...selectedIds.value, collection.id])
    }

    newName.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro desconhecido'
  }
}

function remove(collectionId: string, name: string) {
  if (!window.confirm(`Eliminar a coleção "${name}"? As receitas continuam nos guardados.`)) return

  deleteCollection(collectionId)
}

let previousOverflow = ''

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      :aria-label="recipe ? `Coleções de ${recipe.title}` : 'Coleções'"
    >
      <header class="header">
        <div>
          <h2>{{ recipe ? 'Guardar numa coleção' : 'Coleções' }}</h2>
          <p v-if="recipe" class="subtitle">{{ recipe.title }}</p>
        </div>
        <button class="close-btn" aria-label="Fechar" @click="emit('close')">×</button>
      </header>

      <div class="body">
        <p v-if="state.collections.length === 0" class="empty">
          Ainda não tens coleções. Cria uma abaixo.
        </p>

        <ul v-else class="collection-list">
          <li v-for="collection in state.collections" :key="collection.id">
            <label v-if="recipe" class="collection">
              <input
                type="checkbox"
                :checked="selectedIds.includes(collection.id)"
                @change="toggleCollection(collection.id)"
              />
              <span class="name">{{ collection.name }}</span>
              <span class="count">{{ countIn(collection.id) }}</span>
            </label>

            <div v-else class="collection static">
              <span class="name">{{ collection.name }}</span>
              <span class="count">{{ countIn(collection.id) }}</span>
              <button
                class="delete-btn"
                :aria-label="`Eliminar coleção ${collection.name}`"
                @click="remove(collection.id, collection.name)"
              >
                ×
              </button>
            </div>
          </li>
        </ul>

        <form class="create-form" @submit.prevent="create">
          <input v-model="newName" type="text" maxlength="60" placeholder="Nome da nova coleção" />
          <button type="submit" :disabled="!newName.trim()">Criar</button>
        </form>

        <p v-if="error" class="error">{{ error }}</p>
      </div>

      <footer class="footer">
        <button class="btn-secondary" @click="emit('close')">Concluir</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1100;
}

.modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  background: var(--color-background, #fff);
  color: var(--color-text, #222);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #ddd);
}

.header h2 {
  margin: 0;
  font-size: 1.2rem;
}

.subtitle {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: #666;
}

.close-btn {
  width: 32px;
  height: 32px;
  min-height: 0;
  padding: 0;
  flex: none;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.body {
  padding: 12px 20px;
  overflow-y: auto;
}

.empty {
  margin: 8px 0 16px;
  color: #666;
  font-size: 0.9rem;
  text-align: center;
}

.collection-list {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
}

.collection {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 8px;
}

label.collection {
  cursor: pointer;
}

label.collection:hover {
  background: rgba(0, 0, 0, 0.04);
}

.collection input {
  width: 18px;
  height: 18px;
  min-height: 0;
  accent-color: #198754;
}

.name {
  flex: 1;
}

.count {
  font-size: 0.8rem;
  color: #666;
  font-variant-numeric: tabular-nums;
}

.delete-btn {
  width: 28px;
  height: 28px;
  min-height: 0;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #dc3545;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
}

.delete-btn:hover {
  background: rgba(220, 53, 69, 0.12);
}

.create-form {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.create-form input {
  flex: 1;
  min-width: 0;
}

.create-form button {
  width: auto;
  min-height: 0;
  flex: none;
  padding: 0 16px;
  border-radius: 8px;
  background: #198754;
  color: #fff;
}

.create-form button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  margin: 8px 0 0;
  color: #dc3545;
  font-size: 0.85rem;
}

.footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid var(--color-border, #ddd);
}

.btn-secondary {
  width: auto;
  min-height: 0;
  padding: 8px 16px;
  border-radius: 8px;
  background: #e9ecef;
  color: #333;
}
</style>
