<script setup lang="ts">
const { showChinese } = useSongLanguage()

/** Whether the compact navigation panel is open below the `sm` breakpoint. */
const menuOpen = ref(false)

/** Closes the compact navigation panel after the visitor picks a destination. */
const closeMenu = (): void => {
  menuOpen.value = false
}

/**
 * Primary navigation; retired sections stay out until they have data.
 * The admin backend (`/admin/...`) is intentionally absent: it is a hidden entry point reached
 * only by direct URL and protected by Cloudflare Access, so never add it here or to the footer.
 */
const links = [
  { label: '歌曲', to: '/', icon: 'i-lucide-music' },
  { label: '系列', to: '/series', icon: 'i-lucide-layers' },
  { label: '城市', to: '/cities', icon: 'i-lucide-map-pin' },
  { label: '原始数据', to: '/raw', icon: 'i-lucide-table-2' },
]
</script>

<template>
  <!-- One row at every width: no wrapping, and only the nav moves into the menu below sm. -->
  <header class="glass-header sticky top-0 z-40">
    <div class="mx-auto flex max-w-6xl items-center gap-x-2 px-4 py-3 sm:gap-x-4 sm:px-6">
      <NuxtLink to="/" class="group flex min-w-0 items-center gap-2.5 text-inherit no-underline">
        <img
          src="/logo.png"
          alt="初音未来演唱会曲目统计"
          width="32"
          height="32"
          class="size-8 shrink-0 rounded-lg ring-1 ring-black/10 dark:ring-white/15"
        >
        <span class="min-w-0 leading-tight">
          <span class="block truncate text-sm font-semibold tracking-tight">初音未来演唱会</span>
          <span class="block truncate text-[11px] text-muted">曲目统计</span>
        </span>
      </NuxtLink>

      <nav class="hidden items-center gap-1 sm:flex" aria-label="主导航">
        <UButton
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :icon="link.icon"
          :label="link.label"
          color="neutral"
          variant="ghost"
          size="sm"
          class="shrink-0"
        />
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
        <SiteSearch />
        <label class="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <USwitch v-model="showChinese" aria-label="显示中文名称" size="sm" />
          <span class="hidden lg:inline">中文名称</span>
        </label>
        <UColorModeButton color="neutral" variant="ghost" size="sm" />
        <!-- Below sm the primary navigation collapses into this panel. -->
        <UPopover v-model:open="menuOpen" :content="{ align: 'end' }">
          <UButton
            icon="i-lucide-menu"
            color="neutral"
            variant="ghost"
            size="sm"
            class="sm:hidden"
            aria-label="打开导航"
            aria-haspopup="dialog"
            :aria-expanded="menuOpen"
          />
          <template #content>
            <div class="flex w-44 flex-col gap-1 p-1">
              <UButton
                v-for="link in links"
                :key="link.to"
                :to="link.to"
                :icon="link.icon"
                :label="link.label"
                color="neutral"
                variant="ghost"
                size="sm"
                class="justify-start"
                @click="closeMenu"
              />
            </div>
          </template>
        </UPopover>
      </div>
    </div>
  </header>
</template>
