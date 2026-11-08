<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useCatalog } from '~/composables/useCatalog.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { useSortableHeader } from '~/composables/useSortableHeader.ts'
import { useLocale } from '~/composables/useLocale.ts'
import { buildPerformanceOverview, buildSeriesOverview } from '~~/shared/overview.ts'
import { setlistPerformanceIds, showCountsByPerformance } from '~~/shared/performance-setlists.ts'
import { reviewRotations } from '~~/shared/rotation.ts'

const { catalog, error, pending, load } = useCatalog()
const { localizePlace } = usePlaceNames()
const { localizeSeries, localizePerformanceSeries, seriesTitle } = useSeriesTitles()
const { t } = useLocale()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const review = computed(() => (catalog.value ? reviewRotations(catalog.value) : null))

/** 场次 counts per 演出, including a day split into 日场 / 夜场 by the drawn-up schedule. */
const showCounts = computed(() => {
  if (!catalog.value || !review.value) return undefined
  return showCountsByPerformance(catalog.value, review.value)
})

/** 演出 ids that have a setlist, so a wiki-sourced stop is not badged 暂无歌单. */
const setlistIds = computed(() => (catalog.value ? setlistPerformanceIds(catalog.value) : undefined))

const seriesOverview = computed(() =>
  catalog.value ? buildSeriesOverview(catalog.value.series, catalog.value.performances, showCounts.value) : [],
)

const performanceOverview = computed(() =>
  catalog.value ? buildPerformanceOverview(catalog.value.performances, showCounts.value, setlistIds.value) : [],
)

/** Series lookup used to translate the series tag inside each 演出 name. */
const seriesById = computed(() => new Map((catalog.value?.series ?? []).map((row) => [row.id, row])))

/** Year span of one series, or null when it has no dated 演出. */
const yearSpan = (first: number | null, last: number | null): string | null => {
  if (first === null || last === null) return null
  return first === last ? String(first) : `${first}–${last}`
}

/** One row of the series table with the text the page prints. */
type SeriesView = {
  seriesId: number
  primary: string
  originalNote: string | null
  performances: number
  shows: number
  years: string | null
  firstDate: string | null
  lastDate: string | null
}

const seriesRows = computed<SeriesView[]>(() =>
  seriesOverview.value.map((row) => {
    const view = seriesTitle(row.name)
    return {
      seriesId: row.seriesId,
      primary: view.primary,
      originalNote: view.originalNote,
      performances: row.performances,
      shows: row.shows,
      years: yearSpan(row.firstYear, row.lastYear),
      firstDate: row.firstDate,
      lastDate: row.lastDate,
    }
  }),
)

/** One row of the 演出 table with its name and series in the site language. */
type PerformanceView = {
  id: number
  label: string
  seriesId: number
  seriesLabel: string
  dates: string | null
  year: number | null
  venue: string | null
  shows: number
  hasSetlist: boolean
}

const performanceRows = computed<PerformanceView[]>(() =>
  performanceOverview.value.map((row) => {
    const series = seriesById.value.get(row.seriesId)
    return {
      id: row.id,
      label: localizePlace(localizePerformanceSeries(row.name, series?.name ?? '', row.seriesNumber)),
      seriesId: row.seriesId,
      seriesLabel: series === undefined ? t('series.seriesFallback', { id: row.seriesId }) : localizeSeries(series.name),
      dates: row.dates,
      year: row.year,
      venue: row.venue,
      shows: row.shows,
      hasSetlist: row.hasSetlist,
    }
  }),
)

/** Selected series for the 演出 table; empty means 全部, matching the ranking and timeline filters. */
const selectedSeries = ref<number[]>([])

/** Place filter restored from `?place=`, used when a header-search place hit is opened. */
const route = useRoute()
const placeFilter = ref<string>(typeof route.query.place === 'string' ? route.query.place : '')

/** Filter options in the series table's default order, most 演出 first. */
const seriesItems = computed(() => {
  const ordered = [...seriesRows.value].sort(
    (left, right) => right.performances - left.performances || left.primary.localeCompare(right.primary, 'zh'),
  )
  return ordered.map((row) => ({ label: row.primary, value: row.seriesId }))
})

const filteredPerformances = computed(() => {
  let rows = performanceRows.value
  if (selectedSeries.value.length > 0) rows = rows.filter((row) => selectedSeries.value.includes(row.seriesId))
  if (placeFilter.value !== '') rows = rows.filter((row) => row.venue === placeFilter.value)
  return rows
})

/** Clears the place filter and drops it from the URL without adding a history entry. */
const clearPlaceFilter = (): void => {
  placeFilter.value = ''
  const query = { ...route.query }
  delete query.place
  void navigateTo({ query }, { replace: true })
}

/** Keeps the place filter in sync when another search hit or the back button changes `?place=`. */
watch(
  () => route.query.place,
  (value) => {
    placeFilter.value = typeof value === 'string' ? value : ''
  },
)

/** Catalog-wide sums printed next to the section titles. */
const totals = computed(() => {
  const years = seriesOverview.value.flatMap((row) => (row.firstYear === null || row.lastYear === null ? [] : [row.firstYear, row.lastYear]))
  return {
    series: seriesRows.value.length,
    performances: performanceRows.value.length,
    shows: seriesOverview.value.reduce((sum, row) => sum + row.shows, 0),
    years: years.length === 0 ? null : yearSpan(Math.min(...years), Math.max(...years)),
  }
})

/** Default order of the series table: most 演出 first. */
const seriesSorting = ref([{ id: 'performances', desc: true }])
/** Default order of the 演出 table: the catalog's newest-first date order. */
const performanceSorting = ref<{ id: string; desc: boolean }[]>([])

/** Sortable header button, shared with every other table on the site. */
const sortableHeader = useSortableHeader()

const seriesColumns = computed<TableColumn<SeriesView>[]>(() => [
  { accessorKey: 'primary', header: sortableHeader(t('col.series')), enableSorting: true },
  { accessorKey: 'performances', header: sortableHeader(t('col.performanceCount')), enableSorting: true },
  { accessorKey: 'shows', header: sortableHeader(t('col.shows')), enableSorting: true },
  { accessorKey: 'years', header: sortableHeader(t('col.years')), enableSorting: true },
  { accessorKey: 'firstDate', header: sortableHeader(t('col.firstShow')), enableSorting: true },
  { accessorKey: 'lastDate', header: sortableHeader(t('col.lastShow')), enableSorting: true },
])

const performanceColumns = computed<TableColumn<PerformanceView>[]>(() => [
  { accessorKey: 'dates', header: sortableHeader(t('col.date')), enableSorting: true },
  { accessorKey: 'label', header: sortableHeader(t('col.performance')), enableSorting: true },
  { accessorKey: 'seriesLabel', header: sortableHeader(t('col.series')), enableSorting: true },
  { accessorKey: 'venue', header: sortableHeader(t('col.venue')), enableSorting: true },
  { accessorKey: 'shows', header: sortableHeader(t('col.shows')), enableSorting: true },
])

/** Blank marker for a missing value. */
const cell = (value: string | null): string => (value === null || value === '' ? '—' : value)

useHead({ title: computed(() => t('series.indexTitle')) })
</script>

<template>
  <main class="space-y-6">
    <section class="pt-4 sm:pt-8">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Hatsune Miku Concert Statistics</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-5xl">
        {{ t('series.heading1') }}<br class="sm:hidden">{{ t('series.heading2') }}
      </h1>
      <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <UBadge color="primary" variant="subtle" icon="i-lucide-layers">{{ t('common.seriesCount', { n: totals.series }) }}</UBadge>
        <UBadge color="primary" variant="subtle" icon="i-lucide-calendar-range">{{ t('common.performances', { n: totals.performances }) }}</UBadge>
        <UBadge color="primary" variant="subtle" icon="i-lucide-clock">{{ t('common.shows', { n: totals.shows }) }}</UBadge>
        <UBadge v-if="totals.years" color="neutral" variant="subtle">{{ totals.years }}</UBadge>
        <UButton to="/" color="neutral" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">{{ t('series.viewRanking') }}</UButton>
      </div>
    </section>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('common.catalogError')"
      :description="error"
    />

    <template v-else>
      <TableSection
        v-if="catalog || pending"
        :title="t('series.tableTitle')"
        :note="t('series.note')"
        :fill="false"
        v-model:sorting="seriesSorting"
        :data="seriesRows"
        :columns="seriesColumns"
        :loading="pending"
        empty-icon="i-lucide-layers"
        :empty-title="t('series.emptyTitle')"
        :empty-description="t('series.emptyDesc')"
      >
        <template #primary-cell="{ row }">
          <NuxtLink :to="`/series/${row.original.seriesId}`" class="text-highlighted no-underline hover:text-primary">
            {{ row.original.primary }}
          </NuxtLink>
          <span v-if="row.original.originalNote" class="block text-xs text-dimmed">{{ row.original.originalNote }}</span>
        </template>
        <template #performances-cell="{ row }">
          <span class="tabular-nums text-muted">{{ row.original.performances }}</span>
        </template>
        <template #shows-cell="{ row }">
          <UBadge color="primary" variant="subtle">{{ row.original.shows }}</UBadge>
        </template>
        <template #years-cell="{ row }">
          <span class="tabular-nums text-muted">{{ cell(row.original.years) }}</span>
        </template>
        <template #firstDate-cell="{ row }">
          <span class="tabular-nums text-muted">{{ cell(row.original.firstDate) }}</span>
        </template>
        <template #lastDate-cell="{ row }">
          <span class="tabular-nums text-muted">{{ cell(row.original.lastDate) }}</span>
        </template>
      </TableSection>

      <TableSection
        v-if="catalog || pending"
        :title="t('series.performancesTitle')"
        :count="filteredPerformances.length !== performanceRows.length
          ? t('series.filteredCount', { shown: filteredPerformances.length, total: performanceRows.length })
          : t('series.performanceCount', { n: performanceRows.length })"
        :fill="false"
        v-model:sorting="performanceSorting"
        :data="filteredPerformances"
        :columns="performanceColumns"
        :loading="pending"
        empty-icon="i-lucide-calendar-x"
        :empty-title="t('series.emptyPerformances')"
        :empty-description="t('series.emptyPerformancesDesc')"
      >
        <template #actions>
          <FilterField :label="t('col.series')">
            <USelectMenu
              v-model="selectedSeries"
              :items="seriesItems"
              value-key="value"
              multiple
              search-input
              :filter-fields="['label']"
              :placeholder="t('series.allSeries')"
              size="sm"
              class="w-44"
            />
          </FilterField>
          <UButton
            v-if="placeFilter"
            color="neutral"
            variant="subtle"
            size="sm"
            trailing-icon="i-lucide-x"
            :label="t('series.filterPlace', { place: placeFilter })"
            :aria-label="t('series.clearPlace')"
            @click="clearPlaceFilter"
          />
        </template>
        <template #dates-cell="{ row }">
          <span class="whitespace-nowrap tabular-nums text-muted">{{ cell(row.original.dates) }}</span>
        </template>
        <template #label-cell="{ row }">
          <NuxtLink :to="`/shows/${row.original.id}`" class="text-highlighted no-underline hover:text-primary">
            {{ row.original.label }}
          </NuxtLink>
          <UBadge v-if="!row.original.hasSetlist" color="neutral" variant="subtle" size="sm" class="ml-2">{{ t('series.noSetlist') }}</UBadge>
        </template>
        <template #seriesLabel-cell="{ row }">
          <NuxtLink :to="`/series/${row.original.seriesId}`" class="text-muted no-underline hover:text-primary">
            {{ row.original.seriesLabel }}
          </NuxtLink>
        </template>
        <template #venue-cell="{ row }">
          <span class="text-muted">{{ cell(row.original.venue) }}</span>
        </template>
        <template #shows-cell="{ row }">
          <span class="tabular-nums text-muted">{{ row.original.shows }}</span>
        </template>
      </TableSection>
    </template>
  </main>
</template>
