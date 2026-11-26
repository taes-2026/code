export const GENERATION_STEPS = [
  'A ler os ingredientes escolhidos…',
  'A aplicar o perfil e as restrições…',
  'A procurar uma combinação que funcione…',
  'A escrever os passos e os tempos…',
  'A validar a receita…',
] as const

export function generationStep(elapsedSeconds: number): number {
  const seconds = Math.max(0, Math.floor(elapsedSeconds))
  return Math.min(Math.floor(seconds / 2), GENERATION_STEPS.length - 1)
}

export function totalMinutes(prepMinutes: number, cookMinutes: number): number {
  return prepMinutes + cookMinutes
}

export const UNIT_LABELS: Record<string, string> = {
  unit: 'un',
  kg: 'kg',
  g: 'g',
  l: 'L',
  ml: 'ml',
  pack: 'emb.',
}

export function unitLabel(unit: string): string {
  return UNIT_LABELS[unit] ?? unit
}

export function formatQuantity(quantity: number): string {
  return Number.isInteger(quantity)
    ? String(quantity)
    : quantity.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}
