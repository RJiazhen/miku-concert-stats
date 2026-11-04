<script setup lang="ts">
const { showChinese } = useSongLanguage()

/** Primary navigation; retired sections stay out until they have data. */
const links = [
  { label: '排行', to: '/', icon: 'i-lucide-trophy' },
  { label: '原始数据', to: '/raw', icon: 'i-lucide-table-2' },
  { label: '核验', to: '/report', icon: 'i-lucide-list-checks' },
]
</script>

<template>
  <header class="glass-header sticky top-0 z-40">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
      <NuxtLink to="/" class="group flex items-center gap-2.5 text-inherit no-underline">
        <span class="grid size-9 place-items-center rounded-xl bg-linear-to-br from-miku-400 to-magenta-500 text-sm font-bold text-neutral-950 shadow-lg shadow-miku-500/20">
          MI
        </span>
        <span class="leading-tight">
          <span class="block text-sm font-semibold tracking-tight">初音未来演唱会</span>
          <span class="block text-[11px] text-muted">曲目统计</span>
        </span>
      </NuxtLink>

      <nav class="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-2 sm:w-auto" aria-label="主导航">
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

      <div class="order-2 ml-auto flex items-center gap-3 sm:order-3">
        <SiteSearch />
        <label class="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <USwitch v-model="showChinese" aria-label="显示中文名称" size="sm" />
          <span class="hidden lg:inline">中文名称</span>
        </label>
        <UColorModeButton color="neutral" variant="ghost" size="sm" />
      </div>
    </div>
  </header>
</template>
