import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import type { ItemForm } from '@/types/item'

const itemsReference = (uid: string) => collection(db, 'users', uid, 'items')

export async function createItem(uid: string, form: ItemForm): Promise<void> {
  await addDoc(itemsReference(uid), {
    name: form.name.trim(),
    category: form.category,
    quantity: form.quantity,
    unit: form.unit,
    expirationDate: Timestamp.fromDate(form.expirationDate),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}
