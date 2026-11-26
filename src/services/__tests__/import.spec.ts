import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS, clear, readAll, save, type StorageData } from '@/lib/storage'
import { EXPORT_VERSION, serializeAppDataExport } from '@/services/export'
import { ImportError, importAppData, parseAppDataExport } from '@/services/import'

vi.mock('@/lib/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/storage')>()

  return {
    ...actual,
    clear: vi.fn(),
    readAll: vi.fn(),
    save: vi.fn(),
  }
})

const NOW = new Date('2026-11-26T10:15:00.000Z')

function makeData(overrides: Partial<StorageData> = {}): StorageData {
  return {
    profile: null,
    profiles: [],
    activeProfileId: null,
    items: [],
    categories: {},
    bookmarks: [],
    collections: [],
    cachedRecipes: {},
    shoppingList: [],
    preparations: [],
    ...overrides,
  }
}

function validJson(data: StorageData = makeData()): string {
  return serializeAppDataExport({
    app: 'smartpantry',
    version: EXPORT_VERSION,
    exportedAt: NOW.toISOString(),
    data,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(readAll).mockReturnValue(makeData())
  vi.mocked(save).mockReset()
})

describe('parseAppDataExport', () => {
  it('aceita um ficheiro gerado pela exportação', () => {
    const data = makeData({ items: [] })

    expect(parseAppDataExport(validJson(data))).toEqual({
      app: 'smartpantry',
      version: EXPORT_VERSION,
      exportedAt: NOW.toISOString(),
      data,
    })
  })

  it('rejeita JSON inválido', () => {
    expect(() => parseAppDataExport('{ nope')).toThrow(ImportError)
    expect(() => parseAppDataExport('{ nope')).toThrow('O ficheiro não contém JSON válido.')
  })

  it('rejeita ficheiros de outras aplicações', () => {
    const contents = JSON.stringify({ ...JSON.parse(validJson()), app: 'outra-app' })

    expect(() => parseAppDataExport(contents)).toThrow(
      'O ficheiro não é uma exportação do SmartPantry.',
    )
  })

  it('rejeita versões não suportadas', () => {
    const contents = JSON.stringify({ ...JSON.parse(validJson()), version: 99 })

    expect(() => parseAppDataExport(contents)).toThrow('Versão de exportação não suportada: 99.')
  })

  it('rejeita dados incompletos ou inválidos', () => {
    const incomplete = JSON.parse(validJson()) as Record<string, unknown>
    delete (incomplete.data as Record<string, unknown>).items

    const invalid = JSON.parse(validJson()) as Record<string, unknown>
    const invalidData = invalid.data as Record<string, unknown>
    invalidData.items = [{}]

    expect(() => parseAppDataExport(JSON.stringify(incomplete))).toThrow(
      'Os dados do ficheiro são inválidos ou estão incompletos.',
    )
    expect(() => parseAppDataExport(JSON.stringify(invalid))).toThrow(
      'Os dados do ficheiro são inválidos ou estão incompletos.',
    )
  })
})

describe('importAppData', () => {
  it('substitui todas as chaves pelos dados importados', () => {
    const imported = makeData({ activeProfileId: 'perfil-importado', items: [] })
    const previous = makeData({ activeProfileId: 'perfil-antigo' })
    vi.mocked(readAll).mockReturnValue(previous)

    const result = importAppData(validJson(imported))

    expect(result.data).toEqual(imported)
    expect(clear).toHaveBeenCalledOnce()
    expect(vi.mocked(save).mock.calls).toEqual(STORAGE_KEYS.map((key) => [key, imported[key]]))
  })

  it('repõe os dados anteriores se falhar ao guardar', () => {
    const previous = makeData({ activeProfileId: 'perfil-antigo' })
    vi.mocked(readAll).mockReturnValue(previous)

    let attempts = 0
    vi.mocked(save).mockImplementation(() => {
      attempts += 1
      if (attempts === 3) throw new Error('sem espaço')
    })

    expect(() => importAppData(validJson(makeData()))).toThrow(ImportError)
    expect(clear).toHaveBeenCalledTimes(2)
    expect(vi.mocked(save).mock.calls.slice(-STORAGE_KEYS.length)).toEqual(
      STORAGE_KEYS.map((key) => [key, previous[key]]),
    )
  })

  it('não altera o armazenamento quando o ficheiro é inválido', () => {
    expect(() => importAppData('{ nope')).toThrow(ImportError)
    expect(clear).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
  })
})
