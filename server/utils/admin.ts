import { getHeader, type H3Event } from 'h3'
import type { AdminSession } from '../../shared/admin.ts'
import { ACCESS_JWT_HEADER, accessJwksOf, resolveAccessIdentity, type AccessIdentity } from './access.ts'
import { accessConfigOf, feedbackStoreOf } from './feedback.ts'

/**
 * Resolves the Access identity of one admin request without throwing.
 * Returns `null` when no Access app is configured, when the request has no JWT, or when the JWT
 * fails signature / claim / JWKS checks. Callers decide between redirecting and a bare 401.
 */
export const resolveAdminIdentity = async (event: H3Event): Promise<AccessIdentity | null> => {
  const config = accessConfigOf(event)
  if (config === null) return null
  return resolveAccessIdentity({
    token: getHeader(event, ACCESS_JWT_HEADER),
    config,
    loadJwks: (teamDomain) => accessJwksOf(teamDomain),
  })
}

/** Whether the current request carries an Access JWT at all; separates "signed out" from "bad token". */
export const hasAccessToken = (event: H3Event): boolean => {
  const token = getHeader(event, ACCESS_JWT_HEADER)
  return typeof token === 'string' && token.trim() !== ''
}

/**
 * Collects the non-secret facts the admin shell displays.
 * `identity` comes from the caller so this stays pure with respect to verification.
 */
export const adminSessionOf = (event: H3Event, identity: AccessIdentity | null): AdminSession => {
  return {
    configured: accessConfigOf(event) !== null,
    identity,
    storage: feedbackStoreOf(event) !== undefined,
    catalogVersion: String(useRuntimeConfig(event).public.catalogVersion ?? ''),
    environment: import.meta.dev ? 'development' : 'production',
    serverTime: new Date().toISOString(),
  }
}
