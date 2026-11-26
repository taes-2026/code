import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toRecipeDetails } from '@/services/sousChef'
import { cacheRecipe } from '@/services/recipes'
import type { SousChefResponse } from '@/types/sousChef'

vi.mock('@/services/items', () => ({ findAll: vi.fn(() => []) }))
vi.mock('@/services/profiles', () => ({ getActiveProfile: vi.fn(() => null) }))
vi.mock('@/services/recipes', () => ({ cacheRecipe: vi.fn() }))

function makeResponse(id = 'ai-test'): SousChefResponse {
  return {
    id,
    recipe: {
      title: 'Arroz de tomate',
      summary: 'Simples e rápido.',
      servings: 2,
      prepMinutes: 5,
      cookMinutes: 15,
      ingredients: [
        { name: 'Tomate', quantity: 2, unit: 'unit', optional: false, fromPantry: true },
        { name: 'Azeite', quantity: 20, unit: 'ml', optional: true, fromPantry: false },
      ],
      steps: [
        { n: 1, text: 'Corte o tomate.', uses: ['Tomate'], timerSeconds: null },
        { n: 2, text: 'Cozinhe em lume brando.', uses: ['Tomate', 'Azeite'], timerSeconds: 360 },
      ],
      tips: ['Sirva morno.'],
    },
    meta: { source: 'gemini', model: 'gemini-3.5-flash-lite', attempts: 1, warnings: [] },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('toRecipeDetails', () => {
  it('maps the generated recipe into the cook-mode shape', () => {
    const details = toRecipeDetails(makeResponse())

    expect(details.title).toBe('Arroz de tomate')
    expect(details.servings).toBe(2)
    expect(details.readyInMinutes).toBe(20)
    expect(details.sourceName).toBe('GenAI Sous-Chef')
    expect(details.extendedIngredients[0]).toEqual({
      id: 1,
      name: 'Tomate',
      original: '2 un',
      amount: 2,
      unit: 'unit',
      image: '',
    })
    expect(details.analyzedInstructions[0].steps[1].timerSeconds).toBe(360)
    expect(details.analyzedInstructions[0].steps[0].timerSeconds).toBeUndefined()
    expect(cacheRecipe).toHaveBeenCalledWith(details)
  })

  it('derives a stable numeric id so bookmarks and preparations keep working', () => {
    const first = toRecipeDetails(makeResponse('ai-018a9837-aadd'))
    const again = toRecipeDetails(makeResponse('ai-018a9837-aadd'))
    const other = toRecipeDetails(makeResponse('ai-ffffffff-bbbb'))

    expect(first.id).toBeGreaterThan(0)
    expect(again.id).toBe(first.id)
    expect(other.id).not.toBe(first.id)
  })
})
