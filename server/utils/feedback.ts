import type { H3Event } from 'h3'
import type { FeedbackRecord } from '../../shared/feedback.ts'

/**
 * The part of Cloudflare's `KVNamespace` the feedback routes use.
 * Declared here so the routes stay typed without pulling in @cloudflare/workers-types.
 */
export type FeedbackKv = {
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>
  get: (key: string, options?: { type?: 'text' }) => Promise<string | null>
  list: (options?: { prefix?: string; limit?: number }) => Promise<{ keys: { name: string }[] }>
}

/** Bindings the Worker must declare for feedback and for its read-only inbox. */
export type FeedbackBindings = {
  FEEDBACK?: FeedbackKv
  FEEDBACK_TOKEN?: string
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

/** Configured inbox secret, or an empty string when `FEEDBACK_TOKEN` has not been set. */
export const feedbackTokenOf = (event: H3Event): string => {
  return feedbackBindingsOf(event).FEEDBACK_TOKEN ?? ''
}

/** Compares two secrets without stopping at the first difference. Length mismatch returns early. */
export const sameSecret = (left: string, right: string): boolean => {
  if (left.length === 0 || left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

/** Serialises a record for KV. Kept here so the stored format has one owner. */
export const serialiseFeedbackRecord = (record: FeedbackRecord): string => {
  return JSON.stringify(record)
}
