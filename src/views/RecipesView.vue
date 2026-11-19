<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { searchRecipes, getPantryNames, type RecipeSummary } from '@/services/recipes'
import { getActiveProfile } from '@/services/profiles'
import { DIETS } from '@/domain/diet'
import RecipeDetailModal from '@/components/RecipeDetailModal.vue'
import ChoosePantrysForSearchModal from '@/components/ChoosePantrysForSearchModal.vue'
import BookmarkButton from '@/components/BookmarkButton.vue'
import CollectionsModal from '@/components/CollectionsModal.vue'
import type { RecipeReference } from '@/types/bookmark'

const rawRecipes = ref<RecipeSummary[]>([])
const query = ref('')
const loading = ref(false)
const error = ref('')
const selectedRecipeId = ref<number | null>(null)
const pickerRecipe = ref<RecipeReference | null>(null)
const showIngredientsModal = ref(false)
const ingredients = ref<string[]>([])
const activeProfile = ref(getActiveProfile())
const sortBy = ref<'expiring' | 'overlap' | 'missing' | 'name'>('expiring')

function openCollections(recipe: RecipeSummary) {
    pickerRecipe.value = { id: recipe.id, title: recipe.title, image: recipe.image }
}

const recipes = computed(() => {
    const list = [...rawRecipes.value]

    if (sortBy.value === 'expiring') {
        return list.sort((a, b) => {
            const aExp = a.usesExpiring ? 1 : 0
            const bExp = b.usesExpiring ? 1 : 0
            if (bExp !== aExp) return bExp - aExp

            const aExpCount = a.expiringIngredients?.length ?? 0
            const bExpCount = b.expiringIngredients?.length ?? 0
            if (bExpCount !== aExpCount) return bExpCount - aExpCount

            const aOverlap = a.overlapPercentage ?? 0
            const bOverlap = b.overlapPercentage ?? 0
            if (bOverlap !== aOverlap) return bOverlap - aOverlap

            return (a.missedIngredientCount ?? 0) - (b.missedIngredientCount ?? 0)
        })
    }

    if (sortBy.value === 'overlap') {
        return list.sort((a, b) => {
            const aOverlap = a.overlapPercentage ?? 0
            const bOverlap = b.overlapPercentage ?? 0
            if (bOverlap !== aOverlap) return bOverlap - aOverlap
            return (a.missedIngredientCount ?? 0) - (b.missedIngredientCount ?? 0)
        })
    }

    if (sortBy.value === 'missing') {
        return list.sort((a, b) => {
            const aMissed = a.missedIngredientCount ?? 0
            const bMissed = b.missedIngredientCount ?? 0
            if (aMissed !== bMissed) return aMissed - bMissed
            return (b.overlapPercentage ?? 0) - (a.overlapPercentage ?? 0)
        })
    }

    return list.sort((a, b) => a.title.localeCompare(b.title))
})

function getOverlapTone(pct: number): string {
    if (pct >= 75) return 'tone-high'
    if (pct >= 40) return 'tone-mid'
    return 'tone-low'
}

async function loadRecipes() {
    activeProfile.value = getActiveProfile()
    loading.value = true
    error.value = ''
    try {
        const hasQuery = query.value.trim().length > 0
        const selected = ingredients.value
        const expiring = getPantryNames().map((i) => i.name)

        const base = selected.length > 0 ? selected : hasQuery ? [] : expiring

        rawRecipes.value = await searchRecipes(query.value, base, 20, { prioritize: base })
    } catch (e) {
        error.value = e instanceof Error ? e.message : 'Erro desconhecido'
        rawRecipes.value = []
    } finally {
        loading.value = false
    }
}

async function onIngredientsConfirm(selected: string[]) {
    ingredients.value = selected
    showIngredientsModal.value = false
    await loadRecipes()
}

onMounted(loadRecipes)

async function removeIngredient(name: string) {
    ingredients.value = ingredients.value.filter((i) => i !== name)
    await loadRecipes()
}

async function clearIngredients() {
    ingredients.value = []
    await loadRecipes()
}
</script>

<template>
    <main class="page-container">
        <header class="page-header">
            <h2>Receitas</h2>
            <div class="header-links">
                <router-link to="/shopping-list" class="back-link">Lista de compras</router-link>
                <router-link to="/bookmarks" class="back-link">Guardadas</router-link>
                <router-link to="/" class="back-link">Voltar</router-link>
            </div>
        </header>

        <p v-if="activeProfile" class="profile-hint">
            Sugestões adaptadas ao perfil de <strong>{{ activeProfile.name }}</strong> ({{ DIETS[activeProfile.diet] ??
                activeProfile.diet }})
        </p>

        <form class="search-form" @submit.prevent="loadRecipes">
            <input v-model="query" type="search" placeholder="Pesquisar receitas (ex: pasta)" />
            <button type="submit" class="btn-submit" :disabled="loading">Pesquisar</button>
        </form>

        <button type="button" class="btn-submit" :disabled="loading" @click="showIngredientsModal = true">
            Select items
        </button>

        <div v-if="ingredients.length > 0" class="selected-chips">
            <button v-for="name in ingredients" :key="name" type="button" class="chip" :disabled="loading"
                @click="removeIngredient(name)">
                {{ name }} ✕
            </button>
            <button type="button" class="chip chip-clear" :disabled="loading" @click="clearIngredients">
                Limpar tudo
            </button>
        </div>

        <h2 class="section-title">Suggested recipes based on your pantry</h2>

        <div v-if="recipes.length > 0" class="toolbar">
            <span class="results-count">{{ recipes.length }} receitas encontradas</span>
            <div class="sort-controls">
                <label for="sort-select">Ordenar por:</label>
                <select id="sort-select" v-model="sortBy" class="sort-select">
                    <option value="expiring">Produtos a expirar primeiro</option>
                    <option value="overlap">Maior correspondência (%)</option>
                    <option value="missing">Menos ingredientes em falta</option>
                    <option value="name">Nome (A-Z)</option>
                </select>
            </div>
        </div>

        <p v-if="loading" class="status">A carregar receitas...</p>
        <p v-else-if="error" class="status error">{{ error }}</p>
        <p v-else-if="recipes.length === 0" class="status">Nenhuma receita encontrada.</p>

        <div v-else class="recipe-grid">
            <article v-for="recipe in recipes" :key="recipe.id" class="recipe-card" role="button" tabindex="0"
                @click="selectedRecipeId = recipe.id" @keydown.enter="selectedRecipeId = recipe.id">
                <div class="card-media">
                    <img :src="recipe.image" :alt="recipe.title" loading="lazy" />
                    <div class="card-overlay-badges">
                        <span v-if="recipe.overlapPercentage !== undefined" class="card-overlap-badge"
                            :class="getOverlapTone(recipe.overlapPercentage)"
                            :title="`${recipe.overlapPercentage}% dos ingredientes disponíveis`">
                            {{ recipe.overlapPercentage }}%
                        </span>
                        <span v-if="recipe.usesExpiring" class="card-expiring-badge" title="Usa ingredientes a expirar">
                            A expirar
                        </span>
                    </div>
                    <BookmarkButton class="card-bookmark" :recipe="recipe"
                        @longpress="openCollections(recipe)" />
                </div>
                <div class="card-content">
                    <h3>{{ recipe.title }}</h3>
                    <div v-if="recipe.totalIngredients" class="card-stats">
                        <span class="stat-badge in-stock">
                            {{ recipe.usedIngredientCount }} em stock
                        </span>
                        <span v-if="recipe.missedIngredientCount" class="stat-badge missing">
                            {{ recipe.missedIngredientCount }} em falta
                        </span>
                    </div>
                    <p v-if="recipe.usesExpiring && recipe.expiringIngredients?.length" class="card-expiring-info">
                        Aproveita: <strong>{{ recipe.expiringIngredients.join(', ') }}</strong>
                    </p>
                </div>
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

.profile-hint {
    font-size: 0.9rem;
    color: #15803d;
    margin-bottom: 1rem;
    background: #f0fdf4;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border: 1px solid #bbf7d0;
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

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    gap: 12px;
    flex-wrap: wrap;
}

.results-count {
    font-size: 0.85rem;
    color: #64748b;
}

.sort-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: #475569;
}

.sort-select {
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    background: #fff;
    font-size: 0.85rem;
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
    display: flex;
    flex-direction: column;
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
    width: 100%;
    aspect-ratio: 312 / 231;
    overflow: hidden;
    background: #f1f5f9;
}

.card-overlay-badges {
    position: absolute;
    top: 8px;
    left: 8px;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    z-index: 1;
}

.card-overlap-badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    color: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.card-expiring-badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    background: #f59e0b;
    color: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.tone-high {
    background-color: #16a34a;
}

.tone-mid {
    background-color: #d97706;
}

.tone-low {
    background-color: #64748b;
}

.card-bookmark {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 1;
}

.card-content {
    padding: 12px;
    display: flex;
    flex-direction: column;
    flex: 1;
}

.recipe-card h3 {
    font-size: 1rem;
    margin: 0 0 8px;
    padding: 0;
    line-height: 1.3;
}

.card-stats {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: auto;
    padding-top: 6px;
}

.stat-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
}

.stat-badge.in-stock {
    background: #dcfce7;
    color: #15803d;
}

.stat-badge.missing {
    background: #fee2e2;
    color: #b91c1c;
}

.card-expiring-info {
    font-size: 0.75rem;
    color: #b45309;
    background: #fef3c7;
    padding: 4px 6px;
    border-radius: 4px;
    margin: 6px 0 0;
}

.section-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 24px 0 12px;
    padding-left: 10px;
    border-left: 4px solid #198754;
    color: #1f2937;
}

.selected-chips {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    margin-top: 12px;
}

.selected-chips .chip {
    flex: 0 0 auto;
    width: auto;
    min-height: 0;
    height: auto;
    display: inline-block;
    padding: 2px 8px;
    border: 1px solid #198754;
    border-radius: 999px;
    background: #f0fdf4;
    color: #15803d;
    font-size: 0.75rem;
    line-height: 1.3;
    cursor: pointer;
}

.selected-chips .chip:disabled {
    opacity: 0.6;
    cursor: default;
}

.selected-chips .chip-clear {
    background: #fff;
    border-color: #dc3545;
    color: #dc3545;
}

.chip:disabled {
    opacity: 0.6;
    cursor: default;
}
</style>
