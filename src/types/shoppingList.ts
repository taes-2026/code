export interface ShoppingListItem {
  id: string
  name: string
  amount?: number
  unit?: string
  original?: string
  checked: boolean
  recipeId?: number
  recipeTitle?: string
  createdAt: string
}
