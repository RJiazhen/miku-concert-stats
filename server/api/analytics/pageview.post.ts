/**
 * Public endpoint that records one first-party page view into Analytics Engine.
 *
 * The browser sends a random visitor id it generated locally; nothing here reads cookies, IPs or
 * user agents. Requests are only accepted from the site's own origin, the body is bounded, and a
 * runtime without the `PAGEVIEWS` binding (local `nuxt dev`) answers 204 without writing anywhere.
 */
import {
  createError,
  defineEventHandler,
  getHeader,
  getRequestURL,
  readBody,
  setResponseStatus,
  type H3Event,
} from 'h3'
import { parsePageviewPayload } from '../../../shared/visitor-tracking.ts'
import { recordPageview } from '../../utils/visitor-analytics.ts'

/** Largest accepted body; a valid event is well under 1 KB. */
const MAX_BODY_BYTES = 4096

/** Reads `CF-IPCountry` as a two-letter code; anything else becomes `unknown`. */
const countryOf = (event: H3Event): string => {
  const raw = (getHeader(event, 'cf-ipcountry') ?? '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(raw) ? raw : 'unknown'
}

/**
 * Rejects cross-origin posts so another site cannot inflate this site's numbers.
 * Browsers always send `Origin` for `fetch`; a request without one (curl, scripts) is rejected as
 * well, because no visitor path omits it.
 */
const assertSameOrigin = (event: H3Event): void => {
  const host = getRequestURL(event).host
  const origin = getHeader(event, 'origin')
  let originHost = ''
  try {
    originHost = origin ? new URL(origin).host : ''
  } catch {
    originHost = ''
  }
  if (originHost === host) return
  throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: 'Forbidden', data: null })
}

/**
 * `POST /api/analytics/pageview` — stores one page view keyed by the first-party visitor id.
 * Answers 204 for every stored event and for a runtime without the binding, so the browser never
 * retries; a body that fails validation gets 400 and a foreign origin gets 403.
 */
const postPageview = async (event: H3Event): Promise<null> => {
  const declaredLength = Number(getHeader(event, 'content-length') ?? '0')
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Payload Too Large',
      message: 'Payload Too Large',
      data: null,
    })
  }
  assertSameOrigin(event)
  const payload = parsePageviewPayload(await readBody(event).catch(() => null))
  if (payload === null) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Bad Request', data: null })
  }
  recordPageview(event, getRequestURL(event).host, countryOf(event), payload)
  setResponseStatus(event, 204)
  return null
}

export default defineEventHandler(postPageview)
