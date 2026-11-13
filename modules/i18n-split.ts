import { resolve } from 'node:path'
import { defineNuxtModule, addVitePlugin } from '@nuxt/kit'
import { splitI18nModules } from '../shared/i18n/split-modules.ts'

/**
 * Projects `i18n/modules/*.ts` (all locales side by side) into
 * `i18n/locales/<locale>/<module>.json` for `@nuxtjs/i18n` lazy loading.
 * Runs on Nuxt setup (prepare/dev/build) and again when module sources change in Vite.
 */
export default defineNuxtModule({
  meta: {
    name: 'i18n-split',
    configKey: 'i18nSplit',
  },
  setup: (_options, nuxt) => {
    const root = nuxt.options.rootDir
    const modulesDir = resolve(root, 'i18n/modules')
    const localesDir = resolve(root, 'i18n/locales')

    /** Writes locale JSON from the multi-locale module sources. */
    const runSplit = (): void => {
      splitI18nModules(modulesDir, localesDir)
    }

    runSplit()

    nuxt.hook('builder:watch', (_event, path) => {
      if (!path) return
      const normalized = path.replace(/\\/g, '/')
      if (!normalized.includes('i18n/modules/')) return
      runSplit()
    })

    addVitePlugin({
      name: 'i18n-split-watch',
      buildStart: () => {
        runSplit()
      },
      configureServer: (server) => {
        server.watcher.add(modulesDir)
        server.watcher.on('change', (file) => {
          if (file.replace(/\\/g, '/').includes('i18n/modules/')) {
            runSplit()
          }
        })
      },
    })
  },
})
