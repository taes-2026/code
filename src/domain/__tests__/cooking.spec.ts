import { describe, expect, it } from 'vitest'
import { buildCookingSteps } from '@/domain/cooking'
import type { RecipeDetails } from '@/services/recipes'

function makeRecipe(steps: { step: string; timerSeconds?: number }[]): RecipeDetails {
  return {
    instructions: null,
    analyzedInstructions: [
      { name: '', steps: steps.map((step, index) => ({ number: index + 1, ...step })) },
    ],
    extendedIngredients: [
      { id: 1, name: 'Tomate', original: '2', amount: 2, unit: 'unit', image: '' },
    ],
  } as unknown as RecipeDetails
}

describe('buildCookingSteps', () => {
  it('uses the explicit timer of an AI step without parsing the text', () => {
    const steps = buildCookingSteps(makeRecipe([{ step: 'Deixe apurar.', timerSeconds: 300 }]))

    expect(steps[0].timedActions).toEqual([{ seconds: 300, label: '5 min' }])
  })

  it('falls back to detecting durations written in the text', () => {
    const steps = buildCookingSteps(makeRecipe([{ step: 'Cozinhe por 10 minutes.' }]))

    expect(steps[0].timedActions[0]?.seconds).toBe(600)
  })

  it('adds no timer when the step is not timed', () => {
    const steps = buildCookingSteps(makeRecipe([{ step: 'Sirva de imediato.' }]))

    expect(steps[0].timedActions).toEqual([])
  })
})
