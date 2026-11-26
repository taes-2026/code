import { STORAGE_KEYS, clear, isStorageData, readAll, save } from '@/lib/storage'
import { APP_IDENTIFIER, EXPORT_VERSION, type AppDataExport } from '@/services/export'

export class ImportError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ImportError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseAppDataExport(contents: string): AppDataExport {
  let value: unknown

  try {
    value = JSON.parse(contents)
  } catch (error) {
    throw new ImportError('O ficheiro não contém JSON válido.', { cause: error })
  }

  if (!isRecord(value) || value.app !== APP_IDENTIFIER) {
    throw new ImportError('O ficheiro não é uma exportação do SmartPantry.')
  }

  if (value.version !== EXPORT_VERSION) {
    throw new ImportError(`Versão de exportação não suportada: ${String(value.version)}.`)
  }

  if (typeof value.exportedAt !== 'string') {
    throw new ImportError('O ficheiro não contém uma data de exportação válida.')
  }

  if (!isStorageData(value.data)) {
    throw new ImportError('Os dados do ficheiro são inválidos ou estão incompletos.')
  }

  return {
    app: APP_IDENTIFIER,
    version: EXPORT_VERSION,
    exportedAt: value.exportedAt,
    data: value.data,
  }
}

/**
 * Substitui todos os dados da aplicação pelos dados de um ficheiro exportado.
 * Em caso de falha ao guardar, tenta repor o estado anterior.
 */
export function importAppData(contents: string): AppDataExport {
  const exportData = parseAppDataExport(contents)
  const previous = readAll()

  try {
    clear()

    for (const key of STORAGE_KEYS) {
      save(key, exportData.data[key])
    }
  } catch (error) {
    try {
      clear()

      for (const key of STORAGE_KEYS) {
        save(key, previous[key])
      }
    } catch {
      // Não é possível recuperar o estado anterior; mantém-se o erro original.
    }

    throw new ImportError('Não foi possível guardar os dados importados.', { cause: error })
  }

  return exportData
}
