/**
 * Types and pure helpers for the maintainer backend under `/admin`.
 * Shared by the Nitro guard, the session endpoint, and the admin UI, so no Node or DOM access here.
 */

/** Maintainer identity resolved from a Cloudflare Access JWT. Never includes any feedback data. */
export type AdminIdentity = {
  subject: string | null
  email: string | null
}

/** What the admin shell needs to know about the current request. */
export type AdminSession = {
  /** False when ACCESS_TEAM_DOMAIN / ACCESS_AUD are missing, e.g. in local `nuxt dev`. */
  configured: boolean
  /** Null when the request carries no valid Access JWT. */
  identity: AdminIdentity | null
  /** Whether the FEEDBACK KV binding is available to this Worker instance. */
  storage: boolean
  /** Build-time catalog content hash, or an empty string when no catalog was built. */
  catalogVersion: string
  environment: 'development' | 'production'
  /** Server clock when the session was resolved, in ISO form. */
  serverTime: string
}

/** Cloudflare Access application the Worker validates against. */
export type AccessLoginConfig = {
  /** Bare team host, e.g. `team.cloudflareaccess.com` (no scheme). */
  teamDomain: string
  /** Application Audience (AUD) tag, sent as the `kid` query parameter. */
  aud: string
}

/** One UTC calendar day of the first-party trend; days without page views are zero-filled. */
export type AdminVisitorDay = {
  /** `YYYY-MM-DD` in UTC. */
  date: string
  /** Page views that day. */
  pageviews: number
  /** Distinct visitor ids that day. */
  visitors: number
}

/** One path in the first-party top list. */
export type AdminVisitorPath = {
  /** `route.path` recorded by the first-party tracker. */
  path: string
  /** Page views on this path. */
  pageviews: number
  /** Distinct visitor ids that loaded this path. */
  visitors: number
}

/** One labelled slice of a first-party breakdown (device or country). */
export type AdminVisitorSlice = {
  /** `desktop` / `mobile` / `tablet` / `other`, or an ISO 3166-1 alpha-2 country code. */
  label: string
  /** Page views in this slice. */
  pageviews: number
  /** Distinct visitor ids in this slice. */
  visitors: number
}

/**
 * Answer of `GET /api/admin/visitors` once CF_ANALYTICS_API_TOKEN, CF_ACCOUNT_TAG and
 * CF_ANALYTICS_HOST are set and the first-party dataset has rows. `visitors` counts distinct
 * first-party ids (stored in `index1`), so it is a real unique-visitor number.
 */
export type AdminVisitorsConfigured = {
  configured: true
  /** Length of the queried window in days (7 or 30). */
  days: number
  /** First calendar day of the window, `YYYY-MM-DD` (UTC). */
  from: string
  /** Last calendar day of the window, `YYYY-MM-DD` (UTC). */
  to: string
  /** Host whose rows are counted; page views recorded on any other host are excluded. */
  host: string
  /** Page views in the window. */
  pageviews: number
  /** Distinct visitor ids in the window. */
  visitors: number
  /** Visitor ids whose first ever page view happened in this window. */
  newVisitors: number
  /** `visitors - newVisitors`, never negative. */
  returningVisitors: number
  /** Distinct tab sessions in the window. */
  sessions: number
  /** Page views per visitor (one decimal), 0 when there are no visitors. */
  pageviewsPerVisitor: number
  /** Sessions per visitor (one decimal), 0 when there are no visitors. */
  visitsPerVisitor: number
  /** Every day in the window, oldest first. */
  daily: AdminVisitorDay[]
  /** Most loaded paths, largest first. */
  topPaths: AdminVisitorPath[]
  /** Page views per device, largest first. */
  devices: AdminVisitorSlice[]
  /** Page views per country, largest first. */
  countries: AdminVisitorSlice[]
}

/** Answer while the first-party analytics settings are blank. */
export type AdminVisitorsUnconfigured = { configured: false }

/** Payload of `GET /api/admin/visitors`. */
export type AdminVisitors = AdminVisitorsConfigured | AdminVisitorsUnconfigured

/**
 * Estimates a distinct count from Analytics Engine rows that may be sampled.
 *
 * Analytics Engine stores `_sample_interval` per row (`weight`), so `distinct * weight / rows` scales
 * a distinct count back to the unsampled population. Returns 0 for an empty result instead of NaN.
 */
export const weightedDistinct = (rows: number, weight: number, distinct: number): number => {
  if (rows <= 0 || distinct <= 0) return 0
  return Math.round((distinct * weight) / rows)
}

/**
 * Builds the Cloudflare Access login URL that sends a signed-out browser to the team IdP.
 *
 * Format: `https://<teamDomain>/cdn-cgi/access/login/<hostname>?kid=<aud>&redirect_url=<path>`.
 * `redirectPath` is the path (plus query string) to return to after login; it is encoded so the
 * Access page receives one complete URL instead of splitting on nested `?` / `&`.
 */
export const buildAccessLoginUrl = (
  config: AccessLoginConfig,
  hostname: string,
  redirectPath: string,
): string => {
  const params = new URLSearchParams({ kid: config.aud, redirect_url: redirectPath })
  return `https://${config.teamDomain}/cdn-cgi/access/login/${hostname}?${params.toString()}`
}
