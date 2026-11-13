import { readDatasetPage } from '../../../utils/dev-raw-io.ts'

/** Joins a catch-all route param into a dataset id (`songs`, `wiki-raw/mm2025`, …). */
const datasetIdOf = (param: string | string[] | undefined): string => {
  if (param === undefined) throw createError({ statusCode: 400, statusMessage: 'Missing dataset' })
  const joined = Array.isArray(param) ? param.join('/') : param
  return decodeURIComponent(joined)
}

/** Returns a searchable page of rows for one dataset. */
export default defineEventHandler((event) => {
  const dataset = datasetIdOf(getRouterParam(event, 'dataset'))
  const query = getQuery(event)
  return readDatasetPage(dataset, {
    q: typeof query.q === 'string' ? query.q : '',
    offset: query.offset !== undefined ? Number(query.offset) : 0,
    limit: query.limit !== undefined ? Number(query.limit) : 100,
  })
})
