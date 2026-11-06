import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

export default defineNuxtConfig({
  compatibilityDate: '2026-10-06',
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  // Cloudflare does not compress the sqlite content type, so ship a gzip copy
  // and cache both files by their own content hash or default validators.
  routeRules: {
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
    serverAssets: [{ baseName: 'skill', dir: resolve(process.cwd(), 'skills') }],
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
      title: '初音未来演唱会曲目播放统计',
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
