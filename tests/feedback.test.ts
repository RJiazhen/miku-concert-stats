import { describe, expect, it } from 'vitest'
import {
  FEEDBACK_DESCRIPTION_MAX,
  FEEDBACK_TITLE_MAX,
  FEEDBACK_URL_MAX,
  FEEDBACK_VERSION_MAX,
  FEEDBACK_VIEWPORT_MAX,
  buildFeedbackRecord,
  feedbackKey,
  isoOrNull,
  isHttpUrl,
  parseFeedbackPayload,
  parseFeedbackRecord,
} from '../shared/feedback.ts'

/** Minimal valid body; each test overrides the field it cares about. */
const validBody = () => ({ description: '2024 年东京场的播放量不对' })

/** Asserts the validation failed and returns its Chinese message for further checks. */
const rejection = (raw: unknown): string => {
  const result = parseFeedbackPayload(raw)
  if (result.ok) throw new Error('expected the payload to be rejected')
  return result.message
}

/** Asserts the validation passed and returns the normalised payload. */
const acceptance = (raw: unknown) => {
  const result = parseFeedbackPayload(raw)
  if (!result.ok) throw new Error(`expected the payload to pass: ${result.message}`)
  return result.value
}

describe('parseFeedbackPayload', () => {
  it('rejects bodies that are not plain objects', () => {
    for (const raw of [null, undefined, 'text', 42, [], ['description']]) {
      expect(rejection(raw)).toBe('请求内容不是有效的反馈数据')
    }
  })

  it('requires a description', () => {
    expect(rejection({})).toBe('请填写问题描述')
    expect(rejection({ description: '   ' })).toBe('请填写问题描述')
    expect(rejection({ description: 12 })).toBe('请填写问题描述')
  })

  it('trims the description', () => {
    expect(acceptance({ description: '  数据不对  ' }).description).toBe('数据不对')
  })

  it('enforces the description length limit', () => {
    expect(acceptance({ description: 'a'.repeat(FEEDBACK_DESCRIPTION_MAX) }).description).toHaveLength(
      FEEDBACK_DESCRIPTION_MAX,
    )
    expect(rejection({ description: 'a'.repeat(FEEDBACK_DESCRIPTION_MAX + 1) })).toBe(
      `问题描述最多 ${FEEDBACK_DESCRIPTION_MAX} 个字符`,
    )
    // Trimming happens before the length check, so surrounding spaces do not count.
    expect(acceptance({ description: `  ${'a'.repeat(FEEDBACK_DESCRIPTION_MAX)}  ` }).description).toHaveLength(
      FEEDBACK_DESCRIPTION_MAX,
    )
  })

  it('treats a blank source URL as absent', () => {
    expect(acceptance(validBody()).sourceUrl).toBeNull()
    expect(acceptance({ ...validBody(), sourceUrl: '   ' }).sourceUrl).toBeNull()
    expect(acceptance({ ...validBody(), sourceUrl: null }).sourceUrl).toBeNull()
  })

  it('accepts only http and https source URLs', () => {
    expect(acceptance({ ...validBody(), sourceUrl: 'https://vocadb.net/S/1' }).sourceUrl).toBe(
      'https://vocadb.net/S/1',
    )
    expect(acceptance({ ...validBody(), sourceUrl: 'http://example.com/a?b=1' }).sourceUrl).toBe(
      'http://example.com/a?b=1',
    )
    expect(rejection({ ...validBody(), sourceUrl: 'ftp://example.com' })).toBe(
      '数据来源链接必须是 http:// 或 https:// 开头的网址',
    )
    expect(rejection({ ...validBody(), sourceUrl: 'javascript:alert(1)' })).toBe(
      '数据来源链接必须是 http:// 或 https:// 开头的网址',
    )
    expect(rejection({ ...validBody(), sourceUrl: 'vocadb.net/S/1' })).toBe(
      '数据来源链接必须是 http:// 或 https:// 开头的网址',
    )
  })

  it('enforces the source URL length limit', () => {
    const base = 'https://example.com/'
    const atLimit = `${base}${'a'.repeat(FEEDBACK_URL_MAX - base.length)}`
    expect(acceptance({ ...validBody(), sourceUrl: atLimit }).sourceUrl).toHaveLength(FEEDBACK_URL_MAX)
    expect(rejection({ ...validBody(), sourceUrl: `${atLimit}a` })).toBe(
      `数据来源链接最多 ${FEEDBACK_URL_MAX} 个字符`,
    )
  })

  it('rejects a malformed auto-collected page URL', () => {
    expect(acceptance({ ...validBody(), pageUrl: 'https://example.com/raw?x=1' }).pageUrl).toBe(
      'https://example.com/raw?x=1',
    )
    expect(rejection({ ...validBody(), pageUrl: 'not a url' })).toBe('页面链接必须是 http:// 或 https:// 开头的网址')
  })

  it('enforces the page title length limit', () => {
    expect(acceptance({ ...validBody(), pageTitle: 'a'.repeat(FEEDBACK_TITLE_MAX) }).pageTitle).toHaveLength(
      FEEDBACK_TITLE_MAX,
    )
    expect(rejection({ ...validBody(), pageTitle: 'a'.repeat(FEEDBACK_TITLE_MAX + 1) })).toBe(
      `页面标题最多 ${FEEDBACK_TITLE_MAX} 个字符`,
    )
  })

  it('requires the client timestamp to parse', () => {
    expect(acceptance(validBody()).collectedAt).toBeNull()
    expect(acceptance({ ...validBody(), collectedAt: '2026-11-04T07:17:00.000Z' }).collectedAt).toBe(
      '2026-11-04T07:17:00.000Z',
    )
    expect(acceptance({ ...validBody(), collectedAt: '2026-11-04T15:17:00+08:00' }).collectedAt).toBe(
      '2026-11-04T07:17:00.000Z',
    )
    expect(rejection({ ...validBody(), collectedAt: 'yesterday' })).toBe('采集时间格式不正确')
  })

  it('accepts the minimal body the widget now sends', () => {
    const payload = acceptance({
      description: '页面上的数据不对',
      pageUrl: 'https://example.com/songs?series=1',
      pageTitle: '歌曲排行',
    })
    expect(payload).toEqual({
      description: '页面上的数据不对',
      sourceUrl: null,
      pageUrl: 'https://example.com/songs?series=1',
      pageTitle: '歌曲排行',
      viewport: null,
      catalogVersion: null,
      collectedAt: null,
    })
  })

  it('accepts a body without a client timestamp', () => {
    const payload = acceptance(validBody())
    expect(payload.collectedAt).toBeNull()
    const record = buildFeedbackRecord(payload, { id: 'abc', now: new Date('2026-11-04T07:17:00.000Z') })
    expect(record.receivedAt).toBe('2026-11-04T07:17:00.000Z')
    expect(record.collectedAt).toBe('2026-11-04T07:17:00.000Z')
  })

  it('clamps diagnostic fields instead of rejecting the report', () => {
    const payload = acceptance({
      ...validBody(),
      viewport: 'x'.repeat(FEEDBACK_VIEWPORT_MAX + 10),
      catalogVersion: 'y'.repeat(FEEDBACK_VERSION_MAX + 10),
    })
    expect(payload.viewport).toHaveLength(FEEDBACK_VIEWPORT_MAX)
    expect(payload.catalogVersion).toHaveLength(FEEDBACK_VERSION_MAX)
  })

  it('drops unknown fields', () => {
    const payload = acceptance({ ...validBody(), ipAddress: '127.0.0.1' })
    expect(Object.keys(payload).sort()).toEqual([
      'catalogVersion',
      'collectedAt',
      'description',
      'pageTitle',
      'pageUrl',
      'sourceUrl',
      'viewport',
    ])
  })
})

describe('stored record', () => {
  it('carries both clocks and falls back to the receive time', () => {
    const payload = acceptance(validBody())
    const record = buildFeedbackRecord(payload, { id: 'abc', now: new Date('2026-11-04T07:17:00.000Z') })
    expect(record).toEqual({
      id: 'abc',
      receivedAt: '2026-11-04T07:17:00.000Z',
      collectedAt: '2026-11-04T07:17:00.000Z',
      description: '2024 年东京场的播放量不对',
      sourceUrl: null,
      pageUrl: null,
      pageTitle: null,
      viewport: null,
      catalogVersion: null,
    })
  })

  it('keeps the client timestamp when it is present', () => {
    const payload = acceptance({ ...validBody(), collectedAt: '2026-11-04T01:02:03.000Z' })
    const record = buildFeedbackRecord(payload, { id: 'abc', now: new Date('2026-11-04T07:17:00.000Z') })
    expect(record.collectedAt).toBe('2026-11-04T01:02:03.000Z')
  })

  it('builds a timestamped, prefixed key', () => {
    const record = buildFeedbackRecord(acceptance(validBody()), {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      now: new Date('2026-11-04T07:17:00.000Z'),
    })
    expect(feedbackKey(record)).toBe(
      'feedback:2026-11-04T07:17:00.000Z:f47ac10b-58cc-4372-a567-0e02b2c3d479',
    )
  })

  it('round-trips through JSON', () => {
    const record = buildFeedbackRecord(
      acceptance({ ...validBody(), sourceUrl: 'https://vocadb.net/S/1', pageUrl: 'https://example.com/raw' }),
      { id: 'abc', now: new Date('2026-11-04T07:17:00.000Z') },
    )
    expect(parseFeedbackRecord(JSON.stringify(record))).toEqual(record)
  })

  it('skips corrupt or incomplete entries', () => {
    expect(parseFeedbackRecord('{')).toBeNull()
    expect(parseFeedbackRecord('[]')).toBeNull()
    expect(parseFeedbackRecord(JSON.stringify({ id: 'abc' }))).toBeNull()
    expect(parseFeedbackRecord(JSON.stringify({ ...buildFeedbackRecord(acceptance(validBody()), { id: 'abc', now: new Date() }), description: null }))).toBeNull()
  })
})

describe('helpers', () => {
  it('recognises only absolute http and https URLs', () => {
    expect(isHttpUrl('https://example.com')).toBe(true)
    expect(isHttpUrl('http://example.com')).toBe(true)
    expect(isHttpUrl('mailto:a@example.com')).toBe(false)
    expect(isHttpUrl('/raw')).toBe(false)
    expect(isHttpUrl('')).toBe(false)
  })

  it('normalises timestamps and rejects nonsense', () => {
    expect(isoOrNull(null)).toBeNull()
    expect(isoOrNull('2026-11-04')).toBe('2026-11-04T00:00:00.000Z')
    expect(isoOrNull('nope')).toBeNull()
  })
})
