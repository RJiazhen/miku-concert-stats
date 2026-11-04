import { describe, expect, it } from 'vitest'
import {
  FEEDBACK_DESCRIPTION_MAX,
  FEEDBACK_TITLE_MAX,
  FEEDBACK_URL_MAX,
  FEEDBACK_VERSION_MAX,
  FEEDBACK_VIEWPORT_MAX,
  FEEDBACK_STATUS_LABEL,
  buildFeedbackRecord,
  feedbackKey,
  isoOrNull,
  isFeedbackStatus,
  isHttpUrl,
  normalizeFeedbackStatus,
  parseFeedbackPayload,
  parseFeedbackRecord,
} from '../shared/feedback.ts'
import {
  normaliseTeamDomain,
  resolveAccessIdentity,
  verifyAccessJwt,
  type AccessJwks,
} from '../server/utils/access.ts'

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
      status: 'open',
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

describe('feedback status', () => {
  it('defaults new records to open', () => {
    const record = buildFeedbackRecord(acceptance(validBody()), {
      id: 'abc',
      now: new Date('2026-11-04T07:17:00.000Z'),
    })
    expect(record.status).toBe('open')
    expect(FEEDBACK_STATUS_LABEL[record.status]).toBe('未解决')
  })

  it('treats legacy records without status as open', () => {
    const legacy = {
      id: 'abc',
      receivedAt: '2026-11-04T07:17:00.000Z',
      collectedAt: '2026-11-04T07:17:00.000Z',
      description: '旧数据',
      sourceUrl: null,
      pageUrl: null,
      pageTitle: null,
      viewport: null,
      catalogVersion: null,
    }
    expect(parseFeedbackRecord(JSON.stringify(legacy))).toEqual({ ...legacy, status: 'open' })
  })

  it('keeps an explicit resolved status when reading KV JSON', () => {
    const record = buildFeedbackRecord(acceptance(validBody()), {
      id: 'abc',
      now: new Date('2026-11-04T07:17:00.000Z'),
    })
    const resolved = { ...record, status: 'resolved' as const }
    expect(parseFeedbackRecord(JSON.stringify(resolved))?.status).toBe('resolved')
    expect(FEEDBACK_STATUS_LABEL.resolved).toBe('已解决')
  })

  it('normalises unknown status values to open', () => {
    expect(normalizeFeedbackStatus('resolved')).toBe('resolved')
    expect(normalizeFeedbackStatus('open')).toBe('open')
    expect(normalizeFeedbackStatus('done')).toBe('open')
    expect(normalizeFeedbackStatus(undefined)).toBe('open')
    expect(isFeedbackStatus('resolved')).toBe(true)
    expect(isFeedbackStatus('nope')).toBe(false)
  })
})

/** Base64url without padding, the encoding JWT segments use. */
const toBase64Url = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Encodes one JWT header or payload segment as base64url JSON. */
const jwtSegment = (value: unknown): string => toBase64Url(new TextEncoder().encode(JSON.stringify(value)))

/** RSA keypair plus the JWKS document Cloudflare Access would serve for it. */
type TestAccessKey = { pair: CryptoKeyPair; jwks: AccessJwks }

/** Generates a throwaway RS256 keypair, so the tests never need the network or a real team. */
const generateAccessKey = async (kid = 'test-key'): Promise<TestAccessKey> => {
  const generated = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )
  const pair = generated as CryptoKeyPair
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  if (typeof jwk.n !== 'string' || typeof jwk.e !== 'string') throw new Error('missing RSA parameters')
  return { pair, jwks: { keys: [{ kty: 'RSA', n: jwk.n, e: jwk.e, kid }] } }
}

/** Signs a JWT exactly like Cloudflare Access does (RS256 over `header.payload`). */
const signAccessToken = async (
  key: CryptoKey,
  claims: Record<string, unknown>,
  header: Record<string, unknown> = { alg: 'RS256', kid: 'test-key', typ: 'JWT' },
): Promise<string> => {
  const signingInput = `${jwtSegment(header)}.${jwtSegment(claims)}`
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput))
  return `${signingInput}.${toBase64Url(new Uint8Array(signature))}`
}

const ACCESS_ISSUER = 'https://team.cloudflareaccess.com'
const ACCESS_AUD = 'aud-tag-0123456789'
const ACCESS_NOW = Date.parse('2026-11-04T07:17:00.000Z')

/** Valid Access claims; each test breaks the single claim it cares about. */
const validAccessClaims = () => ({
  aud: [ACCESS_AUD],
  iss: ACCESS_ISSUER,
  sub: 'user-1',
  email: 'maintainer@example.com',
  iat: ACCESS_NOW / 1000 - 60,
  nbf: ACCESS_NOW / 1000 - 60,
  exp: ACCESS_NOW / 1000 + 600,
})

const ACCESS_CONFIG = { teamDomain: 'team.cloudflareaccess.com', aud: ACCESS_AUD }

const accessKey = await generateAccessKey()

describe('Cloudflare Access identity', () => {
  it('accepts a correctly signed token and returns only identity claims', async () => {
    const token = await signAccessToken(accessKey.pair.privateKey, validAccessClaims())
    const claims = await verifyAccessJwt(token, {
      jwks: accessKey.jwks,
      aud: ACCESS_AUD,
      issuer: ACCESS_ISSUER,
      now: ACCESS_NOW,
    })
    expect(claims?.email).toBe('maintainer@example.com')
    expect(claims?.sub).toBe('user-1')

    const identity = await resolveAccessIdentity({
      token,
      config: ACCESS_CONFIG,
      loadJwks: async () => accessKey.jwks,
      now: ACCESS_NOW,
    })
    // The resolved identity is exactly these two fields: no description, counts, or other payload.
    expect(identity).toEqual({ subject: 'user-1', email: 'maintainer@example.com' })
  })

  it('accepts an audience as a bare string', async () => {
    const token = await signAccessToken(accessKey.pair.privateKey, { ...validAccessClaims(), aud: ACCESS_AUD })
    const claims = await verifyAccessJwt(token, {
      jwks: accessKey.jwks,
      aud: ACCESS_AUD,
      issuer: ACCESS_ISSUER,
      now: ACCESS_NOW,
    })
    expect(claims?.aud).toBe(ACCESS_AUD)
  })

  it('rejects a token issued for another Access application', async () => {
    const token = await signAccessToken(accessKey.pair.privateKey, { ...validAccessClaims(), aud: ['other-aud'] })
    expect(
      await verifyAccessJwt(token, { jwks: accessKey.jwks, aud: ACCESS_AUD, issuer: ACCESS_ISSUER, now: ACCESS_NOW }),
    ).toBeNull()
  })

  it('rejects a token from another team domain', async () => {
    const token = await signAccessToken(accessKey.pair.privateKey, {
      ...validAccessClaims(),
      iss: 'https://other.cloudflareaccess.com',
    })
    expect(
      await verifyAccessJwt(token, { jwks: accessKey.jwks, aud: ACCESS_AUD, issuer: ACCESS_ISSUER, now: ACCESS_NOW }),
    ).toBeNull()
  })

  it('rejects an expired token and one that is not valid yet', async () => {
    const expired = await signAccessToken(accessKey.pair.privateKey, {
      ...validAccessClaims(),
      exp: ACCESS_NOW / 1000 - 3600,
    })
    const future = await signAccessToken(accessKey.pair.privateKey, {
      ...validAccessClaims(),
      nbf: ACCESS_NOW / 1000 + 3600,
    })
    const options = { jwks: accessKey.jwks, aud: ACCESS_AUD, issuer: ACCESS_ISSUER, now: ACCESS_NOW }
    expect(await verifyAccessJwt(expired, options)).toBeNull()
    expect(await verifyAccessJwt(future, options)).toBeNull()
  })

  it('rejects a token without an expiry', async () => {
    const claims = { ...validAccessClaims() } as Record<string, unknown>
    delete claims.exp
    const token = await signAccessToken(accessKey.pair.privateKey, claims)
    expect(
      await verifyAccessJwt(token, { jwks: accessKey.jwks, aud: ACCESS_AUD, issuer: ACCESS_ISSUER, now: ACCESS_NOW }),
    ).toBeNull()
  })

  it('rejects a tampered signature and the unsigned "none" algorithm', async () => {
    const token = await signAccessToken(accessKey.pair.privateKey, validAccessClaims())
    const tampered = `${token.slice(0, -2)}${token.endsWith('AA') ? 'BB' : 'AA'}`
    const unsigned = `${jwtSegment({ alg: 'none', kid: 'test-key' })}.${jwtSegment(validAccessClaims())}.`
    const options = { jwks: accessKey.jwks, aud: ACCESS_AUD, issuer: ACCESS_ISSUER, now: ACCESS_NOW }
    expect(await verifyAccessJwt(tampered, options)).toBeNull()
    expect(await verifyAccessJwt(unsigned, options)).toBeNull()
  })

  it('rejects a token signed by a key the JWKS does not contain', async () => {
    const stranger = await generateAccessKey('test-key')
    const token = await signAccessToken(stranger.pair.privateKey, validAccessClaims())
    expect(
      await verifyAccessJwt(token, { jwks: accessKey.jwks, aud: ACCESS_AUD, issuer: ACCESS_ISSUER, now: ACCESS_NOW }),
    ).toBeNull()
  })

  it('rejects a request without the Access header', async () => {
    for (const token of [undefined, null, '', '   ']) {
      const identity = await resolveAccessIdentity({
        token,
        config: ACCESS_CONFIG,
        loadJwks: async () => accessKey.jwks,
        now: ACCESS_NOW,
      })
      expect(identity).toBeNull()
    }
  })

  it('fails closed when the Access bindings are empty', async () => {
    const token = await signAccessToken(accessKey.pair.privateKey, validAccessClaims())
    for (const config of [null, { teamDomain: '', aud: '' }, { teamDomain: 'team.cloudflareaccess.com', aud: '' }]) {
      const identity = await resolveAccessIdentity({
        token,
        config,
        loadJwks: async () => accessKey.jwks,
        now: ACCESS_NOW,
      })
      expect(identity).toBeNull()
    }
  })

  it('fails closed when the JWKS cannot be loaded', async () => {
    const token = await signAccessToken(accessKey.pair.privateKey, validAccessClaims())
    const identity = await resolveAccessIdentity({
      token,
      config: ACCESS_CONFIG,
      loadJwks: async () => null,
      now: ACCESS_NOW,
    })
    expect(identity).toBeNull()
  })

  it('normalises a pasted team domain', () => {
    expect(normaliseTeamDomain('team.cloudflareaccess.com')).toBe('team.cloudflareaccess.com')
    expect(normaliseTeamDomain('  https://team.cloudflareaccess.com/  ')).toBe('team.cloudflareaccess.com')
    expect(normaliseTeamDomain('')).toBe('')
  })
})
