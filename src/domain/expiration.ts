import type { InventoryItem } from '@/types/item'

export const EXPIRING_WINDOW_HOURS = 48

const EXPIRATION_RANGE_YEARS = 10
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/
const TYPED_ISO = /^(\d{4})[-/.]?(\d{2})[-/.]?(\d{2})$/
const TYPED_LOCAL = /^(\d{2})[-/.]?(\d{2})[-/.]?(\d{4})$/

const pad = (value: number) => String(value).padStart(2, '0')

function toDateOnly(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function parseDateOnly(value: string): Date | null {
  const match = DATE_ONLY.exec(value)

  if (!match) return null

  const [year, month, day] = match.slice(1).map(Number) as [number, number, number]
  const date = new Date(year, month - 1, day)

  return toDateOnly(date) === value ? date : null
}

export function parseTypedDate(text: string): string | null {
  const iso = TYPED_ISO.exec(text)
  const local = TYPED_LOCAL.exec(text)
  const candidates = [
    iso && `${iso[1]}-${iso[2]}-${iso[3]}`,
    local && `${local[3]}-${local[2]}-${local[1]}`,
  ]

  return candidates.find((date) => date && parseDateOnly(date)) ?? null
}

export function getExpirationDateRange(today: Date): { min: string; max: string } {
  const shift = (years: number) =>
    toDateOnly(new Date(today.getFullYear() + years, today.getMonth(), today.getDate()))

  return { min: shift(-EXPIRATION_RANGE_YEARS), max: shift(EXPIRATION_RANGE_YEARS) }
}

export function getExpirationTime(expirationDate: string): Date | null {
  if (!expirationDate) return null

  if (DATE_ONLY.test(expirationDate)) {
    const date = parseDateOnly(expirationDate)

    date?.setDate(date.getDate() + 1)

    return date
  }

  const date = new Date(expirationDate)

  return Number.isNaN(date.getTime()) ? null : date
}

function expirationMs(item: InventoryItem): number {
  return getExpirationTime(item.expirationDate)?.getTime() ?? Infinity
}

export function compareByExpiration(a: InventoryItem, b: InventoryItem): number {
  return expirationMs(a) - expirationMs(b) || a.name.localeCompare(b.name, 'pt-PT')
}

export type ExpirationState = 'expired' | 'expiring' | 'ok'

export function getExpirationState(
  expirationDate: string,
  now: Date,
  hours = EXPIRING_WINDOW_HOURS,
): ExpirationState {
  const time = getExpirationTime(expirationDate)?.getTime() ?? Infinity

  if (time <= now.getTime()) return 'expired'
  if (time <= now.getTime() + hours * HOUR_MS) return 'expiring'

  return 'ok'
}

export function getExpiringItems(
  items: readonly InventoryItem[],
  now: Date,
  hours = EXPIRING_WINDOW_HOURS,
  includeExpired = false,
): InventoryItem[] {
  return items
    .filter((item) => {
      const state = getExpirationState(item.expirationDate, now, hours)

      return state === 'expiring' || (includeExpired && state === 'expired')
    })
    .sort(compareByExpiration)
}

export function formatExpirationDate(expirationDate: string): string {
  const date = parseDateOnly(expirationDate) ?? new Date(expirationDate)

  if (Number.isNaN(date.getTime())) return '—'

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

export function describeExpiration(expirationDate: string, now: Date): string {
  const expiresAt = getExpirationTime(expirationDate)

  if (!expiresAt) return ''

  const remaining = expiresAt.getTime() - now.getTime()

  if (remaining <= 0) return 'já expirou'

  const lastValidDay = startOfDay(new Date(expiresAt.getTime() - 1))
  const days = Math.round((lastValidDay - startOfDay(now)) / DAY_MS)

  if (days === 0) return 'expira hoje'
  if (days === 1) return 'expira amanhã'

  return `expira em ${Math.ceil(remaining / HOUR_MS)} h`
}
