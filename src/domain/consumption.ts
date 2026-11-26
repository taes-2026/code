import { isIngredientMatch } from '@/domain/overlap'
import { normalizeUnit } from '@/domain/pantry'
import type { InventoryItem } from '@/types/item'

/** Minimal recipe ingredient shape needed to plan a pantry deduction. */
export interface ConsumableIngredient {
  id: number
  name: string
  original: string
  amount: number
  unit: string
}

/** Quantity that will actually be deducted from the pantry. */
export interface ConsumedQuantity {
  name: string
  amount: number
  unit: string
}

/**
 * One editable row of the quantity adjustment step: the amount the user can
 * change before the pantry is deducted.
 */
export interface ConsumedQuantityRow extends ConsumedQuantity {
  key: string
  original: string
  /** Amount written in the recipe, used to restore the default. */
  recipeAmount: number
  /** Stock that will be deducted, or null when no pantry item matches. */
  pantryQuantity: number | null
}

/** Recipe amounts are often fractional (cups, tablespoons...). */
const FRACTIONAL_STEP = 0.25

function findPantryItem(
  ingredient: ConsumableIngredient,
  items: readonly InventoryItem[],
): InventoryItem | null {
  const name = ingredient.name || ingredient.original

  return (
    items.find(
      (item) =>
        normalizeUnit(item.unit) === normalizeUnit(ingredient.unit) &&
        isIngredientMatch(item.name, name),
    ) ?? null
  )
}

/**
 * Builds one row per recipe ingredient, defaulting to the recipe amount so
 * confirming without changes keeps the previous behaviour. `pantryQuantity`
 * is the stock that will be deducted, or null when the ingredient name and
 * unit do not match any pantry item.
 */
export function buildConsumedQuantityRows(
  ingredients: readonly ConsumableIngredient[],
  items: readonly InventoryItem[],
): ConsumedQuantityRow[] {
  return ingredients.map((ingredient, index) => {
    const match = findPantryItem(ingredient, items)

    return {
      key: `${ingredient.id}-${index}`,
      name: ingredient.name || ingredient.original,
      original: ingredient.original,
      amount: ingredient.amount,
      recipeAmount: ingredient.amount,
      unit: ingredient.unit,
      pantryQuantity: match ? match.quantity : null,
    }
  })
}

/** Increment used by the +/− controls: whole units for countable items. */
export function quantityStep(unit: string): number {
  return normalizeUnit(unit) === 'unit' ? 1 : FRACTIONAL_STEP
}

/** Coerces an edited value (including empty inputs) into a valid quantity. */
export function normalizeConsumedAmount(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

/** Applies a step without going below zero or leaking float noise. */
export function stepConsumedAmount(
  amount: number | string,
  direction: 1 | -1,
  unit: string,
): number {
  const next = normalizeConsumedAmount(amount) + direction * quantityStep(unit)

  return next > 0 ? Math.round(next * 100) / 100 : 0
}

/**
 * Turns the edited rows into the quantities the pantry should deduct.
 * Ingredients set to zero are skipped entirely.
 */
export function toConsumedQuantities(
  rows: readonly ConsumedQuantityRow[],
): ConsumedQuantity[] {
  return rows
    .map((row) => ({
      name: row.name,
      amount: normalizeConsumedAmount(row.amount),
      unit: row.unit,
    }))
    .filter((quantity) => quantity.amount > 0)
}
