import type { RouterConfig } from '@nuxt/schema'

/**
 * Tour stop hashes (`#p-{id}`) are selection state, not element targets — changing
 * the active setlist must not jump the page. Other hashes keep default behavior.
 */
export default {
  scrollBehavior: (to, from, savedPosition) => {
    if (to.hash.startsWith('#p-')) return false
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 80, behavior: 'smooth' }
    if (to.path !== from.path) return { top: 0 }
    return false
  },
} satisfies RouterConfig
