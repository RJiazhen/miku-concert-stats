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

/**
 * True when the pointer can hover. Language opens on hover only then; touch / coarse
 * pointers keep click-to-open so the menu does not flash open on a tap.
 */
const HOVER_OPEN_QUERY = '(hover: hover) and (pointer: fine)'

/** Whether hover-open menus are allowed on this device. */
const hoverOpenMenus = ref(false)

let hoverOpenQuery: MediaQueryList | null = null

/** Syncs hover-open capability when the pointer media query changes. */
const syncHoverOpen = (): void => {
  hoverOpenMenus.value = hoverOpenQuery?.matches === true
}

/** Starts listening for hover-capable pointer changes. */
const startHoverOpenTracking = (): void => {
  hoverOpenQuery = window.matchMedia(HOVER_OPEN_QUERY)
  hoverOpenMenus.value = hoverOpenQuery.matches
  hoverOpenQuery.addEventListener('change', syncHoverOpen)
}

/** Releases the hover-capability listener. */
const stopHoverOpenTracking = (): void => {
  hoverOpenQuery?.removeEventListener('change', syncHoverOpen)
  hoverOpenQuery = null
}

/** Whether the language popover is open. */
const languageOpen = ref(false)

/** Pending close for the language popover, so crossing the gap into the panel never closes it. */
let languageCloseTimer: ReturnType<typeof setTimeout> | undefined

/** Opens the language popover on hover-capable devices and cancels a scheduled close. */
const openLanguage = (): void => {
  if (!hoverOpenMenus.value) return
  if (languageCloseTimer !== undefined) {
    clearTimeout(languageCloseTimer)
    languageCloseTimer = undefined
  }
  languageOpen.value = true
}

/** Closes the language popover after a short delay on hover-capable devices. */
const closeLanguageSoon = (): void => {
  if (!hoverOpenMenus.value) return
  if (languageCloseTimer !== undefined) clearTimeout(languageCloseTimer)
  languageCloseTimer = setTimeout(() => {
    languageOpen.value = false
    languageCloseTimer = undefined
  }, 180)
}

/** Cancels a pending language close when the header unmounts. */
const stopLanguageCloseTimer = (): void => {
  if (languageCloseTimer === undefined) return
  clearTimeout(languageCloseTimer)
  languageCloseTimer = undefined
}

/** Whether the compact navigation panel is open. */
const menuOpen = ref(false)

/** Hover-open state of the desktop "more" navigation popover. */
const moreOpen = ref(false)

/** Pending close for the "more" popover, so crossing the gap into the panel never closes it. */
let moreCloseTimer: ReturnType<typeof setTimeout> | undefined

/** Opens the "more" popover and cancels a scheduled close. */
const openMore = (): void => {
  if (moreCloseTimer !== undefined) {
    clearTimeout(moreCloseTimer)
    moreCloseTimer = undefined
  }
  moreOpen.value = true
}

/** Closes the "more" popover after a short delay, long enough to reach the panel. */
const closeMoreSoon = (): void => {
  if (moreCloseTimer !== undefined) clearTimeout(moreCloseTimer)
  moreCloseTimer = setTimeout(() => {
    moreOpen.value = false
    moreCloseTimer = undefined
  }, 180)
}

/** Cancels a pending "more" close when the header unmounts. */
const stopMoreCloseTimer = (): void => {
  if (moreCloseTimer === undefined) return
  clearTimeout(moreCloseTimer)
  moreCloseTimer = undefined
}

/** Picks a language and closes whichever menu opened the choice. */
const pickLanguage = (next: Locale): void => {
  setLocale(next)
  languageOpen.value = false
  menuOpen.value = false
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

/** Closes every open menu, used by the Escape key. */
const closeMenus = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape') return
  menuOpen.value = false
  moreOpen.value = false
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
  startHoverOpenTracking()
  window.addEventListener('keydown', closeMenus)
})
onUnmounted(() => {
  stopWideTracking()
  stopHoverOpenTracking()
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
 * The first `PRIMARY_LINK_COUNT` entries stay visible on the desktop row; the rest fold into the
 * hover-opened "more" menu. The compact panel below `lg` still lists every entry.
 */
const links = [
  { key: 'nav.songs', to: '/', icon: 'i-lucide-music' },
  { key: 'nav.producers', to: '/producers', icon: 'i-lucide-user-round' },
  { key: 'nav.timeline', to: '/timeline', icon: 'i-lucide-chart-line' },
  { key: 'nav.series', to: '/series', icon: 'i-lucide-layers' },
  { key: 'nav.cities', to: '/cities', icon: 'i-lucide-map-pin' },
] as const

/** How many leading links stay on the desktop row before the rest move into the "more" menu. */
const PRIMARY_LINK_COUNT = 3

/** Links always visible on the desktop navigation row. */
const primaryLinks = links.slice(0, PRIMARY_LINK_COUNT)

/** Links hidden in the desktop "more" popover until the pointer or focus reaches it. */
const overflowLinks = links.slice(PRIMARY_LINK_COUNT)

onBeforeUnmount(() => {
  stopMoreCloseTimer()
  stopLanguageCloseTimer()
})
</script>

<template>
  <!-- One row at every width: nothing wraps, and narrow screens fold items away instead. -->
  <header class="glass-header sticky top-0 z-40">
    <div class="mx-auto flex max-w-chrome items-center gap-x-2 px-4 py-3 sm:gap-x-4 sm:px-6">
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
          v-for="link in primaryLinks"
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
        <!--
          Hover opens the panel; a click pins or unpins it for keyboard and touch use.
          Deliberately no `@focus` and no `mode="hover"`: Reka's `onCloseAutoFocus` moves focus
          back to the trigger on close, so a focus-opened panel reopens right after it closes
          (the pointer is already gone, so nothing would close it again).
        -->
        <UPopover
          v-model:open="moreOpen"
          :content="{ align: 'start', sideOffset: 6, collisionPadding: 8 }"
        >
          <UButton
            icon="i-lucide-ellipsis"
            :label="t('nav.more')"
            color="neutral"
            variant="ghost"
            size="sm"
            class="shrink-0"
            :aria-label="t('nav.more')"
            aria-haspopup="menu"
            :aria-expanded="moreOpen"
            @mouseenter="openMore"
            @mouseleave="closeMoreSoon"
            @click="moreOpen = !moreOpen"
          />
          <template #content>
            <div
              class="flex w-44 flex-col gap-1 p-1.5"
              @mouseenter="openMore"
              @mouseleave="closeMoreSoon"
            >
              <UButton
                v-for="link in overflowLinks"
                :key="link.to"
                :to="link.to"
                :icon="link.icon"
                :label="t(link.key)"
                color="neutral"
                variant="ghost"
                size="sm"
                class="justify-start"
                @click="moreOpen = false"
              />
            </div>
          </template>
        </UPopover>
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
        <!-- Input from `xl`; below that the same search stays available as its icon button. -->
        <SiteSearch />
        <!-- Below lg the AI prompt, theme, and GitHub buttons live in the menu panel; language stays on the row. -->
        <div class="hidden lg:block">
          <AiPromptButton />
        </div>
        <!--
          Icon-only language trigger sits left of the theme button. Hover opens on fine pointers;
          touch keeps click-to-open. No focus-open: Reka restores focus to the trigger on close,
          which would reopen the panel after a choice.
        -->
        <UPopover
          v-model:open="languageOpen"
          :content="{ align: 'end', sideOffset: 8, collisionPadding: 8 }"
        >
          <UButton
            icon="i-lucide-languages"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('nav.language')"
            aria-haspopup="menu"
            :aria-expanded="languageOpen"
            @mouseenter="openLanguage"
            @mouseleave="closeLanguageSoon"
          />
          <template #content>
            <div
              class="flex w-52 flex-col gap-1 p-1.5"
              @mouseenter="openLanguage"
              @mouseleave="closeLanguageSoon"
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
    <div class="mx-auto h-full max-w-chrome overflow-y-auto px-4 pt-16 pb-6 sm:px-6">
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
