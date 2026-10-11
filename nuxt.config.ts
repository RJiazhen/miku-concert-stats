export default defineNuxtConfig({
  compatibilityDate: '2026-10-06',
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-Hans' },
      title: '初音未来演唱会曲目播放统计',
      meta: [
        {
          name: 'description',
          content: '按演出、系列和年份比较初音未来演唱会歌单的播放量区间。统计在浏览器本地完成。',
        },
      ],
      script: [
        {
          key: 'theme-init',
          tagPriority: 'critical',
          innerHTML:
            "(() => { try { const stored = localStorage.getItem('miku-concert-stats-theme'); if (stored === 'light' || stored === 'dark') document.documentElement.dataset.theme = stored; } catch { /* storage unavailable */ } })();",
        },
      ],
    },
  },
})
