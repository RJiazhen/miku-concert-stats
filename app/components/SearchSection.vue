<script setup lang="ts">
import { computed } from 'vue'
import type { SearchRow, SearchSection as SearchSectionData } from '~/composables/useSearchHits.ts'

const props = withDefaults(defineProps<{
  /** One non-empty result type with its real total. */
  section: SearchSectionData
  /** Panel uses compact headings; the results page uses section headings. */
  variant?: 'panel' | 'page'
  /** Rows to print now; defaults to every row the lookup returned. */
  rows?: SearchRow[]
  /** Whether to print the type's “查看全部” link. */
  showMore?: boolean
  /** Query the rows matched, forwarded so a song row can show the alias that hit. */
  query?: string
}>(), {
  variant: 'panel',
  rows: undefined,
  showMore: false,
  query: '',
})

const emit = defineEmits<{
  /** A row was opened. */
  select: []
  /** The visitor asked for another slice of the same section. */
  showMore: []
}>()

/** Rows printed now; the results page passes a growing slice. */
const visibleRows = computed(() => props.rows ?? props.section.rows)

/** Heading id, so the section is labelled by its own h2. */
const headingId = computed(() => `search-section-${props.section.key}`)
</script>

<template>
  <section class="min-w-0" :aria-labelledby="headingId">
    <h2
      :id="headingId"
      :class="variant === 'page' ? 'text-lg font-semibold text-highlighted' : 'px-2 py-1 text-[11px] tracking-wide text-muted uppercase'"
    >
      {{ section.label }}{{ variant === 'panel' ? ' 共' : '' }} {{ section.total }} {{ section.unit }}
      <span
        v-if="section.truncated"
        :class="variant === 'page' ? 'ml-1 text-sm font-normal text-muted' : 'normal-case'"
      >· 已显示前 {{ section.rows.length }} 条</span>
    </h2>
    <ul class="space-y-0.5">
      <li v-for="row in visibleRows" :key="row.key">
        <SearchHitRow :row="row" :query="props.query" @select="emit('select')" />
      </li>
    </ul>
    <div v-if="visibleRows.length < section.rows.length || showMore" class="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pt-1">
      <UButton
        v-if="visibleRows.length < section.rows.length"
        color="neutral"
        variant="link"
        size="xs"
        @click="emit('showMore')"
      >
        显示更多
      </UButton>
      <NuxtLink
        v-if="showMore"
        :to="section.moreTo"
        class="text-xs text-primary no-underline hover:underline"
      >查看全部 {{ section.total }} {{ section.unit }}</NuxtLink>
    </div>
  </section>
</template>
