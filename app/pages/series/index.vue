<script setup lang="ts">
import { computed, h, onMounted, ref, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useCatalog } from '~/composables/useCatalog.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { performanceSchedules } from '~~/shared/event-schedule.ts'
import { buildPerformanceOverview, buildSeriesOverview } from '~~/shared/overview.ts'
import { reviewRotations } from '~~/shared/rotation.ts'

const UButton = resolveComponent('UButton')

const { catalog, error, pending, load } = useCatalog()
const { localizePlace } = usePlaceNames()
const { localizeSeries, localizePerformanceSeries, seriesTitle } = useSeriesTitles()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const review = computed(() => (catalog.value ? reviewRotations(catalog.value) : null))

/** 场次 counts per 演出, including a day split into 日场 / 夜场 by the setlist notes. */
const showCounts = computed(() => {
  if (!catalog.value || !review.value) return undefined
  return new Map([...performanceSchedules(catalog.value, review.value)].map(([id, shows]) => [id, shows.length]))
})

const seriesOverview = computed(() =>
  catalog.value ? buildSeriesOverview(catalog.value.series, catalog.value.performances, showCounts.value) : [],
)

const performanceOverview = computed(() =>
  catalog.value ? buildPerformanceOverview(catalog.value.performances, showCounts.value) : [],
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
      seriesLabel: series === undefined ? `系列 ${row.seriesId}` : localizeSeries(series.name),
      dates: row.dates,
      year: row.year,
      venue: row.venue,
      shows: row.shows,
      hasSetlist: row.hasSetlist,
    }
  }),
)

/** Selected series for the 演出 table; `all` keeps every row. */
const ALL_SERIES = 'all'
const seriesFilter = ref<string>(ALL_SERIES)

/** Filter options in the series table's default order, most 演出 first. */
const seriesItems = computed(() => {
  const ordered = [...seriesRows.value].sort(
    (left, right) => right.performances - left.performances || left.primary.localeCompare(right.primary, 'zh'),
  )
  return [{ label: '全部系列', value: ALL_SERIES }, ...ordered.map((row) => ({ label: row.primary, value: String(row.seriesId) }))]
})

const filteredPerformances = computed(() =>
  seriesFilter.value === ALL_SERIES
    ? performanceRows.value
    : performanceRows.value.filter((row) => String(row.seriesId) === seriesFilter.value),
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

/** Sortable header button, matching the song ranking and the city ranking. */
const sortableHeader = (label: string) => ({ column }: { column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc?: boolean) => void } }) => {
  const sorted = column.getIsSorted()
  return h(UButton, {
    color: 'neutral',
    variant: 'ghost',
    size: 'xs',
    label,
    trailingIcon: sorted ? (sorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow') : 'i-lucide-arrow-up-down',
    class: '-mx-2',
    onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
  })
}

const seriesColumns: TableColumn<SeriesView>[] = [
  { accessorKey: 'primary', header: sortableHeader('系列'), enableSorting: true },
  { accessorKey: 'performances', header: sortableHeader('演出数'), enableSorting: true },
  { accessorKey: 'shows', header: sortableHeader('场次'), enableSorting: true },
  { accessorKey: 'years', header: sortableHeader('年份'), enableSorting: true },
  { accessorKey: 'firstDate', header: sortableHeader('首次演出'), enableSorting: true },
  { accessorKey: 'lastDate', header: sortableHeader('最近演出'), enableSorting: true },
]

const performanceColumns: TableColumn<PerformanceView>[] = [
  { accessorKey: 'dates', header: sortableHeader('日期'), enableSorting: true },
  { accessorKey: 'label', header: sortableHeader('演出'), enableSorting: true },
  { accessorKey: 'seriesLabel', header: sortableHeader('系列'), enableSorting: true },
  { accessorKey: 'venue', header: sortableHeader('场馆'), enableSorting: true },
  { accessorKey: 'shows', header: sortableHeader('场次'), enableSorting: true },
]

/** Blank marker for a missing value. */
const cell = (value: string | null): string => (value === null || value === '' ? '—' : value)
</script>

<template>
  <main class="space-y-6">
    <section class="pt-4 sm:pt-8">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Hatsune Miku Concert Statistics</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-5xl">
        系列与演出<br class="sm:hidden">总览
      </h1>
      <p class="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
        目录里的全部系列与演出。系列是一个演唱会品牌（如魔法未来），演出是一次城市站，场次是演出的每一天；
        同一天有日场 / 夜场时分别计数。点系列进入系列主页，点演出查看歌单与场次。
      </p>
      <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <UBadge color="primary" variant="subtle" icon="i-lucide-layers">{{ totals.series }} 个系列</UBadge>
        <UBadge color="primary" variant="subtle" icon="i-lucide-calendar-range">{{ totals.performances }} 个演出</UBadge>
        <UBadge color="primary" variant="subtle" icon="i-lucide-clock">{{ totals.shows }} 个场次</UBadge>
        <UBadge v-if="totals.years" color="neutral" variant="subtle">{{ totals.years }}</UBadge>
        <UButton to="/" color="neutral" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">查看曲目排行</UButton>
      </div>
    </section>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="目录加载失败"
      :description="error"
    />

    <template v-else>
      <section class="space-y-3">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-lg font-semibold text-highlighted">
            系列
            <span class="ml-1 text-sm font-normal text-muted">{{ seriesRows.length }} 个</span>
          </h2>
          <p class="text-xs text-muted">「场次」按演出日计数，日场 / 夜场分别计数</p>
        </div>

        <UTable
          v-if="catalog"
          v-model:sorting="seriesSorting"
          :data="seriesRows"
          :columns="seriesColumns"
          :loading="pending"
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
          <template #empty>
            <UEmpty icon="i-lucide-layers" title="没有系列" description="目录里还没有系列记录。" variant="naked" />
          </template>
        </UTable>
        <USkeleton v-else class="h-56 w-full rounded-xl" />
      </section>

      <section class="space-y-3">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-lg font-semibold text-highlighted">
            演出
            <span class="ml-1 text-sm font-normal text-muted">
              {{ filteredPerformances.length }} 个<template v-if="filteredPerformances.length !== performanceRows.length"> / {{ performanceRows.length }}</template>
            </span>
          </h2>
          <label class="flex items-center gap-2 text-xs text-muted">
            系列
            <USelect v-model="seriesFilter" :items="seriesItems" size="sm" class="w-44" />
          </label>
        </div>

        <UTable
          v-if="catalog"
          v-model:sorting="performanceSorting"
          :data="filteredPerformances"
          :columns="performanceColumns"
          :loading="pending"
          sticky
          class="max-h-[75vh]"
        >
          <template #dates-cell="{ row }">
            <span class="whitespace-nowrap tabular-nums text-muted">{{ cell(row.original.dates) }}</span>
          </template>
          <template #label-cell="{ row }">
            <NuxtLink :to="`/shows/${row.original.id}`" class="text-highlighted no-underline hover:text-primary">
              {{ row.original.label }}
            </NuxtLink>
            <UBadge v-if="!row.original.hasSetlist" color="neutral" variant="subtle" size="sm" class="ml-2">暂无歌单</UBadge>
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
          <template #empty>
            <UEmpty
              icon="i-lucide-calendar-x"
              title="没有符合条件的演出"
              description="换一个系列筛选。"
              variant="naked"
            />
          </template>
        </UTable>
        <USkeleton v-else class="h-72 w-full rounded-xl" />
      </section>
    </template>
  </main>
</template>
