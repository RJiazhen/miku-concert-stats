import { computed, onMounted } from 'vue'
import { useState } from 'nuxt/app'
import { en as uiEn, ja as uiJa, zh_cn as uiZhCn, zh_tw as uiZhTw } from '@nuxt/ui/locale'
import type { Locale as UiLocale } from '@nuxt/ui'
import {
  isLocale,
  localeFromLanguage,
  localeSelfName,
  localeTag,
  translate,
  type Locale,
  type MessageKey,
  type MessageParams,
} from '~~/shared/i18n/index.ts'

const STORAGE_KEY = 'miku-concert-stats-locale'
const ORIGINAL_TITLE_KEY = 'miku-concert-stats-show-original-title'

/** Server render and the first client render both start in the source language. */
const sourceLocale = (): Locale => 'zh'

/** Original titles are shown until the reader hides them. */
const originalTitleDefault = (): boolean => true

/**
 * Nuxt UI's own locale for each site language, so built-in strings (table "no data", select
 * "no match", modal "close", toast, pagination) follow the language switch too.
 */
export const uiLocaleOf = (locale: Locale): UiLocale<unknown> => {
  if (locale === 'ja') return uiJa
  if (locale === 'en') return uiEn
  if (locale === 'zh-Hant') return uiZhTw
  return uiZhCn
}



/**
 * Shares the interface language across pages.
 * After mount a stored choice wins; otherwise the browser language picks Japanese, English, or Chinese.
 */
export const useLocale = () => {
  const locale = useState<Locale>('site-locale', sourceLocale)
  const originals = useState<boolean>('site-show-original-title', originalTitleDefault)

  /** Applies localStorage, or `navigator.language` when the visitor has not chosen. */
  const readLocale = (): void => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const storedOriginals = localStorage.getItem(ORIGINAL_TITLE_KEY)
    if (storedOriginals !== null) originals.value = storedOriginals !== '0'
    if (isLocale(stored)) {
      locale.value = stored
      return
    }
    locale.value = localeFromLanguage(navigator.language)
  }
  onMounted(readLocale)

  /** Stores the visitor's choice and re-renders every localized string. */
  const setLocale = (next: Locale): void => {
    locale.value = next
    localStorage.setItem(STORAGE_KEY, next)
  }

  /** Whether a non-Japanese title prints the Japanese original under it; no-op control in Japanese. */
  const showOriginalTitle = computed<boolean>({
    get: () => originals.value,
    set: (next: boolean) => {
      originals.value = next
      localStorage.setItem(ORIGINAL_TITLE_KEY, next ? '1' : '0')
    },
  })

  /** One interface string in the active language. */
  const t = (key: MessageKey, params?: MessageParams): string => translate(locale.value, key, params)

  /** Name of the active language as its own speakers write it. */
  const currentName = computed(() => localeSelfName(locale.value))

  return {
    locale,
    setLocale,
    showOriginalTitle,
    t,
    currentName,
    uiLocale: computed(() => uiLocaleOf(locale.value)),
    tag: computed(() => localeTag(locale.value)),
  }
}

/**
 * Keeps `<html lang>` and the document title in step with the language switch.
 * Called once from the default layout; the static title template stays in `nuxt.config.ts`.
 */
export const useLocaleDocument = (): void => {
  const { locale } = useLocale()
  useHead({
    htmlAttrs: { lang: () => localeTag(locale.value) },
    titleTemplate: (title?: string) => {
      const name = translate(locale.value, 'common.appName')
      return title ? `${title} · ${name}` : name
    },
    meta: [{ name: 'description', content: () => translate(locale.value, 'common.tagline') }],
  })
}
