import { listDatasetSummaries } from '../../../utils/dev-raw-io.ts'

/** Lists every browsable dataset for the dev-only `/raw` sidebar. */
export default defineEventHandler(() => {
  return { datasets: listDatasetSummaries() }
})
