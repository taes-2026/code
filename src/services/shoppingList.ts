import { find, save, subscribe as subscribeStored } from '@/lib/storage'
import { isIngredientMatch, normalizeName } from '@/domain/overlap'
import type { ShoppingListItem } from '@/types/shoppingList'

export function findAllShoppingItems(): ShoppingListItem[] {
  return find('shoppingList')
}

export function findShoppingItem(id: string): ShoppingListItem | null {
  return findAllShoppingItems().find((item) => item.id === id) ?? null
}

export function addShoppingItem(data: {
  name: string
  amount?: number
  unit?: string
  original?: string
  recipeId?: number
  recipeTitle?: string
}): ShoppingListItem {
  const cleanName = data.name.trim()
  if (!cleanName) {
    throw new Error('Nome do item é obrigatório.')
  }

  const item: ShoppingListItem = {
    id: crypto.randomUUID(),
    name: cleanName,
    amount: data.amount,
    unit: data.unit,
    original: data.original?.trim() || cleanName,
    checked: false,
    recipeId: data.recipeId,
    recipeTitle: data.recipeTitle,
    createdAt: new Date().toISOString(),
  }

  save('shoppingList', [...findAllShoppingItems(), item])
  return item
}

export function addMissingIngredientsToShoppingList(
  recipe: { id: number; title: string },
  missingIngredients: Array<{ name: string; original?: string; amount?: number; unit?: string }>,
): { added: ShoppingListItem[]; existingCount: number } {
  const currentItems = [...findAllShoppingItems()]
  const added: ShoppingListItem[] = []
  let existingCount = 0

  for (const missing of missingIngredients) {
    const normMissing = normalizeName(missing.name)
    if (!normMissing) continue

    const existingUnchecked = currentItems.find(
      (item) => !item.checked && (normalizeName(item.name) === normMissing || isIngredientMatch(item.name, missing.name)),
    )

    if (existingUnchecked) {
      existingCount++
      continue
    }

    const existingChecked = currentItems.find(
      (item) => item.checked && (normalizeName(item.name) === normMissing || isIngredientMatch(item.name, missing.name)),
    )

    if (existingChecked) {
      existingChecked.checked = false
      existingChecked.recipeId = recipe.id
      existingChecked.recipeTitle = recipe.title
      if (missing.amount !== undefined) existingChecked.amount = missing.amount
      if (missing.unit) existingChecked.unit = missing.unit
      if (missing.original) existingChecked.original = missing.original
      added.push(existingChecked)
      continue
    }

    const newItem: ShoppingListItem = {
      id: crypto.randomUUID(),
      name: missing.name.trim(),
      amount: missing.amount,
      unit: missing.unit,
      original: missing.original?.trim() || missing.name.trim(),
      checked: false,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      createdAt: new Date().toISOString(),
    }

    currentItems.push(newItem)
    added.push(newItem)
  }

  save('shoppingList', currentItems)
  return { added, existingCount }
}

export function toggleShoppingItem(id: string): void {
  const updated = findAllShoppingItems().map((item) =>
    item.id === id ? { ...item, checked: !item.checked } : item,
  )
  save('shoppingList', updated)
}

export function removeShoppingItem(id: string): void {
  const updated = findAllShoppingItems().filter((item) => item.id !== id)
  save('shoppingList', updated)
}

export function clearCheckedShoppingItems(): void {
  const updated = findAllShoppingItems().filter((item) => !item.checked)
  save('shoppingList', updated)
}

export function clearAllShoppingItems(): void {
  save('shoppingList', [])
}

export function subscribeShoppingList(listener: (items: ShoppingListItem[]) => void): () => void {
  return subscribeStored('shoppingList', listener)
}
