/**
 * First-party page-view tracker.
 *
 * The visitor id is a random UUID created locally and kept in localStorage, so it survives reloads
 * and never leaves this site; the session id lives in sessionStorage and dies with the tab. The id
 * is only ever sent to `/api/analytics/pageview`. Nothing is tracked for `/admin`, for visitors who
 * asked for Do Not Track, or on the server.
 */
import type { PageviewPayload, PageviewDevice } from '~~/shared/visitor-tracking.ts'

/** localStorage key of the long-lived visitor id. */
const VISITOR_KEY = 'miku:visitor-id'

/** sessionStorage key of the per-tab session id. */
const SESSION_KEY = 'miku:session-id'

/** Matches the canonical UUID form `crypto.randomUUID()` produces. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Returns a random UUID, falling back to a `getRandomValues` version on browsers without
 * `crypto.randomUUID` (older Safari). The fallback still produces a valid v4 string.
 */
const randomId = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Reads a stored id or mints one.
 * Returns the id plus whether it was created now; a corrupt stored value is replaced.
 */
const readOrCreateId = (storage: Storage, key: string): { id: string; created: boolean } => {
  const stored = storage.getItem(key)
  if (typeof stored === 'string' && UUID_PATTERN.test(stored)) return { id: stored, created: false }
  const id = randomId()
  storage.setItem(key, id)
  return { id, created: true }
}

/** Derives a coarse device bucket from the user agent; the raw agent is never sent. */
const deviceOf = (): PageviewDevice => {
  const agent = navigator.userAgent
  if (/iPad|Tablet|PlayBook|Silk/i.test(agent) || (/Android/i.test(agent) && !/Mobile/i.test(agent))) {
    return 'tablet'
  }
  if (/Mobi|iPhone|iPod|Android/i.test(agent)) return 'mobile'
  return 'desktop'
}

/** Host that linked to this page, `direct` when there is none. */
const externalReferrerOf = (): string => {
  if (document.referrer === '') return 'direct'
  try {
    const url = new URL(document.referrer)
    return url.hostname === location.hostname ? 'internal' : url.hostname.slice(0, 120)
  } catch {
    return 'direct'
  }
}

/** Posts one page view; failures are swallowed because tracking must never affect the page. */
const sendPageview = (payload: PageviewPayload): void => {
  void fetch('/api/analytics/pageview', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined)
}

/** True when the visitor asked the browser not to be tracked. */
const doNotTrack = (): boolean => {
  const value = String(navigator.doNotTrack ?? '')
  return value === '1' || value === 'yes'
}

/**
 * Registers the tracker: one page view for the first rendered page, then one per navigation.
 * `app:mounted` covers the initial page (it fires after hydration), `afterEach` covers client-side
 * navigations; `track` deduplicates by path so the startup router transition cannot double-count.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (doNotTrack()) return
  let visitor: { id: string; created: boolean }
  let session: { id: string; created: boolean }
  try {
    visitor = readOrCreateId(window.localStorage, VISITOR_KEY)
    session = readOrCreateId(window.sessionStorage, SESSION_KEY)
  } catch {
    // Storage can be disabled entirely; without a persisted id there is no visitor to count.
    return
  }

  const device = deviceOf()
  const router = nuxtApp.$router
  const referrer = externalReferrerOf()
  let lastPath = ''

  /** Records the current route once; duplicate paths in the same tab are ignored. */
  const track = (path: string): void => {
    if (path === lastPath) return
    lastPath = path
    if (path.startsWith('/admin')) return
    sendPageview({
      visitorId: visitor.id,
      sessionId: session.id,
      path: path.slice(0, 200),
      referrerHost: referrer,
      device,
      firstVisit: visitor.created,
    })
    // Only the very first page view of a new visitor id carries the flag.
    visitor.created = false
  }

  nuxtApp.hook('app:mounted', () => track(router.currentRoute.value.path))
  router.afterEach((to, from) => {
    if (to.path === from.path) return
    track(to.path)
  })
})
