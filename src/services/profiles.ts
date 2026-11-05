import { find as findStored, save as saveStored } from '@/lib/storage'
import type { Profile, ProfileForm } from '@/types/profile'

export function find(): Profile | null {
  return findStored('profile')
}

export function hasProfile(): boolean {
  return find() !== null
}

export function save(form: ProfileForm): Profile {
  const existing = find()
  const now = new Date().toISOString()

  const profile: Profile = {
    ...form,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  saveStored('profile', profile)

  return profile
}
