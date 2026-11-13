import type cities from '../../i18n/modules/cities.ts'
import type col from '../../i18n/modules/col.ts'
import type feedback from '../../i18n/modules/feedback.ts'
import type producers from '../../i18n/modules/producers.ts'
import type rank from '../../i18n/modules/rank.ts'
import type raw from '../../i18n/modules/raw.ts'
import type report from '../../i18n/modules/report.ts'
import type search from '../../i18n/modules/search.ts'
import type series from '../../i18n/modules/series.ts'
import type shell from '../../i18n/modules/shell.ts'
import type show from '../../i18n/modules/show.ts'
import type song from '../../i18n/modules/song.ts'
import type timeline from '../../i18n/modules/timeline.ts'
import type { Locale } from './locale.ts'
import { I18N_MODULE_NAMES } from './module-names.ts'

export {
  LOCALES,
  isChineseLocale,
  isLocale,
  localeFromLanguage,
  localeFromLanguages,
  localeFromTag,
  localeSelfName,
  localeTag,
} from './locale.ts'
export type { Locale } from './locale.ts'
export { I18N_MODULE_NAMES } from './module-names.ts'
export type { I18nModuleName } from './module-names.ts'

/** Union of every feature module’s keys — the UI message catalog. */
type MessageModules = typeof shell &
  typeof col &
  typeof rank &
  typeof song &
  typeof series &
  typeof cities &
  typeof producers &
  typeof show &
  typeof timeline &
  typeof search &
  typeof report &
  typeof feedback &
  typeof raw

/** Every key the interface uses. */
export type MessageKey = keyof MessageModules

/** Parameter values filled into `{name}` placeholders. */
export type MessageParams = Record<string, string | number>

/**
 * Translator bound to one locale, the shape components and shared helpers take.
 * Vue supplies `useI18n().t`; scripts/tests use `translator` from `node-translate.ts`.
 */
export type Translate = (key: MessageKey, params?: MessageParams) => string

/**
 * Fills `{name}` placeholders in a template the same way the old catalog did.
 * Shared with the Node translator; Vue I18n handles placeholders itself at runtime.
 */
export const fillMessageParams = (template: string, params?: MessageParams): string => {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}

/**
 * Builds a Translate from a flat locale catalog (Node/scripts/tests).
 * An unknown key returns the key itself so a mistake is visible instead of rendering blank.
 */
export const translateFromCatalog = (
  catalog: Record<string, string>,
): Translate => {
  return (key, params) => {
    const template = catalog[key as string]
    if (template === undefined) return key
    return fillMessageParams(template, params)
  }
}

/** Locale codes registered with `@nuxtjs/i18n` (same order as the language switcher). */
export const i18nLocaleFiles = (locale: Locale): string[] =>
  I18N_MODULE_NAMES.map((name) => `${locale}/${name}.json`)
