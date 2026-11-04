import type { Allergy, Diet, Restriction } from '@/domain/diet'
import type { Timestamp } from 'firebase/firestore'

export interface Profile {
  id: string
  name: string

  diet: Diet
  allergies: Allergy[]
  restrictions: Restriction[]

  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type ProfileForm = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>
