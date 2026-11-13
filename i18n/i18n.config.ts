/**
 * Vue I18n options for `@nuxtjs/i18n`.
 * Locale message files are registered in `nuxt.config.ts` and lazy-loaded per language.
 */
export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'zh',
}))
