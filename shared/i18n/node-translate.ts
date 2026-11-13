import { catalogForLocale } from './split-modules.ts'
import { translateFromCatalog, type Translate } from './index.ts'
import type { Locale } from './locale.ts'

/**
 * Sync translator for scripts and Vitest.
 * Imports every multi-locale module — never import this from `app/` or the client will ship all languages.
 */
export const translator = (locale: Locale): Translate => translateFromCatalog(catalogForLocale(locale))

/**
 * One-shot translate for scripts/tests that already know the locale.
 */
export const translate = (
  locale: Locale,
  key: Parameters<Translate>[0],
  params?: Parameters<Translate>[1],
): string => translator(locale)(key, params)
