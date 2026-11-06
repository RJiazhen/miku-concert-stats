<script setup lang="ts">
import { computed } from 'vue'
import { derivedItemsByShow, mergeShowSetlists, type MergedShowSetlistRow, type ShowSetlistPrintRow } from '~~/shared/performance-setlists.ts'
import type { Catalog, PerformanceSetlistRow, PerformanceShowSetlistItemRow, PerformanceShowSetlistRow } from '~~/shared/types.ts'

const props = defineProps<{
  catalog: Catalog
  performanceId: number
}>()

/** Derived 演出 row, or null when the catalog has no derived layer for this 演出. */
const setlist = computed<PerformanceSetlistRow | null>(
  () => props.catalog.performanceSetlists.find((row) => row.performance_id === props.performanceId) ?? null,
)

/** 场次 of this 演出, in calendar order. */
const shows = computed<PerformanceShowSetlistRow[]>(() =>
  props.catalog.performanceShowSetlists
    .filter((row) => row.performance_id === props.performanceId)
    .sort((left, right) => (left.date ?? '9999').localeCompare(right.date ?? '9999') || (left.half ?? '').localeCompare(right.half ?? '')),
)

/** Ordered rows of one 场次. */
const itemsOf = (showKey: string): PerformanceShowSetlistItemRow[] =>
  props.catalog.performanceShowSetlistItems
    .filter((row) => row.show_key === showKey)
    .sort((left, right) => left.position - right.position)

/** Chinese label of one 场次. */
const showLabel = (row: PerformanceShowSetlistRow): string => {
  const date = row.date ?? '日期未知'
  if (row.half === 'day') return `${date} 日场`
  if (row.half === 'night') return `${date} 夜场`
  return date
}

/** Label of every 场次 in calendar order, shared by the merged header and its table. */
const showLabels = computed<string[]>(() => shows.value.map(showLabel))

/** Printed rows of one 场次, used when the shows cannot share one table. */
const rowsOf = (show: PerformanceShowSetlistRow): ShowSetlistPrintRow[] =>
  itemsOf(show.show_key).map((item) => ({ item }))

/** One merged programme for the whole 演出, or null when the shows must stay separate. */
const mergedRows = computed<MergedShowSetlistRow[] | null>(() => {
  if (shows.value.length < 2) return null
  const merged = mergeShowSetlists(shows.value, derivedItemsByShow(props.catalog, props.performanceId))
  return merged?.mergeable === true ? merged.rows : null
})

/** Song count summary of the whole 演出. */
const lengthSummary = computed<string>(() => {
  const counts = [...new Set(shows.value.map((row) => row.item_count))]
  if (counts.length === 0) return '无歌单'
  if (counts.length === 1) return `每场 ${counts[0]} 首`
  return `每场 ${counts.join(' / ')} 首`
})
</script>

<template>
  <section class="space-y-4">
    <UAlert
      v-if="!setlist || shows.length === 0"
      color="warning"
      variant="subtle"
      icon="i-lucide-info"
      title="这个演出还没有派生的场次歌单"
      description="目录里没有该演出的场次级数据，无法列出曲目。"
    />
    <template v-else>
      <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
        <UBadge color="neutral" variant="subtle" size="sm">{{ shows.length }} 个场次</UBadge>
        <UBadge color="neutral" variant="subtle" size="sm">{{ lengthSummary }}</UBadge>
      </div>

      <div v-if="mergedRows" class="space-y-2">
        <header class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-base font-semibold text-highlighted">合并歌单</h2>
          <p class="text-xs text-muted">{{ showLabels.join('、') }}</p>
        </header>
        <ShowSetlistTable :catalog="catalog" :rows="mergedRows" :show-labels="showLabels" />
      </div>

      <div v-else class="space-y-4">
        <div v-for="show in shows" :key="show.show_key" class="space-y-2">
          <header class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="text-base font-semibold text-highlighted">{{ showLabel(show) }}</h2>
            <p class="text-xs text-muted">{{ show.item_count }} 首</p>
          </header>
          <ShowSetlistTable :catalog="catalog" :rows="rowsOf(show)" />
        </div>
      </div>
    </template>
  </section>
</template>
