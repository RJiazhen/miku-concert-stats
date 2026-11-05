<script setup lang="ts">
import { computed } from 'vue'
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

/** Song count summary of the whole 演出. */
const lengthSummary = computed<string>(() => {
  const counts = [...new Set(shows.value.map((row) => row.item_count))]
  if (counts.length === 0) return '无歌单'
  if (counts.length === 1) return `每场 ${counts[0]} 首`
  return `每场 ${counts.join(' / ')} 首`
})

/** Sources cited for this 演出. */
const sources = computed(() => props.catalog.performanceSetlistSources.filter((row) => row.performance_id === props.performanceId))

/** Whether the attribution is still open, so a reader should not treat the rows as settled. */
const pendingReview = computed(() => setlist.value?.pending_review === 1)

/** Source with the lowest confidence, used for the badge that says how the rows were located. */
const bestConfidence = computed(() => {
  const order = { high: 0, medium: 1, low: 2 } as const
  const values = sources.value.map((row) => order[row.confidence])
  if (values.length === 0) return null
  return Object.entries(order).find(([, rank]) => rank === Math.max(...values))?.[0] ?? null
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
        <UBadge color="neutral" variant="subtle" size="sm">源歌单 {{ setlist.source_row_count }} 行</UBadge>
        <UBadge
          v-if="setlist.status === 'inherited'"
          color="info"
          variant="subtle"
          size="sm"
        >
          沿用整份共用歌单
        </UBadge>
        <UBadge v-if="pendingReview" color="warning" variant="subtle" size="sm">场次归属仍待核实</UBadge>
        <UBadge v-if="bestConfidence" color="neutral" variant="subtle" size="sm">
          来源置信度 {{ bestConfidence }}
        </UBadge>
        <UBadge v-if="setlist.conflict === 1" color="error" variant="subtle" size="sm">与既有结论存在冲突</UBadge>
        <ULink
          :to="`https://vocadb.net/L/${setlist.source_list_id}`"
          target="_blank"
          class="text-primary hover:underline"
        >
          查看 VocaDB 源歌单
        </ULink>
      </div>

      <UAlert
        v-if="setlist.status === 'inherited'"
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="本场沿用整份共用歌单"
        description="VocaDB 的这份歌单没有任何分场备注，因此每个演出都按整份曲目计算，没有逐场证据。"
      />
      <UAlert
        v-if="setlist.note"
        color="neutral"
        variant="subtle"
        icon="i-lucide-notebook-pen"
        :description="setlist.note"
      />

      <div v-for="show in shows" :key="show.show_key" class="space-y-2">
        <header class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-base font-semibold text-highlighted">{{ showLabel(show) }}</h2>
          <p class="text-xs text-muted">{{ show.item_count }} 首 · 省略 {{ show.omitted_count }} 行</p>
        </header>
        <ShowSetlistTable :catalog="catalog" :show="show" :items="itemsOf(show.show_key)" />
      </div>

      <div v-if="sources.length > 0" class="rounded-xl border border-default/60 p-3 text-xs text-muted">
        <p class="mb-1 font-medium text-highlighted">数据来源</p>
        <ul class="space-y-1">
          <li v-for="source in sources" :key="source.url">
            <ULink :to="source.url" target="_blank" class="text-primary hover:underline">{{ source.title }}</ULink>
            · {{ source.confidence }} · 访问于 {{ source.accessed_at }}
            <span v-if="source.conflict === 1" class="text-warning">· 与 VocaDB 冲突</span>
            <span v-if="source.note"> · {{ source.note }}</span>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
