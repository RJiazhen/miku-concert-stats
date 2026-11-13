import { computed } from 'vue'
import { useCookie, useHead, useI18n, useState } from '#imports'
import { en as uiEn, ja as uiJa, zh_cn as uiZhCn, zh_tw as uiZhTw } from '@nuxt/ui/locale'
import type { Locale as UiLocale } from '@nuxt/ui'
import {
  isLocale,
  localeSelfName,
  localeTag,
  type Locale,
  type MessageKey,
  type MessageParams,
} from '~~/shared/i18n/index.ts'

/** Cookie holding the "show original Japanese title" switch. */
const ORIGINAL_TITLE_COOKIE = 'miku-concert-stats-show-original-title'

/** Preference remembered for a year. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** Readable on every page, and not sent with cross-site requests. */
const cookieOptions = {
  maxAge: COOKIE_MAX_AGE,
  sameSite: 'lax' as const,
  path: '/',
}

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
 * Shares the interface language across pages via `@nuxtjs/i18n`.
 * Cookie + browser detection live in the i18n module (`detectBrowserLanguage`);
 * this composable keeps the show-original-title cookie and a stable `t` / `setLocale` API.
 */
export const useLocale = () => {
  const {
    locale: i18nLocale,
    setLocale: setI18nLocale,
    t: i18nT,
  } = useI18n()

  const storedOriginals = useCookie<string | null>(ORIGINAL_TITLE_COOKIE, {
    default: () => null,
    ...cookieOptions,
  })

  const locale = computed<Locale>({
    get: () => (isLocale(i18nLocale.value) ? i18nLocale.value : 'zh'),
    set: (next) => {
      void setI18nLocale(next)
    },
  })

  const originals = useState<boolean>('site-show-original-title', () => {
    if (storedOriginals.value === null) return originalTitleDefault()
    return storedOriginals.value !== '0'
  })

  /** Stores the visitor's choice and re-renders every localized string. */
  const setLocale = (next: Locale): void => {
    void setI18nLocale(next)
  }

  /** Whether a non-Japanese title prints the Japanese original under it; no-op control in Japanese. */
  const showOriginalTitle = computed<boolean>({
    get: () => originals.value,
    set: (next: boolean) => {
      originals.value = next
      storedOriginals.value = next ? '1' : '0'
    },
  })

  /** One interface string in the active language. */
  const t = (key: MessageKey, params?: MessageParams): string => {
    if (params === undefined) return i18nT(key)
    return i18nT(key, params)
  }

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
  const { locale, t } = useLocale()
  useHead({
    htmlAttrs: { lang: () => localeTag(locale.value) },
    titleTemplate: (title?: string) => {
      const name = t('common.appName')
      return title ? `${title} · ${name}` : name
    },
    meta: [{ name: 'description', content: () => t('common.tagline') }],
  })
}
