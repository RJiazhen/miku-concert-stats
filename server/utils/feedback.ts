import { createError, getHeader, type H3Event } from 'h3'
import type { FeedbackRecord } from '../../shared/feedback.ts'
import {
  ACCESS_JWT_HEADER,
  accessJwksOf,
  normaliseTeamDomain,
  resolveAccessIdentity,
  type AccessConfig,
  type AccessIdentity,
} from './access.ts'

/**
 * The part of Cloudflare's `KVNamespace` the feedback routes use.
 * Declared here so the routes stay typed without pulling in @cloudflare/workers-types.
 */
export type FeedbackKv = {
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>
  get: (key: string, options?: { type?: 'text' }) => Promise<string | null>
  list: (options?: { prefix?: string; limit?: number }) => Promise<{ keys: { name: string }[] }>
}

/**
 * Bindings the Worker must declare for feedback, for its admin inbox, and for the Access gate.
 * `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` come from the Cloudflare Access application; when either
 * is blank every admin feedback API fails closed with 401.
 */
export type FeedbackBindings = {
  FEEDBACK?: FeedbackKv
  ACCESS_TEAM_DOMAIN?: string
  ACCESS_AUD?: string
}

/** Nitro's cloudflare_module preset attaches `{ request, env, context }` to every event. */
export type CloudflareEventContext = { cloudflare?: { env?: FeedbackBindings } }

/** Reads the Cloudflare bindings of a request; an empty object when the preset is not active. */
export const feedbackBindingsOf = (event: H3Event): FeedbackBindings => {
  return (event.context as unknown as CloudflareEventContext).cloudflare?.env ?? {}
}

/**
 * KV namespace that stores submissions.
 * `nuxt dev` truthfully has no binding: the wrangler platform proxy would silently write into a
 * throwaway local KV and hide the 503 fallback that the UI and the maintainers rely on.
 */
export const feedbackStoreOf = (event: H3Event): FeedbackKv | undefined => {
  if (import.meta.dev) return undefined
  return feedbackBindingsOf(event).FEEDBACK
}

/** Serialises a record for KV. Kept here so the stored format has one owner. */
export const serialiseFeedbackRecord = (record: FeedbackRecord): string => {
  return JSON.stringify(record)
}

/**
 * Reads the Access application from the Worker bindings.
 * Returns `null` when either value is blank, which makes every admin route fail closed.
 */
export const accessConfigOf = (event: H3Event): AccessConfig | null => {
  const bindings = feedbackBindingsOf(event)
  const teamDomain = normaliseTeamDomain(bindings.ACCESS_TEAM_DOMAIN ?? '')
  const aud = (bindings.ACCESS_AUD ?? '').trim()
  if (teamDomain === '' || aud === '') return null
  return { teamDomain, aud }
}

/**
 * The single 401 every admin feedback route throws when identity cannot be proven.
 * The body carries no feedback content, metadata, or counts, and the reason is never included;
 * a missing header, an empty binding, a bad signature, and an expired token look identical.
 */
const unauthorized = (): never => {
  throw createError({
    statusCode: 401,
    statusMessage: 'Unauthorized',
    message: 'Unauthorized',
    data: null,
  })
}

/**
 * Requires a valid Cloudflare Access identity on every admin feedback API.
 *
 * Reads `Cf-Access-Jwt-Assertion`, verifies it against the team JWKS (see `access.ts`), and throws
 * a bare 401 on any failure. Call this before touching KV: a rejected request must not read, count,
 * or echo stored feedback. The returned identity is for the server's own use and is never sent.
 */
export const assertFeedbackIdentity = async (event: H3Event): Promise<AccessIdentity> => {
  const identity = await resolveAccessIdentity({
    token: getHeader(event, ACCESS_JWT_HEADER),
    config: accessConfigOf(event),
    loadJwks: (teamDomain) => accessJwksOf(teamDomain),
  })
  if (identity === null) unauthorized()
  return identity
}
