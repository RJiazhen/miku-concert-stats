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
