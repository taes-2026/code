import { findAll } from '@/services/items'
import { getActiveProfile } from '@/services/profiles'
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
): Promise<SousChefResponse> {
  const request = buildRequest(selected, servings, options)

  let response: Response

  try {
    response = await fetch(`${baseUrl}/v1/sous-chef`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    })
  } catch {
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
