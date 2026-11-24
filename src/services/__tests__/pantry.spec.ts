import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { find, save } from '@/lib/storage'
import { updatePantryAfterMeal, type ConsumedIngredient } from '@/services/pantry'
import type { InventoryItem } from '@/types/item'

vi.mock('@/lib/storage', () => ({
  find: vi.fn(),
  save: vi.fn(),
}))

const NOW = '2026-01-01T10:00:00.000Z'

function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'item-1',
    name: 'Leite',
    category: 'dairy',
    quantity: 2,
    unit: 'l',
    expirationDate: '2026-12-31',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeConsumed(overrides: Partial<ConsumedIngredient> = {}): ConsumedIngredient {
  return { name: 'Leite', amount: 1, unit: 'l', ...overrides }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW))
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('updatePantryAfterMeal', () => {
  it('decrementa a quantidade quando a unidade é igual', () => {
    const milk = makeItem({ quantity: 3 })
    vi.mocked(find).mockReturnValue([milk])

    const result = updatePantryAfterMeal([makeConsumed({ amount: 1 })])

    expect(result.items).toEqual([{ ...milk, quantity: 2, updatedAt: NOW }])
    expect(result.notUpdated).toEqual([])
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('items', result.items)
  })

  it('remove o item quando a quantidade fica a zero', () => {
    vi.mocked(find).mockReturnValue([makeItem({ quantity: 2 })])

    const result = updatePantryAfterMeal([makeConsumed({ amount: 2 })])

    expect(result.items).toEqual([])
    expect(result.notUpdated).toEqual([])
    expect(save).toHaveBeenCalledWith('items', [])
  })

  it('remove o item quando a quantidade consumida é superior ao stock', () => {
    vi.mocked(find).mockReturnValue([makeItem({ quantity: 2 })])

    const result = updatePantryAfterMeal([makeConsumed({ amount: 5 })])

    expect(result.items).toEqual([])
    expect(result.notUpdated).toEqual([])
  })

  it('não atualiza o item quando a unidade é diferente', () => {
    const milk = makeItem({ quantity: 2, unit: 'l' })
    vi.mocked(find).mockReturnValue([milk])
    const consumed = makeConsumed({ amount: 500, unit: 'ml' })

    const result = updatePantryAfterMeal([consumed])

    expect(result.items).toEqual([milk])
    expect(result.notUpdated).toEqual([consumed])
    expect(save).toHaveBeenCalledWith('items', [milk])
  })

  it('devolve o ingrediente nos não atualizados quando não existe na pantry', () => {
    vi.mocked(find).mockReturnValue([makeItem()])
    const consumed = makeConsumed({ name: 'Farinha', amount: 1, unit: 'kg' })

    const result = updatePantryAfterMeal([consumed])

    expect(result.items).toHaveLength(1)
    expect(result.notUpdated).toEqual([consumed])
  })

  it('processa vários ingredientes e mantém os restantes itens intactos', () => {
    const milk = makeItem({ id: 'milk', name: 'Leite', quantity: 2, unit: 'l' })
    const flour = makeItem({ id: 'flour', name: 'Farinha', quantity: 1, unit: 'kg' })
    const eggs = makeItem({ id: 'eggs', name: 'Ovos', quantity: 6, unit: 'unit' })
    vi.mocked(find).mockReturnValue([milk, flour, eggs])
    const missing = makeConsumed({ name: 'Arroz', amount: 1, unit: 'kg' })

    const result = updatePantryAfterMeal([
      makeConsumed({ name: 'Leite', amount: 1, unit: 'l' }),
      makeConsumed({ name: 'Ovos', amount: 6, unit: 'unit' }),
      missing,
    ])

    expect(result.items).toEqual([{ ...milk, quantity: 1, updatedAt: NOW }, flour])
    expect(result.notUpdated).toEqual([missing])
    expect(save).toHaveBeenCalledWith('items', result.items)
  })

  it('compara os nomes sem distinguir maiúsculas nem acentos', () => {
    const sugar = makeItem({ name: 'Açúcar', quantity: 1, unit: 'kg' })
    vi.mocked(find).mockReturnValue([sugar])

    const result = updatePantryAfterMeal([
      makeConsumed({ name: 'ACUCAR', amount: 0.5, unit: 'kg' }),
    ])

    expect(result.items).toEqual([{ ...sugar, quantity: 0.5, updatedAt: NOW }])
    expect(result.notUpdated).toEqual([])
  })

  it('trata a unidade vazia como unidade(s) da pantry', () => {
    const carrot = makeItem({ name: 'Carrot', quantity: 5, unit: 'unit' })
    vi.mocked(find).mockReturnValue([carrot])

    const result = updatePantryAfterMeal([makeConsumed({ name: 'carrot', amount: 3, unit: '' })])

    expect(result.items).toEqual([{ ...carrot, quantity: 2, updatedAt: NOW }])
    expect(result.notUpdated).toEqual([])
  })

  it('encontra o item quando o nome está no plural', () => {
    const carrot = makeItem({ name: 'Carrot', quantity: 5, unit: 'unit' })
    vi.mocked(find).mockReturnValue([carrot])

    const result = updatePantryAfterMeal([
      makeConsumed({ name: 'carrots', amount: 5, unit: 'unit' }),
    ])

    expect(result.items).toEqual([])
    expect(result.notUpdated).toEqual([])
  })

  it('devolve o que foi efetivamente removido da despensa', () => {
    const milk = makeItem({ quantity: 2 })
    const flour = makeItem({ id: 'flour', name: 'Farinha', quantity: 1, unit: 'kg' })
    vi.mocked(find).mockReturnValue([milk, flour])

    const result = updatePantryAfterMeal([
      makeConsumed({ name: 'Leite', amount: 5, unit: 'l' }),
      makeConsumed({ name: 'Farinha', amount: 0.5, unit: 'kg' }),
    ])

    expect(result.removed).toEqual([
      { name: 'Leite', amount: 2, unit: 'l' },
      { name: 'Farinha', amount: 0.5, unit: 'kg' },
    ])
  })

  it('atualiza apenas o primeiro item quando há duplicados não agregáveis', () => {
    const first = makeItem({ id: 'first', quantity: 1, expirationDate: '2026-12-30' })
    const second = makeItem({ id: 'second', quantity: 5, expirationDate: '2026-12-31' })
    vi.mocked(find).mockReturnValue([first, second])

    const result = updatePantryAfterMeal([makeConsumed({ amount: 1 })])

    expect(result.items).toEqual([second])
  })
})
