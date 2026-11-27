/**
 * Feature-module basenames under `i18n/modules/`.
 * The i18n-split Nuxt module writes one JSON per (locale × module) from these names.
 */
export const I18N_MODULE_NAMES = [
  'shell',
  'home',
  'col',
  'rank',
  'song',
  'series',
  'tour',
  'cities',
  'producers',
  'show',
  'timeline',
  'search',
  'report',
  'feedback',
  'raw',
] as const

/** One feature-module basename. */
export type I18nModuleName = (typeof I18N_MODULE_NAMES)[number]
