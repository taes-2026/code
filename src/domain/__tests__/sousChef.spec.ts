import { describe, expect, it } from 'vitest'
import { GENERATION_STEPS, generationStep, totalMinutes } from '@/domain/sousChef'

describe('generationStep', () => {
  it('advances every two seconds and stops at the last step', () => {
    expect(generationStep(0)).toBe(0)
    expect(generationStep(1)).toBe(0)
    expect(generationStep(2)).toBe(1)
    expect(generationStep(4)).toBe(2)
    expect(generationStep(8)).toBe(4)
    expect(generationStep(60)).toBe(GENERATION_STEPS.length - 1)
  })

  it('treats negative elapsed time as the first step', () => {
    expect(generationStep(-5)).toBe(0)
  })
})

describe('totalMinutes', () => {
  it('adds prep and cook time', () => {
    expect(totalMinutes(10, 15)).toBe(25)
    expect(totalMinutes(0, 0)).toBe(0)
  })
})
