export default defineNuxtConfig({
  compatibilityDate: '2026-10-06',
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
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
