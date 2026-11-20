export interface RecipePreparation {
  id: string
  recipeId: number
  title: string
  image: string
  preparedAt: string
}

export interface PreparationStats {
  count: number
  lastPreparedAt: string | null
}
