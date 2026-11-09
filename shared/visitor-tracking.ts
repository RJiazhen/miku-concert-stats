/**
 * First-party page-view tracking shared by the browser beacon and the Worker endpoint.
 *
 * There is no third-party identifier here: the browser creates a random UUID once, keeps it in
 * localStorage, and sends it with each client-side navigation. The Worker only writes the values it
 * validated, so nothing in this module may depend on Node or DOM APIs.
 */

/** Device classes the page view is bucketed into; derived from the user agent in the browser. */
export const PAGEVIEW_DEVICES = ['desktop', 'mobile', 'tablet', 'other'] as const

/** One device bucket. */
export type PageviewDevice = (typeof PAGEVIEW_DEVICES)[number]

/** Validated payload of `POST /api/analytics/pageview`. */
export type PageviewPayload = {
  /** Random UUID stored in the browser; the sampling index of every stored page view. */
  visitorId: string
  /** Random UUID inherited from sessionStorage, so a tab session can be grouped. */
  sessionId: string
  /** `route.path` without the query string, e.g. `/shows/2959`. */
  path: string
  /** Host that linked here, `direct` when there is none, or `internal` for in-site navigation. */
  referrerHost: string
  /** Device bucket derived from the user agent in the browser. */
  device: PageviewDevice
  /** True for the single first page view that created this visitor id. */
  firstVisit: boolean
}

/** Longest path kept; anything longer is truncated instead of rejected. */
const MAX_PATH_LENGTH = 200

/** Longest referrer host kept; anything longer is truncated. */
const MAX_REFERRER_LENGTH = 120

/** Matches the canonical UUID form produced by `crypto.randomUUID()`. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** True when the value is a UUID in canonical form. */
export const isVisitorId = (value: unknown): value is string => {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

/** Narrows an unknown value to one of the four device buckets. */
const deviceOf = (value: unknown): PageviewDevice | null => {
  return PAGEVIEW_DEVICES.includes(value as PageviewDevice) ? (value as PageviewDevice) : null
}

/**
 * Collapses whitespace-free text to a bounded single line.
 * Returns an empty string for anything that is not a non-trivial string.
 */
const textOf = (value: unknown, limit: number): string => {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, limit)
}

/**
 * Validates the request body of the public page-view endpoint.
 * Returns `null` for anything that is not a well-formed event, so the route can answer 400 without
 * writing a partial row. `path` must be an absolute in-site path; an empty referrer becomes
 * `direct` and an empty device becomes `other`.
 */
export const parsePageviewPayload = (body: unknown): PageviewPayload | null => {
  if (typeof body !== 'object' || body === null) return null
  const input = body as Record<string, unknown>
  if (!isVisitorId(input.visitorId) || !isVisitorId(input.sessionId)) return null
  const path = textOf(input.path, MAX_PATH_LENGTH)
  if (!path.startsWith('/')) return null
  const referrerHost = textOf(input.referrerHost, MAX_REFERRER_LENGTH) || 'direct'
  const device = input.device === undefined ? 'other' : deviceOf(input.device)
  if (device === null) return null
  return {
    visitorId: input.visitorId,
    sessionId: input.sessionId,
    path,
    referrerHost,
    device,
    firstVisit: input.firstVisit === true,
  }
}
