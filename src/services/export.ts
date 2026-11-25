import { readAll, type StorageData } from '@/lib/storage'

export const EXPORT_VERSION = 1

export type AppDataExport = {
  app: 'smartpantry'
  version: number
  exportedAt: string
  data: StorageData
}

export function buildAppDataExport(now: Date = new Date()): AppDataExport {
  return {
    app: 'smartpantry',
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    data: readAll(),
  }
}

export function serializeAppDataExport(exportData: AppDataExport): string {
  return JSON.stringify(exportData, null, 2)
}

export function buildFileName(now: Date = new Date()): string {
  return `smartpantry-${now.toISOString().slice(0, 10)}.json`
}

export function exportAppData(now: Date = new Date()): string {
  const contents = serializeAppDataExport(buildAppDataExport(now))
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const filename = buildFileName(now)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)

  return filename
}
