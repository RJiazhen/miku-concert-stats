<script setup lang="ts">
import { computed } from 'vue'
import type { SearchSection as SearchSectionData } from '~/composables/useSearchHits.ts'
import { searchPagePath } from '~/composables/useSearchHits.ts'

const props = defineProps<{
  /** Query as typed; the footer link keeps it. */
  query: string
  /** Non-empty result types, already capped and localized. */
  sections: SearchSectionData[]
  /** Catalog still downloading. */
  loading: boolean
  /** Catalog load failure message, printed instead of an empty state. */
  error: string | null
}>()

const emit = defineEmits<{
  /** A row or the footer link was opened, so the panel can close. */
  select: []
}>()

/** Query trimmed, so a whitespace-only box never produces a `/search?q=` link. */
const trimmed = computed(() => props.query.trim())

/** Footer label: name the real song count when the cap hid part of the list. */
const moreLabel = computed(() => {
  const songs = props.sections.find((section) => section.key === 'songs')
  if (songs && songs.truncated) return `查看全部 ${songs.total} 首`
  return '查看全部结果'
})
</script>

<template>
  <div class="max-h-[60vh] overflow-y-auto p-2 text-sm">
    <div v-if="loading" class="space-y-2 px-2 py-1">
      <USkeleton class="h-3 w-1/3" />
      <USkeleton class="h-8 w-full" />
      <USkeleton class="h-8 w-full" />
      <USkeleton class="h-3 w-1/4" />
      <USkeleton class="h-8 w-full" />
    </div>
    <p v-else-if="error" class="px-2 py-3 text-xs text-error">目录加载失败：{{ error }}</p>
    <template v-else-if="sections.length > 0">
      <SearchSection
        v-for="section in sections"
        :key="section.key"
        :section="section"
        variant="panel"
        :query="query"
        @select="emit('select')"
      />
      <NuxtLink
        :to="searchPagePath(trimmed)"
        class="mt-1 block px-2 py-1.5 text-xs text-primary no-underline hover:underline"
        @click="emit('select')"
      >{{ moreLabel }}</NuxtLink>
    </template>
    <p v-else class="px-2 py-3 text-xs text-muted">没有找到，试试更短的名称。</p>
  </div>
</template>
