<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useCatalog } from '~/composables/useCatalog.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { performanceSchedules } from '~~/shared/event-schedule.ts'
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

const seriesId = computed(() => Number(route.params.seriesId))
const seriesNumber = computed(() => Number(route.params.number))

const series = computed(() => catalog.value?.series.find((row) => row.id === seriesId.value) ?? null)

/** Series name in the site language, with the catalog spelling kept as a note when translated. */
const seriesView = computed(() =>
  series.value ? seriesTitle(series.value.name) : { primary: String(seriesId.value), originalNote: null },
)

/** One 演出 name with its series and place in the site language. */
const performanceLabel = (performance: PerformanceRow): string => {
  return localizePlace(localizePerformanceSeries(performance.name, series.value?.name ?? '', performance.series_number))
}

/** 演出 of this series year, earliest first; one row per city stop. */
const performances = computed(() => {
  if (!Number.isInteger(seriesId.value) || !Number.isInteger(seriesNumber.value)) return []
  const rows = catalog.value?.performances.filter((row) => row.series_id === seriesId.value && row.series_number === seriesNumber.value) ?? []
  return [...rows].sort((left, right) => (left.start_date ?? '').localeCompare(right.start_date ?? '') || left.id - right.id)
})

const review = computed(() => (catalog.value ? reviewRotations(catalog.value) : null))

/** 场次 per 演出, including day/night halves proved by the setlist notes. */
const schedules = computed(() => {
  if (!catalog.value || !review.value) return null
  return performanceSchedules(catalog.value, review.value)
})

/** One row per 演出 with the facts the index prints. */
const entries = computed(() =>
  performances.value.map((performance) => ({
    performance,
    label: performanceLabel(performance),
    dates: performanceHeaderFacts(performance).dates,
    venue: performance.venue_name,
    showCount: schedules.value?.get(performance.id)?.length ?? 0,
  })),
)

/** 场次 across every 演出 of this series year. */
const totalShows = computed(() => entries.value.reduce((sum, entry) => sum + entry.showCount, 0))

/** First 演出 of this series year, from `edition_premieres`. */
const premiere = computed(() => {
  if (!catalog.value) return null
  return catalog.value.premieres.find((row) => row.series_id === seriesId.value && row.series_number === seriesNumber.value) ?? null
})
</script>

<template>
  <main class="space-y-6">
    <p v-if="pending" class="text-sm text-muted">正在浏览器中加载目录…</p>
    <UAlert v-else-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />

    <template v-else-if="catalog">
      <UBreadcrumb :items="[{ label: '排行', to: '/' }, { label: '演出列表' }, { label: `${seriesView.primary} ${seriesNumber}` }]" />

      <header class="space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">
          {{ seriesView.primary }} {{ seriesNumber }}
        </h1>
        <p v-if="seriesView.originalNote" class="text-xs text-muted">{{ seriesView.originalNote }}</p>
        <p class="text-sm text-muted">
          系列年度的演出列表 · {{ entries.length }} 个演出 · {{ totalShows }} 个场次
          <template v-if="premiere">· 年度首演 {{ premiere.premiere_date }}</template>
        </p>
        <p class="text-xs text-muted">
          每个演出是一个城市站（VocaDB release event），点进单独的演出页查看歌单；场次按天计，同一天有日场 / 夜场时分别计算。
          日期、场馆与歌单都来自 VocaDB。
        </p>
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
                <template v-if="entry.performance.song_list_id === null">· 无歌单</template>
              </p>
            </div>
            <ULink
              :to="entry.performance.source_url"
              target="_blank"
              class="text-xs text-dimmed hover:text-primary"
              aria-label="在 VocaDB 查看这个演出"
            >
              演出 {{ entry.performance.id }}
            </ULink>
          </li>
          <li v-if="entries.length === 0" class="py-3 text-sm text-muted">这个系列年度没有演出记录。</li>
        </ul>
      </UCard>
    </template>
  </main>
</template>
