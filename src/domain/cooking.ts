import type { RecipeDetails, RecipeIngredient } from '@/services/recipes'

export interface StepSegment {
  text: string
  highlight: boolean
}

export interface CookingStep {
  text: string
  segments: StepSegment[]
  ingredients: RecipeIngredient[]
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function variants(name: string): string[] {
  const clean = name.trim().toLowerCase()

  if (!clean) return []

  const singular = clean.replace(/(?:es|s)$/, '')

  return singular && singular !== clean ? [clean, singular] : [clean]
}

function ingredientPattern(ingredient: RecipeIngredient): RegExp[] {
  return variants(ingredient.name).map(
    (variant) => new RegExp(`\\b${escapeRegExp(variant)}(?:s|es)?\\b`, 'i'),
  )
}

function buildHighlightPattern(recipe: RecipeDetails): RegExp | null {
  const names = [...new Set(recipe.extendedIngredients.flatMap((item) => variants(item.name)))]

  if (names.length === 0) return null

  names.sort((a, b) => b.length - a.length)

  return new RegExp(`\\b(?:${names.map(escapeRegExp).join('|')})(?:s|es)?\\b`, 'gi')
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''

  return new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() ?? ''
}

function buildSegments(text: string, pattern: RegExp | null): StepSegment[] {
  if (!pattern) return [{ text, highlight: false }]

  const segments: StepSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0

    if (index > lastIndex) segments.push({ text: text.slice(lastIndex, index), highlight: false })

    segments.push({ text: match[0], highlight: true })
    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex), highlight: false })

  return segments.length > 0 ? segments : [{ text, highlight: false }]
}

function ingredientsInStep(text: string, recipe: RecipeDetails): RecipeIngredient[] {
  const haystack = ` ${text} `

  return recipe.extendedIngredients.filter((ingredient) =>
    ingredientPattern(ingredient).some((pattern) => pattern.test(haystack)),
  )
}

export function buildCookingSteps(recipe: RecipeDetails): CookingStep[] {
  const highlightPattern = buildHighlightPattern(recipe)
  const analyzed = (recipe.analyzedInstructions ?? []).flatMap((group) => group.steps ?? [])
  const sources: (string | null)[] =
    analyzed.length > 0 ? analyzed.map((step) => step.step) : [recipe.instructions]

  return sources
    .map((source) => stripHtml(source))
    .filter((text) => text.length > 0)
    .map((text) => ({
      text,
      segments: buildSegments(text, highlightPattern),
      ingredients: ingredientsInStep(text, recipe),
    }))
}
