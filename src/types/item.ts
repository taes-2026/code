import type { Timestamp } from 'firebase/firestore'
import type { ItemCategory, ItemUnit } from '@/domain/items'

export interface InventoryItem {
  id: string
  name: string
  category: ItemCategory
  quantity: number
  unit: ItemUnit
  expirationDate: Timestamp
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export interface ItemForm {
  name: string
  category: ItemCategory
  quantity: number
  unit: ItemUnit
  expirationDate: Date
}
