import { find as findStored, save as saveStored } from '@/lib/storage'
import type { Profile, ProfileForm } from '@/types/profile'

/**
 * Returns all stored profiles, automatically migrating any legacy single profile.
 */
export function findAll(): Profile[] {
  let list = findStored('profiles')

  // Automatic migration if legacy single profile exists
  if (list.length === 0) {
    const legacy = findStored('profile')
    if (legacy) {
      const now = new Date().toISOString()
      const migrated: Profile = {
        id: (legacy as Profile).id ?? crypto.randomUUID(),
        name: legacy.name,
        diet: legacy.diet,
        allergies: legacy.allergies ?? [],
        restrictions: legacy.restrictions ?? [],
        createdAt: legacy.createdAt ?? now,
        updatedAt: legacy.updatedAt ?? now,
      }
      list = [migrated]
      saveStored('profiles', list)
      saveStored('activeProfileId', migrated.id)
      saveStored('profile', migrated)
    }
  }

  return list
}

/**
 * Returns the currently active profile ID, or the first available profile ID.
 */
export function getActiveProfileId(): string | null {
  const activeId = findStored('activeProfileId')
  const profiles = findAll()

  if (activeId && profiles.some((p) => p.id === activeId)) {
    return activeId
  }

  const fallback = profiles[0]?.id ?? null
  if (fallback && fallback !== activeId) {
    saveStored('activeProfileId', fallback)
  }

  return fallback
}

/**
 * Returns the currently active profile.
 */
export function getActiveProfile(): Profile | null {
  const id = getActiveProfileId()
  if (!id) return null
  return findAll().find((p) => p.id === id) ?? null
}

/**
 * Legacy alias for getActiveProfile() to maintain full backwards compatibility.
 */
export function find(): Profile | null {
  return getActiveProfile()
}

/**
 * Returns true if at least one profile exists.
 */
export function hasProfile(): boolean {
  return getActiveProfile() !== null
}

/**
 * Switches the active profile to the profile with the given ID.
 */
export function switchProfile(profileId: string): Profile {
  const profiles = findAll()
  const target = profiles.find((p) => p.id === profileId)

  if (!target) {
    throw new Error(`Perfil com o ID "${profileId}" não encontrado.`)
  }

  saveStored('activeProfileId', target.id)
  saveStored('profile', target)

  return target
}

/**
 * Creates a new profile and optionally sets it as the active profile.
 */
export function create(form: ProfileForm, setAsActive = true): Profile {
  const profiles = findAll()
  const now = new Date().toISOString()

  const newProfile: Profile = {
    ...form,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }

  const nextProfiles = [...profiles, newProfile]
  saveStored('profiles', nextProfiles)

  if (setAsActive || profiles.length === 0) {
    saveStored('activeProfileId', newProfile.id)
    saveStored('profile', newProfile)
  }

  return newProfile
}

/**
 * Saves/updates a profile.
 * If an ID is provided, updates that profile;
 * otherwise updates the active profile, or creates a new one if none exists.
 */
export function save(form: ProfileForm, id?: string): Profile {
  const profiles = findAll()
  const targetId = id ?? getActiveProfileId()

  if (!targetId || profiles.length === 0) {
    return create(form, true)
  }

  const existing = profiles.find((p) => p.id === targetId)
  const now = new Date().toISOString()

  const updatedProfile: Profile = {
    ...form,
    id: targetId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  const nextProfiles = profiles.map((p) => (p.id === targetId ? updatedProfile : p))
  saveStored('profiles', nextProfiles)

  if (targetId === getActiveProfileId()) {
    saveStored('profile', updatedProfile)
  }

  return updatedProfile
}

/**
 * Deletes a profile by ID. If the active profile was deleted, switches to another.
 */
export function deleteProfile(profileId: string): void {
  const profiles = findAll()
  const filtered = profiles.filter((p) => p.id !== profileId)
  saveStored('profiles', filtered)

  if (getActiveProfileId() === profileId) {
    const nextActive = filtered[0] ?? null
    saveStored('activeProfileId', nextActive ? nextActive.id : null)
    saveStored('profile', nextActive)
  }
}
