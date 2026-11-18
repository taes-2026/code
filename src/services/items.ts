import { find, save, subscribe as subscribeStored } from '@/lib/storage'
import type { InventoryItem, ItemForm } from '@/types/item'

function buildItem(form: ItemForm): InventoryItem {
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    name: form.name.trim(),
    category: form.category,
    quantity: form.quantity,
    unit: form.unit,
    expirationDate: form.expirationDate,
    createdAt: now,
    updatedAt: now,
  }
}

export function findAll(): InventoryItem[] {
  return find('items')
}

export function create(form: ItemForm): InventoryItem {
  const item = buildItem(form)

  save('items', [...findAll(), item])

  return item
}
export function subscribe(listener: (items: InventoryItem[]) => void): () => void {
  return subscribeStored('items', listener)
}
