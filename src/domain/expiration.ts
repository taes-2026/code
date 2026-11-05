import type { InventoryItem } from '@/types/item'

export const EXPIRING_WINDOW_HOURS = 48

export const INCLUDE_EXPIRED = false

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

export interface ExpiringOptions {
  includeExpired?: boolean
}

export const EXPIRATION_RANGE_YEARS = 10

export function toDateOnly(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDateOnly(value: string): Date | null {
  const match = DATE_ONLY.exec(value)

  if (!match) return null

  const [year, month, day] = match.slice(1).map(Number) as [number, number, number]
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return date
}

const TYPED_ISO = /^(\d{4})[-/.]?(\d{2})[-/.]?(\d{2})$/
const TYPED_LOCAL = /^(\d{2})[-/.]?(\d{2})[-/.]?(\d{4})$/

/**
 * Converte uma data escrita à mão em `YYYY-MM-DD`. Aceita `2026-11-19`,
 * `19-11-2026`, `19/11/2026`, `19112026` e `20261119`. Devolve `null` se a
 * data não existir.
 */
export function parseTypedDate(text: string): string | null {
  const local = TYPED_LOCAL.exec(text)
  const iso = TYPED_ISO.exec(text)
  const candidates = [
    local && `${local[3]}-${local[2]}-${local[1]}`,
    iso && `${iso[1]}-${iso[2]}-${iso[3]}`,
  ]

  return candidates.find((date): date is string => !!date && parseDateOnly(date) !== null) ?? null
}

export function getExpirationDateRange(today: Date): { min: string; max: string } {
  const year = today.getFullYear()
  const month = today.getMonth()
  const day = today.getDate()

  return {
    min: toDateOnly(new Date(year - EXPIRATION_RANGE_YEARS, month, day)),
    max: toDateOnly(new Date(year + EXPIRATION_RANGE_YEARS, month, day)),
  }
}

export function getExpirationTime(expirationDate: string): Date | null {
  if (!expirationDate) return null

  if (DATE_ONLY.test(expirationDate)) {
    const date = parseDateOnly(expirationDate)

    return date && new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  }

  const date = new Date(expirationDate)

  return Number.isNaN(date.getTime()) ? null : date
}

export function getExpiringItems(
  items: readonly InventoryItem[],
  now: Date,
  hours: number = EXPIRING_WINDOW_HOURS,
  { includeExpired = INCLUDE_EXPIRED }: ExpiringOptions = {},
): InventoryItem[] {
  const start = now.getTime()
  const limit = start + hours * HOUR_MS

  return items
    .map((item) => ({ item, time: getExpirationTime(item.expirationDate)?.getTime() }))
    .filter(
      (entry): entry is { item: InventoryItem; time: number } =>
        entry.time !== undefined && entry.time <= limit && (includeExpired || entry.time > start),
    )
    .sort((a, b) => a.time - b.time || a.item.name.localeCompare(b.item.name, 'pt-PT'))
    .map((entry) => entry.item)
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function describeExpiration(expirationDate: string, now: Date): string {
  const expiresAt = getExpirationTime(expirationDate)

  if (!expiresAt) return ''

  const remaining = expiresAt.getTime() - now.getTime()

  if (remaining <= 0) return 'já expirou'

  const lastValid = new Date(expiresAt.getTime() - 1)
  const days = Math.round((startOfDay(lastValid) - startOfDay(now)) / DAY_MS)

  if (days === 0) return 'expira hoje'
  if (days === 1) return 'expira amanhã'

  return `expira em ${Math.ceil(remaining / HOUR_MS)} h`
}
