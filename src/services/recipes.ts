
import { getActiveProfile } from '@/services/profiles'
import { findAll } from '@/services/items'
import type { InventoryItem } from '@/types/item'

export interface RecipeSummary {
  id: number
  title: string
  image: string
  imageType: string
  usedIngredients?: { name: string; original: string }[]
  missedIngredients?: { name: string; original: string }[]
  extendedIngredients?: { name: string; original: string }[]
}

interface ComplexSearchResponse {
  results: RecipeSummary[]
  offset: number
  number: number
  totalResults: number
}

export function getPantryNames(max = 5): InventoryItem[] {
  const today = new Date().toLocaleDateString('sv-SE')
  const banned = (getActiveProfile()?.restrictions ?? []).map(r => r.trim().toLowerCase()).filter(Boolean)

  return findAll()
    .filter(i => i.expirationDate >= today)
    .filter(i => !banned.some(word => i.name.toLowerCase().includes(word)))
    .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))
    .slice(0, max)
}

export async function searchRecipes(query = '', ingredients: string[] = [], number = 20): Promise<RecipeSummary[]> {
  const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY
  if (!apiKey) throw new Error('Falta a variável VITE_SPOONACULAR_API_KEY no ficheiro .env')

  const params = new URLSearchParams({ number: String(number) })
  if (query.trim()) params.set('query', query.trim())
  params.set('addRecipeInformation', 'true')
  params.set('fillIngredients', 'true')
  

  if (ingredients.length > 0 && !query.trim()) {
    params.set('includeIngredients', ingredients.join(','))
    params.set('sort', 'max-used-ingredients')
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

  const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params}`, {
    headers: { 'x-api-key': apiKey },
  })

  if (!response.ok) throw new Error(`Erro ao obter receitas (${response.status})`)

  const data: ComplexSearchResponse = await response.json()
  const bannedItems = (profile?.restrictions ?? []).map(r => r.trim().toLowerCase()).filter(Boolean)

  const filteredRecipes = data.results.filter(r => {
    const text = [r.title, ...(r.usedIngredients ?? []).map(i => i.original)]
      .join(' ')
      .toLowerCase()

    return !bannedItems.some(word => text.includes(word))
  })

  const pantryItems = getPantryNames()

  function getRecipeScore(recipe: RecipeSummary) {
  const recipeIngredients = (recipe.extendedIngredients ?? [])
    .map(i => i.name.toLowerCase())

  return pantryItems.reduce((total, item, index) => {
    const name = item.name.toLowerCase()

    const found = recipeIngredients.some(ingredient =>
      ingredient.includes(name) || name.includes(ingredient)
    )

    return total + (found ? pantryItems.length - index : 0)
  }, 0)
}

  return filteredRecipes.sort((a, b) => getRecipeScore(b) - getRecipeScore(a))
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

export async function getRecipeInformation(id: number): Promise<RecipeDetails> {
  const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY
  if (!apiKey) throw new Error('Falta a variável VITE_SPOONACULAR_API_KEY no ficheiro .env')

  const params = new URLSearchParams({ includeNutrition: 'true' })
  const response = await fetch(`https://api.spoonacular.com/recipes/${id}/information?${params}`,{
    headers: { 'x-api-key': apiKey },
  })
  if (!response.ok) throw new Error(`Erro ao obter detalhes da receita (${response.status})`)

  return response.json()
}
