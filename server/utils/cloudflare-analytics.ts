/**
 * Cloudflare Web Analytics queries for the maintainer backend.
 *
 * Nothing here is visitor-level: the GraphQL datasets are asked for aggregates only, and the API
 * token never leaves the Worker. Every alias is filtered by `requestHost`, so a Web Analytics
 * account that also tracks other sites or hostnames contributes nothing but this site's rows.
 * All settings come from the Cloudflare bindings (the same place ACCESS_TEAM_DOMAIN and ACCESS_AUD
 * come from), so an unconfigured deployment degrades to a "not configured" answer instead of an
 * exception.
 */
import type {
  AdminAnalyticsBreakdown,
  AdminAnalyticsConfigured,
  AdminAnalyticsDay,
  AdminAnalyticsPath,
} from '../../shared/admin.ts'
import type { AnalyticsSettings } from './analytics-settings.ts'

/** Cloudflare GraphQL Analytics endpoint; the only request destination of this module. */
const GRAPHQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql'

/** How many paths the top list keeps; enough to explain the traffic without pagination. */
const TOP_PATH_LIMIT = 20

/** How many slices each breakdown keeps; the head of the distribution explains the rest. */
const DEVICE_LIMIT = 4
const BROWSER_LIMIT = 6
const COUNTRY_LIMIT = 8

/**
 * One query for the whole page: totals, a daily series, the busiest paths and three breakdowns.
 * `count` is page views and `sum.visits` is visits, matching the Web Analytics dashboard. Every
 * alias carries the same `requestHost` filter so the account cannot leak another site's rows.
 */
const WEB_ANALYTICS_QUERY = `query WebAnalyticsOverview($accountTag: String!, $host: String!, $since: Date!, $until: Date!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      totals: rumPageloadEventsAdaptiveGroups(
        limit: 1
        filter: { date_geq: $since, date_leq: $until, requestHost: $host }
      ) {
        count
        sum { visits }
        avg { sampleInterval }
      }
      daily: rumPageloadEventsAdaptiveGroups(
        limit: 31
        filter: { date_geq: $since, date_leq: $until, requestHost: $host }
        orderBy: [date_ASC]
      ) {
        count
        sum { visits }
        dimensions { date }
      }
      topPaths: rumPageloadEventsAdaptiveGroups(
        limit: ${TOP_PATH_LIMIT}
        filter: { date_geq: $since, date_leq: $until, requestHost: $host }
        orderBy: [count_DESC]
      ) {
        count
        sum { visits }
        dimensions { requestPath }
      }
      devices: rumPageloadEventsAdaptiveGroups(
        limit: ${DEVICE_LIMIT}
        filter: { date_geq: $since, date_leq: $until, requestHost: $host }
        orderBy: [count_DESC]
      ) {
        count
        sum { visits }
        dimensions { deviceType }
      }
      browsers: rumPageloadEventsAdaptiveGroups(
        limit: ${BROWSER_LIMIT}
        filter: { date_geq: $since, date_leq: $until, requestHost: $host }
        orderBy: [count_DESC]
      ) {
        count
        sum { visits }
        dimensions { userAgentBrowser }
      }
      countries: rumPageloadEventsAdaptiveGroups(
        limit: ${COUNTRY_LIMIT}
        filter: { date_geq: $since, date_leq: $until, requestHost: $host }
        orderBy: [count_DESC]
      ) {
        count
        sum { visits }
        dimensions { countryName }
      }
    }
  }
}`

/** Closed window the page asks for: 7 or 30 whole UTC days, ending today. */
export type AnalyticsRange = {
  days: number
  from: string
  to: string
}

/** GraphQL group row; every field is optional because it comes from an external service. */
type GraphqlGroup = {
  count?: unknown
  sum?: { visits?: unknown }
  avg?: { sampleInterval?: unknown }
  dimensions?: {
    requestPath?: unknown
    date?: unknown
    deviceType?: unknown
    userAgentBrowser?: unknown
    countryName?: unknown
  }
}

/** Narrows an untrusted value to a finite non-negative integer. */
const wholeNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.max(0, Math.trunc(value))
}

/** Reads a GraphQL alias that should be an array of groups, tolerating a missing alias. */
const rowsOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

/**
 * Builds the UTC calendar-day window the query uses.
 * `days` is the number of whole days including today, so 7 means today and the six days before it.
 */
export const analyticsRangeOf = (days: number, now = new Date()): AnalyticsRange => {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const start = new Date(end.getTime() - (Math.max(1, days) - 1) * 86_400_000)
  return { days, from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
}

/** Enumerates every UTC date in the window as `YYYY-MM-DD`, oldest first. */
const datesBetween = (from: string, to: string): string[] => {
  const end = Date.parse(`${to}T00:00:00Z`)
  const dates: string[] = []
  for (let cursor = Date.parse(`${from}T00:00:00Z`); cursor <= end; cursor += 86_400_000) {
    dates.push(new Date(cursor).toISOString().slice(0, 10))
  }
  return dates
}

/** Builds the daily series, zero-filling days that produced no beacon rows. */
const dailyOf = (rows: unknown, range: AnalyticsRange): AdminAnalyticsDay[] => {
  const byDate = new Map<string, { pageviews: number; visits: number }>()
  for (const raw of rowsOf(rows)) {
    const group = raw as GraphqlGroup
    const date = typeof group.dimensions?.date === 'string' ? group.dimensions.date : ''
    if (date === '') continue
    const current = byDate.get(date) ?? { pageviews: 0, visits: 0 }
    current.pageviews += wholeNumber(group.count) ?? 0
    current.visits += wholeNumber(group.sum?.visits) ?? 0
    byDate.set(date, current)
  }
  return datesBetween(range.from, range.to).map((date) => {
    const day = byDate.get(date) ?? { pageviews: 0, visits: 0 }
    return { date, pageviews: day.pageviews, visits: day.visits }
  })
}

/** Maps the top-path alias, largest first. */
const topPathsOf = (rows: unknown): AdminAnalyticsPath[] => {
  const paths: AdminAnalyticsPath[] = []
  for (const raw of rowsOf(rows)) {
    const group = raw as GraphqlGroup
    const path = typeof group.dimensions?.requestPath === 'string' ? group.dimensions.requestPath : ''
    paths.push({
      path,
      pageviews: wholeNumber(group.count) ?? 0,
      visits: wholeNumber(group.sum?.visits) ?? 0,
    })
  }
  paths.sort((left, right) => right.pageviews - left.pageviews)
  return paths
}

/** Maps one breakdown alias (device, browser or country), largest first. */
const breakdownOf = (
  rows: unknown,
  dimension: 'deviceType' | 'userAgentBrowser' | 'countryName',
): AdminAnalyticsBreakdown[] => {
  const slices: AdminAnalyticsBreakdown[] = []
  for (const raw of rowsOf(rows)) {
    const group = raw as GraphqlGroup
    const value = group.dimensions?.[dimension]
    if (typeof value !== 'string' || value === '') continue
    slices.push({
      label: value,
      pageviews: wholeNumber(group.count) ?? 0,
      visits: wholeNumber(group.sum?.visits) ?? 0,
    })
  }
  slices.sort((left, right) => right.pageviews - left.pageviews)
  return slices
}

/**
 * Reshapes one GraphQL response into the page payload.
 * Returns `null` when the body has GraphQL errors or no account row, so the caller can fail with a
 * generic 502 instead of rendering zeros that look like real traffic.
 */
const summarise = (
  payload: unknown,
  range: AnalyticsRange,
  host: string,
): AdminAnalyticsConfigured | null => {
  if (typeof payload !== 'object' || payload === null) return null
  const body = payload as { data?: unknown; errors?: unknown }
  if (Array.isArray(body.errors) && body.errors.length > 0) return null
  const data = body.data
  if (typeof data !== 'object' || data === null) return null
  const viewer = (data as { viewer?: unknown }).viewer
  if (typeof viewer !== 'object' || viewer === null) return null
  const accounts = (viewer as { accounts?: unknown }).accounts
  if (!Array.isArray(accounts) || accounts.length === 0) return null
  const account = accounts[0] as {
    totals?: unknown
    daily?: unknown
    topPaths?: unknown
    devices?: unknown
    browsers?: unknown
    countries?: unknown
  }
  const totals = Array.isArray(account.totals)
    ? (account.totals[0] as GraphqlGroup | undefined)
    : undefined
  const pageviews = wholeNumber(totals?.count) ?? 0
  const visits = wholeNumber(totals?.sum?.visits) ?? 0
  const sampleIntervalRaw = wholeNumber(totals?.avg?.sampleInterval)
  const sampleInterval = sampleIntervalRaw === null || sampleIntervalRaw === 0 ? null : sampleIntervalRaw

  return {
    configured: true,
    host,
    ...range,
    pageviews,
    visits,
    sampleInterval,
    daily: dailyOf(account.daily, range),
    topPaths: topPathsOf(account.topPaths),
    devices: breakdownOf(account.devices, 'deviceType'),
    browsers: breakdownOf(account.browsers, 'userAgentBrowser'),
    countries: breakdownOf(account.countries, 'countryName'),
  }
}

/**
 * Fetches the aggregated overview for one window.
 * Returns `null` on a non-2xx response, a malformed body, or a GraphQL error; the token and the
 * upstream message are never included in the result.
 */
export const fetchWebAnalyticsOverview = async (
  config: AnalyticsSettings,
  range: AnalyticsRange,
): Promise<AdminAnalyticsConfigured | null> => {
  let response: Response
  try {
    response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: WEB_ANALYTICS_QUERY,
        variables: {
          accountTag: config.accountTag,
          host: config.host,
          since: range.from,
          until: range.to,
        },
      }),
    })
  } catch {
    return null
  }
  if (!response.ok) return null
  const payload: unknown = await response.json().catch(() => null)
  return summarise(payload, range, config.host)
}
