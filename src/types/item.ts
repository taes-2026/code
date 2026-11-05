import type { ItemCategory, ItemUnit } from '@/domain/items'

export interface InventoryItem {
  id: string
  name: string
  category: ItemCategory
  quantity: number
  unit: ItemUnit
  expirationDate: string
  createdAt: string
  updatedAt: string
}

export interface ItemForm {
  name: string
  category: ItemCategory
  quantity: number
  unit: ItemUnit
  expirationDate: string
}
