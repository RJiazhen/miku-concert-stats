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

/** One page path in the Web Analytics top list; aggregates only, never a visitor. */
export type AdminAnalyticsPath = {
  /** `requestPath` as recorded by the Cloudflare beacon, e.g. `/shows/2959`. */
  path: string
  /** Page loads in the selected window. */
  pageviews: number
  /** Visits that started on this path. */
  visits: number
}

/** Answer of `GET /api/admin/analytics` once CF_ANALYTICS_API_TOKEN and CF_ACCOUNT_TAG are set. */
export type AdminAnalyticsConfigured = {
  configured: true
  /** Length of the queried window in days (7 or 30). */
  days: number
  /** First calendar day of the window, `YYYY-MM-DD` (UTC). */
  from: string
  /** Last calendar day of the window, `YYYY-MM-DD` (UTC). */
  to: string
  /** `count` of `rumPageloadEventsAdaptiveGroups`. */
  pageviews: number
  /** `sum.visits` of the same rows. */
  visits: number
  /** Sampling interval Cloudflare applied, or null when it did not report one. */
  sampleInterval: number | null
  /** Most loaded paths, largest first. */
  topPaths: AdminAnalyticsPath[]
}

/** Answer while either Cloudflare Analytics setting is blank; keeps the page in a setup state. */
export type AdminAnalyticsUnconfigured = { configured: false }

/** Payload of `GET /api/admin/analytics`. */
export type AdminAnalytics = AdminAnalyticsConfigured | AdminAnalyticsUnconfigured

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
