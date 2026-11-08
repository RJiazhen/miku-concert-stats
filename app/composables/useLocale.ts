import { computed } from 'vue'
import { useCookie, useRequestHeaders, useState } from 'nuxt/app'
import { en as uiEn, ja as uiJa, zh_cn as uiZhCn, zh_tw as uiZhTw } from '@nuxt/ui/locale'
import type { Locale as UiLocale } from '@nuxt/ui'
import {
  isLocale,
  localeFromLanguages,
  localeSelfName,
  localeTag,
  translate,
  type Locale,
  type MessageKey,
  type MessageParams,
} from '~~/shared/i18n/index.ts'

/** Cookie holding the visitor's language choice; sent with each request so SSR can render it. */
const LOCALE_COOKIE = 'miku-concert-stats-locale'

/** Cookie holding the "show original Japanese title" switch. */
const ORIGINAL_TITLE_COOKIE = 'miku-concert-stats-show-original-title'

/** Both preferences are remembered for a year. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** Readable on every page, and not sent with cross-site requests. */
const cookieOptions = {
  maxAge: COOKIE_MAX_AGE,
  sameSite: 'lax' as const,
  path: '/',
}

/** The source language when neither a stored choice nor the browser names a supported one. */
const sourceLocale = (): Locale => 'zh'

/** Original titles are shown until the reader hides them. */
const originalTitleDefault = (): boolean => true

/**
 * Locale to render before the visitor has picked one: the stored cookie when it names a supported
 * language, otherwise the first supported language in `Accept-Language`, otherwise Chinese.
 */
const initialLocale = (stored: string | null, languages: string): Locale => {
  if (isLocale(stored)) return stored
  return localeFromLanguages(languages) ?? sourceLocale()
}

/**
 * Languages the browser asked for, in preference order.
 * On the server this is the request's `Accept-Language` header, so the first HTML already matches
 * the visitor; in a client-only render it is `navigator.language`.
 */
const requestLanguages = (): string => {
  if (import.meta.server) return useRequestHeaders(['accept-language'])['accept-language'] ?? ''
  return navigator.language
}

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
 * The server renders the stored choice or the browser's `Accept-Language` language, and the same
 * value hydrates on the client, so the page never switches language after it appears.
 */
export const useLocale = () => {
  const storedLocale = useCookie<string | null>(LOCALE_COOKIE, {
    default: () => null,
    ...cookieOptions,
  })
  const storedOriginals = useCookie<string | null>(ORIGINAL_TITLE_COOKIE, {
    default: () => null,
    ...cookieOptions,
  })
  const locale = useState<Locale>('site-locale', () => initialLocale(storedLocale.value, requestLanguages()))
  const originals = useState<boolean>('site-show-original-title', () => {
    if (storedOriginals.value === null) return originalTitleDefault()
    return storedOriginals.value !== '0'
  })

  /** Stores the visitor's choice and re-renders every localized string. */
  const setLocale = (next: Locale): void => {
    locale.value = next
    storedLocale.value = next
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
