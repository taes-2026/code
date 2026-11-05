import type { InventoryItem } from '@/types/item'

export const EXPIRING_WINDOW_HOURS = 48

export const INCLUDE_EXPIRED = false

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

export interface ExpiringOptions {
  includeExpired?: boolean
}

export function getExpirationTime(expirationDate: string): Date | null {
  if (!expirationDate) return null

  const match = DATE_ONLY.exec(expirationDate)

  if (match) {
    const [year, month, day] = match.slice(1).map(Number) as [number, number, number]
    const date = new Date(year, month - 1, day)

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null
    }

    return new Date(year, month - 1, day + 1)
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
