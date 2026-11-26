import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { find, save } from '@/lib/storage'
import {
  ProfileNotFoundError,
  deleteProfile,
  findById,
  save as saveProfile,
} from '@/services/profiles'
import type { Profile, ProfileForm } from '@/types/profile'

vi.mock('@/lib/storage', () => ({
  find: vi.fn(),
  save: vi.fn(),
}))

function makeProfile(id: string): Profile {
  return {
    id,
    name: `Perfil ${id}`,
    diet: 'omnivore',
    intolerances: [],
    restrictions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function useStorage(initial: Record<string, unknown>) {
  const state: Record<string, unknown> = { ...initial }

  vi.mocked(find).mockImplementation(((key: string) => {
    if (key in state) return state[key]
    if (key === 'activeProfileId' || key === 'profile') return null
    return []
  }) as unknown as typeof find)

  vi.mocked(save).mockImplementation(((key: string, value: unknown) => {
    state[key] = value
  }) as unknown as typeof save)

  return state
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

function makeForm(overrides: Partial<ProfileForm> = {}): ProfileForm {
  return {
    name: 'Perfil atualizado',
    diet: 'vegan',
    intolerances: ['gluten'],
    restrictions: ['pork'],
    ...overrides,
  }
}

describe('findById', () => {
  it('devolve o perfil com o id indicado', () => {
    const active = makeProfile('a')
    const other = makeProfile('b')
    useStorage({
      profiles: [active, other],
      activeProfileId: active.id,
      profile: active,
    })

    expect(findById(other.id)).toEqual(other)
  })

  it('devolve null quando o id não existe', () => {
    const active = makeProfile('a')
    useStorage({
      profiles: [active],
      activeProfileId: active.id,
      profile: active,
    })

    expect(findById('missing')).toBeNull()
  })
})

describe('save', () => {
  it('atualiza o perfil ativo mantendo o id e a data de criação', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-01T10:00:00.000Z'))

    const active = makeProfile('a')
    const other = makeProfile('b')
    const state = useStorage({
      profiles: [active, other],
      activeProfileId: active.id,
      profile: active,
    })

    const updated = saveProfile(makeForm({ name: 'Casa' }), active.id)

    expect(updated).toEqual({
      id: active.id,
      name: 'Casa',
      diet: 'vegan',
      intolerances: ['gluten'],
      restrictions: ['pork'],
      createdAt: active.createdAt,
      updatedAt: '2026-02-01T10:00:00.000Z',
    })
    expect(state.profiles).toEqual([updated, other])
    expect(state.activeProfileId).toBe(active.id)
    expect(state.profile).toEqual(updated)
  })

  it('atualiza um perfil não ativo sem alterar o perfil ativo', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-01T10:00:00.000Z'))

    const active = makeProfile('a')
    const other = makeProfile('b')
    const state = useStorage({
      profiles: [active, other],
      activeProfileId: active.id,
      profile: active,
    })

    const updated = saveProfile(makeForm({ name: 'Casa de praia' }), other.id)

    expect(state.profiles).toEqual([active, updated])
    expect(state.activeProfileId).toBe(active.id)
    expect(state.profile).toEqual(active)
    expect(vi.mocked(save).mock.calls.map(([key]) => key)).toEqual(['profiles'])
  })

  it('atualiza o perfil ativo quando não é indicado um id', () => {
    const active = makeProfile('a')
    const state = useStorage({
      profiles: [active],
      activeProfileId: active.id,
      profile: active,
    })

    const updated = saveProfile(makeForm())

    expect(updated.id).toBe(active.id)
    expect(state.profiles).toEqual([updated])
    expect(state.profile).toEqual(updated)
  })

  it('lança erro e não guarda nada quando o id indicado não existe', () => {
    const active = makeProfile('a')
    const state = useStorage({
      profiles: [active],
      activeProfileId: active.id,
      profile: active,
    })

    expect(() => saveProfile(makeForm(), 'missing')).toThrow(ProfileNotFoundError)
    expect(state.profiles).toEqual([active])
    expect(state.profile).toEqual(active)
    expect(save).not.toHaveBeenCalled()
  })

  it('cria um perfil quando ainda não existe nenhum', () => {
    const state = useStorage({
      profiles: [],
      activeProfileId: null,
      profile: null,
    })

    const created = saveProfile(makeForm())

    expect(created.id).toBeTruthy()
    expect(state.profiles).toEqual([created])
    expect(state.activeProfileId).toBe(created.id)
    expect(state.profile).toEqual(created)
  })
})

describe('deleteProfile', () => {
  it('elimina um perfil não ativo e mantém o perfil ativo', () => {
    const active = makeProfile('a')
    const other = makeProfile('b')
    const state = useStorage({
      profiles: [active, other],
      activeProfileId: active.id,
      profile: active,
    })

    const result = deleteProfile(other.id)

    expect(result).toEqual({
      status: 'deleted',
      activeProfileChanged: false,
      newActiveProfileId: null,
    })
    expect(state.profiles).toEqual([active])
    expect(state.activeProfileId).toBe(active.id)
    expect(state.profile).toEqual(active)
  })

  it('elimina o perfil ativo e passa a ativar o primeiro perfil restante', () => {
    const first = makeProfile('a')
    const second = makeProfile('b')
    const third = makeProfile('c')
    const state = useStorage({
      profiles: [first, second, third],
      activeProfileId: first.id,
      profile: first,
    })

    const result = deleteProfile(first.id)

    expect(result).toEqual({
      status: 'deleted',
      activeProfileChanged: true,
      newActiveProfileId: second.id,
    })
    expect(state.profiles).toEqual([second, third])
    expect(state.activeProfileId).toBe(second.id)
    expect(state.profile).toEqual(second)
  })

  it('não elimina o último perfil', () => {
    const only = makeProfile('a')
    const state = useStorage({
      profiles: [only],
      activeProfileId: only.id,
      profile: only,
    })

    const result = deleteProfile(only.id)

    expect(result).toEqual({ status: 'last-profile' })
    expect(state.profiles).toEqual([only])
    expect(state.activeProfileId).toBe(only.id)
    expect(save).not.toHaveBeenCalled()
  })

  it('devolve not-found quando o id não existe', () => {
    const active = makeProfile('a')
    const state = useStorage({
      profiles: [active, makeProfile('b')],
      activeProfileId: active.id,
      profile: active,
    })

    const result = deleteProfile('missing')

    expect(result).toEqual({ status: 'not-found' })
    expect(state.profiles).toHaveLength(2)
    expect(save).not.toHaveBeenCalled()
  })

  it('não altera a pantry, a lista de compras nem o recipe book', () => {
    const active = makeProfile('a')
    const other = makeProfile('b')
    const items = [{ id: 'item-1', name: 'Leite' }]
    const shoppingList = [{ id: 'shop-1', name: 'Ovos' }]
    const bookmarks = [{ id: 1, title: 'Bolo' }]
    const state = useStorage({
      profiles: [active, other],
      activeProfileId: active.id,
      profile: active,
      items,
      shoppingList,
      bookmarks,
    })

    deleteProfile(other.id)

    expect(state.items).toEqual(items)
    expect(state.shoppingList).toEqual(shoppingList)
    expect(state.bookmarks).toEqual(bookmarks)
    expect(vi.mocked(save).mock.calls.map(([key]) => key)).toEqual(['profiles'])
  })
})
