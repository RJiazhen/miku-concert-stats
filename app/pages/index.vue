<script setup lang="ts">
import { computed, h, onMounted, ref, resolveComponent, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useCatalog } from '~/composables/useCatalog.ts'
import { songCharacters } from '~/composables/useCharacters.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { useSongVariants } from '~/composables/useSongVariants.ts'
import { availableCharacters } from '~~/shared/character-options.ts'
import { rankSongAppearances, type RankingMode } from '~~/shared/stats.ts'
import { producerCredit } from '~~/shared/credit.ts'
import { formatRotationReason } from '~~/shared/rotation.ts'
import { SEVERITY_LABELS } from '~~/shared/setlist-diff.ts'
import {
  availablePerformanceYears,
  canEndRangeAt,
  canStartRangeAt,
  normalizeYearRange,
  type YearRange,
} from '~~/shared/year-range.ts'

const UButton = resolveComponent('UButton')

const { catalog, error, pending, load } = useCatalog()
const variants = useSongVariants()
const { localizeSeries } = useSeriesTitles()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

/** Sentinel for an open end of the year range; Reka UI forbids an empty `SelectItem` value. */
const YEAR_ANY = 'all'

const mode = ref<RankingMode>('setlist')
const selectedSeries = ref<number[]>([])
const seriesTouched = ref(false)
const yearFrom = ref(YEAR_ANY)
const yearTo = ref(YEAR_ANY)
const includeBroadcast = ref(false)
const includeMedleyComponents = ref(false)
const characterFilter = ref('all')
const query = ref('')
const sorting = ref<{ id: string; desc: boolean }[]>([{ id: 'count', desc: true }])

/** Mirrors a backend value into the URL once the page is interactive. */
const mounted = ref(false)

const seriesOptions = computed(() => catalog.value?.series ?? [])

/** Parses a four-digit year. Any other text leaves that side of the range open. */
const yearOrNull = (value: string): number | null => {
  if (!/^\d{4}$/.test(value.trim())) return null
  return Number(value.trim())
}

type RankedSong = {
  songId: number
  rank: number
  name: string
  /** Producer credit, without the featured vocalists already shown in 演出角色; also the tooltip text. */
  artists: string
  /** Display text for 演出角色. */
  characters: string
  /** Base character names behind `characters`, used by the character filter and its option list. */
  characterList: string[]
  count: number
  seriesCount: number
  firstYear: number | null
  lastYear: number | null
  approximate: boolean
  /** Rotation notes for the ≈ badge tooltip, already localized. */
  reasons: string[]
  variantSongIds: number[]
  variantNames: string
  /** Lower-cased haystack for the search box. */
  search: string
}

/** Chinese titles are irrelevant to search; both names are indexed. */
const ranked = computed<RankedSong[]>(() => {
  if (!catalog.value || selectedSeries.value.length === 0) return []
  const songs = catalog.value.songs
  const byId = new Map(songs.map((song) => [song.id, song]))
  return rankSongAppearances(catalog.value, {
    mode: mode.value,
    seriesIds: selectedSeries.value,
    yearFrom: yearOrNull(yearFrom.value),
    yearTo: yearOrNull(yearTo.value),
    includeBroadcast: includeBroadcast.value,
    includeMedleyComponents: includeMedleyComponents.value,
    variants,
  }).map((row, index) => {
    const groupIds = [row.songId, ...row.variantSongIds]
    const groupSongs = groupIds.map((id) => byId.get(id)).filter((song) => song !== undefined)
    const characters = new Set<string>()
    for (const song of groupSongs) for (const name of songCharacters(song.artist_string)) characters.add(name)
    const characterList = [...characters]
    const variantNames = row.variantSongIds
      .map((id) => byId.get(id)?.name ?? String(id))
      .join('、')
    const haystack = [
      row.name,
      row.artists ?? '',
      variantNames,
      characterList.join(' '),
    ]
      .join(' ')
      .toLowerCase()
    return {
      songId: row.songId,
      rank: index + 1,
      name: row.name,
      artists: producerCredit(row.artists) ?? '—',
      characters: characterList.length === 0 ? '—' : characterList.join('、'),
      characterList,
      count: row.count,
      seriesCount: row.seriesCount,
      firstYear: row.firstYear,
      lastYear: row.lastYear,
      approximate: row.approximate,
      reasons: row.reasons.map(formatRotationReason),
      variantSongIds: row.variantSongIds,
      variantNames,
      search: haystack,
    }
  })
})

/** Ranking rows after the search box and character filter. */
const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return ranked.value.filter((row) => {
    if (characterFilter.value !== 'all' && !row.characterList.includes(characterFilter.value)) return false
    if (needle === '') return true
    return row.search.includes(needle)
  })
})

/** Sortable header button. */
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

const columns: TableColumn<RankedSong>[] = [
  { accessorKey: 'rank', header: sortableHeader('名次'), enableSorting: true },
  { accessorKey: 'name', header: sortableHeader('歌曲'), enableSorting: true },
  { accessorKey: 'artists', header: '艺人', enableSorting: true, meta: { class: { td: 'max-w-40' } } },
  { accessorKey: 'characters', header: sortableHeader('演出角色'), enableSorting: true },
  { accessorKey: 'count', header: sortableHeader('次数'), enableSorting: true },
  { accessorKey: 'seriesCount', header: sortableHeader('系列数'), enableSorting: true },
  { accessorKey: 'firstYear', header: sortableHeader('最早年份'), enableSorting: true },
  { accessorKey: 'lastYear', header: sortableHeader('最晚年份'), enableSorting: true },
]

/** Blank marker for a missing value. */
const cell = (value: string | number | null): string => (value === null || value === '' ? '—' : String(value))

/** Query keys mirrored into the URL. */
type FilterState = {
  mode: RankingMode
  series: number[]
  from: string
  to: string
  broadcast: boolean
  medley: boolean
  character: string
  q: string
  sort: string
  dir: 'asc' | 'desc'
}

/** Current filter state in URL form. */
const state = computed<FilterState>(() => ({
  mode: mode.value,
  series: selectedSeries.value,
  from: yearOrNull(yearFrom.value) === null ? '' : yearFrom.value,
  to: yearOrNull(yearTo.value) === null ? '' : yearTo.value,
  broadcast: includeBroadcast.value,
  medley: includeMedleyComponents.value,
  character: characterFilter.value,
  q: query.value,
  sort: sorting.value[0]?.id ?? 'count',
  dir: sorting.value[0]?.desc === false ? 'asc' : 'desc',
}))

/** Replaces the query string without adding history entries. */
const syncUrl = (): void => {
  if (!mounted.value) return
  const current = state.value
  const everySeries = catalog.value?.series.map((row) => row.id) ?? []
  const seriesIsDefault = current.series.length === everySeries.length && current.series.every((id) => everySeries.includes(id))
  void navigateTo(
    {
      query: {
        mode: current.mode === 'show' ? 'show' : undefined,
        series: seriesIsDefault ? undefined : current.series.join(','),
        from: current.from || undefined,
        to: current.to || undefined,
        broadcast: current.broadcast ? '1' : undefined,
        medley: current.medley ? '1' : undefined,
        character: current.character === 'all' ? undefined : current.character,
        q: current.q || undefined,
        sort: current.sort === 'count' ? undefined : current.sort,
        dir: current.dir === 'desc' ? undefined : current.dir,
      },
    },
    { replace: true },
  )
}
watch(state, syncUrl, { deep: true })

/** Restores filters from the URL. Runs after hydration so SSR output stays stable. */
const readUrl = (): void => {
  const route = useRoute()
  const url = route.query
  const readString = (value: unknown): string => (typeof value === 'string' ? value : '')
  if (readString(url.mode) === 'show') mode.value = 'show'
  const series = readString(url.series)
  if (series !== '') {
    const ids = series
      .split(',')
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value))
    if (ids.length > 0) {
      selectedSeries.value = ids
      seriesTouched.value = true
    }
  }
  /** Restored bounds are swapped when a shared link holds an inverted range. */
  const restored = normalizeYearRange({ from: yearOrNull(readString(url.from)), to: yearOrNull(readString(url.to)) })
  yearFrom.value = restored.from === null ? YEAR_ANY : String(restored.from)
  yearTo.value = restored.to === null ? YEAR_ANY : String(restored.to)
  includeBroadcast.value = readString(url.broadcast) === '1'
  includeMedleyComponents.value = readString(url.medley) === '1'
  characterFilter.value = readString(url.character) || 'all'
  query.value = readString(url.q)
  const sort = readString(url.sort)
  if (sort !== '') sorting.value = [{ id: sort, desc: readString(url.dir) !== 'asc' }]
  mounted.value = true
}

/** Checks every series once, the first time the catalog is available. */
const selectAllSeries = (): void => {
  if (seriesTouched.value || !catalog.value) return
  selectedSeries.value = catalog.value.series.map((row) => row.id)
  seriesTouched.value = true
}
watch(catalog, selectAllSeries, { immediate: true })

/** Restores the URL once at mount, then keeps it in sync. */
onMounted(() => {
  readUrl()
})

/** Clears every filter back to the default view. */
const reset = (): void => {
  mode.value = 'setlist'
  selectedSeries.value = catalog.value?.series.map((row) => row.id) ?? []
  yearFrom.value = YEAR_ANY
  yearTo.value = YEAR_ANY
  includeBroadcast.value = false
  includeMedleyComponents.value = false
  characterFilter.value = 'all'
  query.value = ''
  sorting.value = [{ id: 'count', desc: true }]
}

/** Active filter count, shown next to the reset button. */
const activeFilters = computed(() => {
  let count = 0
  if (mode.value === 'show') count++
  if (yearOrNull(yearFrom.value) !== null || yearOrNull(yearTo.value) !== null) count++
  if (includeBroadcast.value) count++
  if (includeMedleyComponents.value) count++
  if (characterFilter.value !== 'all') count++
  if (query.value) count++
  const all = catalog.value?.series.map((row) => row.id) ?? []
  if (selectedSeries.value.length !== all.length) count++
  return count
})

/** Options for 角色, built from characters that occur in the current ranking so every choice returns rows. */
const characterItems = computed(() => [
  { label: '全部角色', value: 'all' },
  ...availableCharacters(ranked.value).map(({ name, count }) => ({ label: `${name}（${count}）`, value: name })),
])

/** Keeps the selection aligned with the options: a character that no longer occurs falls back to 全部角色. */
const keepCharacterFilterValid = (): void => {
  if (!catalog.value) return
  if (!characterItems.value.some((item) => item.value === characterFilter.value)) characterFilter.value = 'all'
}
watch(characterItems, keepCharacterFilterValid)
/** Series checkboxes in the site language; `value` stays the numeric catalog id used in the URL. */
const seriesItems = computed(() => seriesOptions.value.map((series) => ({ label: localizeSeries(series.name), value: series.id })))

/** Calendar years present in the catalog, newest first; the same list the year filter matches against. */
const yearOptions = computed(() => availablePerformanceYears(catalog.value?.performances ?? []))

/** Items shared by both year pickers: 不限 plus every year the data contains. */
const yearItems = computed(() => [
  { label: '不限', value: YEAR_ANY },
  ...yearOptions.value.map((year) => ({ label: `${year} 年`, value: String(year) })),
])

/** Bounds currently selected; `null` marks an open end. */
const yearRange = computed<YearRange>(() => ({ from: yearOrNull(yearFrom.value), to: yearOrNull(yearTo.value) }))

/** Start-year items; years after the selected end year stay visible but disabled, so the range cannot invert. */
const yearFromItems = computed(() =>
  yearItems.value.map((item) => {
    const year = yearOrNull(item.value)
    return { ...item, disabled: year !== null && !canStartRangeAt(year, yearRange.value) }
  }),
)

/** End-year items; years before the selected start year stay visible but disabled, so the range cannot invert. */
const yearToItems = computed(() =>
  yearItems.value.map((item) => {
    const year = yearOrNull(item.value)
    return { ...item, disabled: year !== null && !canEndRangeAt(year, yearRange.value) }
  }),
)

/** Severity labels are reused in the link to the review page. */
const reviewHint = SEVERITY_LABELS['segment-differs']
</script>

<template>
  <main class="space-y-6">
    <section class="pt-4 sm:pt-8">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Hatsune Miku Concert Statistics</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-5xl">
        初音未来演唱会<br class="sm:hidden">曲目统计
      </h1>
      <p class="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
        按歌单或按场次统计每首歌出现的次数。默认不计配信、线上和 VR 场，也不把串烧的组成歌曲单独计入。
        同一首歌的 remix、声库与翻唱版本按人工核对的清单合并计数。
      </p>
      <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <UBadge color="primary" variant="subtle" icon="i-lucide-music">按歌单是默认口径</UBadge>
        <UButton to="/cities" color="neutral" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">按城市统计场次</UButton>
        <UButton to="/raw" color="neutral" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">查看原始数据</UButton>
        <UButton to="/report" color="neutral" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">
          歌单差异核验（{{ reviewHint }}）
        </UButton>
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
    <UCard v-else>
      <div class="flex flex-wrap items-end gap-3">
        <UFieldGroup size="sm">
          <UButton :variant="mode === 'setlist' ? 'solid' : 'outline'" label="按歌单" @click="mode = 'setlist'" />
          <UButton :variant="mode === 'show' ? 'solid' : 'outline'" label="按场次" @click="mode = 'show'" />
        </UFieldGroup>
        <UInput v-model="query" icon="i-lucide-search" placeholder="搜索歌名、版本或艺人" size="sm" class="min-w-56 flex-1" />
        <USelect v-model="yearFrom" :items="yearFromItems" aria-label="起始年" title="起始年" size="sm" class="w-24" />
        <USelect v-model="yearTo" :items="yearToItems" aria-label="结束年" title="结束年" size="sm" class="w-24" />
        <USelect v-model="characterFilter" :items="characterItems" size="sm" class="w-36" />
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-rotate-ccw"
          :label="activeFilters > 0 ? `重置 ${activeFilters}` : '重置'"
          :disabled="activeFilters === 0"
          @click="reset"
        />
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <UCheckbox v-model="includeBroadcast" label="计入配信 / 线上 / VR" size="sm" />
        <UCheckbox v-model="includeMedleyComponents" label="计入串烧组成" size="sm" />
        <UCheckboxGroup
          v-model="selectedSeries"
          :items="seriesItems"
          orientation="horizontal"
          size="sm"
          :ui="{ fieldset: 'flex flex-wrap items-center gap-x-4 gap-y-1' }"
        />
      </div>
    </UCard>

    <section class="space-y-3">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="text-lg font-semibold text-highlighted">
          排行
          <span class="ml-1 text-sm font-normal text-muted">{{ filtered.length }} 首</span>
        </h2>
        <p class="text-xs text-muted">「含 N 个版本」表示 remix、声库或翻唱版本已并入该行</p>
      </div>

      <UTable
        v-if="catalog"
        v-model:sorting="sorting"
        :data="filtered"
        :columns="columns"
        :loading="pending"
        sticky
        class="max-h-[70vh]"
      >
        <template #rank-cell="{ row }">
          <span class="font-mono text-muted">{{ row.original.rank }}</span>
        </template>
        <template #name-cell="{ row }">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <NuxtLink :to="`/songs/${row.original.songId}`" class="text-highlighted no-underline hover:text-primary">
              <SongTitle :song-id="row.original.songId" :original="row.original.name" />
            </NuxtLink>
            <UTooltip v-if="row.original.variantSongIds.length > 0" :text="`并入：${row.original.variantNames}`">
              <UBadge color="secondary" variant="subtle" size="sm">
                含 {{ row.original.variantSongIds.length }} 个版本
              </UBadge>
            </UTooltip>
            <ULink
              :to="`https://vocadb.net/S/${row.original.songId}`"
              target="_blank"
              class="text-dimmed hover:text-primary"
              aria-label="在 VocaDB 查看"
            >
              <UIcon name="i-lucide-external-link" class="size-3.5" />
            </ULink>
          </div>
        </template>
        <template #artists-cell="{ row }">
          <UTooltip :text="row.original.artists" :content="{ side: 'top' }">
            <span class="block max-w-40 truncate text-muted">{{ row.original.artists }}</span>
          </UTooltip>
        </template>
        <template #characters-cell="{ row }">
          <span class="text-muted">{{ row.original.characters }}</span>
        </template>
        <template #count-cell="{ row }">
          <UBadge
            :color="row.original.approximate ? 'warning' : 'primary'"
            variant="subtle"
            :title="row.original.reasons.join('\n')"
          >
            {{ row.original.approximate ? `≈ ${row.original.count}` : row.original.count }}
          </UBadge>
        </template>
        <template #seriesCount-cell="{ row }">
          <span class="tabular-nums text-muted">{{ row.original.seriesCount }}</span>
        </template>
        <template #firstYear-cell="{ row }">
          <span class="tabular-nums text-muted">{{ cell(row.original.firstYear) }}</span>
        </template>
        <template #lastYear-cell="{ row }">
          <span class="tabular-nums text-muted">{{ cell(row.original.lastYear) }}</span>
        </template>
        <template #empty>
          <UEmpty
            icon="i-lucide-search-x"
            title="没有符合条件的歌曲"
            description="换一个关键词，或放宽年份与系列筛选。"
            variant="naked"
          />
        </template>
      </UTable>
      <USkeleton v-else class="h-72 w-full rounded-xl" />
    </section>
  </main>
</template>
