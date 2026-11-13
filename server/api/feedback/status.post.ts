import { createError, defineEventHandler, readBody, type H3Event } from 'h3'
import {
  FEEDBACK_KEY_PREFIX,
  FEEDBACK_TTL_SECONDS,
  isFeedbackStatus,
  parseFeedbackRecord,
  type FeedbackRecord,
  type FeedbackStatus,
} from '../../../shared/feedback.ts'
import { assertFeedbackIdentity, feedbackStoreOf, serialiseFeedbackRecord } from '../../utils/feedback.ts'

/** Body for `POST /api/feedback/status`; identity comes from the Access header, never from here. */
type StatusBody = {
  id?: unknown
  receivedAt?: unknown
  status?: unknown
}

/**
 * Sets the triage status of one stored feedback record.
 * The caller must carry a Cloudflare Access JWT; identity is verified before any KV access, so a
 * failed check is 401 with no feedback data. The record is rewritten under the same key and TTL.
 */
const updateFeedbackStatus = async (event: H3Event): Promise<{ ok: true; item: FeedbackRecord }> => {
  await assertFeedbackIdentity(event)

  const body = (await readBody(event)) as StatusBody | null

  const id = typeof body?.id === 'string' ? body.id.trim() : ''
  const receivedAt = typeof body?.receivedAt === 'string' ? body.receivedAt.trim() : ''
  if (id === '' || receivedAt === '') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid feedback', message: '缺少反馈 id 或时间' })
  }
  if (!isFeedbackStatus(body?.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid feedback',
      message: '状态只能是 open 或 resolved',
    })
  }
  const nextStatus: FeedbackStatus = body.status

  const store = feedbackStoreOf(event)
  if (!store) {
    throw createError({ statusCode: 503, statusMessage: 'Unavailable', message: 'Unavailable', data: null })
  }

  const key = `${FEEDBACK_KEY_PREFIX}${receivedAt}:${id}`
  const raw = await store.get(key, { type: 'text' })
  if (typeof raw !== 'string') {
    throw createError({ statusCode: 404, statusMessage: 'Not found', message: '找不到这条反馈' })
  }
  const record = parseFeedbackRecord(raw)
  if (record === null) {
    throw createError({ statusCode: 404, statusMessage: 'Not found', message: '找不到这条反馈' })
  }

  const updated: FeedbackRecord = { ...record, status: nextStatus }
  try {
    await store.put(key, serialiseFeedbackRecord(updated), { expirationTtl: FEEDBACK_TTL_SECONDS })
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Feedback storage failed',
      message: '反馈状态保存失败，请稍后再试。',
    })
  }

  return { ok: true, item: updated }
}

export default defineEventHandler(updateFeedbackStatus)
