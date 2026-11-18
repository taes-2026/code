import type { Intolerance, Diet, Restriction } from '@/domain/diet'

export type ProfileForm = {
  name: string
  diet: Diet
  intolerances: Intolerance[]
  restrictions: Restriction[]
}

export interface Profile extends ProfileForm {
  id: string
  createdAt: string
  updatedAt: string
}
