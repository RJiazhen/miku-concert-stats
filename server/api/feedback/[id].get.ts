import { createError, defineEventHandler, getQuery, getRouterParam, type H3Event } from 'h3'
import {
  FEEDBACK_KEY_PREFIX,
  parseFeedbackRecord,
  type FeedbackRecord,
} from '../../../shared/feedback.ts'
import { assertFeedbackToken, feedbackStoreOf } from '../../utils/feedback.ts'

/**
 * One feedback record for maintainers.
 * `GET /api/feedback/:id?token=<FEEDBACK_TOKEN>&receivedAt=<ISO>`
 * Auth is checked before any KV read; failed verification returns 401 with no data.
 */
const getFeedbackDetail = async (event: H3Event): Promise<{ item: FeedbackRecord }> => {
  const query = getQuery(event)
  const supplied = typeof query.token === 'string' ? query.token : ''
  assertFeedbackToken(event, supplied)

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
