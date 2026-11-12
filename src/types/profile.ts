import type { Allergy, Diet, Restriction } from '@/domain/diet'

export type ProfileForm = {
  name: string
  diet: Diet
  allergies: Allergy[]
  restrictions: Restriction[]
}

export interface Profile extends ProfileForm {
  id: string
  createdAt: string
  updatedAt: string
}
