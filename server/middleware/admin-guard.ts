import { defineEventHandler, getRequestURL, sendRedirect } from 'h3'
import { buildAccessLoginUrl } from '../../shared/admin.ts'
import { accessConfigOf } from '../utils/feedback.ts'
import { adminSessionOf, hasAccessToken, resolveAdminIdentity } from '../utils/admin.ts'

/** Whether a pathname belongs to the admin shell. API routes are intentionally excluded. */
const isAdminPage = (pathname: string): boolean => {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

/**
 * Guards the `/admin` shell with Cloudflare Access.
 *
 * A GET/HEAD page request without any Access JWT is answered with a 302 to the team login page,
 * carrying the original path as `redirect_url`. A request that does carry a token is verified; a
 * bad token is left to the page, which shows a signed-out / expired state instead of looping
 * through the IdP. When ACCESS_TEAM_DOMAIN or ACCESS_AUD is blank (local development), nothing is
 * redirected: the page renders and explains that Access is not configured.
 *
 * The resolved session is attached to `event.context.adminSession` so the Nuxt layout can render
 * the maintainer address during SSR without a second request or forwarding the JWT header.
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  if (!isAdminPage(url.pathname)) return
  if (event.method !== 'GET' && event.method !== 'HEAD') return

  const identity = await resolveAdminIdentity(event)
  event.context.adminSession = adminSessionOf(event, identity)
  if (identity !== null) return

  const config = accessConfigOf(event)
  if (config === null) return
  if (hasAccessToken(event)) return
  // Local dev loads the real [vars] through Cloudflare emulation, but 127.0.0.1 is not an Access
  // destination. Redirecting would land on "Invalid redirect URL", so render the shell instead.
  if (import.meta.dev) return

  const hostname = url.hostname
  const redirectPath = `${url.pathname}${url.search}`
  return sendRedirect(event, buildAccessLoginUrl(config, hostname, redirectPath), 302)
})
