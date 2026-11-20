import { find, save } from '@/lib/storage'
import type { RecipeReference } from '@/types/bookmark'
import type { PreparationStats, RecipePreparation } from '@/types/preparation'

function preparationsOf(recipeId: number): RecipePreparation[] {
  return find('preparations').filter((preparation) => preparation.recipeId === recipeId)
}

export function recordPreparation(recipe: RecipeReference): RecipePreparation {
  const preparation: RecipePreparation = {
    id: crypto.randomUUID(),
    recipeId: recipe.id,
    title: recipe.title,
    image: recipe.image,
    preparedAt: new Date().toISOString(),
  }

  save('preparations', [...find('preparations'), preparation])

  return preparation
}

export function statsFor(recipeId: number): PreparationStats {
  const preparations = preparationsOf(recipeId)
  let lastPreparedAt: string | null = null

  for (const preparation of preparations) {
    if (lastPreparedAt === null || preparation.preparedAt > lastPreparedAt) {
      lastPreparedAt = preparation.preparedAt
    }
  }

  return { count: preparations.length, lastPreparedAt }
}

export function countsByRecipe(): Map<number, number> {
  const counts = new Map<number, number>()

  for (const preparation of find('preparations')) {
    counts.set(preparation.recipeId, (counts.get(preparation.recipeId) ?? 0) + 1)
  }

  return counts
}
