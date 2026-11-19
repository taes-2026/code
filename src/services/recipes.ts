import { getActiveProfile } from '@/services/profiles'
import { findAll } from '@/services/items'
import { find, save } from '@/lib/storage'
import type { InventoryItem } from '@/types/item'
import {
  enrichRecipeWithOverlap,
  prioritizeRecipes,
  calculateRecipeOverlap,
} from '@/domain/overlap'

export interface RecipeSummary {
  id: number
  title: string
  image: string
  imageType: string
  usedIngredients?: { name: string; original: string }[]
  missedIngredients?: { name: string; original: string }[]
  extendedIngredients?: { name: string; original: string }[]
  overlapPercentage?: number
  totalIngredients?: number
  usedIngredientCount?: number
  missedIngredientCount?: number
  usesExpiring?: boolean
  expiringIngredients?: string[]
}

interface ComplexSearchResponse {
  results: RecipeSummary[]
  offset: number
  number: number
  totalResults: number
}

export function getPantryNames(max = 5): InventoryItem[] {
  const today = new Date().toLocaleDateString('sv-SE')
  const banned = (getActiveProfile()?.restrictions ?? []).map((r) => r.trim().toLowerCase()).filter(Boolean)

  return findAll()
    .filter((i) => i.expirationDate >= today)
    .filter((i) => !banned.some((word) => i.name.toLowerCase().includes(word)))
    .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))
    .slice(0, max)
}

export async function searchRecipes(
  query = '',
  ingredients: string[] = [],
  number = 20,
  options: { prioritize?: string[] } = {},
): Promise<RecipeSummary[]> {
  const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY
  if (!apiKey) throw new Error('Falta a variável VITE_SPOONACULAR_API_KEY no ficheiro .env')

  const hasQuery = query.trim().length > 0

  const params = new URLSearchParams({ number: String(number) })
  if (hasQuery) params.set('query', query.trim())
  params.set('addRecipeInformation', 'true')
  params.set('fillIngredients', 'true')

  if (ingredients.length > 0) {
    params.set('includeIngredients', ingredients.join(','))
    if (!hasQuery) params.set('sort', 'max-used-ingredients')
  }

  const profile = getActiveProfile()
  if (profile) {
    if (profile.diet && profile.diet !== 'omnivore') {
      params.set('diet', profile.diet)
    }
    if (profile.intolerances.length > 0) {
      params.set('intolerances', profile.intolerances.join(','))
    }
    if (profile.restrictions.length > 0) {
      params.set('excludeIngredients', profile.restrictions.join(','))
    }
  }

  let data: ComplexSearchResponse

  try {
    const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params}`, {
      headers: { 'x-api-key': apiKey },
    })

    if (!response.ok) throw new Error(`Erro ao obter receitas (${response.status})`)

    data = await response.json()
  } catch (error) {
    if (
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      error instanceof TypeError
    ) {
      throw new Error('Sem ligação à internet. Não é possível procurar novas receitas offline.')
    }
    throw error
  }

  const bannedItems = (profile?.restrictions ?? []).map((r) => r.trim().toLowerCase()).filter(Boolean)

  const filteredRecipes = data.results.filter((r) => {
    const text = [r.title, ...(r.usedIngredients ?? []).map((i) => i.original)]
      .join(' ')
      .toLowerCase()

    return !bannedItems.some((word) => text.includes(word))
  })

  const pantryItems = findAll()
  const now = new Date()

  const enrichedRecipes: RecipeSummary[] = filteredRecipes.map((r) => {
    const allIngredients =
      (r.extendedIngredients ?? []).length > 0
        ? r.extendedIngredients!
        : [...(r.usedIngredients ?? []), ...(r.missedIngredients ?? [])]

    if (allIngredients.length > 0) {
      const overlap = calculateRecipeOverlap(allIngredients, pantryItems, now)
      return {
        ...r,
        overlapPercentage: overlap.overlapPercentage,
        totalIngredients: overlap.totalIngredients,
        usedIngredientCount: overlap.inStockCount,
        missedIngredientCount: overlap.missingCount,
        usesExpiring: overlap.usesExpiring,
        expiringIngredients: overlap.expiringIngredients,
      }
    }

    return enrichRecipeWithOverlap(
      {
        id: r.id,
        title: r.title,
        image: r.image,
        imageType: r.imageType,
        usedIngredients: (r.usedIngredients ?? []).map((i, idx) => ({ id: idx, name: i.name, original: i.original })),
        missedIngredients: (r.missedIngredients ?? []).map((i, idx) => ({ id: idx, name: i.name, original: i.original })),
      },
      pantryItems,
      now,
    )
  })

  const priority = (options.prioritize ?? []).map((n) => n.toLowerCase())
  if (priority.length > 0) {
    function getRecipeScore(recipe: RecipeSummary) {
      const recipeIngredients = (recipe.extendedIngredients ?? []).map((i) => i.name.toLowerCase())

      return priority.reduce((total, name, index) => {
        const found = recipeIngredients.some(
          (ingredient) => ingredient.includes(name) || name.includes(ingredient),
        )
        return total + (found ? priority.length - index : 0)
      }, 0)
    }

    return enrichedRecipes.sort((a, b) => getRecipeScore(b) - getRecipeScore(a))
  }

  return prioritizeRecipes(enrichedRecipes)
}

export async function searchRecipesByIngredients(ingredients: string[], number = 12): Promise<RecipeSummary[]> {
  return searchRecipes('', ingredients, number, { prioritize: ingredients })
}

export interface RecipeIngredient {
  id: number
  name: string
  original: string
  amount: number
  unit: string
  image: string
}

export interface RecipeStep {
  number: number
  step: string
}

export interface NutrientInfo {
  name: string
  amount: number
  unit: string
  percentOfDailyNeeds?: number
}

export interface RecipeNutrition {
  nutrients: NutrientInfo[]
}

export interface RecipeDetails {
  id: number
  title: string
  image: string
  servings: number
  readyInMinutes: number
  preparationMinutes: number | null
  cookingMinutes: number | null
  healthScore: number
  pricePerServing: number
  sourceName: string | null
  sourceUrl: string | null
  creditsText: string | null
  summary: string
  instructions: string | null
  cuisines: string[]
  dishTypes: string[]
  diets: string[]
  vegetarian: boolean
  vegan: boolean
  glutenFree: boolean
  dairyFree: boolean
  veryHealthy: boolean
  cheap: boolean
  veryPopular: boolean
  extendedIngredients: RecipeIngredient[]
  analyzedInstructions: { name: string; steps: RecipeStep[] }[]
  nutrition?: RecipeNutrition
}

export function getCachedRecipe(id: number): RecipeDetails | null {
  return find('cachedRecipes')[String(id)] ?? null
}

export function cacheRecipe(recipe: RecipeDetails): void {
  const cache = find('cachedRecipes')

  try {
    save('cachedRecipes', { ...cache, [String(recipe.id)]: recipe })
  } catch (error) {
    console.error('[recipes] não foi possível guardar a receita em cache', error)
  }
}

export async function getRecipeInformation(id: number): Promise<RecipeDetails> {
  const cached = getCachedRecipe(id)
  const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY

  if (!apiKey) {
    if (cached) return cached
    throw new Error('Falta a variável VITE_SPOONACULAR_API_KEY no ficheiro .env')
  }

  const params = new URLSearchParams({ includeNutrition: 'true' })

  try {
    const response = await fetch(`https://api.spoonacular.com/recipes/${id}/information?${params}`, {
      headers: { 'x-api-key': apiKey },
    })

    if (!response.ok) {
      if (cached) return cached
      throw new Error(`Erro ao obter detalhes da receita (${response.status})`)
    }

    const recipe: RecipeDetails = await response.json()

    cacheRecipe(recipe)

    return recipe
  } catch (error) {
    if (cached) return cached
    if (
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      error instanceof TypeError
    ) {
      throw new Error('Sem ligação à internet e sem versão guardada desta receita.')
    }
    throw error
  }
}
