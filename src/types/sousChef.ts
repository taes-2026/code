import type { Diet, Intolerance, Restriction } from '@/domain/diet'

export type SousChefUnit = 'unit' | 'kg' | 'g' | 'l' | 'ml' | 'pack'

export interface SousChefIngredientInput {
  name: string
  quantity?: number
  unit?: SousChefUnit
}

export interface SousChefProfileInput {
  servings: number
  diet: Diet
  intolerances: Intolerance[]
  restrictions: Restriction[]
}

export interface SousChefRequest {
  ingredients: SousChefIngredientInput[]
  pantry: string[]
  profile: SousChefProfileInput
  maxMinutes?: number
  notes?: string
}

export interface GeneratedIngredient {
  name: string
  quantity: number
  unit: SousChefUnit
  optional: boolean
  fromPantry: boolean
}

export interface GeneratedStep {
  n: number
  text: string
  uses: string[]
  timerSeconds: number | null
}

export interface GeneratedRecipe {
  title: string
  summary: string
  servings: number
  prepMinutes: number
  cookMinutes: number
  ingredients: GeneratedIngredient[]
  steps: GeneratedStep[]
  tips: string[]
}

export interface SousChefMeta {
  source: 'gemini' | 'testing'
  model: string
  attempts: number
  warnings: string[]
}

export interface SousChefResponse {
  id: string
  recipe: GeneratedRecipe
  meta: SousChefMeta
}

export interface SousChefErrorBody {
  error: {
    code: string
    message: string
    details: string[] | null
  }
}
