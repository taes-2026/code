import { find, save } from '@/lib/storage'
import { isIngredientMatch } from '@/domain/overlap'
import { mergePantryItems, normalizeUnit } from '@/domain/pantry'
import type { InventoryItem } from '@/types/item'

export interface ConsumedIngredient {
  name: string
  amount: number
  unit: string
}

export interface RemovedIngredient {
  name: string
  amount: number
  unit: string
}

export interface PantryUpdateResult {
  items: InventoryItem[]
  removed: RemovedIngredient[]
  notUpdated: ConsumedIngredient[]
}

export function updatePantryAfterMeal(consumed: readonly ConsumedIngredient[]): PantryUpdateResult {
  const now = new Date().toISOString()
  const items = mergePantryItems(find('items'), now)
  const removed: RemovedIngredient[] = []
  const notUpdated: ConsumedIngredient[] = []

  for (const ingredient of consumed) {
    const index = items.findIndex(
      (item) =>
        normalizeUnit(item.unit) === normalizeUnit(ingredient.unit) &&
        isIngredientMatch(item.name, ingredient.name),
    )
    const item = items[index]

    if (!item) {
      notUpdated.push(ingredient)
      continue
    }

    const removedAmount = Math.min(item.quantity, ingredient.amount)

    if (removedAmount > 0) {
      removed.push({ name: item.name, amount: removedAmount, unit: ingredient.unit })
    }

    const remaining = item.quantity - ingredient.amount

    if (remaining <= 0) {
      items.splice(index, 1)
    } else {
      items[index] = { ...item, quantity: remaining, updatedAt: now }
    }
  }

  save('items', items)

  return { items, removed, notUpdated }
}
