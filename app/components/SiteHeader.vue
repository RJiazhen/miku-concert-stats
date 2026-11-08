<script setup lang="ts">
import { LOCALES, localeSelfName, type Locale } from '~~/shared/i18n/index.ts'
import { useAiPrompt } from '~/composables/useAiPrompt.ts'
import { useLocale } from '~/composables/useLocale.ts'

const { t, locale, setLocale, showOriginalTitle } = useLocale()
const { copyPrompt: writePrompt } = useAiPrompt()
const colorMode = useColorMode()
const toast = useToast()

/** Language choices without flags or emoji: the active language first, then the rest in switcher order. */
const languageItems = computed(() => {
  const current = locale.value
  const ordered: Locale[] = [current, ...LOCALES.filter((value) => value !== current)]
  return ordered.map((value) => ({ value, label: localeSelfName(value) }))
})

/** Whether the original-title switch can be used; Japanese titles are already the originals. */
const originalTitleDisabled = computed(() => locale.value === 'ja')

/** What the switch shows: always off in Japanese, otherwise the stored preference. */
const originalTitleShown = computed(() => !originalTitleDisabled.value && showOriginalTitle.value)

/** Applies the switch, keeping the stored preference untouched while Japanese is active. */
const toggleOriginalTitle = (next: boolean): void => {
  if (originalTitleDisabled.value) return
  showOriginalTitle.value = next
}

/** Hover-open state of the desktop language popover. */
const languageOpen = ref(false)

/**
 * Set after the visitor picks an option: hover and focus stay ignored until the pointer has left
 * the trigger and the panel. Otherwise the click that ends the choice hands focus back to the
 * trigger, whose focus / hover would reopen the very menu that just closed.
 */
let hoverSuppressed = false

/** Pending close, so moving the pointer from the button into the menu never closes it. */
let closeTimer: ReturnType<typeof setTimeout> | undefined

/** Opens the popover and cancels a scheduled close. */
const openLanguages = (): void => {
  if (hoverSuppressed) return
  if (closeTimer !== undefined) {
    clearTimeout(closeTimer)
    closeTimer = undefined
  }
  languageOpen.value = true
}

/** Closes the popover after a short delay, long enough to cross the gap into the menu. */
const closeLanguagesSoon = (): void => {
  if (closeTimer !== undefined) clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    languageOpen.value = false
    closeTimer = undefined
  }, 180)
}

/** Cancels a pending close when the component unmounts. */
const stopCloseTimer = (): void => {
  if (closeTimer === undefined) return
  clearTimeout(closeTimer)
  closeTimer = undefined
}

/** Whether a viewport point sits on the language trigger or the open panel. */
const overLanguageSurface = (x: number, y: number): boolean => {
  return document.elementFromPoint(x, y)?.closest('[data-language-surface]') != null
}

/**
 * Keeps the open panel in step with the pointer, and releases the post-selection lock once the
 * pointer is away from the trigger.
 * `mouseleave` alone is not enough: a panel opened by focus while the pointer is already outside
 * never receives one, so it used to stay open until the pointer happened to cross the trigger.
 */
const trackLanguagePointer = (event: PointerEvent): void => {
  const inside = overLanguageSurface(event.clientX, event.clientY)
  if (!inside) hoverSuppressed = false
  if (!languageOpen.value) return
  if (inside) openLanguages()
  else closeLanguagesSoon()
}

/** Starts following the pointer, so the open panel and the post-selection lock both react. */
const startPointerTracking = (): void => {
  document.addEventListener('pointermove', trackLanguagePointer)
}

/** Stops tracking the pointer when the header goes away. */
const stopPointerTracking = (): void => {
  document.removeEventListener('pointermove', trackLanguagePointer)
}

/** Whether the compact navigation panel is open. */
const menuOpen = ref(false)

/** Picks a language and closes whichever menu opened the choice. */
const pickLanguage = (next: Locale): void => {
  setLocale(next)
  languageOpen.value = false
  menuOpen.value = false
  hoverSuppressed = true
}

/** Copies the AI prompt from the compact menu and reports the outcome as a toast. */
const copyAiPrompt = async (): Promise<void> => {
  const copied = await writePrompt()
  toast.add({
    title: copied ? t('ai.copiedHint') : t('ai.failedHint'),
    color: copied ? 'success' : 'error',
    icon: copied ? 'i-lucide-check' : 'i-lucide-circle-alert',
  })
}

/** Closes the compact navigation panel after the visitor picks a destination. */
const closeMenu = (): void => {
  menuOpen.value = false
}

/** Closes both menus, used by the Escape key. */
const closeMenus = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape') return
  menuOpen.value = false
  languageOpen.value = false
}

/** Wide-screen query; crossing it closes the compact panel, which no longer exists there. */
const WIDE_SCREEN_QUERY = '(min-width: 64rem)'

let wideQuery: MediaQueryList | null = null

/** Closes the compact panel as soon as the wide navigation takes over. */
const syncWideScreen = (): void => {
  if (wideQuery?.matches !== true) return
  menuOpen.value = false
}

/** Starts listening for the wide-screen breakpoint. */
const startWideTracking = (): void => {
  wideQuery = window.matchMedia(WIDE_SCREEN_QUERY)
  wideQuery.addEventListener('change', syncWideScreen)
}

/** Releases the breakpoint listener. */
const stopWideTracking = (): void => {
  wideQuery?.removeEventListener('change', syncWideScreen)
  wideQuery = null
}

/** Keeps the page behind the open panel from scrolling, and restores it on close. */
const syncBodyScroll = (open: boolean): void => {
  document.body.style.overflow = open ? 'hidden' : ''
}
watch(menuOpen, syncBodyScroll)

onMounted(() => {
  startWideTracking()
  startPointerTracking()
  window.addEventListener('keydown', closeMenus)
})
onUnmounted(() => {
  stopWideTracking()
  window.removeEventListener('keydown', closeMenus)
  syncBodyScroll(false)
})

/** Whether the dark theme is active; used for the appearance row's switch. */
const isDark = computed(() => colorMode.value === 'dark')

/** Switches between light and dark; an explicit choice replaces the system preference. */
const setDark = (next: boolean): void => {
  colorMode.preference = next ? 'dark' : 'light'
}

/**
 * Primary navigation. Labels are resolved in the active language at render time.
 * The admin backend (`/admin/...`) is intentionally absent: it is a hidden entry point reached
 * only by direct URL and protected by Cloudflare Access, so never add it here or to the footer.
 */
const links = [
  { key: 'nav.songs', to: '/', icon: 'i-lucide-music' },
  { key: 'nav.timeline', to: '/timeline', icon: 'i-lucide-chart-line' },
  { key: 'nav.series', to: '/series', icon: 'i-lucide-layers' },
  { key: 'nav.cities', to: '/cities', icon: 'i-lucide-map-pin' },
  { key: 'nav.producers', to: '/producers', icon: 'i-lucide-user-round' },
  { key: 'nav.raw', to: '/raw', icon: 'i-lucide-table-2' },
] as const

onBeforeUnmount(stopCloseTimer)
onBeforeUnmount(stopPointerTracking)
</script>

<template>
  <!-- One row at every width: nothing wraps, and narrow screens fold items away instead. -->
  <header class="glass-header sticky top-0 z-40">
    <div class="mx-auto flex max-w-6xl items-center gap-x-2 px-4 py-3 sm:gap-x-4 sm:px-6">
      <NuxtLink to="/" class="group flex min-w-0 items-center gap-2.5 text-inherit no-underline">
        <img
          src="/logo.png"
          :alt="t('common.appName')"
          width="32"
          height="32"
          class="size-8 shrink-0 rounded-lg ring-1 ring-black/10 dark:ring-white/15"
        >
        <span class="min-w-0 leading-tight">
          <span class="block truncate text-sm font-semibold tracking-tight">{{ t('common.appShort') }}</span>
          <span class="block truncate text-[11px] text-muted">{{ t('common.appSuffix') }}</span>
        </span>
      </NuxtLink>

      <!-- Labels stay until the search input has already folded away at `xl`. -->
      <nav class="hidden items-center gap-1 lg:flex" :aria-label="t('nav.main')">
        <UButton
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :icon="link.icon"
          :label="t(link.key)"
          :aria-label="t(link.key)"
          color="neutral"
          variant="ghost"
          size="sm"
          class="shrink-0"
        />
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
        <!-- Input from `xl`; below that the same search stays available as its icon button. -->
        <SiteSearch />
        <!-- Below lg the AI prompt, language, theme, and GitHub buttons live in the menu panel. -->
        <div class="hidden lg:block">
          <AiPromptButton />
        </div>
        <!-- Hover opens the language menu; the original-name switch lives inside it. -->
        <UPopover
          v-model:open="languageOpen"
          class="hidden lg:inline-flex"
          :content="{ align: 'end', sideOffset: 8, collisionPadding: 8 }"
        >
          <UButton
            data-language-surface
            icon="i-lucide-languages"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('nav.language')"
            aria-haspopup="menu"
            :aria-expanded="languageOpen"
            @mouseenter="openLanguages"
            @mouseleave="closeLanguagesSoon"
            @focus="openLanguages"
            @click="languageOpen = !languageOpen"
          />
          <template #content>
            <div
              data-language-surface
              class="flex w-52 flex-col gap-1 p-1.5"
              @mouseenter="openLanguages"
              @mouseleave="closeLanguagesSoon"
            >
              <UButton
                v-for="item in languageItems"
                :key="item.value"
                color="neutral"
                :variant="item.value === locale ? 'soft' : 'ghost'"
                size="sm"
                class="justify-between"
                :label="item.label"
                :trailing-icon="item.value === locale ? 'i-lucide-check' : undefined"
                @click="pickLanguage(item.value)"
              />
              <div class="mt-1 flex items-center justify-between gap-3 border-t border-default px-2 pt-2 pb-1">
                <span
                  class="text-xs whitespace-nowrap"
                  :class="originalTitleDisabled ? 'text-dimmed' : 'text-muted'"
                >{{ t('nav.showOriginalTitle') }}</span>
                <USwitch
                  :model-value="originalTitleShown"
                  :disabled="originalTitleDisabled"
                  size="sm"
                  :aria-label="t('nav.showOriginalTitle')"
                  @update:model-value="toggleOriginalTitle"
                />
              </div>
            </div>
          </template>
        </UPopover>
        <div class="hidden lg:block">
          <UColorModeButton color="neutral" variant="ghost" size="sm" />
        </div>
        <div class="hidden lg:block">
          <UTooltip :text="t('nav.github')">
            <UButton
              to="https://github.com/RJiazhen/miku-concert-stats"
              target="_blank"
              rel="noopener noreferrer"
              icon="i-tabler:brand-github"
              color="neutral"
              variant="ghost"
              size="sm"
              :aria-label="t('nav.githubNewWindow')"
            />
          </UTooltip>
        </div>
        <!-- Far right below lg: the folded navigation plus every utility that left the row. -->
        <UButton
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          size="sm"
          class="shrink-0 lg:hidden"
          :aria-label="t('nav.open')"
          aria-haspopup="dialog"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        />
      </div>
    </div>
  </header>

  <!-- Below lg the panel and the header together fill the viewport: the sheet covers even the
       header area, so no page content shows through its translucent background. It is a sibling
       of `<header>` rather than a child, because the header's `backdrop-filter` would otherwise
       re-anchor `position: fixed` to the header box. -->
  <div
    v-if="menuOpen"
    class="fixed inset-0 z-30 bg-default lg:hidden"
    role="dialog"
    aria-modal="true"
    :aria-label="t('nav.open')"
  >
    <div class="mx-auto h-full max-w-6xl overflow-y-auto px-4 pt-16 pb-6 sm:px-6">
      <div class="flex flex-col gap-0.5">
          <UButton
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            :icon="link.icon"
            :label="t(link.key)"
            color="neutral"
            variant="ghost"
            size="md"
            class="justify-start"
            @click="closeMenu"
          />
          <div class="mt-1 flex flex-col gap-0.5 border-t border-default pt-1">
            <p class="px-2.5 pt-1 pb-0.5 text-[11px] tracking-wide text-muted uppercase">{{ t('nav.language') }}</p>
            <UButton
              v-for="item in languageItems"
              :key="`menu:${item.value}`"
              color="neutral"
              :variant="item.value === locale ? 'soft' : 'ghost'"
              size="md"
              class="justify-between"
              :label="item.label"
              :trailing-icon="item.value === locale ? 'i-lucide-check' : undefined"
              @click="pickLanguage(item.value)"
            />
          </div>
          <div class="mt-1 flex flex-col gap-0.5 border-t border-default pt-1">
            <label
              class="flex items-center justify-between gap-3 px-2.5 py-2 whitespace-nowrap"
            >
              <span class="text-sm" :class="originalTitleDisabled ? 'text-dimmed' : 'text-muted'">
                {{ t('nav.showOriginalTitle') }}
              </span>
              <USwitch
                :model-value="originalTitleShown"
                :disabled="originalTitleDisabled"
                :aria-label="t('nav.showOriginalTitle')"
                size="sm"
                @update:model-value="toggleOriginalTitle"
              />
            </label>
          </div>
          <!-- Appearance: label on the left, a themed switch whose thumb shows sun or moon. -->
          <div class="mt-1 flex flex-col gap-0.5 border-t border-default pt-1">
            <label class="flex items-center justify-between gap-3 px-2.5 py-2 whitespace-nowrap">
              <span class="text-sm text-muted">{{ t('nav.appearance') }}</span>
              <USwitch
                :model-value="isDark"
                checked-icon="i-tabler:moon-filled"
                unchecked-icon="i-tabler:sun-filled"
                :aria-label="t('nav.appearance')"
                size="sm"
                @update:model-value="setDark"
              />
            </label>
          </div>
          <!-- AI prompt on its own full-width row, then the GitHub icon centred below. -->
          <div class="mt-1 flex flex-col gap-0.5 border-t border-default pt-1">
            <UButton
              icon="i-tabler:ai"
              :label="t('ai.copyPrompt')"
              color="neutral"
              variant="ghost"
              size="md"
              class="justify-start"
              @click="copyAiPrompt"
            />
          </div>
          <div class="mt-1 flex items-center justify-center border-t border-default pt-1.5">
            <UTooltip :text="t('nav.github')">
              <UButton
                to="https://github.com/RJiazhen/miku-concert-stats"
                target="_blank"
                rel="noopener noreferrer"
                icon="i-tabler:brand-github"
                color="neutral"
                variant="ghost"
                size="md"
                :aria-label="t('nav.githubNewWindow')"
              />
            </UTooltip>
          </div>
      </div>
    </div>
  </div>
</template>
