/**
 * First-party visitor analytics: writing page views into Analytics Engine and querying them back.
 *
 * Writes go through the `PAGEVIEWS` binding; queries go through the Analytics Engine SQL API with
 * the account token the Cloudflare Web Analytics module already uses. Every query filters on the
 * recorded host, so a preview deployment or another hostname can never contribute rows to the
 * public site's numbers.
 */
import type { H3Event } from 'h3'
import type {
  AdminVisitorsConfigured,
  AdminVisitorDay,
  AdminVisitorPath,
  AdminVisitorSlice,
} from '../../shared/admin.ts'
import { weightedDistinct } from '../../shared/admin.ts'
import type { PageviewPayload } from '../../shared/visitor-tracking.ts'
import type { AnalyticsSettings } from './analytics-settings.ts'
import type { AnalyticsRange } from './cloudflare-analytics.ts'

/** Dataset name; it must match the `[[analytics_engine_datasets]]` entry in `wrangler.toml`. */
export const PAGEVIEW_DATASET = 'miku_pageviews'

/** Binding name the Worker reads; missing in local `nuxt dev`, where writes become no-ops. */
export const PAGEVIEW_BINDING = 'PAGEVIEWS'

/** How many paths the visitor top list keeps. */
const TOP_PATH_LIMIT = 20

/** How many device and country slices each breakdown keeps. */
const DEVICE_LIMIT = 4
const COUNTRY_LIMIT = 8

/**
 * Column layout of one stored page view, kept in one place so writes and queries cannot drift.
 * `blob7` is `first` only for the page view that created the visitor id.
 */
const COLUMNS = {
  host: 'blob1',
  path: 'blob2',
  session: 'blob3',
  referrer: 'blob4',
  device: 'blob5',
  country: 'blob6',
  firstVisit: 'blob7',
  visitor: 'index1',
} as const

/** The part of `event.context.cloudflare.env` this module writes through. */
type PageviewBindings = {
  PAGEVIEWS?: { writeDataPoint: (point: PageviewDataPoint) => void }
}

/** Shape accepted by `writeDataPoint`; mirrors the Workers types without importing them. */
type PageviewDataPoint = {
  indexes: string[]
  blobs: string[]
  doubles: number[]
}

/** Reads the Analytics Engine binding, or `null` when this runtime has none (local dev). */
const pageviewBindingOf = (event: H3Event): PageviewBindings['PAGEVIEWS'] => {
  const context = event.context as unknown as { cloudflare?: { env?: PageviewBindings } }
  return context.cloudflare?.env?.PAGEVIEWS
}

/**
 * Appends one page view to the dataset.
 * Returns false when the binding is missing, so the public route can answer 204 either way and
 * local development stays quiet.
 */
export const recordPageview = (
  event: H3Event,
  host: string,
  country: string,
  payload: PageviewPayload,
): boolean => {
  const dataset = pageviewBindingOf(event)
  if (!dataset) return false
  dataset.writeDataPoint({
    indexes: [payload.visitorId],
    blobs: [
      host,
      payload.path,
      payload.sessionId,
      payload.referrerHost,
      payload.device,
      country,
      payload.firstVisit ? 'first' : '',
    ],
    doubles: [1],
  })
  return true
}

/** Escapes a string for a single-quoted SQL literal; host comes from config, not the request. */
const sqlString = (value: string): string => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`

/** One row of an Analytics Engine SQL response; numbers may arrive as strings. */
type SqlRow = Record<string, unknown>

/** Coerces an untrusted SQL value to a finite non-negative number. */
const numberValue = (value: unknown): number => {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return 0
  return Math.max(0, parsed)
}

/**
 * Posts one SQL statement to the Analytics Engine SQL API.
 * Returns the `data` rows, or `null` on a non-2xx response or a malformed body. Upstream messages
 * are dropped because they can quote the token-bearing request.
 */
const runSql = async (settings: AnalyticsSettings, sql: string): Promise<SqlRow[] | null> => {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${settings.accountTag}/analytics_engine/sql`
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${settings.apiToken}`,
        'content-type': 'text/plain',
      },
      body: sql,
    })
  } catch {
    return null
  }
  if (!response.ok) return null
  const payload: unknown = await response.json().catch(() => null)
  if (typeof payload !== 'object' || payload === null) return null
  const data = (payload as { data?: unknown }).data
  if (!Array.isArray(data)) return []
  return data.map((row) => (typeof row === 'object' && row !== null ? (row as SqlRow) : {}))
}

/** Shared `WHERE` clause: the window plus this site's host. */
const whereClause = (settings: AnalyticsSettings, range: AnalyticsRange): string => {
  const start = `${range.from} 00:00:00`
  const end = new Date(Date.parse(`${range.to}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
  return [
    `timestamp >= toDateTime(${sqlString(start)})`,
    `timestamp < toDateTime(${sqlString(`${end} 00:00:00`)})`,
    `${COLUMNS.host} = ${sqlString(settings.host)}`,
  ].join(' AND ')
}

/** Selects `rows`, sample weight and distinct visitors for one grouped query. */
const countColumns = (): string => {
  return [
    'COUNT() AS rows',
    'SUM(_sample_interval) AS weight',
    `COUNT(DISTINCT ${COLUMNS.visitor}) AS visitors`,
  ].join(', ')
}

/** Page views and visitors of one aggregate row. */
type Slice = { pageviews: number; visitors: number }

/** Converts one SQL row into page views and a sampling-corrected visitor count. */
const sliceOf = (row: SqlRow): Slice => {
  const rows = numberValue(row.rows)
  const weight = numberValue(row.weight)
  return {
    pageviews: Math.round(weight),
    visitors: weightedDistinct(rows, weight, numberValue(row.visitors)),
  }
}

/**
 * Fetches the first-party visitor overview for one window.
 * Returns `null` when any statement fails, so the route can answer 502 instead of zeros.
 */
export const fetchVisitorOverview = async (
  settings: AnalyticsSettings,
  range: AnalyticsRange,
): Promise<AdminVisitorsConfigured | null> => {
  const where = whereClause(settings, range)
  const dataset = PAGEVIEW_DATASET

  const totalsSql = `SELECT ${countColumns()}, COUNT(DISTINCT ${COLUMNS.session}) AS sessions FROM ${dataset} WHERE ${where}`
  const newSql = `SELECT ${countColumns()} FROM ${dataset} WHERE ${where} AND ${COLUMNS.firstVisit} = 'first'`
  const dailySql = `SELECT formatDateTime(toStartOfDay(timestamp), '%Y-%m-%d') AS day, ${countColumns()} FROM ${dataset} WHERE ${where} GROUP BY day ORDER BY day ASC`
  const pathsSql = `SELECT ${COLUMNS.path} AS label, ${countColumns()} FROM ${dataset} WHERE ${where} GROUP BY label ORDER BY weight DESC LIMIT ${TOP_PATH_LIMIT}`
  const devicesSql = `SELECT ${COLUMNS.device} AS label, ${countColumns()} FROM ${dataset} WHERE ${where} GROUP BY label ORDER BY weight DESC LIMIT ${DEVICE_LIMIT}`
  const countriesSql = `SELECT ${COLUMNS.country} AS label, ${countColumns()} FROM ${dataset} WHERE ${where} GROUP BY label ORDER BY weight DESC LIMIT ${COUNTRY_LIMIT}`

  const [totalsRows, newRows, dailyRows, pathsRows, devicesRows, countriesRows] = await Promise.all([
    runSql(settings, totalsSql),
    runSql(settings, newSql),
    runSql(settings, dailySql),
    runSql(settings, pathsSql),
    runSql(settings, devicesSql),
    runSql(settings, countriesSql),
  ])
  if (
    totalsRows === null ||
    newRows === null ||
    dailyRows === null ||
    pathsRows === null ||
    devicesRows === null ||
    countriesRows === null
  ) {
    return null
  }

  const totals = sliceOf(totalsRows[0] ?? {})
  const sessions = weightedDistinct(
    numberValue(totalsRows[0]?.rows),
    numberValue(totalsRows[0]?.weight),
    numberValue(totalsRows[0]?.sessions),
  )
  const newVisitors = sliceOf(newRows[0] ?? {}).visitors

  const byDay = new Map<string, Slice>()
  for (const row of dailyRows) {
    const day = typeof row.day === 'string' ? row.day.slice(0, 10) : ''
    if (day === '') continue
    const slice = sliceOf(row)
    const current = byDay.get(day) ?? { pageviews: 0, visitors: 0 }
    byDay.set(day, {
      pageviews: current.pageviews + slice.pageviews,
      visitors: current.visitors + slice.visitors,
    })
  }

  const daily: AdminVisitorDay[] = []
  const end = Date.parse(`${range.to}T00:00:00Z`)
  for (let cursor = Date.parse(`${range.from}T00:00:00Z`); cursor <= end; cursor += 86_400_000) {
    const date = new Date(cursor).toISOString().slice(0, 10)
    const slice = byDay.get(date) ?? { pageviews: 0, visitors: 0 }
    daily.push({ date, ...slice })
  }

  /** Maps one grouped row into a labelled slice list, dropping empty labels. */
  const slicesOf = (rows: SqlRow[]): AdminVisitorSlice[] => {
    const slices: AdminVisitorSlice[] = []
    for (const row of rows) {
      const label = typeof row.label === 'string' ? row.label.trim() : ''
      if (label === '') continue
      slices.push({ label, ...sliceOf(row) })
    }
    return slices
  }

  const topPaths: AdminVisitorPath[] = slicesOf(pathsRows).map((slice) => ({
    path: slice.label,
    pageviews: slice.pageviews,
    visitors: slice.visitors,
  }))
  const visitors = totals.visitors

  return {
    configured: true,
    host: settings.host,
    ...range,
    pageviews: totals.pageviews,
    visitors,
    newVisitors: Math.min(newVisitors, visitors),
    returningVisitors: Math.max(0, visitors - Math.min(newVisitors, visitors)),
    sessions,
    pageviewsPerVisitor: visitors > 0 ? Math.round((totals.pageviews / visitors) * 10) / 10 : 0,
    visitsPerVisitor: visitors > 0 ? Math.round((sessions / visitors) * 10) / 10 : 0,
    daily,
    topPaths,
    devices: slicesOf(devicesRows),
    countries: slicesOf(countriesRows),
  }
}
