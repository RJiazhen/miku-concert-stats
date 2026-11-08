<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useCatalog } from '~/composables/useCatalog.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { useLocale } from '~/composables/useLocale.ts'
import { useVenueNames } from '~/composables/useVenueNames.ts'
import { setlistPerformanceIds, showCountsByPerformance } from '~~/shared/performance-setlists.ts'
import { performanceHeaderFacts } from '~~/shared/performance-header.ts'
import { reviewRotations } from '~~/shared/rotation.ts'
import type { PerformanceRow } from '~~/shared/types.ts'

const route = useRoute()
const { catalog, error, pending, load } = useCatalog()
const { localizePlace } = usePlaceNames()
const { localizeVenue } = useVenueNames()
const { localizePerformanceSeries, seriesTitle } = useSeriesTitles()
const { t } = useLocale()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const seriesId = computed(() => Number(route.params.id))
const series = computed(() => catalog.value?.series.find((row) => row.id === seriesId.value) ?? null)

/** Series name in the site language; the id stands in when the catalog has no row. */
const seriesView = computed(() =>
  series.value ? seriesTitle(series.value.name) : { primary: t('series.seriesFallback', { id: seriesId.value }), originalNote: null },
)

/** Source button label: a local series points at its own site, not at a VocaDB series page. */
const seriesSourceLabel = computed(() =>
  (series.value?.source_url ?? '').startsWith('https://vocadb.net/') ? 'VocaDB' : t('common.source'),
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
    venue: localizeVenue(performance.venue_name),
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

useHead({ title: computed(() => seriesView.value.primary) })
</script>

<template>
  <main class="space-y-6">
    <p v-if="pending" class="text-sm text-muted">{{ t('common.loadingCatalog') }}</p>
    <UAlert v-else-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UEmpty
      v-else-if="catalog && series === null"
      icon="i-lucide-list-x"
      :title="t('series.pageNotFound')"
      :description="t('common.notFoundId')"
    />

    <template v-else-if="series">
      <header class="space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">{{ seriesView.primary }}</h1>
        <p v-if="seriesView.originalNote" class="text-xs text-muted">{{ seriesView.originalNote }}</p>
        <p class="text-sm text-muted">
          {{ t('series.pageSummary', { performances: performances.length, shows: totalShows }) }}
          <template v-if="yearRange">· {{ yearRange }}</template>
        </p>
        <div class="flex flex-wrap gap-2 text-xs">
          <UButton to="/series" color="neutral" variant="link" size="xs" icon="i-lucide-layers">
            {{ t('series.allSeries') }}
          </UButton>
          <UButton :to="series.source_url" target="_blank" color="neutral" variant="outline" size="xs" icon="i-lucide-external-link">
            {{ seriesSourceLabel }}
          </UButton>
        </div>
      </header>

      <UCard>
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">{{ t('series.performancesHeading') }}</h2>
        </template>
        <ul class="divide-y divide-default/40">
          <li v-for="entry in entries" :key="entry.performance.id" class="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div class="min-w-0 space-y-1">
              <NuxtLink :to="`/shows/${entry.performance.id}`" class="text-primary hover:underline">
                {{ entry.label }}
              </NuxtLink>
              <p class="text-xs text-muted">
                {{ entry.dates ?? t('common.unknownDate') }}
                <template v-if="entry.venue">· {{ entry.venue }}</template>
                {{ t('series.showCountLine', { n: entry.showCount }) }}
                <template v-if="!entry.hasSetlist">{{ t('series.noSetlistLine') }}</template>
              </p>
            </div>
            <ULink
              :to="entry.performance.source_url"
              target="_blank"
              class="text-xs text-dimmed hover:text-primary"
              :aria-label="t('series.sourcePage')"
              :title="t('series.sourcePage')"
            >
              <UIcon name="i-lucide-external-link" class="size-4" />
            </ULink>
          </li>
          <li v-if="entries.length === 0" class="py-3 text-sm text-muted">{{ t('series.noPerformances') }}</li>
        </ul>
      </UCard>
    </template>
  </main>
</template>
