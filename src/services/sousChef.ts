import { formatQuantity, unitLabel } from '@/domain/sousChef'
import { findAll } from '@/services/items'
import { getActiveProfile } from '@/services/profiles'
import { cacheRecipe, type RecipeDetails } from '@/services/recipes'
import type { InventoryItem } from '@/types/item'
import type {
  SousChefErrorBody,
  SousChefRequest,
  SousChefResponse,
  SousChefUnit,
} from '@/types/sousChef'

const baseUrl = import.meta.env.VITE_SOUS_CHEF_URL ?? '/api'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: 'Os ingredientes ou o perfil não são válidos. Revê os dados e tenta outra vez.',
  rate_limited: 'Demasiados pedidos seguidos. Espera um minuto e tenta novamente.',
  upstream_rate_limited: 'O serviço de IA está ocupado. Tenta novamente dentro de instantes.',
  upstream_refused: 'O serviço de IA recusou gerar esta receita.',
  upstream_timeout: 'O serviço de IA demorou demasiado a responder. Tenta outra vez.',
  invalid_model_output: 'A receita gerada não respeitou as restrições do perfil. Tenta novamente.',
  upstream_error: 'Não foi possível contactar o serviço de IA.',
  misconfigured: 'O serviço de IA está mal configurado.',
  internal: 'Ocorreu um erro inesperado ao gerar a receita.',
}

function today(): string {
  return new Date().toLocaleDateString('sv-SE')
}

function onlyAvailable(items: InventoryItem[]): InventoryItem[] {
  const cutoff = today()
  return items.filter((item) => item.expirationDate >= cutoff)
}

export function buildRequest(
  selected: InventoryItem[],
  servings: number,
  options: { maxMinutes?: number; notes?: string } = {},
): SousChefRequest {
  const selectedIds = new Set(selected.map((item) => item.id))
  const profile = getActiveProfile()

  const pantry = onlyAvailable(findAll())
    .filter((item) => !selectedIds.has(item.id))
    .map((item) => item.name.trim())
    .filter((name) => name.length > 0)

  return {
    ingredients: selected.map((item) => ({
      name: item.name.trim(),
      quantity: item.quantity,
      unit: item.unit as SousChefUnit,
    })),
    pantry: [...new Set(pantry)].slice(0, 40),
    profile: {
      servings,
      diet: profile?.diet ?? 'omnivore',
      intolerances: profile?.intolerances ?? [],
      restrictions: profile?.restrictions ?? [],
    },
    ...(options.maxMinutes ? { maxMinutes: options.maxMinutes } : {}),
    ...(options.notes?.trim() ? { notes: options.notes.trim() } : {}),
  }
}

export async function generateRecipe(
  selected: InventoryItem[],
  servings: number,
  options: { maxMinutes?: number; notes?: string } = {},
  signal?: AbortSignal,
): Promise<SousChefResponse> {
  const request = buildRequest(selected, servings, options)

  let response: Response

  try {
    response = await fetch(`${baseUrl}/v1/sous-chef`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    })
  } catch (cause) {
    if (signal?.aborted) throw cause
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Sem ligação à internet. Não é possível gerar receitas novas offline.')
    }
    throw new Error(ERROR_MESSAGES.upstream_error)
  }

  const body = (await response.json().catch(() => null)) as
    SousChefResponse | SousChefErrorBody | null

  if (!response.ok) {
    const error = body as SousChefErrorBody | null
    const code = error?.error?.code ?? 'upstream_error'
    throw new Error(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.upstream_error)
  }

  if (!body || !('recipe' in body)) {
    throw new Error(ERROR_MESSAGES.upstream_error)
  }

  return body
}

const AI_RECIPE_IMAGE =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="16" fill="#e8f2ec"/><rect x="34" y="50" width="60" height="34" rx="6" fill="#198754"/><rect x="30" y="44" width="68" height="10" rx="5" fill="#146c43"/><rect x="58" y="84" width="12" height="10" fill="#198754"/><rect x="46" y="94" width="36" height="6" rx="3" fill="#146c43"/></svg>',
  )

function numericId(value: string): number {
  let hash = 0

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0
  }

  return Math.abs(hash) || 1
}

export function toRecipeDetails(response: SousChefResponse): RecipeDetails {
  const recipe = response.recipe
  const details: RecipeDetails = {
    id: numericId(response.id),
    title: recipe.title,
    image: AI_RECIPE_IMAGE,
    servings: recipe.servings,
    readyInMinutes: recipe.prepMinutes + recipe.cookMinutes,
    preparationMinutes: recipe.prepMinutes,
    cookingMinutes: recipe.cookMinutes,
    healthScore: 0,
    pricePerServing: 0,
    sourceName: 'GenAI Sous-Chef',
    sourceUrl: null,
    creditsText: null,
    summary: recipe.summary,
    instructions: recipe.steps.map((step) => step.text).join('\n'),
    cuisines: [],
    dishTypes: [],
    diets: [],
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    dairyFree: false,
    veryHealthy: false,
    cheap: false,
    veryPopular: false,
    extendedIngredients: recipe.ingredients.map((ingredient, index) => ({
      id: index + 1,
      name: ingredient.name,
      original: `${formatQuantity(ingredient.quantity)} ${unitLabel(ingredient.unit)}`,
      amount: ingredient.quantity,
      unit: ingredient.unit,
      image: '',
    })),
    analyzedInstructions: [
      {
        name: '',
        steps: recipe.steps.map((step) => ({
          number: step.n,
          step: step.text,
          ...(step.timerSeconds ? { timerSeconds: step.timerSeconds } : {}),
        })),
      },
    ],
  }

  try {
    cacheRecipe(details)
  } catch (error) {
    console.error('[sousChef] não foi possível guardar a receita gerada', error)
  }

  return details
}
