import type { RecipeDetails } from '@/services/recipes'

export interface MealNutrient {
  name: string
  amount: number
  unit: string
  percentOfDailyNeeds: number | null
}

export interface MealIngredient {
  name: string
  original: string
}

export interface MealSummary {
  title: string
  image: string
  servings: number
  readyInMinutes: number
  ingredients: MealIngredient[]
  nutrients: MealNutrient[]
  calories: MealNutrient | null
}

const NUTRIENT_ORDER: readonly string[] = [
  'Calories',
  'Protein',
  'Fat',
  'Carbohydrates',
  'Fiber',
  'Sugars',
  'Sodium',
]

function round(value: number): number {
  return Math.round(value * 10) / 10
}

export function buildMealSummary(recipe: RecipeDetails): MealSummary {
  const nutrients = [...(recipe.nutrition?.nutrients ?? [])]
    .filter((nutrient) => NUTRIENT_ORDER.includes(nutrient.name))
    .sort((a, b) => NUTRIENT_ORDER.indexOf(a.name) - NUTRIENT_ORDER.indexOf(b.name))
    .map((nutrient) => ({
      name: nutrient.name,
      amount: round(nutrient.amount),
      unit: nutrient.unit,
      percentOfDailyNeeds: nutrient.percentOfDailyNeeds ?? null,
    }))

  return {
    title: recipe.title,
    image: recipe.image,
    servings: recipe.servings,
    readyInMinutes: recipe.readyInMinutes,
    ingredients: recipe.extendedIngredients.map((ingredient) => ({
      name: ingredient.name,
      original: ingredient.original,
    })),
    nutrients,
    calories: nutrients.find((nutrient) => nutrient.name === 'Calories') ?? null,
  }
}
