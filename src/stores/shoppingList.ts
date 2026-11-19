import { reactive } from 'vue'
import {
  findAllShoppingItems,
  addShoppingItem as addStoredItem,
  addMissingIngredientsToShoppingList as addMissingStored,
  toggleShoppingItem as toggleStoredItem,
  removeShoppingItem as removeStoredItem,
  clearCheckedShoppingItems as clearCheckedStored,
  clearAllShoppingItems as clearAllStored,
  subscribeShoppingList,
} from '@/services/shoppingList'
import type { ShoppingListItem } from '@/types/shoppingList'

const state = reactive<{
  items: ShoppingListItem[]
}>({
  items: [],
})

function refresh(): void {
  state.items = findAllShoppingItems()
}

refresh()

subscribeShoppingList((items) => {
  state.items = items
})

export function useShoppingList() {
  function addMissing(
    recipe: { id: number; title: string },
    missingIngredients: Array<{
      name: string
      original?: string
      amount?: number
      unit?: string
    }>,
  ) {
    const result = addMissingStored(recipe, missingIngredients)
    refresh()
    return result
  }

  function addItem(data: {
    name: string
    amount?: number
    unit?: string
    original?: string
    recipeId?: number
    recipeTitle?: string
  }) {
    const item = addStoredItem(data)
    refresh()
    return item
  }

  function toggle(id: string) {
    toggleStoredItem(id)
    refresh()
  }

  function remove(id: string) {
    removeStoredItem(id)
    refresh()
  }

  function clearChecked() {
    clearCheckedStored()
    refresh()
  }

  function clearAll() {
    clearAllStored()
    refresh()
  }

  return {
    state,
    refresh,
    addMissing,
    addItem,
    toggle,
    remove,
    clearChecked,
    clearAll,
  }
}
