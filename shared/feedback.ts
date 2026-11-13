/**
 * Validation and shape rules for the error-report form.
 * Pure: the server route and the browser widget share these limits, so no Node or DOM access here.
 */

/** Maximum description length after trimming. Matches the textarea counter in the modal. */
export const FEEDBACK_DESCRIPTION_MAX = 4000

/** Maximum length of the optional source URL and of the auto-collected page URL. */
export const FEEDBACK_URL_MAX = 2000

/** Maximum length of the auto-collected document title. */
export const FEEDBACK_TITLE_MAX = 300

/** Maximum length kept for the `1280×800` viewport hint. */
export const FEEDBACK_VIEWPORT_MAX = 40

/** Maximum length kept for the catalog content hash. */
export const FEEDBACK_VERSION_MAX = 64

/** Largest accepted JSON request body, in UTF-8 bytes. */
export const FEEDBACK_BODY_MAX_BYTES = 16 * 1024

/** How long a submission stays readable in KV (180 days, in seconds). */
export const FEEDBACK_TTL_SECONDS = 180 * 24 * 60 * 60

/** KV key prefix; the rest of the key sorts by ISO timestamp. */
export const FEEDBACK_KEY_PREFIX = 'feedback:'

/** Default number of entries the inbox route returns. */
export const FEEDBACK_INBOX_LIMIT = 50

/** What the visitor is sending: a problem on the page, or a request for something new. */
export type FeedbackKind = 'error' | 'feature'

/** Kind used when a body omits or misspells the field; matches the modal's first radio option. */
export const DEFAULT_FEEDBACK_KIND: FeedbackKind = 'error'

/** Chinese labels for the kind radio and the admin inbox. */
export const FEEDBACK_KIND_LABEL: Record<FeedbackKind, string> = {
  error: '页面有错误',
  feature: '请求新功能',
}

/** Name given to the description field per kind, reused by validation messages. */
const KIND_DESCRIPTION_LABEL: Record<FeedbackKind, string> = {
  error: '问题描述',
  feature: '功能描述',
}

/** Name given to the optional link field per kind, reused by validation messages. */
const KIND_SOURCE_LABEL: Record<FeedbackKind, string> = {
  error: '数据来源链接',
  feature: '相关链接',
}

/** Normalised submission. Optional context fields are `null` when absent or blank. */
export type FeedbackPayload = {
  kind: FeedbackKind
  description: string
  sourceUrl: string | null
  pageUrl: string | null
  pageTitle: string | null
  viewport: string | null
  catalogVersion: string | null
  collectedAt: string | null
}

/** Triage state for a stored submission. Legacy KV rows without this field are treated as open. */
export type FeedbackStatus = 'open' | 'resolved'

/** Chinese labels shown in the admin inbox. */
export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  open: '未解决',
  resolved: '已解决',
}

/** A submission as stored in KV, with the server id, receive time, and triage status. */
export type FeedbackRecord = FeedbackPayload & {
  id: string
  receivedAt: string
  status: FeedbackStatus
}

/** Result of validating an untrusted request body. `message` is user-facing Chinese. */
export type FeedbackValidation = { ok: true; value: FeedbackPayload } | { ok: false; message: string }

/** Identity and clock used when freezing a payload into a stored record. */
export type FeedbackRecordMeta = { id: string; now: Date }

/** Narrows an unknown JSON value to a plain object. Arrays and null are not payloads. */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Reads an optional string field, treating non-strings and blanks as absent. */
const optionalText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Whether `value` parses as an absolute http or https URL. */
export const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** Returns the ISO form of `value`, or `null` when it is not a parseable date. */
export const isoOrNull = (value: string | null): string | null => {
  if (value === null) return null
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : new Date(time).toISOString()
}

/** Validates an optional URL field: blank means absent, otherwise http(s) within `max`. */
const optionalUrl = (
  raw: string | null,
  max: number,
  label: string,
): { ok: true; value: string | null } | { ok: false; message: string } => {
  if (raw === null) return { ok: true, value: null }
  if (raw.length > max) return { ok: false, message: `${label}最多 ${max} 个字符` }
  if (!isHttpUrl(raw)) return { ok: false, message: `${label}必须是 http:// 或 https:// 开头的网址` }
  return { ok: true, value: raw }
}

/** Whether a value is a known feedback kind. */
export const isFeedbackKind = (value: unknown): value is FeedbackKind => {
  return value === 'error' || value === 'feature'
}

/** Normalises a stored or requested kind; missing or unknown values become the default. */
export const normalizeFeedbackKind = (value: unknown): FeedbackKind => {
  return isFeedbackKind(value) ? value : DEFAULT_FEEDBACK_KIND
}

/**
 * Validates and normalises a decoded JSON body from `POST /api/feedback`.
 * Returns the trimmed payload, or a Chinese message describing the first problem.
 */
export const parseFeedbackPayload = (raw: unknown): FeedbackValidation => {
  if (!isPlainObject(raw)) return { ok: false, message: '请求内容不是有效的反馈数据' }

  // The kind decides the wording of the other checks, so it is resolved before them.
  const kind = normalizeFeedbackKind(raw.kind)
  const descriptionLabel = KIND_DESCRIPTION_LABEL[kind]

  const description = optionalText(raw.description)
  if (description === null) return { ok: false, message: `请填写${descriptionLabel}` }
  if (description.length > FEEDBACK_DESCRIPTION_MAX) {
    return { ok: false, message: `${descriptionLabel}最多 ${FEEDBACK_DESCRIPTION_MAX} 个字符` }
  }

  const sourceUrl = optionalUrl(optionalText(raw.sourceUrl), FEEDBACK_URL_MAX, KIND_SOURCE_LABEL[kind])
  if (!sourceUrl.ok) return sourceUrl

  const pageUrl = optionalUrl(optionalText(raw.pageUrl), FEEDBACK_URL_MAX, '页面链接')
  if (!pageUrl.ok) return pageUrl

  const pageTitle = optionalText(raw.pageTitle)
  if (pageTitle !== null && pageTitle.length > FEEDBACK_TITLE_MAX) {
    return { ok: false, message: `页面标题最多 ${FEEDBACK_TITLE_MAX} 个字符` }
  }

  const collectedAt = optionalText(raw.collectedAt)
  if (collectedAt !== null && isoOrNull(collectedAt) === null) {
    return { ok: false, message: '采集时间格式不正确' }
  }

  // Viewport and catalog version are diagnostics, so clamp them instead of rejecting the report.
  const viewport = optionalText(raw.viewport)?.slice(0, FEEDBACK_VIEWPORT_MAX) ?? null
  const catalogVersion = optionalText(raw.catalogVersion)?.slice(0, FEEDBACK_VERSION_MAX) ?? null

  return {
    ok: true,
    value: {
      kind,
      description,
      sourceUrl: sourceUrl.value,
      pageUrl: pageUrl.value,
      pageTitle,
      viewport,
      catalogVersion,
      collectedAt: isoOrNull(collectedAt),
    },
  }
}


/** Whether a value is a known feedback status. */
export const isFeedbackStatus = (value: unknown): value is FeedbackStatus => {
  return value === 'open' || value === 'resolved'
}

/** Normalises a stored or requested status; missing or unknown values become open. */
export const normalizeFeedbackStatus = (value: unknown): FeedbackStatus => {
  return isFeedbackStatus(value) ? value : 'open'
}

/**
 * Builds the stored record. A missing or invalid client timestamp falls back to the receive time,
 * so every record always carries both clocks.
 */
export const buildFeedbackRecord = (payload: FeedbackPayload, meta: FeedbackRecordMeta): FeedbackRecord => {
  const receivedAt = meta.now.toISOString()
  return {
    ...payload,
    id: meta.id,
    receivedAt,
    collectedAt: payload.collectedAt ?? receivedAt,
    status: 'open',
  }
}

/** KV key for a record. ISO timestamps sort lexicographically, so listing stays chronological. */
export const feedbackKey = (record: FeedbackRecord): string => {
  return `${FEEDBACK_KEY_PREFIX}${record.receivedAt}:${record.id}`
}

/**
 * Parses one stored KV value back into a record.
 * Old or hand-edited entries that miss the required fields are skipped instead of throwing.
 */
export const parseFeedbackRecord = (raw: string): FeedbackRecord | null => {
  let decoded: unknown
  try {
    decoded = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isPlainObject(decoded)) return null
  const { id, receivedAt, description } = decoded
  if (typeof id !== 'string' || typeof receivedAt !== 'string' || typeof description !== 'string') return null
  const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)
  return {
    id,
    receivedAt,
    collectedAt: text(decoded.collectedAt),
    kind: normalizeFeedbackKind(decoded.kind),
    description,
    sourceUrl: text(decoded.sourceUrl),
    pageUrl: text(decoded.pageUrl),
    pageTitle: text(decoded.pageTitle),
    viewport: text(decoded.viewport),
    catalogVersion: text(decoded.catalogVersion),
    status: normalizeFeedbackStatus(decoded.status),
  }
}
