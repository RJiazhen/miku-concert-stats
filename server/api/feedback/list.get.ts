import { createError, defineEventHandler, getQuery, type H3Event } from 'h3'
import {
  FEEDBACK_INBOX_LIMIT,
  FEEDBACK_KEY_PREFIX,
  parseFeedbackRecord,
  type FeedbackRecord,
} from '../../../shared/feedback.ts'
import { assertFeedbackIdentity, feedbackStoreOf, type FeedbackKv } from '../../utils/feedback.ts'

/** Keys read per request; KV lists at most 1000 keys, so the inbox stays one round trip. */
const MAX_KEYS = 1000

/** Largest `limit` a caller may ask for. */
const MAX_LIMIT = 200

/** Parses `?limit=` into a bounded page size, defaulting to `FEEDBACK_INBOX_LIMIT`. */
const inboxLimit = (raw: string | undefined): number => {
  const parsed = Number(raw ?? '')
  if (!Number.isInteger(parsed) || parsed < 1) return FEEDBACK_INBOX_LIMIT
  return Math.min(parsed, MAX_LIMIT)
}

/** Reads a record back, skipping keys that are missing or no longer parseable. */
const readRecord = async (store: FeedbackKv, key: string): Promise<FeedbackRecord | null> => {
  const raw = await store.get(key, { type: 'text' })
  return typeof raw === 'string' ? parseFeedbackRecord(raw) : null
}

/**
 * Read-only inbox for maintainers: `GET /api/feedback/list`.
 * The caller must already carry a Cloudflare Access JWT; identity is verified before any KV access,
 * so a failed check is 401 with no items, counts, or metadata.
 */
const listFeedback = async (event: H3Event): Promise<{ count: number; items: FeedbackRecord[] }> => {
  await assertFeedbackIdentity(event)

  const store = feedbackStoreOf(event)
  if (!store) {
    throw createError({ statusCode: 503, statusMessage: 'Unavailable', message: 'Unavailable', data: null })
  }

  const query = getQuery(event)
  const listed = await store.list({ prefix: FEEDBACK_KEY_PREFIX, limit: MAX_KEYS })
  const keys = listed.keys
    .map((entry) => entry.name)
    .sort()
    .reverse()
    .slice(0, inboxLimit(typeof query.limit === 'string' ? query.limit : undefined))

  const records = await Promise.all(keys.map((key) => readRecord(store, key)))
  const items = records.filter((record): record is FeedbackRecord => record !== null)
  return { count: items.length, items }
}

export default defineEventHandler(listFeedback)
