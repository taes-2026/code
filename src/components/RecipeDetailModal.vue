<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getRecipeInformation, type RecipeDetails } from '@/services/recipes'
import { findAll as findAllPantryItems } from '@/services/items'
import { calculateRecipeOverlap, type OverlapResult } from '@/domain/overlap'
import BookmarkButton from '@/components/BookmarkButton.vue'
import CollectionsModal from '@/components/CollectionsModal.vue'
import CookModeModal from '@/components/CookModeModal.vue'
import { useBookmarks } from '@/stores/bookmarks'
import type { RecipeReference } from '@/types/bookmark'

const props = defineProps<{ recipeId: number }>()
const emit = defineEmits<{ close: [] }>()

const recipe = ref<RecipeDetails | null>(null)
const loading = ref(false)
const error = ref('')
const showCollections = ref(false)
const showCookMode = ref(false)
const pantryItems = ref(findAllPantryItems())

const overlapData = computed<OverlapResult | null>(() => {
    if (!recipe.value || !recipe.value.extendedIngredients) return null
    return calculateRecipeOverlap(recipe.value.extendedIngredients, pantryItems.value, new Date())
})

function getOverlapTone(pct: number): string {
    if (pct >= 75) return 'tone-high'
    if (pct >= 40) return 'tone-mid'
    return 'tone-low'
}

const { isBookmarked } = useBookmarks()

const reference = computed<RecipeReference | null>(() =>
    recipe.value
        ? { id: recipe.value.id, title: recipe.value.title, image: recipe.value.image }
        : null,
)
const saved = computed(() => (recipe.value ? isBookmarked(recipe.value.id) : false))

async function load(id: number) {
    loading.value = true
    error.value = ''
    recipe.value = null
    try {
        recipe.value = await getRecipeInformation(id)
    } catch (e) {
        error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
        loading.value = false
    }
}

watch(() => props.recipeId, load, { immediate: true })

function stripHtml(html: string | null | undefined): string {
    if (!html) return ''
    return new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() ?? ''
}

const summary = computed(() => stripHtml(recipe.value?.summary))

const steps = computed(() => recipe.value?.analyzedInstructions?.map((i) => i.steps).flat() ?? [])
const plainInstructions = computed(() => stripHtml(recipe.value?.instructions))

const tags = computed(() => {
    const r = recipe.value
    if (!r) return []

    const main = [
        { on: r.vegetarian, label: 'Vegetarian' },
        { on: r.vegan, label: 'Vegan' },
        { on: r.glutenFree, label: 'Gluten free' },
        { on: r.dairyFree, label: 'Dairy free' },
        { on: r.veryHealthy, label: 'Very healthy' },
        { on: r.cheap, label: 'Budget friendly' },
        { on: r.veryPopular, label: 'Popular' },
    ]
        .filter((t) => t.on)
        .map((t) => ({ label: t.label, muted: false }))

    const seen = new Set(main.map((t) => t.label.toLowerCase()))
    const extra = (r.diets ?? [])
        .filter((d) => !seen.has(d.toLowerCase()))
        .map((d) => ({ label: d, muted: true }))

    return [...main, ...extra]
})

const pricePerServing = computed(() =>
    recipe.value ? `$${(recipe.value.pricePerServing / 100).toFixed(2)}` : '',
)

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && !showCollections.value && !showCookMode.value) emit('close')
}

onMounted(() => {
    document.addEventListener('keydown', onKeydown)
    document.body.style.overflow = 'hidden'
})
onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
})
</script>

<template>
    <div class="overlay" @click.self="emit('close')">
        <div class="modal" role="dialog" aria-modal="true" :aria-label="recipe?.title ?? 'Recipe details'">
            <button class="close-btn" aria-label="Close" @click="emit('close')">×</button>

            <p v-if="loading" class="status">Loading details...</p>
            <p v-else-if="error" class="status error">{{ error }}</p>

            <template v-else-if="recipe">
                <img v-if="recipe.image" :src="recipe.image" :alt="recipe.title" class="hero" />

                <div class="content">
                    <div class="title-row">
                        <h2>{{ recipe.title }}</h2>
                        <div class="title-actions">
                            <button v-if="saved" type="button" class="collections-btn"
                                @click="showCollections = true">
                                Coleções
                            </button>
                            <BookmarkButton v-if="reference" :recipe="reference"
                                @longpress="showCollections = true" />
                        </div>
                    </div>

                    <button v-if="steps.length || plainInstructions" type="button" class="cook-mode-btn"
                        @click="showCookMode = true">
                        Começar a cozinhar
                    </button>

                    <ul class="facts">
                        <li><strong>{{ recipe.readyInMinutes }} min</strong><span>Total time</span></li>
                        <li v-if="recipe.preparationMinutes && recipe.preparationMinutes > 0">
                            <strong>{{ recipe.preparationMinutes }} min</strong><span>Prep</span>
                        </li>
                        <li v-if="recipe.cookingMinutes && recipe.cookingMinutes > 0">
                            <strong>{{ recipe.cookingMinutes }} min</strong><span>Cooking</span>
                        </li>
                        <li v-if="recipe.servings != null"><strong>{{ recipe.servings }}</strong><span>Servings</span>
                        </li>
                        <li v-if="recipe.healthScore != null"><strong>{{ recipe.healthScore }}</strong><span>Health
                                score</span></li>
                        <li v-if="pricePerServing"><strong>{{ pricePerServing }}</strong><span>Per serving</span></li>
                    </ul>

                    <div v-if="tags.length" class="tags">
                        <span v-for="tag in tags" :key="tag.label" :class="['tag', { 'tag-muted': tag.muted }]">{{
                            tag.label }}</span>
                    </div>

                    <p v-if="recipe.cuisines.length || recipe.dishTypes.length" class="meta">
                        <span v-if="recipe.cuisines.length"><strong>Cuisine:</strong> {{ recipe.cuisines.join(', ')
                            }}</span>
                        <span v-if="recipe.dishTypes.length"><strong>Dish type:</strong> {{ recipe.dishTypes.join(', ')
                            }}</span>
                    </p>

                    <div v-if="overlapData" class="overlap-card">
                        <div class="overlap-header">
                            <span class="overlap-pct-badge" :class="getOverlapTone(overlapData.overlapPercentage)">
                                {{ overlapData.overlapPercentage }}%
                            </span>
                            <div class="overlap-text">
                                <strong>Correspondência da despensa</strong>
                                <span>{{ overlapData.inStockCount }} de {{ overlapData.totalIngredients }} ingredientes em stock</span>
                            </div>
                            <span v-if="overlapData.usesExpiring" class="expiring-pill">
                                Utiliza {{ overlapData.expiringIngredients.length }} ingrediente{{ overlapData.expiringIngredients.length > 1 ? 's' : '' }} a expirar
                            </span>
                        </div>
                    </div>

                    <section v-if="summary">
                        <h3>Summary</h3>
                        <p class="summary">{{ summary }}</p>
                    </section>

                    <section v-if="overlapData && overlapData.ingredients.length">
                        <div class="ingredients-header">
                            <h3>Ingredientes</h3>
                            <div class="stock-summary-pills">
                                <span class="pill pill-stock">{{ overlapData.inStockCount }} em stock</span>
                                <span v-if="overlapData.missingCount" class="pill pill-missing">{{ overlapData.missingCount }} em falta</span>
                            </div>
                        </div>
                        <ul class="ingredients-list">
                            <li v-for="(ing, i) in overlapData.ingredients" :key="`${ing.name}-${i}`"
                                :class="['ing-row', { 'is-stock': ing.inStock, 'is-missing': !ing.inStock, 'is-expiring': ing.isExpiring }]">
                                <span class="ing-badge" :class="ing.isExpiring ? 'badge-expiring' : ing.inStock ? 'badge-stock' : 'badge-missing'">
                                    <template v-if="ing.isExpiring">A expirar</template>
                                    <template v-else-if="ing.inStock">Em stock</template>
                                    <template v-else>Em falta</template>
                                </span>
                                <span class="ing-name">
                                    {{ ing.original || ing.name }}
                                    <small v-if="ing.matchedPantryItem" class="matched-hint">
                                        (Na despensa: {{ ing.matchedPantryItem.name }})
                                    </small>
                                </span>
                            </li>
                        </ul>
                    </section>
                    <section v-else-if="recipe.extendedIngredients.length">
                        <h3>Ingredientes</h3>
                        <ul class="ingredients">
                            <li v-for="(ing, i) in recipe.extendedIngredients" :key="`${ing.id}-${i}`">
                                {{ ing.original }}
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h3>Instructions</h3>
                        <ol v-if="steps.length" class="steps">
                            <li v-for="(step, i) in steps" :key="i">{{ step.step }}</li>
                        </ol>
                        <p v-else-if="plainInstructions">{{ plainInstructions }}</p>
                        <p v-else>No instructions available.</p>
                    </section>
                </div>
            </template>
        </div>
    </div>

    <CollectionsModal v-if="showCollections && reference" :recipe="reference"
        @close="showCollections = false" />

    <CookModeModal v-if="showCookMode && recipe" :recipe="recipe" @close="showCookMode = false" />
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
    z-index: 1000;
}

.modal {
    position: relative;
    width: 100%;
    max-width: 720px;
    max-height: 90vh;
    overflow-y: auto;
    background: var(--color-background, #fff);
    color: var(--color-text, #222);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.close-btn {
    position: sticky;
    top: 8px;
    float: right;
    margin: 8px 8px 0 0;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    z-index: 1;
}

.hero {
    width: 100%;
    aspect-ratio: 556 / 370;
    object-fit: cover;
    display: block;
    margin-top: -44px;
}

.content {
    padding: 20px 24px 24px;
}

.content h2 {
    margin: 0 0 16px;
}

.title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
}

.title-row h2 {
    margin: 0;
}

.title-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: none;
}

.collections-btn {
    width: auto;
    min-height: 40px;
    padding: 0 14px;
    border: 1px solid #198754;
    border-radius: 999px;
    background: transparent;
    color: #198754;
    font-size: 0.85rem;
    cursor: pointer;
}

.cook-mode-btn {
    width: 100%;
    margin-bottom: 16px;
    padding: 12px 16px;
    border-radius: 10px;
    background: #198754;
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
}

.cook-mode-btn:hover {
    background: #157347;
}

.content h3 {
    margin: 20px 0 8px;
    font-size: 1.1rem;
    color: #198754;
}

.facts {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    list-style: none;
    padding: 0;
    margin: 0 0 16px;
}

.facts li {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 90px;
    padding: 8px 12px;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 8px;
}

.facts span {
    font-size: 0.8rem;
    color: #666;
}

.tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
}

.tag {
    padding: 2px 10px;
    border-radius: 999px;
    background: #198754;
    color: #fff;
    font-size: 0.8rem;
}

.tag-muted {
    background: #e9ecef;
    color: #333;
    text-transform: capitalize;
}

.meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 0.9rem;
    text-transform: capitalize;
}

.summary {
    line-height: 1.5;
}

.ingredients,
.steps {
    padding-left: 20px;
    line-height: 1.6;
}

.steps li {
    margin-bottom: 6px;
}

.status {
    text-align: center;
    padding: 40px 16px;
    color: #666;
}

.status.error {
    color: #dc3545;
}

.overlap-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 20px;
}

.overlap-header {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
}

.overlap-pct-badge {
    font-size: 1.25rem;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 8px;
    color: #fff;
}

.tone-high {
    background-color: #198754;
}

.tone-mid {
    background-color: #f59e0b;
}

.tone-low {
    background-color: #64748b;
}

.overlap-text {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.overlap-text strong {
    font-size: 0.95rem;
}

.overlap-text span {
    font-size: 0.85rem;
    color: #64748b;
}

.expiring-pill {
    background: #fef3c7;
    color: #b45309;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid #fde68a;
}

.ingredients-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.ingredients-header h3 {
    margin: 0;
}

.stock-summary-pills {
    display: flex;
    gap: 8px;
}

.pill {
    font-size: 0.8rem;
    padding: 2px 8px;
    border-radius: 999px;
    font-weight: 600;
}

.pill-stock {
    background: #dcfce7;
    color: #15803d;
}

.pill-missing {
    background: #fee2e2;
    color: #b91c1c;
}

.ingredients-list {
    list-style: none;
    padding: 0;
    margin: 0 0 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.ing-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-radius: 8px;
    background: #fff;
    border: 1px solid #f1f5f9;
}

.ing-row.is-missing {
    background: #fbfbfb;
    border-color: #f1f1f1;
}

.ing-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 999px;
    white-space: nowrap;
}

.badge-stock {
    background: #dcfce7;
    color: #15803d;
}

.badge-expiring {
    background: #fef3c7;
    color: #b45309;
}

.badge-missing {
    background: #f1f5f9;
    color: #64748b;
}

.ing-name {
    font-size: 0.95rem;
    flex: 1;
}

.matched-hint {
    color: #15803d;
    margin-left: 6px;
    font-style: italic;
}
</style>
