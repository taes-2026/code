import type { InventoryItem } from '@/types/item'
import type { Profile } from '@/types/profile'

const PREFIX = 'smartpantry'

type StorageData = {
  profile: Profile | null
  items: InventoryItem[]
  categories: Record<string, string>
}

export type StorageKey = keyof StorageData

type Entry<T> = {
  default: () => T
  check: (value: unknown) => value is T
}

function isInventoryItem(value: unknown): value is InventoryItem {
  if (typeof value !== 'object' || value === null) return false

  const item = value as Record<string, unknown>

  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.category === 'string' &&
    typeof item.quantity === 'number' &&
    typeof item.unit === 'string' &&
    typeof item.expirationDate === 'string' &&
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string'
  )
}

const entries: { [K in StorageKey]: Entry<StorageData[K]> } = {
  profile: {
    default: () => null,
    check: (value): value is Profile | null =>
      value === null || (typeof value === 'object' && typeof (value as Profile).name === 'string'),
  },
  items: {
    default: () => [],
    check: (value): value is InventoryItem[] =>
      Array.isArray(value) && value.every(isInventoryItem),
  },
  categories: {
    default: () => ({}),
    check: (value): value is Record<string, string> =>
      typeof value === 'object' && value !== null && !Array.isArray(value),
  },
}

export class StorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'StorageError'
  }
}

let backend: Storage | null | undefined

function store(): Storage | null {
  if (backend !== undefined) return backend

  try {
    if (typeof window === 'undefined') throw new Error('no window')

    const test = `${PREFIX}:test`

    window.localStorage.setItem(test, '1')
    window.localStorage.removeItem(test)

    backend = window.localStorage
  } catch {
    backend = null
  }

  return backend
}

function requireStore(): Storage {
  const storage = store()

  if (!storage) throw new StorageError('O armazenamento local não está disponível.')

  return storage
}

const fullKey = (key: StorageKey) => `${PREFIX}:${key}`

export function find<K extends StorageKey>(key: K): StorageData[K] {
  const storage = store()

  if (!storage) return entries[key].default()

  const raw = storage.getItem(fullKey(key))

  if (raw === null) return entries[key].default()

  try {
    const value: unknown = JSON.parse(raw)

    if (!entries[key].check(value)) {
      console.error(`[storage] formato inesperado em "${fullKey(key)}"`)

      return entries[key].default()
    }

    return value
  } catch (error) {
    console.error(`[storage] JSON inválido em "${fullKey(key)}"`, error)

    return entries[key].default()
  }
}

export function save<K extends StorageKey>(key: K, value: StorageData[K]): void {
  const storage = requireStore()

  try {
    storage.setItem(fullKey(key), JSON.stringify(value))
  } catch (error) {
    throw new StorageError(`Não foi possível guardar "${key}".`, { cause: error })
  }
}

export function remove(key: StorageKey): void {
  store()?.removeItem(fullKey(key))
}

export function clear(): void {
  const storage = store()

  if (!storage) return

  const keys: string[] = []

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)

    if (key?.startsWith(`${PREFIX}:`)) keys.push(key)
  }

  keys.forEach((key) => storage.removeItem(key))
}

export function subscribe<K extends StorageKey>(
  key: K,
  listener: (value: StorageData[K]) => void,
): () => void {
  if (typeof window === 'undefined') return () => {}

  const handler = (event: StorageEvent) => {
    if (event.key !== fullKey(key)) return

    if (event.newValue === null) {
      listener(entries[key].default())

      return
    }

    try {
      const value: unknown = JSON.parse(event.newValue)

      listener(entries[key].check(value) ? value : entries[key].default())
    } catch {
      listener(entries[key].default())
    }
  }

  window.addEventListener('storage', handler)

  return () => window.removeEventListener('storage', handler)
}
