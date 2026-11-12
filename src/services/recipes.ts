
import { getActiveProfile } from '@/services/profiles'

export interface RecipeSummary {
  id: number
  title: string
  image: string
  imageType: string
}

interface ComplexSearchResponse {
  results: RecipeSummary[]
  offset: number
  number: number
  totalResults: number
}

export async function searchRecipes(query = '', number = 12): Promise<RecipeSummary[]> {
  const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY
  if (!apiKey) throw new Error('Falta a variável VITE_SPOONACULAR_API_KEY no ficheiro .env')

  const params = new URLSearchParams({ apiKey, number: String(number) })
  if (query.trim()) params.set('query', query.trim())

  const profile = getActiveProfile()
  if (profile) {
    if (profile.diet && profile.diet !== 'omnivore') {
      const dietMap: Record<string, string> = {
        vegetarian: 'vegetarian',
        vegan: 'vegan',
        pescatarian: 'pescetarian',
      }
      params.set('diet', dietMap[profile.diet] ?? profile.diet)
    }

    const intolerances: string[] = []
    if (profile.allergies?.includes('lactose')) intolerances.push('dairy')
    if (profile.allergies?.includes('peanuts')) intolerances.push('peanut')
    if (profile.restrictions?.includes('gluten')) intolerances.push('gluten')

    if (intolerances.length > 0) {
      params.set('intolerances', intolerances.join(','))
    }

    const excludes: string[] = []
    if (profile.restrictions?.includes('pork')) excludes.push('pork')
    if (profile.restrictions?.includes('sugar')) excludes.push('sugar')

    if (excludes.length > 0) {
      params.set('excludeIngredients', excludes.join(','))
    }
  }

  const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params}`)
  if (!response.ok) throw new Error(`Erro ao obter receitas (${response.status})`)

  const data: ComplexSearchResponse = await response.json()
  return data.results
}

export async function searchRecipesByIngredients(ingredients: string[], number = 12): Promise<RecipeSummary[]> {
  if (ingredients.length === 0) return []

  const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY
  if (!apiKey) throw new Error('Falta a variável VITE_SPOONACULAR_API_KEY no ficheiro .env')

  const params = new URLSearchParams({ apiKey, ingredients: ingredients.join(','), number: String(number), ignorePantry: 'true' })

  const response = await fetch(`https://api.spoonacular.com/recipes/findByIngredients?${params}`)
  if (!response.ok) throw new Error(`Erro ao obter receitas (${response.status})`)

  const data: RecipeSummary[] = await response.json()
  return data
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
}

export async function getRecipeInformation(id: number): Promise<RecipeDetails> {
  const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY
  if (!apiKey) throw new Error('Falta a variável VITE_SPOONACULAR_API_KEY no ficheiro .env')

  const params = new URLSearchParams({ apiKey, includeNutrition: 'false' })
  const response = await fetch(`https://api.spoonacular.com/recipes/${id}/information?${params}`)
  if (!response.ok) throw new Error(`Erro ao obter detalhes da receita (${response.status})`)

  return response.json()
}
