<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useCatalog } from '~/composables/useCatalog.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { setlistPerformanceIds, showCountsByPerformance } from '~~/shared/performance-setlists.ts'
import { performanceHeaderFacts } from '~~/shared/performance-header.ts'
import { reviewRotations } from '~~/shared/rotation.ts'
import type { PerformanceRow } from '~~/shared/types.ts'

const route = useRoute()
const { catalog, error, pending, load } = useCatalog()
const { localizePlace } = usePlaceNames()
const { localizePerformanceSeries, seriesTitle } = useSeriesTitles()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const seriesId = computed(() => Number(route.params.id))
const series = computed(() => catalog.value?.series.find((row) => row.id === seriesId.value) ?? null)

/** Series name in the site language; the id stands in when the catalog has no row. */
const seriesView = computed(() =>
  series.value ? seriesTitle(series.value.name) : { primary: `系列 ${seriesId.value}`, originalNote: null },
)

/** 演出 name with its series label and place in the site language. */
const performanceLabel = (performance: PerformanceRow): string => {
  return localizePlace(localizePerformanceSeries(performance.name, series.value?.name ?? '', performance.series_number))
}

const review = computed(() => (catalog.value ? reviewRotations(catalog.value) : null))

/** 场次 count per 演出: the derived layer first, then the note-derived schedule for the rest. */
const showCounts = computed(() => {
  if (!catalog.value || !review.value) return new Map<number, number>()
  return showCountsByPerformance(catalog.value, review.value)
})

/** 演出 ids that have a setlist, including a wiki-sourced one with no `song_list_id`. */
const setlistIds = computed(() => (catalog.value ? setlistPerformanceIds(catalog.value) : new Set<number>()))

/** 演出 of this series, newest first; one row per city stop. */
const performances = computed(() => {
  const rows = catalog.value?.performances.filter((row) => row.series_id === seriesId.value) ?? []
  return [...rows].sort((left, right) => (right.start_date ?? '').localeCompare(left.start_date ?? '') || right.id - left.id)
})

/** One row per 演出 with the facts the page prints. */
const entries = computed(() =>
  performances.value.map((performance) => ({
    performance,
    label: performanceLabel(performance),
    dates: performanceHeaderFacts(performance).dates,
    venue: performance.venue_name,
    showCount: showCounts.value.get(performance.id) ?? 0,
    hasSetlist: setlistIds.value.has(performance.id),
  })),
)

/** 场次 across every 演出 of this series. */
const totalShows = computed(() => entries.value.reduce((sum, entry) => sum + entry.showCount, 0))

/** Year span of the series, e.g. `2013–2026`; null when no 演出 carries a year. */
const yearRange = computed(() => {
  const years = entries.value.flatMap((entry) => (entry.performance.series_number === null ? [] : [entry.performance.series_number]))
  if (years.length === 0) return null
  const first = Math.min(...years)
  const last = Math.max(...years)
  return first === last ? String(first) : `${first}–${last}`
})
</script>

<template>
  <main class="space-y-6">
    <p v-if="pending" class="text-sm text-muted">正在浏览器中加载目录…</p>
    <UAlert v-else-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UEmpty
      v-else-if="catalog && series === null"
      icon="i-lucide-list-x"
      title="找不到这个系列"
      description="这个 id 不在已提交的目录里。"
    />

    <template v-else-if="series">
      <header class="space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">{{ seriesView.primary }}</h1>
        <p v-if="seriesView.originalNote" class="text-xs text-muted">{{ seriesView.originalNote }}</p>
        <p class="text-sm text-muted">
          系列主页 · {{ performances.length }} 个演出 · {{ totalShows }} 个场次
          <template v-if="yearRange">· {{ yearRange }}</template>
        </p>
        <p class="text-xs text-muted">
          每个演出是一个城市站（VocaDB release event），点进演出查看歌单与场次；场次按天计，同一天有日场 / 夜场时分别计算。
        </p>
        <div class="flex flex-wrap gap-2 text-xs">
          <UButton to="/series" color="neutral" variant="link" size="xs" icon="i-lucide-layers">
            全部系列
          </UButton>
          <UButton :to="series.source_url" target="_blank" color="neutral" variant="outline" size="xs" icon="i-lucide-external-link">
            VocaDB 系列
          </UButton>
        </div>
      </header>

      <UCard>
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">演出（{{ entries.length }}）</h2>
        </template>
        <ul class="divide-y divide-default/40">
          <li v-for="entry in entries" :key="entry.performance.id" class="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div class="min-w-0 space-y-1">
              <NuxtLink :to="`/shows/${entry.performance.id}`" class="text-primary hover:underline">
                {{ entry.label }}
              </NuxtLink>
              <p class="text-xs text-muted">
                {{ entry.dates ?? '日期未知' }}
                <template v-if="entry.venue">· {{ entry.venue }}</template>
                · {{ entry.showCount }} 个场次
                <template v-if="!entry.hasSetlist">· 无歌单</template>
              </p>
            </div>
            <ULink
              :to="entry.performance.source_url"
              target="_blank"
              class="text-xs text-dimmed hover:text-primary"
              aria-label="查看这个演出的来源页面"
              title="查看这个演出的来源页面"
            >
              <UIcon name="i-lucide-external-link" class="size-4" />
            </ULink>
          </li>
          <li v-if="entries.length === 0" class="py-3 text-sm text-muted">这个系列没有演出记录。</li>
        </ul>
      </UCard>
    </template>
  </main>
</template>
