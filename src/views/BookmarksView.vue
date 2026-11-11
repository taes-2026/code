<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BookmarkButton from '@/components/BookmarkButton.vue'
import CollectionsModal from '@/components/CollectionsModal.vue'
import RecipeDetailModal from '@/components/RecipeDetailModal.vue'
import { useBookmarks } from '@/stores/bookmarks'
import type { RecipeBookmark, RecipeReference } from '@/types/bookmark'

const { state, bookmarksOf, deleteCollection } = useBookmarks()

const selectedCollectionId = ref<string | null>(null)
const selectedRecipeId = ref<number | null>(null)
const pickerRecipe = ref<RecipeReference | null>(null)
const showCollections = ref(false)

const visibleBookmarks = computed(() => bookmarksOf(selectedCollectionId.value))

watch(
  () => state.collections,
  (collections) => {
    if (
      selectedCollectionId.value !== null &&
      !collections.some((collection) => collection.id === selectedCollectionId.value)
    ) {
      selectedCollectionId.value = null
    }
  },
  { deep: true },
)

function collectionNames(bookmark: RecipeBookmark): string[] {
  return state.collections
    .filter((collection) => bookmark.collectionIds.includes(collection.id))
    .map((collection) => collection.name)
}

function openPicker(bookmark: RecipeBookmark) {
  pickerRecipe.value = { id: bookmark.id, title: bookmark.title, image: bookmark.image }
}

function removeCollection(id: string, name: string) {
  if (!window.confirm(`Eliminar a coleção "${name}"? As receitas continuam nos guardados.`)) return

  deleteCollection(id)
}
</script>

<template>
  <main class="page-container">
    <header class="page-header">
      <h2>Receitas guardadas</h2>
      <router-link to="/dashboard" class="back-link">Voltar</router-link>
    </header>

    <div class="toolbar">
      <p class="summary">
        {{ state.bookmarks.length }}
        {{ state.bookmarks.length === 1 ? 'receita guardada' : 'receitas guardadas' }}
      </p>
      <button type="button" class="btn-secondary" @click="showCollections = true">
        Gerir coleções
      </button>
    </div>

    <nav v-if="state.collections.length" class="filters" aria-label="Filtrar por coleção">
      <button
        type="button"
        class="chip"
        :class="{ active: selectedCollectionId === null }"
        @click="selectedCollectionId = null"
      >
        Todas ({{ state.bookmarks.length }})
      </button>
      <span v-for="collection in state.collections" :key="collection.id" class="chip-group">
        <button
          type="button"
          class="chip"
          :class="{ active: selectedCollectionId === collection.id }"
          @click="selectedCollectionId = collection.id"
        >
          {{ collection.name }}
          ({{ state.bookmarks.filter((b) => b.collectionIds.includes(collection.id)).length }})
        </button>
        <button
          type="button"
          class="chip-delete"
          :aria-label="`Eliminar coleção ${collection.name}`"
          @click="removeCollection(collection.id, collection.name)"
        >
          ×
        </button>
      </span>
    </nav>

    <p v-if="state.bookmarks.length === 0" class="status">
      Ainda não guardaste receitas. Abre uma receita e toca no marcador para a guardares aqui.
    </p>
    <p v-else-if="visibleBookmarks.length === 0" class="status">Nenhuma receita nesta coleção.</p>

    <div v-else class="recipe-grid">
      <article
        v-for="bookmark in visibleBookmarks"
        :key="bookmark.id"
        class="recipe-card"
        role="button"
        tabindex="0"
        @click="selectedRecipeId = bookmark.id"
        @keydown.enter="selectedRecipeId = bookmark.id"
      >
        <div class="card-media">
          <img :src="bookmark.image" :alt="bookmark.title" loading="lazy" />
          <BookmarkButton
            class="card-bookmark"
            :recipe="{ id: bookmark.id, title: bookmark.title, image: bookmark.image }"
            @longpress="openPicker(bookmark)"
          />
        </div>

        <div class="card-body">
          <h3>{{ bookmark.title }}</h3>

          <div v-if="collectionNames(bookmark).length" class="badges">
            <span v-for="name in collectionNames(bookmark)" :key="name" class="badge">
              {{ name }}
            </span>
          </div>

          <button
            type="button"
            class="collections-btn"
            @click.stop="openPicker(bookmark)"
            @keydown.stop
          >
            {{ collectionNames(bookmark).length ? 'Editar coleções' : 'Adicionar a coleção' }}
          </button>
        </div>
      </article>
    </div>

    <RecipeDetailModal
      v-if="selectedRecipeId !== null"
      :recipe-id="selectedRecipeId"
      @close="selectedRecipeId = null"
    />

    <CollectionsModal v-if="pickerRecipe" :recipe="pickerRecipe" @close="pickerRecipe = null" />

    <CollectionsModal v-if="showCollections" @close="showCollections = false" />
  </main>
</template>

<style scoped>
.page-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 16px 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.back-link {
  color: #198754;
  text-decoration: underline;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.summary {
  color: #666;
  font-size: 0.9rem;
}

.btn-secondary {
  width: auto;
  min-height: 0;
  padding: 8px 16px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  background: transparent;
  color: var(--color-text, #333);
  cursor: pointer;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.chip-group {
  position: relative;
  display: inline-flex;
}

.chip {
  width: auto;
  min-height: 36px;
  padding: 6px 12px;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text, #333);
  font-size: 0.85rem;
  cursor: pointer;
}

.chip.active {
  background: #198754;
  border-color: #198754;
  color: #fff;
}

.chip-delete {
  width: 22px;
  height: 22px;
  min-height: 0;
  padding: 0;
  position: absolute;
  top: -6px;
  right: -6px;
  border: none;
  border-radius: 50%;
  background: #dc3545;
  color: #fff;
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
  opacity: 1;
  transition: opacity 0.15s;
}

@media (hover: hover) and (pointer: fine) {
  .chip-delete {
    opacity: 0;
  }

  .chip-group:hover .chip-delete,
  .chip-delete:focus-visible {
    opacity: 1;
  }
}

.status {
  text-align: center;
  color: #666;
  padding: 32px 8px;
}

.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.recipe-card {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-background, #fff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition:
    transform 0.15s,
    box-shadow 0.15s;
  cursor: pointer;
}

.recipe-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
}

.card-media {
  position: relative;
}

.card-media img {
  width: 100%;
  aspect-ratio: 312 / 231;
  object-fit: cover;
  display: block;
}

.card-bookmark {
  position: absolute;
  top: 8px;
  right: 8px;
}

.card-body {
  padding: 12px;
}

.card-body h3 {
  font-size: 1rem;
  margin: 0 0 8px;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.badge {
  padding: 2px 10px;
  border-radius: 999px;
  background: #e9ecef;
  color: #333;
  font-size: 0.75rem;
}

.collections-btn {
  width: auto;
  min-height: 40px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  background: transparent;
  color: #198754;
  font-size: 0.85rem;
  text-decoration: underline;
  cursor: pointer;
}
</style>
