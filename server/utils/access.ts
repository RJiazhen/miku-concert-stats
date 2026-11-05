/**
 * Cloudflare Access identity checks for the hidden `/admin` backend.
 *
 * Only WebCrypto and `fetch` are used, so the same code runs in workerd and in Node tests
 * (no `jose` and no Node-only crypto). Every failure resolves to `null`; callers turn that into a
 * bare 401, so neither the reason nor any feedback content can leak through an error response.
 */

/** Header Cloudflare Access adds to every request it has already authenticated. */
export const ACCESS_JWT_HEADER = 'cf-access-jwt-assertion'

/** One RSA signing key from the Access JWKS document. */
export type AccessJwk = {
  kty: 'RSA'
  n: string
  e: string
  kid?: string
  alg?: string
}

/** The `{ keys: [...] }` document served by `https://<team>/cdn-cgi/access/certs`. */
export type AccessJwks = { keys: AccessJwk[] }

/** Claims the admin routes rely on; any other claim is ignored. */
export type AccessClaims = {
  aud: string | string[]
  iss: string
  exp: number
  nbf?: number
  iat?: number
  sub?: string
  email?: string
}

/** Authenticated maintainer, as far as the Worker can tell. Never echoed to a client. */
export type AccessIdentity = {
  subject: string | null
  email: string | null
}

/** Access application the Worker expects. `teamDomain` has no scheme; `aud` is the AUD tag. */
export type AccessConfig = {
  teamDomain: string
  aud: string
}

/** Inputs for `verifyAccessJwt`; `now` is milliseconds so tests can pin the clock. */
export type AccessVerifyOptions = {
  jwks: AccessJwks
  aud: string
  issuer: string
  now?: number
  skewSeconds?: number
}

/** Everything one admin request needs in order to be accepted or rejected. */
export type AccessCheckInput = {
  token: string | null | undefined
  config: AccessConfig | null
  loadJwks: (teamDomain: string) => Promise<AccessJwks | null>
  now?: number
}

/** Seconds of tolerated clock drift for `exp` and `nbf`. */
const DEFAULT_SKEW_SECONDS = 30

/** How long a fetched JWKS document is reused before another fetch. */
const JWKS_TTL_MS = 5 * 60 * 1000

/** Cache entry for the team's signing keys. One team per deployment, so one slot is enough. */
type JwksCache = { teamDomain: string; keys: AccessJwk[]; fetchedAt: number }

let jwksCache: JwksCache | null = null

/** Decodes a base64url segment into bytes; `null` when it is not valid base64url. */
const base64UrlBytes = (value: string): Uint8Array<ArrayBuffer> | null => {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const remainder = padded.length % 4
  if (remainder === 1) return null
  try {
    const binary = atob(padded + '='.repeat((4 - remainder) % 4))
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  } catch {
    return null
  }
}

/** Parses one decoded JWT segment as a JSON object; `null` for anything else. */
const decodeJsonObject = (segment: string): Record<string, unknown> | null => {
  const bytes = base64UrlBytes(segment)
  if (bytes === null) return null
  try {
    const decoded: unknown = JSON.parse(new TextDecoder().decode(bytes))
    if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) return null
    return decoded as Record<string, unknown>
  } catch {
    return null
  }
}

/** Verifies one RS256 signature against a JWK public key; `false` on any WebCrypto error. */
const verifySignature = async (
  jwk: AccessJwk,
  data: Uint8Array<ArrayBuffer>,
  signature: Uint8Array<ArrayBuffer>,
): Promise<boolean> => {
  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data)
  } catch {
    return false
  }
}

/**
 * Verifies an Access JWT against an already fetched JWKS.
 * Checks the RS256 signature, `iss`, `aud`, `exp`, and `nbf` (with a small clock skew).
 * Returns the claims, or `null` on any failure, so the caller cannot distinguish the reasons.
 */
export const verifyAccessJwt = async (
  token: string | null | undefined,
  options: AccessVerifyOptions,
): Promise<AccessClaims | null> => {
  if (typeof token !== 'string') return null
  const parts = token.trim().split('.')
  if (parts.length !== 3) return null
  const [headerPart, payloadPart, signaturePart] = parts

  const header = decodeJsonObject(headerPart)
  // Only RS256 is accepted, so an `alg: none` or HMAC confusion token never reaches the key lookup.
  if (header === null || header.alg !== 'RS256') return null
  const payload = decodeJsonObject(payloadPart)
  if (payload === null) return null
  const signature = base64UrlBytes(signaturePart)
  if (signature === null) return null

  const keyId = typeof header.kid === 'string' ? header.kid : null
  const candidates = options.jwks.keys.filter((key) => keyId === null || key.kid === keyId)
  if (candidates.length === 0) return null

  const signed = new TextEncoder().encode(`${headerPart}.${payloadPart}`)
  let verified = false
  for (const jwk of candidates) {
    if (await verifySignature(jwk, signed, signature)) {
      verified = true
      break
    }
  }
  if (!verified) return null

  const issuer = typeof payload.iss === 'string' ? payload.iss : null
  if (issuer === null || issuer !== options.issuer) return null

  const audiences =
    typeof payload.aud === 'string'
      ? [payload.aud]
      : Array.isArray(payload.aud)
        ? payload.aud.filter((value): value is string => typeof value === 'string')
        : []
  if (!audiences.includes(options.aud)) return null

  const expiresAt = typeof payload.exp === 'number' ? payload.exp : null
  if (expiresAt === null) return null
  const notBefore = typeof payload.nbf === 'number' ? payload.nbf : null
  const issuedAt = typeof payload.iat === 'number' ? payload.iat : null
  const nowSeconds = (options.now ?? Date.now()) / 1000
  const skew = options.skewSeconds ?? DEFAULT_SKEW_SECONDS
  if (nowSeconds > expiresAt + skew) return null
  if (notBefore !== null && nowSeconds < notBefore - skew) return null

  return {
    aud: audiences.length === 1 ? audiences[0] : audiences,
    iss: issuer,
    exp: expiresAt,
    nbf: notBefore ?? undefined,
    iat: issuedAt ?? undefined,
    sub: typeof payload.sub === 'string' ? payload.sub : undefined,
    email: typeof payload.email === 'string' ? payload.email : undefined,
  }
}

/** Trims a configured team domain to its bare host: `https://team.cloudflareaccess.com/` → `team.cloudflareaccess.com`. */
export const normaliseTeamDomain = (raw: string): string => {
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}

/** Turns one untrusted JWKS entry into a usable RSA key; `null` when it is not one. */
const toAccessJwk = (value: unknown): AccessJwk | null => {
  if (typeof value !== 'object' || value === null) return null
  const key = value as Record<string, unknown>
  if (key.kty !== 'RSA' || typeof key.n !== 'string' || typeof key.e !== 'string') return null
  return {
    kty: 'RSA',
    n: key.n,
    e: key.e,
    kid: typeof key.kid === 'string' ? key.kid : undefined,
    alg: typeof key.alg === 'string' ? key.alg : undefined,
  }
}

/** Extracts the RSA keys from an untrusted JWKS body; an empty list when there are none. */
const accessJwksOfBody = (body: unknown): AccessJwk[] => {
  if (typeof body !== 'object' || body === null) return []
  const keys = (body as { keys?: unknown }).keys
  if (!Array.isArray(keys)) return []
  return keys.map(toAccessJwk).filter((key): key is AccessJwk => key !== null)
}

/**
 * Fetches the Access signing keys of a team, reusing a module-level copy for five minutes.
 * Returns `null` on a network error, a non-2xx response, or a body without RSA keys, so callers
 * fail closed. A rotated key is picked up when the cache expires, at most five minutes later.
 */
export const accessJwksOf = async (teamDomain: string, now = Date.now()): Promise<AccessJwks | null> => {
  if (jwksCache !== null && jwksCache.teamDomain === teamDomain && now - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return { keys: jwksCache.keys }
  }
  try {
    const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`)
    if (!response.ok) return null
    const body: unknown = await response.json()
    const keys = accessJwksOfBody(body)
    if (keys.length === 0) return null
    jwksCache = { teamDomain, keys, fetchedAt: now }
    return { keys }
  } catch {
    return null
  }
}

/**
 * Decides whether one admin request may proceed.
 * Blank Access configuration, a missing or malformed header, an unreachable JWKS, and a failed
 * claim check all resolve to `null` with no further detail.
 */
export const resolveAccessIdentity = async (input: AccessCheckInput): Promise<AccessIdentity | null> => {
  if (input.config === null || input.config.teamDomain === '' || input.config.aud === '') return null
  const token = typeof input.token === 'string' ? input.token.trim() : ''
  if (token === '') return null

  const jwks = await input.loadJwks(input.config.teamDomain)
  if (jwks === null) return null

  const claims = await verifyAccessJwt(token, {
    jwks,
    aud: input.config.aud,
    issuer: `https://${input.config.teamDomain}`,
    now: input.now,
  })
  if (claims === null) return null

  return { subject: claims.sub ?? null, email: claims.email ?? null }
}
