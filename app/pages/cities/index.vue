<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useCatalog } from '~/composables/useCatalog.ts'
import { placeNames } from '~/composables/usePlaceNames.ts'
import { useSortableHeader } from '~/composables/useSortableHeader.ts'
import { buildCityIndex, rankCities } from '~~/shared/cities.ts'
import { showCountsByPerformance } from '~~/shared/performance-setlists.ts'
import { reviewRotations } from '~~/shared/rotation.ts'

const { catalog, error, pending, load } = useCatalog()

/** Parsed once: the checked place list and its matchers never change at runtime. */
const cityIndex = buildCityIndex(placeNames)

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

/** Default order matches the ranking: most 场次 first. */
const sorting = ref<{ id: string; desc: boolean }[]>([{ id: 'shows', desc: true }])

/** A ranking row plus its position under the default shows order. */
type RankedCity = {
  rank: number
  city: string
  /** Source spellings joined for the secondary line. */
  originalNames: string
  concerts: number
  shows: number
  firstYear: number | null
  lastYear: number | null
}

const review = computed(() => (catalog.value ? reviewRotations(catalog.value) : null))

/** 场次 counts per 演出, including a day split into 日场 / 夜场 by the drawn-up schedule. */
const showCounts = computed(() => {
  if (!catalog.value || !review.value) return undefined
  return showCountsByPerformance(catalog.value, review.value)
})

const ranking = computed(() =>
  catalog.value ? rankCities(catalog.value.performances, cityIndex, { showCounts: showCounts.value }) : null,
)

const rows = computed<RankedCity[]>(() => {
  return (ranking.value?.rows ?? []).map((row, index) => ({
    rank: index + 1,
    city: row.city,
    originalNames: row.originalNames.join(' / '),
    concerts: row.concerts,
    shows: row.shows,
    firstYear: row.firstYear,
    lastYear: row.lastYear,
  }))
})

/** Catalog-wide sums shown next to the section title. */
const totals = computed(() => {
  const cities = ranking.value?.rows ?? []
  return {
    concerts: cities.reduce((sum, row) => sum + row.concerts, 0),
    shows: cities.reduce((sum, row) => sum + row.shows, 0),
  }
})

/** Sortable header button, shared with every other table on the site. */
const sortableHeader = useSortableHeader()

const columns: TableColumn<RankedCity>[] = [
  { accessorKey: 'rank', header: sortableHeader('名次'), enableSorting: true },
  { accessorKey: 'city', header: sortableHeader('城市'), enableSorting: true },
  { accessorKey: 'concerts', header: sortableHeader('演出数'), enableSorting: true },
  { accessorKey: 'shows', header: sortableHeader('场次'), enableSorting: true },
  { accessorKey: 'firstYear', header: sortableHeader('最早年份'), enableSorting: true },
  { accessorKey: 'lastYear', header: sortableHeader('最晚年份'), enableSorting: true },
]

/** Blank marker for a missing value. */
const cell = (value: number | null): string => (value === null ? '—' : String(value))

useHead({ title: '城市排行' })
</script>

<template>
  <main class="space-y-6">
    <section class="pt-4 sm:pt-8">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Hatsune Miku Concert Statistics</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-5xl">
        城市演出场次<br class="sm:hidden">排名
      </h1>
      <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <UBadge color="primary" variant="subtle" icon="i-lucide-map-pin">按场次排序</UBadge>
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

    <TableSection
      v-if="catalog || pending"
      title="排行"
      :count="`${rows.length} 个城市 · ${totals.concerts} 个演出 · ${totals.shows} 个场次`"
      note="「场次」按演出日计数，日场 / 夜场分别计数"
      v-model:sorting="sorting"
      :data="rows"
      :columns="columns"
      :loading="pending"
      empty-icon="i-lucide-map-pin-off"
      empty-title="没有可统计的城市"
      empty-description="目录里还没有带城市名称的演出。"
    >
      <template #rank-cell="{ row }">
        <span class="font-mono text-muted">{{ row.original.rank }}</span>
      </template>
      <template #city-cell="{ row }">
        <span class="text-highlighted">{{ row.original.city }}</span>
        <span v-if="row.original.originalNames" class="block text-xs text-dimmed">{{ row.original.originalNames }}</span>
      </template>
      <template #concerts-cell="{ row }">
        <span class="tabular-nums text-muted">{{ row.original.concerts }}</span>
      </template>
      <template #shows-cell="{ row }">
        <UBadge color="primary" variant="subtle">{{ row.original.shows }}</UBadge>
      </template>
      <template #firstYear-cell="{ row }">
        <span class="tabular-nums text-muted">{{ cell(row.original.firstYear) }}</span>
      </template>
      <template #lastYear-cell="{ row }">
        <span class="tabular-nums text-muted">{{ cell(row.original.lastYear) }}</span>
      </template>
    </TableSection>

    <p v-if="ranking && ranking.unknown.concerts > 0" class="text-xs text-muted">
      另有 {{ ranking.unknown.concerts }} 个线上或没有标明城市的演出未计入排名。
    </p>
  </main>
</template>
