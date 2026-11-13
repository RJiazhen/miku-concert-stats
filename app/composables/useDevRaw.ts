/** Sidebar summary for one dataset. */
export type DevRawDatasetSummary = {
  id: string
  label: string
  kind: 'catalog' | 'json' | 'locale-map' | 'wiki-raw'
  rowCount: number
  derived?: boolean
  warning?: string
}

/** One page of editable rows from `/api/dev/raw/:dataset`. */
export type DevRawDatasetPage = {
  id: string
  label: string
  columns: string[]
  primaryKey: string[]
  editable: string[]
  derived?: boolean
  warning?: string
  files?: string[]
  total: number
  offset: number
  limit: number
  rows: Array<{ key: string; cells: Record<string, string | null> }>
}

/** Encodes a dataset id that may contain slashes (`wiki-raw/mm2025`). */
const datasetPath = (id: string): string => id.split('/').map(encodeURIComponent).join('/')

/** Lists datasets for the `/raw` sidebar. */
export const fetchDevRawDatasets = async (): Promise<DevRawDatasetSummary[]> => {
  const response = await $fetch<{ datasets: DevRawDatasetSummary[] }>('/api/dev/raw/list')
  return response.datasets
}

/** Loads one searchable page of rows. */
export const fetchDevRawPage = async (
  id: string,
  options: { q?: string; offset?: number; limit?: number } = {},
): Promise<DevRawDatasetPage> => {
  return await $fetch<DevRawDatasetPage>(`/api/dev/raw/${datasetPath(id)}`, {
    query: {
      q: options.q ?? '',
      offset: options.offset ?? 0,
      limit: options.limit ?? 100,
    },
  })
}

/** Patches one cell and returns the refreshed row. */
export const patchDevRawCell = async (
  id: string,
  key: string,
  field: string,
  value: string | null,
): Promise<{ key: string; cells: Record<string, string | null>; rebuiltCatalog: boolean }> => {
  return await $fetch(`/api/dev/raw/${datasetPath(id)}`, {
    method: 'PATCH',
    body: { key, field, value },
  })
}
