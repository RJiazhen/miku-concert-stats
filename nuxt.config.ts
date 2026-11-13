import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { I18N_MODULE_NAMES } from './shared/i18n/module-names.ts'
import type { Locale } from './shared/i18n/locale.ts'

/** Relative locale JSON paths emitted by the i18n-split module for one language. */
const localeFiles = (locale: Locale): string[] => I18N_MODULE_NAMES.map((name) => `${locale}/${name}.json`)

/**
 * Short content hash of the gzipped catalog.
 * It goes into the download URL so browsers can cache the catalog forever.
 * Empty when the catalog has not been built yet (typecheck, lint).
 */
const catalogVersion = (): string => {
  try {
    const file = resolve(process.cwd(), 'public', 'data', 'catalog.sqlite.gz')
    return createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16)
  } catch {
    return ''
  }
}

/** Production builds drop the local-only `/raw` browser and its filesystem write APIs. */
const isProdBuild = process.env.NODE_ENV === 'production'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-06',
  // `@nuxt/cli` 4.0.1 crashes in `#syncAllowedHosts` when `devServer.host`
  // resolves to the schema's fallback object instead of a string, so name it.
  devServer: {
    host: '127.0.0.1',
  },
  // Dev-only source browser: omitted from production so `/raw` and `/api/dev/raw/*` 404 with no middleware.
  ignore: isProdBuild
    ? [
        'app/pages/raw.vue',
        'app/composables/useDevRaw.ts',
        'server/api/dev/**',
        'server/utils/dev-raw-*.ts',
      ]
    : [],
  // i18n-split must run before @nuxtjs/i18n so langDir JSON already exists.
  modules: ['./modules/i18n-split.ts', '@nuxtjs/i18n', '@nuxt/ui'],
  i18n: {
    restructureDir: 'i18n',
    langDir: 'locales',
    strategy: 'no_prefix',
    defaultLocale: 'zh',
    locales: [
      { code: 'zh', language: 'zh-Hans', name: '简体中文', files: localeFiles('zh') },
      { code: 'zh-Hant', language: 'zh-Hant', name: '繁體中文', files: localeFiles('zh-Hant') },
      { code: 'ja', language: 'ja', name: '日本語', files: localeFiles('ja') },
      { code: 'en', language: 'en', name: 'English', files: localeFiles('en') },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'miku-concert-stats-locale',
      cookieMeta: {
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        path: '/',
      },
      fallbackLocale: 'zh',
      redirectOn: 'root',
    },
  },
  css: ['~/assets/css/main.css'],
  // Cloudflare does not compress the sqlite content type, so ship a gzip copy
  // and cache both files by their own content hash or default validators.
  routeRules: {
    // The generated read-only JSON API changes with each deploy, not within one.
    '/api/v1/**': {
      headers: {
        'cache-control': 'public, max-age=300',
        'access-control-allow-origin': '*',
      },
    },
    '/data/catalog.sqlite.gz': {
      headers: {
        'content-type': 'application/gzip',
        'cache-control': 'public, max-age=31536000, immutable',
      },
    },
    '/data/catalog.sqlite': {
      headers: {
        'content-type': 'application/vnd.sqlite3',
        'cache-control': 'public, max-age=0, must-revalidate',
      },
    },
    // Playback pages were withdrawn before any view-count data existed; old links go home.
    '/catalog': { redirect: '/' },
    '/compare': { redirect: '/' },
    '/windows': { redirect: '/' },
    '/correlation': { redirect: '/' },
  },
  runtimeConfig: {
    public: {
      // The gzip file the browser downloads, hashed at build time.
      catalogVersion: catalogVersion(),
    },
  },
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
    // Serve the repository's agent skill as plain text from `/skill.md`.
    // Bundling it as a server asset keeps `skills/query-concert-stats/SKILL.md`
    // the only copy and works on Cloudflare Workers (no runtime filesystem).
    serverAssets: [
      { baseName: 'skill', dir: resolve(process.cwd(), 'skills') },
      // Compact song counts for the search and ranking routes, generated before build.
      { baseName: 'api', dir: resolve(process.cwd(), 'server', 'assets', 'api') },
    ],
  },
  // Follow the operating system until the visitor picks a theme.
  colorMode: {
    preference: 'system',
    fallback: 'dark',
  },
  ui: {
    // System font stack keeps the build offline and the render instant.
    fonts: false,
    theme: {
      colors: ['primary', 'secondary', 'success', 'info', 'warning', 'error'],
    },
  },
  icon: {
    // Bundle every icon used in .vue files so SSR never calls the Iconify API.
    clientBundle: {
      scan: true,
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-Hans' },
      title: '初音未来演唱会曲目统计',
      // Page titles read "页面名 · 站点名".
      titleTemplate: '%s · 初音未来演唱会曲目统计',
      link: [{ rel: 'icon', type: 'image/png', href: '/logo.png' }],
      meta: [
        {
          name: 'description',
          content: '按演出、系列和年份比较初音未来演唱会歌单。统计在浏览器本地完成。',
        },
        { name: 'theme-color', content: '#05070d' },
      ],
    },
  },
})
