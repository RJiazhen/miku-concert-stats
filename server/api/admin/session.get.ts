import { createError, defineEventHandler, type H3Event } from 'h3'
import type { AdminSession } from '../../../shared/admin.ts'
import { adminSessionOf, resolveAdminIdentity } from '../../utils/admin.ts'

/**
 * `GET /api/admin/session` — identity and environment facts for the admin shell.
 *
 * Returns `configured: false` (no identity) while ACCESS_TEAM_DOMAIN / ACCESS_AUD are blank, which
 * is how `nuxt dev` renders a setup hint instead of an endless login loop. Once configured, a
 * request without a valid Access JWT is a bare 401, matching every other admin API.
 */
const getAdminSession = async (event: H3Event): Promise<AdminSession> => {
  const identity = await resolveAdminIdentity(event)
  const session = adminSessionOf(event, identity)
  if (!session.configured) return session
  if (identity === null) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Unauthorized', data: null })
  }
  return session
}

export default defineEventHandler(getAdminSession)
