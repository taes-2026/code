<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { searchRecipes, type RecipeSummary, searchRecipesByIngredients } from '@/services/recipes'
import RecipeDetailModal from '@/components/RecipeDetailModal.vue'
import ChoosePantrysForSearchModal from '@/components/ChoosePantrysForSearchModal.vue'
import BookmarkButton from '@/components/BookmarkButton.vue'
import CollectionsModal from '@/components/CollectionsModal.vue'
import type { RecipeReference } from '@/types/bookmark'

const recipes = ref<RecipeSummary[]>([])
const query = ref('')
const loading = ref(false)
const error = ref('')
const selectedRecipeId = ref<number | null>(null)
const pickerRecipe = ref<RecipeReference | null>(null)
const showIngredientsModal = ref(false)
const ingredients = ref<string[]>([])

function openCollections(recipe: RecipeSummary) {
    pickerRecipe.value = { id: recipe.id, title: recipe.title, image: recipe.image }
}

async function onIngredientsConfirm(selected: string[]) {
    ingredients.value = selected
    showIngredientsModal.value = false
    loading.value = true
    error.value = ''
    try {
        recipes.value = await searchRecipesByIngredients(selected)
    } catch (e) {
        error.value = e instanceof Error ? e.message : 'Erro desconhecido'
        recipes.value = []
    } finally {
        loading.value = false
    }
}

async function loadRecipes() {
    loading.value = true
    error.value = ''
    try {
        recipes.value = await searchRecipes(query.value)
    } catch (e) {
        error.value = e instanceof Error ? e.message : 'Erro desconhecido'
        recipes.value = []
    } finally {
        loading.value = false
    }
}

onMounted(loadRecipes)
</script>

<template>
    <main class="page-container">
        <header class="page-header">
            <h2>Receitas</h2>
            <div class="header-links">
                <router-link to="/bookmarks" class="back-link">Guardadas</router-link>
                <router-link to="/" class="back-link">Voltar</router-link>
            </div>
        </header>

        <form class="search-form" @submit.prevent="loadRecipes">
            <input v-model="query" type="search" placeholder="Pesquisar receitas (ex: pasta)" />
            <button type="submit" class="btn-submit" :disabled="loading">Pesquisar</button>
        </form>

        <button type="button" class="btn-submit" :disabled="loading" @click="showIngredientsModal = true">Select
            items</button>

        <p v-if="loading" class="status">A carregar receitas...</p>
        <p v-else-if="error" class="status error">{{ error }}</p>
        <p v-else-if="recipes.length === 0" class="status">Nenhuma receita encontrada.</p>

        <div v-else class="recipe-grid">
            <article v-for="recipe in recipes" :key="recipe.id" class="recipe-card" role="button" tabindex="0"
                @click="selectedRecipeId = recipe.id" @keydown.enter="selectedRecipeId = recipe.id">
                <div class="card-media">
                    <img :src="recipe.image" :alt="recipe.title" loading="lazy" />
                    <BookmarkButton class="card-bookmark" :recipe="recipe"
                        @longpress="openCollections(recipe)" />
                </div>
                <h3>{{ recipe.title }}</h3>
            </article>
        </div>

        <ChoosePantrysForSearchModal v-if="showIngredientsModal" :initial-selected="ingredients"
            @close="showIngredientsModal = false" @confirm="onIngredientsConfirm" />

        <CollectionsModal v-if="pickerRecipe" :recipe="pickerRecipe" @close="pickerRecipe = null" />

        <RecipeDetailModal v-if="selectedRecipeId !== null" :recipe-id="selectedRecipeId"
            @close="selectedRecipeId = null" />
    </main>
</template>

<style scoped>
.page-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 16px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.back-link {
    color: #198754;
    text-decoration: underline;
}

.header-links {
    display: flex;
    gap: 16px;
}

.search-form {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
}

.search-form input {
    flex: 1;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.btn-submit {
    flex: 1;
    padding: 8px 16px;
    background-color: #198754;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
}

.btn-submit:disabled {
    opacity: 0.6;
    cursor: default;
}

.status {
    text-align: center;
    color: #666;
}

.status.error {
    color: #dc3545;
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
    transition: transform 0.15s, box-shadow 0.15s;
    cursor: pointer;
}

.recipe-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
}

.recipe-card img {
    width: 100%;
    aspect-ratio: 312 / 231;
    object-fit: cover;
    display: block;
}

.card-media {
    position: relative;
}

.card-bookmark {
    position: absolute;
    top: 8px;
    right: 8px;
}

.recipe-card h3 {
    font-size: 1rem;
    margin: 0;
    padding: 12px;
}
</style>
