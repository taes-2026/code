import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readAll, type StorageData } from '@/lib/storage'
import {
  EXPORT_VERSION,
  buildAppDataExport,
  buildFileName,
  exportAppData,
  serializeAppDataExport,
} from '@/services/export'

vi.mock('@/lib/storage', () => ({
  readAll: vi.fn(),
}))

const NOW = new Date('2026-11-25T14:30:12.000Z')

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

const anchor = {
  href: '',
  download: '',
  click: vi.fn(),
  remove: vi.fn(),
}

const appendChild = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  vi.mocked(readAll).mockReturnValue(makeData())
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:smartpantry'),
    revokeObjectURL: vi.fn(),
  })
  vi.stubGlobal('document', {
    createElement: vi.fn(() => anchor),
    body: { appendChild },
  })
})

afterEach(() => {
  vi.runAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('buildAppDataExport', () => {
  it('inclui versão, data de exportação e todos os dados da aplicação', () => {
    const data = makeData({ items: [] })
    vi.mocked(readAll).mockReturnValue(data)

    expect(buildAppDataExport(NOW)).toEqual({
      app: 'smartpantry',
      version: EXPORT_VERSION,
      exportedAt: NOW.toISOString(),
      data,
    })
    expect(readAll).toHaveBeenCalledOnce()
  })
})

describe('serializeAppDataExport', () => {
  it('produz JSON legível com os dados exportados', () => {
    const exportData = buildAppDataExport(NOW)

    const json = serializeAppDataExport(exportData)

    expect(json).toContain('\n  "app": "smartpantry"')
    expect(JSON.parse(json)).toEqual(exportData)
  })
})

describe('buildFileName', () => {
  it('usa a data da exportação no nome do ficheiro', () => {
    expect(buildFileName(NOW)).toBe('smartpantry-2026-11-25.json')
  })
})

describe('exportAppData', () => {
  it('descarrega um ficheiro JSON com todos os dados e limpa os recursos', async () => {
    const data = makeData()
    vi.mocked(readAll).mockReturnValue(data)

    const filename = exportAppData(NOW)

    expect(filename).toBe('smartpantry-2026-11-25.json')
    expect(URL.createObjectURL).toHaveBeenCalledOnce()

    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob
    expect(blob.type).toBe('application/json')
    expect(JSON.parse(await blob.text())).toEqual({
      app: 'smartpantry',
      version: EXPORT_VERSION,
      exportedAt: NOW.toISOString(),
      data,
    })

    expect(document.createElement).toHaveBeenCalledWith('a')
    expect(anchor.href).toBe('blob:smartpantry')
    expect(anchor.download).toBe(filename)
    expect(appendChild).toHaveBeenCalledWith(anchor)
    expect(anchor.click).toHaveBeenCalledOnce()
    expect(anchor.remove).toHaveBeenCalledOnce()

    vi.runAllTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:smartpantry')
  })
})
