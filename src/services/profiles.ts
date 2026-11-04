import { addDoc, collection, getDocs, limit, query, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import type { ProfileForm } from '@/types/profile'

const profilesReference = (uid: string) => collection(db, 'users', uid, 'profiles')

export async function hasProfile(uid: string): Promise<boolean> {
  const snapshot = await getDocs(query(profilesReference(uid), limit(1)))

  return !snapshot.empty
}

export async function createProfile(uid: string, form: ProfileForm): Promise<void> {
  await addDoc(profilesReference(uid), {
    ...form,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}
