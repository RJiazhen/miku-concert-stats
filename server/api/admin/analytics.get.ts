import { createError, defineEventHandler, getQuery, type H3Event } from 'h3'
import type { AdminAnalytics } from '../../../shared/admin.ts'
import { resolveAdminIdentity } from '../../utils/admin.ts'
import {
  analyticsRangeOf,
  cloudflareAnalyticsConfigOf,
  fetchWebAnalyticsOverview,
} from '../../utils/cloudflare-analytics.ts'

/** Windows the page can ask for; anything else falls back to seven days. */
const ALLOWED_DAYS = [7, 30] as const

/** Coerces the `days` query string into one of the two supported windows. */
const rangeDaysOf = (value: unknown): 7 | 30 => {
  const raw = Array.isArray(value) ? value[0] : value
  return Number(raw) === 30 ? 30 : ALLOWED_DAYS[0]
}

/**
 * Requires a valid Cloudflare Access identity, exactly like the other `/api/admin` routes.
 * A deployment without an Access application fails closed instead of exposing analytics config.
 */
const requireAdminIdentity = async (event: H3Event): Promise<void> => {
  const identity = await resolveAdminIdentity(event)
  if (identity !== null) return
  throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Unauthorized', data: null })
}

/**
 * `GET /api/admin/analytics?days=7|30` — aggregated Cloudflare Web Analytics numbers.
 *
 * The query is server-side and account-scoped; the page only ever sees totals and path counts.
 * When CF_ANALYTICS_API_TOKEN or CF_ACCOUNT_TAG is blank the route answers `{ configured: false }`,
 * which keeps the admin page in a setup state instead of throwing. The token is never returned,
 * logged, or included in an error message.
 */
const getAdminAnalytics = async (event: H3Event): Promise<AdminAnalytics> => {
  await requireAdminIdentity(event)

  const config = cloudflareAnalyticsConfigOf(event)
  if (config === null) return { configured: false }

  const days = rangeDaysOf(getQuery(event).days)
  const range = analyticsRangeOf(days)
  const overview = await fetchWebAnalyticsOverview(config, range)
  if (overview === null) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Analytics Unavailable',
      message: 'Analytics Unavailable',
      data: null,
    })
  }
  return overview
}

export default defineEventHandler(getAdminAnalytics)
