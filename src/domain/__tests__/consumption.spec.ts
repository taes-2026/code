import { describe, expect, it } from 'vitest'
import {
  buildConsumedQuantityRows,
  normalizeConsumedAmount,
  quantityStep,
  stepConsumedAmount,
  toConsumedQuantities,
  type ConsumableIngredient,
  type ConsumedQuantityRow,
} from '@/domain/consumption'
import type { InventoryItem } from '@/types/item'

function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'item-1',
    name: 'Leite',
    category: 'dairy',
    quantity: 2,
    unit: 'l',
    expirationDate: '2026-12-31',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeIngredient(overrides: Partial<ConsumableIngredient> = {}): ConsumableIngredient {
  return {
    id: 1,
    name: 'milk',
    original: '1 cup of milk',
    amount: 1,
    unit: 'l',
    ...overrides,
  }
}

function makeRow(overrides: Partial<ConsumedQuantityRow> = {}): ConsumedQuantityRow {
  return {
    key: '1-0',
    name: 'Leite',
    original: '1 cup of milk',
    amount: 1,
    recipeAmount: 1,
    unit: 'l',
    pantryQuantity: 2,
    ...overrides,
  }
}

describe('buildConsumedQuantityRows', () => {
  it('keeps the recipe amount as the default and reports the pantry stock', () => {
    const rows = buildConsumedQuantityRows([makeIngredient({ amount: 0.5 })], [makeItem()])

    expect(rows).toEqual([
      {
        key: '1-0',
        name: 'milk',
        original: '1 cup of milk',
        amount: 0.5,
        recipeAmount: 0.5,
        unit: 'l',
        pantryQuantity: 2,
      },
    ])
  })

  it('matches ingredients ignoring case, accents and plurals', () => {
    const rows = buildConsumedQuantityRows(
      [makeIngredient({ name: 'Milk', unit: 'L' })],
      [makeItem({ name: 'Leite', unit: 'l' })],
    )

    expect(rows[0]?.pantryQuantity).toBe(2)
  })

  it('marks ingredients missing from the pantry', () => {
    const rows = buildConsumedQuantityRows([makeIngredient({ name: 'flour' })], [makeItem()])

    expect(rows[0]?.pantryQuantity).toBeNull()
  })

  it('does not match when the unit differs', () => {
    const rows = buildConsumedQuantityRows(
      [makeIngredient({ name: 'milk', unit: 'ml' })],
      [makeItem({ unit: 'l' })],
    )

    expect(rows[0]?.pantryQuantity).toBeNull()
  })

  it('creates one unique row per ingredient, preserving the order', () => {
    const rows = buildConsumedQuantityRows(
      [
        makeIngredient({ id: 1, name: 'milk' }),
        makeIngredient({ id: 2, name: 'eggs', unit: 'unit', original: '2 eggs' }),
      ],
      [makeItem()],
    )

    expect(rows.map((row) => row.name)).toEqual(['milk', 'eggs'])
    expect(new Set(rows.map((row) => row.key)).size).toBe(2)
  })

  it('leaves the input ingredients untouched', () => {
    const ingredient = makeIngredient()
    const items = [makeItem()]

    buildConsumedQuantityRows([ingredient], items)

    expect(ingredient.amount).toBe(1)
    expect(items[0]?.quantity).toBe(2)
  })
})

describe('normalizeConsumedAmount', () => {
  it('accepts positive numbers and numeric strings', () => {
    expect(normalizeConsumedAmount(2)).toBe(2)
    expect(normalizeConsumedAmount('1.5')).toBe(1.5)
  })

  it('turns empty, invalid and non-positive values into zero', () => {
    expect(normalizeConsumedAmount('')).toBe(0)
    expect(normalizeConsumedAmount('abc')).toBe(0)
    expect(normalizeConsumedAmount(-1)).toBe(0)
    expect(normalizeConsumedAmount(0)).toBe(0)
    expect(normalizeConsumedAmount(Number.NaN)).toBe(0)
  })
})

describe('quantityStep', () => {
  it('steps by one for countable items and fractionally otherwise', () => {
    expect(quantityStep('unit')).toBe(1)
    expect(quantityStep('units')).toBe(1)
    expect(quantityStep('')).toBe(1)
    expect(quantityStep('kg')).toBe(0.25)
  })
})

describe('stepConsumedAmount', () => {
  it('moves up and down without float noise', () => {
    expect(stepConsumedAmount(1, 1, 'kg')).toBe(1.25)
    expect(stepConsumedAmount(1, -1, 'kg')).toBe(0.75)
    expect(stepConsumedAmount(1, 1, 'unit')).toBe(2)
  })

  it('never goes below zero', () => {
    expect(stepConsumedAmount(0, -1, 'kg')).toBe(0)
    expect(stepConsumedAmount('', -1, 'unit')).toBe(0)
  })
})

describe('toConsumedQuantities', () => {
  it('maps the edited rows to pantry deductions, skipping zero amounts', () => {
    const quantities = toConsumedQuantities([
      makeRow({ name: 'Leite', amount: 0.5, unit: 'l' }),
      makeRow({ key: '2-1', name: 'Ovos', amount: 0, unit: 'unit' }),
      makeRow({ key: '3-2', name: 'Farinha', amount: 2, unit: 'kg' }),
    ])

    expect(quantities).toEqual([
      { name: 'Leite', amount: 0.5, unit: 'l' },
      { name: 'Farinha', amount: 2, unit: 'kg' },
    ])
  })

  it('treats empty and invalid amounts as zero', () => {
    const row = makeRow()
    row.amount = '' as unknown as number

    expect(toConsumedQuantities([row])).toEqual([])
  })
})
