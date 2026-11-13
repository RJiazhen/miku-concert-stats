import { createError, defineEventHandler, getHeader, readRawBody, type H3Event } from 'h3'
import {
  FEEDBACK_BODY_MAX_BYTES,
  FEEDBACK_TTL_SECONDS,
  buildFeedbackRecord,
  feedbackKey,
  parseFeedbackPayload,
} from '../../shared/feedback.ts'
import { feedbackStoreOf, serialiseFeedbackRecord } from '../utils/feedback.ts'

/** Chinese error raised for every client mistake; `statusMessage` stays ASCII for the status line. */
const badRequest = (message: string) => {
  return createError({ statusCode: 400, statusMessage: 'Invalid feedback', message })
}

/** UTF-8 byte length of a string, without Node's Buffer so it works in workerd too. */
const byteLength = (value: string): number => {
  return new TextEncoder().encode(value).byteLength
}

/**
 * Accepts one error report and stores it in the FEEDBACK KV namespace.
 * Public write-only: never returns stored feedback content. Admin read/update routes require a
 * Cloudflare Access identity (`assertFeedbackIdentity`) and fail closed with no data.
 * Validates before touching KV; returns 503 with a Chinese message when the binding is missing
 * (always the case in `nuxt dev`) or when KV rejects the write. Never logs the description.
 */
const submitFeedback = async (event: H3Event): Promise<{ ok: true; id: string }> => {
  const declaredLength = Number(getHeader(event, 'content-length') ?? '0')
  if (Number.isFinite(declaredLength) && declaredLength > FEEDBACK_BODY_MAX_BYTES) {
    throw badRequest('反馈内容过大，请缩短问题描述')
  }

  const raw = await readRawBody(event, 'utf8')
  if (typeof raw !== 'string' || raw.trim() === '') throw badRequest('请求内容为空')
  if (byteLength(raw) > FEEDBACK_BODY_MAX_BYTES) throw badRequest('反馈内容过大，请缩短问题描述')

  let decoded: unknown
  try {
    decoded = JSON.parse(raw)
  } catch {
    throw badRequest('请求内容不是有效的 JSON')
  }

  const validation = parseFeedbackPayload(decoded)
  if (!validation.ok) throw badRequest(validation.message)

  const store = feedbackStoreOf(event)
  if (!store) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Feedback unavailable',
      message: '反馈服务暂不可用，请稍后再试。已填写的内容仍保存在本地。',
    })
  }

  const record = buildFeedbackRecord(validation.value, { id: crypto.randomUUID(), now: new Date() })
  try {
    await store.put(feedbackKey(record), serialiseFeedbackRecord(record), { expirationTtl: FEEDBACK_TTL_SECONDS })
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Feedback storage failed',
      message: '反馈保存失败，请稍后再试。已填写的内容仍保存在本地。',
    })
  }

  return { ok: true, id: record.id }
}

export default defineEventHandler(submitFeedback)
