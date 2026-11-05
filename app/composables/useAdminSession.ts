import { useRequestEvent, useState } from 'nuxt/app'
import type { AdminSession } from '~~/shared/admin.ts'

/** Neutral value for client-side navigation into the admin area before the session loads. */
const emptySession = (): AdminSession => ({
  configured: false,
  identity: null,
  storage: false,
  catalogVersion: '',
  environment: 'production',
  serverTime: '',
})

/**
 * Reads the session the Nitro admin guard attached to the incoming request.
 * Returns `undefined` on the client or when the request did not pass the guard.
 */
const seededSession = (): AdminSession | undefined => {
  if (!import.meta.server) return undefined
  const context = useRequestEvent()?.context as { adminSession?: AdminSession } | undefined
  return context?.adminSession
}

/**
 * Shares one Cloudflare Access session across the admin shell and its pages.
 * The server guard seeds it for the first SSR paint; `load` refreshes it after client-side
 * navigation, a token expiry, or a manual refresh. Failures keep the last known state so a signed
 * out maintainer sees a clear message instead of an empty dashboard.
 */
export const useAdminSession = () => {
  const seed = seededSession()
  const session = useState<AdminSession>('admin-session', () => seed ?? emptySession())
  const pending = useState<boolean>('admin-session-pending', () => false)
  const loaded = useState<boolean>('admin-session-loaded', () => seed !== undefined)

  // Fetches the session from the protected endpoint once, or again when `force` is true.
  const load = async (force = false): Promise<void> => {
    if (pending.value) return
    if (loaded.value && !force) return
    pending.value = true
    try {
      session.value = await $fetch<AdminSession>('/api/admin/session')
      loaded.value = true
    } catch {
      // Keep the seeded copy: an expired token still shows who was signed in a moment ago.
      loaded.value = true
    } finally {
      pending.value = false
    }
  }

  return { session, pending, loaded, load }
}
