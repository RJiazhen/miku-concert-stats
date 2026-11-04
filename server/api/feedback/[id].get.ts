import { createError, defineEventHandler, getQuery, getRouterParam, type H3Event } from 'h3'
import {
  FEEDBACK_KEY_PREFIX,
  parseFeedbackRecord,
  type FeedbackRecord,
} from '../../../shared/feedback.ts'
import { assertFeedbackIdentity, feedbackStoreOf } from '../../utils/feedback.ts'

/**
 * One feedback record for maintainers.
 * `GET /api/feedback/:id?receivedAt=<ISO>`; the caller must carry a Cloudflare Access JWT.
 * Identity is checked before any KV read, so failed verification returns 401 with no data.
 */
const getFeedbackDetail = async (event: H3Event): Promise<{ item: FeedbackRecord }> => {
  await assertFeedbackIdentity(event)

  const query = getQuery(event)
  const id = (getRouterParam(event, 'id') ?? '').trim()
  const receivedAt = typeof query.receivedAt === 'string' ? query.receivedAt.trim() : ''
  if (id === '' || receivedAt === '') {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Bad Request', data: null })
  }

  const store = feedbackStoreOf(event)
  if (!store) {
    throw createError({ statusCode: 503, statusMessage: 'Unavailable', message: 'Unavailable', data: null })
  }

  const key = `${FEEDBACK_KEY_PREFIX}${receivedAt}:${id}`
  const raw = await store.get(key, { type: 'text' })
  if (typeof raw !== 'string') {
    throw createError({ statusCode: 404, statusMessage: 'Not found', message: 'Not found', data: null })
  }
  const item = parseFeedbackRecord(raw)
  if (item === null) {
    throw createError({ statusCode: 404, statusMessage: 'Not found', message: 'Not found', data: null })
  }
  return { item }
}

export default defineEventHandler(getFeedbackDetail)
