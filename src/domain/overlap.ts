import type { InventoryItem } from '@/types/item'
import { getExpirationState } from '@/domain/expiration'
import type { Profile } from '@/types/profile'

export interface IngredientStatus {
  name: string
  original?: string
  inStock: boolean
  isExpiring: boolean
  matchedPantryItem?: InventoryItem
}

export interface OverlapResult {
  overlapPercentage: number
  totalIngredients: number
  inStockCount: number
  missingCount: number
  ingredients: IngredientStatus[]
  inStockIngredients: string[]
  missingIngredients: string[]
  usesExpiring: boolean
  expiringIngredients: string[]
}

export interface RecipeWithOverlap {
  id: number
  title: string
  image: string
  imageType?: string
  overlapPercentage?: number
  totalIngredients?: number
  usedIngredientCount?: number
  missedIngredientCount?: number
  usedIngredients?: { id: number; name: string; original?: string }[]
  missedIngredients?: { id: number; name: string; original?: string }[]
  usesExpiring?: boolean
  expiringIngredients?: string[]
}

const INGREDIENT_SYNONYMS: Record<string, string[]> = {
  tomate: ['tomato', 'tomatoes', 'roma tomato', 'cherry tomato'],
  tomato: ['tomate', 'tomates'],
  cebola: ['onion', 'onions', 'yellow onion', 'red onion'],
  onion: ['cebola', 'cebolas'],
  alho: ['garlic', 'clove', 'garlic clove', 'garlic cloves'],
  garlic: ['alho', 'dente de alho'],
  ovo: ['egg', 'eggs', 'egg yolk', 'egg white'],
  ovos: ['egg', 'eggs'],
  egg: ['ovo', 'ovos'],
  leite: ['milk', 'whole milk', 'skim milk'],
  milk: ['leite'],
  manteiga: ['butter', 'unsalted butter', 'salted butter'],
  butter: ['manteiga'],
  azeite: ['olive oil', 'extra virgin olive oil'],
  'olive oil': ['azeite', 'óleo'],
  óleo: ['oil', 'vegetable oil', 'canola oil'],
  queijo: ['cheese', 'cheddar', 'parmesan', 'mozzarella'],
  cheese: ['queijo'],
  farinha: ['flour', 'all-purpose flour', 'wheat flour'],
  flour: ['farinha'],
  arroz: ['rice', 'white rice', 'brown rice'],
  rice: ['arroz'],
  massa: ['pasta', 'spaghetti', 'penne', 'macaroni', 'noodles'],
  pasta: ['massa', 'esparguete'],
  frango: ['chicken', 'chicken breast', 'chicken thighs'],
  chicken: ['frango'],
  carne: ['beef', 'meat', 'pork'],
  peixe: ['fish', 'salmon', 'tuna', 'cod'],
  cenoura: ['carrot', 'carrots'],
  carrot: ['cenoura', 'cenouras'],
  batata: ['potato', 'potatoes'],
  potato: ['batata', 'batatas'],
  maçã: ['apple', 'apples'],
  maca: ['apple', 'apples'],
  apple: ['maçã', 'maca', 'maçãs'],
  banana: ['banana', 'bananas'],
  laranja: ['orange', 'oranges'],
  orange: ['laranja', 'laranjas'],
  limão: ['lemon', 'lemons', 'lime', 'limes'],
  limao: ['lemon', 'lemons', 'lime', 'limes'],
  lemon: ['limão', 'limao', 'limões'],
  sal: ['salt', 'sea salt', 'kosher salt'],
  salt: ['sal'],
  açúcar: ['sugar', 'granulated sugar', 'brown sugar'],
  acucar: ['sugar', 'granulated sugar', 'brown sugar'],
  sugar: ['açúcar', 'acucar'],
  pimenta: ['pepper', 'black pepper', 'ground pepper'],
  pepper: ['pimenta', 'pimenta preta'],
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\p{M}]/gu, '')
    .trim()
}

export function isIngredientMatch(pantryItemName: string, recipeIngredientName: string): boolean {
  const normPantry = normalizeName(pantryItemName)
  const normRecipe = normalizeName(recipeIngredientName)

  if (!normPantry || !normRecipe) return false

  if (normPantry === normRecipe) return true
  if (normRecipe.includes(normPantry) || normPantry.includes(normRecipe)) return true

  const pantryWords = normPantry.split(/\s+/).filter((w) => w.length > 2)
  const recipeWords = normRecipe.split(/\s+/).filter((w) => w.length > 2)

  for (const pw of pantryWords) {
    if (recipeWords.some((rw) => rw === pw || rw.startsWith(pw) || pw.startsWith(rw))) {
      return true
    }
  }

  const synonyms = INGREDIENT_SYNONYMS[normPantry] ?? []
  for (const syn of synonyms) {
    const normSyn = normalizeName(syn)
    if (normRecipe.includes(normSyn) || normSyn.includes(normRecipe)) {
      return true
    }
  }

  const recipeSynonyms = INGREDIENT_SYNONYMS[normRecipe] ?? []
  for (const syn of recipeSynonyms) {
    const normSyn = normalizeName(syn)
    if (normPantry.includes(normSyn) || normSyn.includes(normPantry)) {
      return true
    }
  }

  return false
}

export function findMatchingPantryItem(
  ingredientName: string,
  pantryItems: readonly InventoryItem[],
): InventoryItem | null {
  for (const item of pantryItems) {
    if (isIngredientMatch(item.name, ingredientName)) {
      return item
    }
  }
  return null
}

export function calculateRecipeOverlap(
  ingredients: { name: string; original?: string }[],
  pantryItems: readonly InventoryItem[],
  now = new Date(),
): OverlapResult {
  if (!ingredients || ingredients.length === 0) {
    return {
      overlapPercentage: 0,
      totalIngredients: 0,
      inStockCount: 0,
      missingCount: 0,
      ingredients: [],
      inStockIngredients: [],
      missingIngredients: [],
      usesExpiring: false,
      expiringIngredients: [],
    }
  }

  const ingredientStatuses: IngredientStatus[] = []
  const inStockIngredients: string[] = []
  const missingIngredients: string[] = []
  const expiringIngredients: string[] = []

  for (const ing of ingredients) {
    const matched = findMatchingPantryItem(ing.name, pantryItems)

    if (matched) {
      const state = getExpirationState(matched.expirationDate, now)
      const isExpiring = state === 'expiring' || state === 'expired'

      ingredientStatuses.push({
        name: ing.name,
        original: ing.original,
        inStock: true,
        isExpiring,
        matchedPantryItem: matched,
      })

      inStockIngredients.push(ing.name)
      if (isExpiring) {
        expiringIngredients.push(matched.name)
      }
    } else {
      ingredientStatuses.push({
        name: ing.name,
        original: ing.original,
        inStock: false,
        isExpiring: false,
      })
      missingIngredients.push(ing.name)
    }
  }

  const total = ingredients.length
  const inStockCount = inStockIngredients.length
  const missingCount = missingIngredients.length
  const overlapPercentage = total > 0 ? Math.round((inStockCount / total) * 100) : 0

  return {
    overlapPercentage,
    totalIngredients: total,
    inStockCount,
    missingCount,
    ingredients: ingredientStatuses,
    inStockIngredients,
    missingIngredients,
    usesExpiring: expiringIngredients.length > 0,
    expiringIngredients,
  }
}

export function enrichRecipeWithOverlap(
  recipe: RecipeWithOverlap,
  pantryItems: readonly InventoryItem[],
  now = new Date(),
): RecipeWithOverlap {
  const used = recipe.usedIngredients ?? []
  const missed = recipe.missedIngredients ?? []
  const total = used.length + missed.length

  const expiringList: string[] = []

  for (const u of used) {
    const matched = findMatchingPantryItem(u.name, pantryItems)
    if (matched) {
      const state = getExpirationState(matched.expirationDate, now)
      if (state === 'expiring' || state === 'expired') {
        expiringList.push(matched.name)
      }
    }
  }

  const overlapPercentage = total > 0 ? Math.round((used.length / total) * 100) : 0

  return {
    ...recipe,
    overlapPercentage,
    totalIngredients: total,
    usedIngredientCount: used.length,
    missedIngredientCount: missed.length,
    usesExpiring: expiringList.length > 0,
    expiringIngredients: expiringList,
  }
}

export function prioritizeRecipes<T extends RecipeWithOverlap>(recipes: readonly T[]): T[] {
  return [...recipes].sort((a, b) => {
    const aUsesExpiring = a.usesExpiring ?? false
    const bUsesExpiring = b.usesExpiring ?? false

    if (aUsesExpiring && !bUsesExpiring) return -1
    if (!aUsesExpiring && bUsesExpiring) return 1

    if (aUsesExpiring && bUsesExpiring) {
      const aExpCount = a.expiringIngredients?.length ?? 0
      const bExpCount = b.expiringIngredients?.length ?? 0
      if (bExpCount !== aExpCount) {
        return bExpCount - aExpCount
      }
    }

    const aOverlap = a.overlapPercentage ?? 0
    const bOverlap = b.overlapPercentage ?? 0
    if (bOverlap !== aOverlap) {
      return bOverlap - aOverlap
    }

    const aMissed = a.missedIngredientCount ?? 0
    const bMissed = b.missedIngredientCount ?? 0
    if (aMissed !== bMissed) {
      return aMissed - bMissed
    }

    return a.title.localeCompare(b.title)
  })
}

export function violatesDietaryProfile(
  recipe: {
    diets?: string[]
    vegetarian?: boolean
    vegan?: boolean
    extendedIngredients?: { name: string }[]
    usedIngredients?: { name: string }[]
    missedIngredients?: { name: string }[]
  },
  profile: Profile | null,
): boolean {
  if (!profile) return false

  const allIngredientNames = [
    ...(recipe.extendedIngredients?.map((i) => i.name) ?? []),
    ...(recipe.usedIngredients?.map((i) => i.name) ?? []),
    ...(recipe.missedIngredients?.map((i) => i.name) ?? []),
  ].map(normalizeName)

  if (profile.diet === 'vegetarian') {
    if (recipe.vegetarian === false) return true
    const nonVegTerms = ['beef', 'pork', 'chicken', 'meat', 'bacon', 'ham', 'peixe', 'fish', 'carne', 'frango', 'porco']
    if (allIngredientNames.some((n) => nonVegTerms.some((t) => n.includes(t)))) return true
  }

  if (profile.diet === 'vegan') {
    if (recipe.vegan === false) return true
    const nonVeganTerms = ['beef', 'pork', 'chicken', 'meat', 'fish', 'egg', 'milk', 'cheese', 'butter', 'honey', 'leite', 'ovo', 'queijo', 'manteiga', 'mel']
    if (allIngredientNames.some((n) => nonVeganTerms.some((t) => n.includes(t)))) return true
  }

  if (profile.diet === 'pescatarian') {
    const nonPescaTerms = ['beef', 'pork', 'chicken', 'meat', 'bacon', 'ham', 'carne', 'frango', 'porco']
    if (allIngredientNames.some((n) => nonPescaTerms.some((t) => n.includes(t)))) return true
  }

  if (profile.allergies?.includes('lactose')) {
    const dairyTerms = ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'dairy', 'leite', 'queijo', 'manteiga', 'iogurte', 'natas']
    if (allIngredientNames.some((n) => dairyTerms.some((t) => n.includes(t)))) return true
  }

  if (profile.allergies?.includes('peanuts')) {
    const peanutTerms = ['peanut', 'peanuts', 'peanut butter', 'amendoim', 'amendoins']
    if (allIngredientNames.some((n) => peanutTerms.some((t) => n.includes(t)))) return true
  }

  if (profile.restrictions?.includes('gluten')) {
    const glutenTerms = ['wheat', 'flour', 'gluten', 'bread', 'pasta', 'farinha', 'trigo', 'pao', 'massa']
    if (allIngredientNames.some((n) => glutenTerms.some((t) => n.includes(t)))) return true
  }

  if (profile.restrictions?.includes('pork')) {
    const porkTerms = ['pork', 'bacon', 'ham', 'sausage', 'prosciutto', 'porco', 'fiambre', 'presunto', 'bacon']
    if (allIngredientNames.some((n) => porkTerms.some((t) => n.includes(t)))) return true
  }

  if (profile.restrictions?.includes('sugar')) {
    const sugarTerms = ['sugar', 'acucar', 'açúcar', 'syrup', 'caramel']
    if (allIngredientNames.some((n) => sugarTerms.some((t) => n.includes(t)))) return true
  }

  return false
}
