import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildRequest, generateRecipe } from '@/services/sousChef'
import { findAll } from '@/services/items'
import { getActiveProfile } from '@/services/profiles'
import type { Profile } from '@/types/profile'
import type { InventoryItem } from '@/types/item'
import type { SousChefResponse } from '@/types/sousChef'

vi.mock('@/services/items', () => ({ findAll: vi.fn() }))
vi.mock('@/services/profiles', () => ({ getActiveProfile: vi.fn() }))

function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'item-1',
    name: 'Tomate',
    category: 'vegetables',
    quantity: 3,
    unit: 'unit',
    expirationDate: '2099-01-01',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-1',
    name: 'Casa',
    diet: 'vegetarian',
    intolerances: ['gluten'],
    restrictions: ['pork'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeResponse(): SousChefResponse {
  return {
    id: 'ai-1',
    recipe: {
      title: 'Arroz de tomate',
      summary: '',
      servings: 2,
      prepMinutes: 5,
      cookMinutes: 15,
      ingredients: [
        { name: 'Tomate', quantity: 2, unit: 'unit', optional: false, fromPantry: true },
      ],
      steps: [{ n: 1, text: 'Cozinhe.', uses: ['Tomate'], timerSeconds: 600 }],
      tips: [],
    },
    meta: { source: 'testing', model: 'testing-v1', attempts: 1, warnings: [] },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buildRequest', () => {
  it('maps leftovers, drops expired pantry items and keeps the profile constraints', () => {
    const tomato = makeItem()
    const salt = makeItem({ id: 'item-2', name: 'Sal', quantity: 1, unit: 'kg' })
    const expired = makeItem({ id: 'item-3', name: 'Iogurte', expirationDate: '2000-01-01' })

    vi.mocked(findAll).mockReturnValue([tomato, salt, expired])
    vi.mocked(getActiveProfile).mockReturnValue(makeProfile())

    const request = buildRequest([tomato], 3, { maxMinutes: 30 })

    expect(request.ingredients).toEqual([{ name: 'Tomate', quantity: 3, unit: 'unit' }])
    expect(request.pantry).toEqual(['Sal'])
    expect(request.profile).toEqual({
      servings: 3,
      diet: 'vegetarian',
      intolerances: ['gluten'],
      restrictions: ['pork'],
    })
    expect(request.maxMinutes).toBe(30)
  })

  it('falls back to an omnivore profile when none is active', () => {
    vi.mocked(findAll).mockReturnValue([makeItem()])
    vi.mocked(getActiveProfile).mockReturnValue(null)

    const request = buildRequest([makeItem()], 2)

    expect(request.profile).toEqual({
      servings: 2,
      diet: 'omnivore',
      intolerances: [],
      restrictions: [],
    })
    expect(request.maxMinutes).toBeUndefined()
  })
})

describe('generateRecipe', () => {
  it('posts the mapped payload and returns the generated recipe', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeResponse(),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(findAll).mockReturnValue([makeItem()])
    vi.mocked(getActiveProfile).mockReturnValue(makeProfile())

    const response = await generateRecipe([makeItem()], 2)

    expect(response.recipe.title).toBe('Arroz de tomate')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/sous-chef',
      expect.objectContaining({ method: 'POST', headers: { 'content-type': 'application/json' } }),
    )

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.ingredients).toHaveLength(1)
    expect(body.profile.diet).toBe('vegetarian')
  })

  it('translates the service error code into a message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code: 'rate_limited', message: 'too many', details: null } }),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(findAll).mockReturnValue([makeItem()])
    vi.mocked(getActiveProfile).mockReturnValue(makeProfile())

    await expect(generateRecipe([makeItem()], 2)).rejects.toThrow('Demasiados pedidos seguidos')
  })
})
