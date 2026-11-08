import { en } from './en.ts'
import { ja } from './ja.ts'
import { zh } from './zh.ts'
import { zhHant } from './zh-Hant.ts'
import type { Locale } from './locale.ts'

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

/** Every key the interface uses, derived from the Chinese source catalog. */
export type MessageKey = keyof typeof zh

/** Parameter values filled into `{name}` placeholders. */
export type MessageParams = Record<string, string | number>

/** Catalogs by locale. */
const catalogs: Record<Locale, Record<MessageKey, string>> = { zh, 'zh-Hant': zhHant, ja, en }

/**
 * One interface string in `locale`, with `{name}` placeholders replaced.
 * An unknown key returns the key itself so a mistake is visible instead of rendering blank.
 */
export const translate = (locale: Locale, key: MessageKey, params?: MessageParams): string => {
  const template: string | undefined = catalogs[locale][key]
  if (template === undefined) return key
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}

/**
 * Translator bound to one locale, the shape components and shared helpers take.
 */
export type Translate = (key: MessageKey, params?: MessageParams) => string

/** Binds `translate` to a locale once, for code that renders many strings. */
export const translator = (locale: Locale): Translate => (key, params) => translate(locale, key, params)
