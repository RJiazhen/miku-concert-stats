<script setup lang="ts">
import { computed, h, onMounted, ref, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useCatalog } from '~/composables/useCatalog.ts'
import { placeNames } from '~/composables/usePlaceNames.ts'
import { buildCityIndex, rankCities } from '~~/shared/cities.ts'

const UButton = resolveComponent('UButton')

const { catalog, error, pending, load } = useCatalog()

/** Parsed once: the checked place list and its matchers never change at runtime. */
const cityIndex = buildCityIndex(placeNames)

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

/** Default order matches the ranking: most shows first. */
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

const ranking = computed(() => (catalog.value ? rankCities(catalog.value.performances, cityIndex) : null))

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

/** Sortable header button, matching the song ranking. */
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

const columns: TableColumn<RankedCity>[] = [
  { accessorKey: 'rank', header: sortableHeader('名次'), enableSorting: true },
  { accessorKey: 'city', header: sortableHeader('城市'), enableSorting: true },
  { accessorKey: 'concerts', header: sortableHeader('演唱会数'), enableSorting: true },
  { accessorKey: 'shows', header: sortableHeader('场数'), enableSorting: true },
  { accessorKey: 'firstYear', header: sortableHeader('最早年份'), enableSorting: true },
  { accessorKey: 'lastYear', header: sortableHeader('最晚年份'), enableSorting: true },
]

/** Blank marker for a missing value. */
const cell = (value: number | null): string => (value === null ? '—' : String(value))
</script>

<template>
  <main class="space-y-6">
    <section class="pt-4 sm:pt-8">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Hatsune Miku Concert Statistics</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-5xl">
        城市演出场次<br class="sm:hidden">排名
      </h1>
      <p class="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
        按举办城市统计演唱会数量。演唱会数是目录里在该城市举办的演出场次数，一个巡演站点计一次；
        场数按演出日拆分，多日演出因此计为多场。配信、线上与 VR 场次不计入城市排名。
      </p>
      <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <UBadge color="primary" variant="subtle" icon="i-lucide-map-pin">按场数排序</UBadge>
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

    <section v-else class="space-y-3">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="text-lg font-semibold text-highlighted">
          排行
          <span class="ml-1 text-sm font-normal text-muted">
            {{ rows.length }} 个城市 · {{ totals.concerts }} 场演唱会 · {{ totals.shows }} 场演出
          </span>
        </h2>
        <p class="text-xs text-muted">「场数」按目录中的演出日计数</p>
      </div>

      <UTable
        v-if="catalog"
        v-model:sorting="sorting"
        :data="rows"
        :columns="columns"
        :loading="pending"
        sticky
        class="max-h-[70vh]"
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
        <template #empty>
          <UEmpty
            icon="i-lucide-map-pin-off"
            title="没有可统计的城市"
            description="目录里还没有带城市名称的演出。"
            variant="naked"
          />
        </template>
      </UTable>
      <USkeleton v-else class="h-72 w-full rounded-xl" />

      <p v-if="ranking && ranking.unknown.concerts > 0" class="text-xs text-muted">
        另有 {{ ranking.unknown.concerts }} 场线上或没有标明城市的演出未计入排名。
      </p>
    </section>
  </main>
</template>
