<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getRecipeInformation, type RecipeDetails } from '@/services/recipes'

const props = defineProps<{ recipeId: number }>()
const emit = defineEmits<{ close: [] }>()

const recipe = ref<RecipeDetails | null>(null)
const loading = ref(false)
const error = ref('')

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
    if (e.key === 'Escape') emit('close')
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
                    <h2>{{ recipe.title }}</h2>

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

                    <section v-if="summary">
                        <h3>Summary</h3>
                        <p class="summary">{{ summary }}</p>
                    </section>

                    <section v-if="recipe.extendedIngredients.length">
                        <h3>Ingredients</h3>
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
</style>
