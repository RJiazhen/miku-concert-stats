<script setup lang="ts">
import { computed } from 'vue'
import { derivedItemsByShow, mergeShowSetlists, type ShowSetlistPrintRow } from '~~/shared/performance-setlists.ts'
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

/** Printed rows of one 场次, used when the shows cannot share one table. */
const rowsOf = (show: PerformanceShowSetlistRow): ShowSetlistPrintRow[] =>
  itemsOf(show.show_key).map((item) => ({ position: item.position, items: [{ item }] }))

/** The only 場次 when the 演出 has exactly one, printed without its date because the header shows it. */
const singleShow = computed<PerformanceShowSetlistRow | null>(() => {
  if (shows.value.length !== 1) return null
  return shows.value[0] ?? null
})

/** Printed rows of that 場次. */
const singleShowRows = computed<ShowSetlistPrintRow[]>(() => (singleShow.value === null ? [] : rowsOf(singleShow.value)))

/** One merged programme for the whole 演出, or null when the shows must stay separate. */
const mergedRows = computed<ShowSetlistPrintRow[] | null>(() => {
  if (shows.value.length < 2) return null
  const merged = mergeShowSetlists(shows.value, derivedItemsByShow(props.catalog, props.performanceId))
  return merged?.mergeable === true ? merged.rows : null
})

/** Song count summary of the whole 演出. */
const lengthSummary = computed<string>(() => {
  const counts = [...new Set(shows.value.map((row) => row.item_count))]
  if (counts.length === 0) return '无歌单'
  if (counts.length === 1) return `每场 ${counts[0]} 首`
  return `各场 ${counts.join(' / ')} 首`
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
      <!-- 场次日期与数量已经写在页头，这里不再重复列出。 -->
      <ShowSetlistTable
        v-if="mergedRows"
        :catalog="catalog"
        :rows="mergedRows"
        :shows="shows"
        title="合并歌单"
        :count="lengthSummary"
      />

      <!-- 只有一个场次时，页头已经写明日期，表格标题只写「歌单」。 -->
      <ShowSetlistTable
        v-else-if="singleShow"
        :catalog="catalog"
        :rows="singleShowRows"
        title="歌单"
        :count="`${singleShow.item_count} 首`"
      />

      <template v-else>
        <ShowSetlistTable
          v-for="show in shows"
          :key="show.show_key"
          :catalog="catalog"
          :rows="rowsOf(show)"
          :title="showLabel(show)"
          :count="`${show.item_count} 首`"
        />
      </template>
    </template>
  </section>
</template>
