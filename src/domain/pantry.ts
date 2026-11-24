import { getExpirationState } from '@/domain/expiration'
import { isIngredientMatch } from '@/domain/overlap'
import type { InventoryItem } from '@/types/item'

/**
 * Words that describe how an ingredient is prepared or sold but not what it is.
 * They are dropped before comparing a recipe ingredient with a pantry item so
 * that, for example, "extra virgin olive oil" matches "olive oil".
 */
const QUALIFIERS = new Set([
  // English connectors and descriptors
  'a',
  'an',
  'and',
  'or',
  'of',
  'the',
  'with',
  'without',
  'for',
  'to',
  'taste',
  'fresh',
  'frozen',
  'dried',
  'dry',
  'canned',
  'raw',
  'cooked',
  'ready',
  'ground',
  'chopped',
  'minced',
  'diced',
  'sliced',
  'grated',
  'shredded',
  'large',
  'small',
  'medium',
  'whole',
  'half',
  'boneless',
  'skinless',
  'extra',
  'virgin',
  'sea',
  'kosher',
  'organic',
  'ripe',
  'peeled',
  'pitted',
  'all',
  'purpose',
  'plain',
  'unsalted',
  'salted',
  'low',
  'fat',
  'nonfat',
  'freshly',
  'finely',
  'roughly',
  'thinly',
  'coarsely',
  'lightly',
  'packed',
  'heaping',
  // Parts and cuts describe the same underlying ingredient
  'breast',
  'breasts',
  'thigh',
  'thighs',
  'wing',
  'wings',
  'drumstick',
  'drumsticks',
  'fillet',
  'fillets',
  'clove',
  'cloves',
  'leaf',
  'leaves',
  'sprig',
  'sprigs',
  'stalk',
  'stalks',
  'head',
  'heads',
  // Portuguese connectors and descriptors
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'ou',
  'com',
  'sem',
  'para',
  'ao',
  'aos',
  'fresco',
  'fresca',
  'congelado',
  'congelada',
  'seco',
  'seca',
  'cru',
  'crua',
  'cozido',
  'cozida',
  'moido',
  'moida',
  'picado',
  'picada',
  'cortado',
  'cortada',
  'ralado',
  'ralada',
  'grande',
  'pequeno',
  'pequena',
  'medio',
  'media',
  'inteiro',
  'inteira',
  'biologico',
  'biologica',
  'maduro',
  'madura',
  'descascado',
  'descascada',
  'peito',
  'peitos',
  'coxa',
  'coxas',
  'filete',
  'filetes',
  'dente',
  'dentes',
  'folha',
  'folhas',
  'ramo',
  'ramos',
  'lata',
  'latas',
  'pacote',
  'pacotes',
])

export type PantryIndex = readonly (readonly string[])[]

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function singularVariants(token: string): string[] {
  const variants = new Set([token])

  if (token.length > 3) {
    if (token.endsWith('ies') && token.length > 4) variants.add(`${token.slice(0, -3)}y`)
    if (token.endsWith('es')) variants.add(token.slice(0, -2))
    if (token.endsWith('s')) variants.add(token.slice(0, -1))
  }

  return [...variants]
}

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true

  const variants = singularVariants(a)

  return singularVariants(b).some((variant) => variants.includes(variant))
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(' ')
    .filter((token) => token.length > 0)
    .filter((token) => !QUALIFIERS.has(token))
    .filter((token) => !/^\d+(?:[.,]\d+)?%?$/.test(token))
}

function describesSameIngredient(a: readonly string[], b: readonly string[]): boolean {
  if (a.length === 0 || a.length !== b.length) return false

  return a.every((token) => b.some((other) => tokensMatch(token, other)))
}

/**
 * Builds the list of ingredient names currently available in the pantry.
 * Expired items and items with no quantity are ignored: they should not count
 * as something the user can cook with.
 */
export function buildPantryIndex(
  items: readonly InventoryItem[],
  now: Date = new Date(),
): PantryIndex {
  return items
    .filter((item) => item.quantity > 0)
    .filter((item) => getExpirationState(item.expirationDate, now) !== 'expired')
    .map((item) => tokenize(item.name))
    .filter((tokens) => tokens.length > 0)
}

/** Returns true when the pantry has an item matching the recipe ingredient. */
export function hasIngredient(index: PantryIndex, ingredientName: string): boolean {
  const ingredient = tokenize(ingredientName)

  return (
    ingredient.length > 0 && index.some((pantry) => describesSameIngredient(pantry, ingredient))
  )
}

export function normalizeUnit(unit: string): string {
  const value = unit.trim().toLowerCase()

  return value === '' || value === 'unit' || value === 'units' ? 'unit' : value
}

/**
 * Joins pantry entries for the same ingredient, unit, category and expiration
 * date, adding their quantities together. The first entry is kept.
 */
export function mergePantryItems(
  items: readonly InventoryItem[],
  now: string = new Date().toISOString(),
): InventoryItem[] {
  const merged: InventoryItem[] = []

  for (const item of items) {
    const existing = merged.find(
      (candidate) =>
        normalizeUnit(candidate.unit) === normalizeUnit(item.unit) &&
        candidate.category === item.category &&
        candidate.expirationDate === item.expirationDate &&
        isIngredientMatch(candidate.name, item.name),
    )

    if (!existing) {
      merged.push({ ...item })
      continue
    }

    existing.quantity += item.quantity
    existing.updatedAt = now
  }

  return merged
}
