/**
 * `GET /api/admin/visitors?days=7|30` — first-party visitor-level numbers from Analytics Engine.
 *
 * Rows are keyed by the random visitor id the browser stores locally, so unique and returning
 * visitors are real counts. The route reuses the same Cloudflare Access guard and the same three
 * analytics settings; when any setting is blank it answers `{ configured: false }` and never calls
 * Cloudflare.
 */
import { createError, defineEventHandler, getQuery, type H3Event } from 'h3'
import type { AdminVisitors } from '../../../shared/admin.ts'
import { resolveAdminIdentity } from '../../utils/admin.ts'
import { analyticsRangeOf, analyticsSettingsOf } from '../../utils/analytics-settings.ts'
import { fetchVisitorOverview } from '../../utils/visitor-analytics.ts'

/** Coerces the `days` query string into one of the two supported windows. */
const rangeDaysOf = (value: unknown): 7 | 30 => {
  const raw = Array.isArray(value) ? value[0] : value
  return Number(raw) === 30 ? 30 : 7
}

/** Requires a valid Cloudflare Access identity, exactly like the other `/api/admin` routes. */
const requireAdminIdentity = async (event: H3Event): Promise<void> => {
  const identity = await resolveAdminIdentity(event)
  if (identity !== null) return
  throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Unauthorized', data: null })
}

/** Loads the overview, mapping any upstream failure to a generic 502 without leaking details. */
const getAdminVisitors = async (event: H3Event): Promise<AdminVisitors> => {
  await requireAdminIdentity(event)

  const settings = analyticsSettingsOf(event)
  if (settings === null) return { configured: false }

  const overview = await fetchVisitorOverview(settings, analyticsRangeOf(rangeDaysOf(getQuery(event).days)))
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

export default defineEventHandler(getAdminVisitors)
