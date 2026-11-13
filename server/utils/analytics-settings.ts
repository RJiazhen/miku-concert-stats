/**
 * Analytics settings shared by first-party visitor analytics.
 *
 * The Analytics Engine SQL queries are account-scoped and host-scoped, so they read these three
 * Worker bindings. The API token is a secret: it is only ever read here, never returned, and never
 * logged.
 */
import type { H3Event } from 'h3'

/** The three Worker settings the analytics routes need; any blank means "not configured". */
export type AnalyticsSettings = {
  /** Account-scoped API token with Account Analytics read access. Never returned or logged. */
  apiToken: string
  /** 32-hex account tag from the Cloudflare dashboard. */
  accountTag: string
  /** Hostname the page is scoped to; no other host in the account may contribute rows. */
  host: string
}

/** Closed window the page asks for: 7 or 30 whole UTC days, ending today. */
export type AnalyticsRange = {
  days: number
  from: string
  to: string
}

/** The part of `event.context.cloudflare.env` the analytics routes read. */
type AnalyticsBindings = {
  CF_ANALYTICS_API_TOKEN?: string
  CF_ACCOUNT_TAG?: string
  CF_ANALYTICS_HOST?: string
}

/** Reads the analytics settings from the request's Cloudflare bindings. */
const analyticsBindingsOf = (event: H3Event): AnalyticsBindings => {
  const context = event.context as unknown as { cloudflare?: { env?: AnalyticsBindings } }
  return context.cloudflare?.env ?? {}
}

/**
 * Returns the analytics settings, or `null` when any of the three is blank.
 * All comparisons happen after trimming so a whitespace-only var behaves like a missing one.
 */
export const analyticsSettingsOf = (event: H3Event): AnalyticsSettings | null => {
  const bindings = analyticsBindingsOf(event)
  const apiToken = (bindings.CF_ANALYTICS_API_TOKEN ?? '').trim()
  const accountTag = (bindings.CF_ACCOUNT_TAG ?? '').trim()
  const host = (bindings.CF_ANALYTICS_HOST ?? '').trim()
  if (apiToken === '' || accountTag === '' || host === '') return null
  return { apiToken, accountTag, host }
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
