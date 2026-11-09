/**
 * Cloudflare Web Analytics queries for the maintainer backend.
 *
 * Nothing here is visitor-level: the GraphQL datasets are asked for aggregates only, and the API
 * token never leaves the Worker. Both settings come from the Cloudflare bindings (the same place
 * ACCESS_TEAM_DOMAIN and ACCESS_AUD come from), so an unconfigured deployment degrades to a
 * "not configured" answer instead of an exception.
 */
import type { H3Event } from 'h3'
import type { AdminAnalyticsConfigured, AdminAnalyticsPath } from '../../shared/admin.ts'

/** Cloudflare GraphQL Analytics endpoint; the only request destination of this module. */
const GRAPHQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql'

/** How many paths the top list keeps; enough to explain the traffic without pagination. */
const TOP_PATH_LIMIT = 20

/**
 * One query for the whole page: account totals plus the busiest paths, over a UTC date window.
 * `count` is page views and `sum.visits` is visits, matching the Web Analytics dashboard.
 */
const WEB_ANALYTICS_QUERY = `query WebAnalyticsOverview($accountTag: String!, $since: Date!, $until: Date!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      totals: rumPageloadEventsAdaptiveGroups(
        limit: 1
        filter: { date_geq: $since, date_leq: $until }
      ) {
        count
        sum { visits }
        avg { sampleInterval }
      }
      topPaths: rumPageloadEventsAdaptiveGroups(
        limit: ${TOP_PATH_LIMIT}
        filter: { date_geq: $since, date_leq: $until }
        orderBy: [count_DESC]
      ) {
        count
        sum { visits }
        dimensions { requestPath }
      }
    }
  }
}`

/** The two Worker settings the analytics routes need; both blank means "not configured". */
export type CloudflareAnalyticsConfig = {
  /** Account-scoped API token with Account Analytics read access. Never returned or logged. */
  apiToken: string
  /** 32-hex account tag from the Cloudflare dashboard. */
  accountTag: string
}

/** Closed window the page asks for: 7 or 30 whole UTC days, ending today. */
export type AnalyticsRange = {
  days: number
  from: string
  to: string
}

/** The part of `event.context.cloudflare.env` this module reads. */
type AnalyticsBindings = {
  CF_ANALYTICS_API_TOKEN?: string
  CF_ACCOUNT_TAG?: string
}

/** GraphQL group row; every field is optional because it comes from an external service. */
type GraphqlGroup = {
  count?: unknown
  sum?: { visits?: unknown }
  avg?: { sampleInterval?: unknown }
  dimensions?: { requestPath?: unknown }
}

/** Narrows an untrusted value to a finite non-negative integer. */
const wholeNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.max(0, Math.trunc(value))
}

/** Reads the two analytics settings from the request's Cloudflare bindings. */
const analyticsBindingsOf = (event: H3Event): AnalyticsBindings => {
  const context = event.context as unknown as { cloudflare?: { env?: AnalyticsBindings } }
  return context.cloudflare?.env ?? {}
}

/**
 * Returns the Cloudflare Analytics settings, or `null` when either is blank.
 * The comparison happens after trimming so a whitespace-only var behaves like a missing one.
 */
export const cloudflareAnalyticsConfigOf = (event: H3Event): CloudflareAnalyticsConfig | null => {
  const bindings = analyticsBindingsOf(event)
  const apiToken = (bindings.CF_ANALYTICS_API_TOKEN ?? '').trim()
  const accountTag = (bindings.CF_ACCOUNT_TAG ?? '').trim()
  if (apiToken === '' || accountTag === '') return null
  return { apiToken, accountTag }
}

/**
 * Builds the UTC calendar-day window the query uses.
 * `days` is the number of whole days including today, so 7 means today and the six days before it.
 */
export const analyticsRangeOf = (days: number, now = new Date()): AnalyticsRange => {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const start = new Date(end.getTime() - (Math.max(1, days) - 1) * 86_400_000)
  return { days, from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
}

/**
 * Reshapes one GraphQL response into the page payload.
 * Returns `null` when the body has GraphQL errors or no account row, so the caller can fail with a
 * generic 502 instead of rendering zeros that look like real traffic.
 */
const summarise = (payload: unknown, range: AnalyticsRange): AdminAnalyticsConfigured | null => {
  if (typeof payload !== 'object' || payload === null) return null
  const body = payload as { data?: unknown; errors?: unknown }
  if (Array.isArray(body.errors) && body.errors.length > 0) return null
  const data = body.data
  if (typeof data !== 'object' || data === null) return null
  const viewer = (data as { viewer?: unknown }).viewer
  if (typeof viewer !== 'object' || viewer === null) return null
  const accounts = (viewer as { accounts?: unknown }).accounts
  if (!Array.isArray(accounts) || accounts.length === 0) return null
  const account = accounts[0] as { totals?: unknown; topPaths?: unknown }
  const totals = Array.isArray(account.totals) ? (account.totals[0] as GraphqlGroup | undefined) : undefined
  const pageviews = wholeNumber(totals?.count) ?? 0
  const visits = wholeNumber(totals?.sum?.visits) ?? 0
  const sampleIntervalRaw = wholeNumber(totals?.avg?.sampleInterval)
  const sampleInterval = sampleIntervalRaw === null || sampleIntervalRaw === 0 ? null : sampleIntervalRaw

  const topPaths: AdminAnalyticsPath[] = []
  if (Array.isArray(account.topPaths)) {
    for (const raw of account.topPaths) {
      const group = raw as GraphqlGroup
      const path = typeof group.dimensions?.requestPath === 'string' ? group.dimensions.requestPath : ''
      topPaths.push({
        path,
        pageviews: wholeNumber(group.count) ?? 0,
        visits: wholeNumber(group.sum?.visits) ?? 0,
      })
    }
  }
  topPaths.sort((left, right) => right.pageviews - left.pageviews)

  return { configured: true, ...range, pageviews, visits, sampleInterval, topPaths }
}

/**
 * Fetches the aggregated overview for one window.
 * Returns `null` on a non-2xx response, a malformed body, or a GraphQL error; the token and the
 * upstream message are never included in the result.
 */
export const fetchWebAnalyticsOverview = async (
  config: CloudflareAnalyticsConfig,
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
        variables: { accountTag: config.accountTag, since: range.from, until: range.to },
      }),
    })
  } catch {
    return null
  }
  if (!response.ok) return null
  const payload: unknown = await response.json().catch(() => null)
  return summarise(payload, range)
}
