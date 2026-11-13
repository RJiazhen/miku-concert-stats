import { patchDatasetCell } from '../../../utils/dev-raw-io.ts'

/** Joins a catch-all route param into a dataset id (`songs`, `wiki-raw/mm2025`, …). */
const datasetIdOf = (param: string | string[] | undefined): string => {
  if (param === undefined) throw createError({ statusCode: 400, statusMessage: 'Missing dataset' })
  const joined = Array.isArray(param) ? param.join('/') : param
  return decodeURIComponent(joined)
}

/** Writes one cell back to its owning local file and returns the refreshed row. */
export default defineEventHandler(async (event) => {
  const dataset = datasetIdOf(getRouterParam(event, 'dataset'))
  const body = await readBody(event) as { key?: unknown; field?: unknown; value?: unknown }
  if (typeof body.key !== 'string' || body.key === '') {
    throw createError({ statusCode: 400, statusMessage: 'Missing row key' })
  }
  if (typeof body.field !== 'string' || body.field === '') {
    throw createError({ statusCode: 400, statusMessage: 'Missing field' })
  }
  const value = body.value === null || body.value === undefined
    ? null
    : typeof body.value === 'string'
      ? body.value
      : String(body.value)
  return patchDatasetCell(dataset, body.key, body.field, value)
})
