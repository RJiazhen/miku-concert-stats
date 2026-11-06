<script setup lang="ts">
import { computed, h, onMounted, ref, resolveComponent, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useCatalog } from '~/composables/useCatalog.ts'
import { songCharacters, characterColor } from '~/composables/useCharacters.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSongVariants } from '~/composables/useSongVariants.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import { useSongLanguage } from '~/composables/useSongLanguage.ts'
import { splitCharacterChips } from '~~/shared/character-chips.ts'
import { formatSongTitle } from '~~/shared/song-titles.ts'
import { availableCharacters } from '~~/shared/character-options.ts'
import { availableProducers, producerNamesForSongs } from '~~/shared/producer-options.ts'
import { rankSongAppearances, type RankingMode } from '~~/shared/stats.ts'
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
const { songHref, songHrefTarget } = useSongLookup()
const { localizeSeries, localizePerformanceSeries } = useSeriesTitles()
const { localizePlace } = usePlaceNames()
const { language, translationFor } = useSongLanguage()

/** Width the character column may occupy; three chips plus the `+N` button fit inside the `p-4` padding. */
const CHARACTERS_WIDTH = 276

/** Width the song title may occupy before it is truncated. */
const NAME_WIDTH = 288

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

/** Sentinel for an open end of the year range; Reka UI forbids an empty `SelectItem` value. */
const YEAR_ANY = 'all'

const mode = ref<RankingMode>('show')
const selectedSeries = ref<number[]>([])
const seriesTouched = ref(false)
const yearFrom = ref(YEAR_ANY)
const yearTo = ref(YEAR_ANY)
const includeBroadcast = ref(false)
const includeMedleyComponents = ref(false)
const characterFilter = ref<string[]>([])
const producerFilter = ref<string[]>([])
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
  /** Producer names shown in 制作人, joined for display; also the tooltip text. */
  artists: string
  /** Producer names shown in 制作人 and matched by the producer filter. */
  producerList: string[]
  /** Base character names shown in 歌手 and used by the character filter. */
  characterList: string[]
  count: number
  /** Distinct 演出 the song appeared in, independent of the counting mode. */
  performanceCount: number
  firstYear: number | null
  lastYear: number | null
  approximate: boolean
  /** 演出 whose 场次 could not be pinned down, linked from the ≈ badge tooltip. */
  approximateShows: { id: number; name: string }[]
  variantSongIds: number[]
  /** Canonical song plus every merged variant, so the badge counts all versions. */
  versionCount: number
  variantNames: string
  /** Full title in the active language, shown in the tooltip when the cell truncates. */
  titleText: string
  /** Character chips shown inline; the rest sit behind the counter button. */
  characterChips: string[]
  /** Characters the counter button reveals on hover. */
  hiddenCharacterChips: string[]
}

/** Ranking rows enriched with the display text and character list the table needs. */
const ranked = computed<RankedSong[]>(() => {
  if (!catalog.value || selectedSeries.value.length === 0) return []
  const songs = catalog.value.songs
  const byId = new Map(songs.map((song) => [song.id, song]))
  const performancesById = new Map(catalog.value.performances.map((performance) => [performance.id, performance]))
  const seriesById = new Map(catalog.value.series.map((series) => [series.id, series]))

  /** Uncertain 演出 as links to their page, oldest first, in the site language. */
  const approximateShowsOf = (ids: readonly number[]): { id: number; name: string }[] =>
    ids
      .flatMap((id) => performancesById.get(id) ?? [])
      .sort((left, right) => (left.start_date ?? '').localeCompare(right.start_date ?? '') || left.id - right.id)
      .map((performance) => {
        const series = seriesById.get(performance.series_id)
        return {
          id: performance.id,
          name: localizePlace(localizePerformanceSeries(performance.name, series?.name ?? '', performance.series_number)),
        }
      })
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
    for (const song of groupSongs) for (const name of songCharacters(song)) characters.add(name)
    const characterList = [...characters]
    const producerList = producerNamesForSongs(groupSongs)
    const variantNames = row.variantSongIds
      .map((id) => byId.get(id)?.name ?? String(id))
      .join('、')
    const title = formatSongTitle(row.name, translationFor(row.songId), language.value)
    const chipSplit = splitCharacterChips(characterList)
    return {
      songId: row.songId,
      rank: index + 1,
      name: row.name,
      artists: producerList.join(', ') || '—',
      producerList,
      characterList,
      count: row.count,
      performanceCount: row.performanceCount,
      firstYear: row.firstYear,
      lastYear: row.lastYear,
      approximate: row.approximate,
      approximateShows: approximateShowsOf(row.approximatePerformanceIds),
      variantSongIds: row.variantSongIds,
      versionCount: row.variantSongIds.length + 1,
      variantNames,
      titleText: title.originalNote === null ? title.primary : `${title.primary}（${title.originalNote}）`,
      characterChips: chipSplit.visible,
      hiddenCharacterChips: chipSplit.hidden,
    }
  })
})

/** Ranking rows after the character and producer filters; empty selections mean 全部. */
const filtered = computed(() =>
  ranked.value.filter((row) => {
    const characterOk =
      characterFilter.value.length === 0 || characterFilter.value.some((name) => row.characterList.includes(name))
    const producerOk =
      producerFilter.value.length === 0 || producerFilter.value.some((name) => row.producerList.includes(name))
    return characterOk && producerOk
  }),
)

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

const columns = computed<TableColumn<RankedSong>[]>(() => [
  { accessorKey: 'rank', header: sortableHeader('名次'), enableSorting: true },
  { accessorKey: 'name', header: sortableHeader('歌曲'), enableSorting: true, meta: { class: { td: 'max-w-[288px]' } } },
  { accessorKey: 'artists', header: '制作人', enableSorting: true, meta: { class: { td: 'max-w-40' } } },
  { id: 'characters', accessorFn: (row) => row.characterList.join('、'), header: sortableHeader('歌手'), enableSorting: true, meta: { class: { td: 'max-w-[276px]' } } },
  { accessorKey: 'count', header: sortableHeader(mode.value === 'show' ? '场次数' : '演出数'), enableSorting: true },
  // 按演出统计时 count 已经是演出数，不再重复一列。
  ...(mode.value === 'show'
    ? [{ accessorKey: 'performanceCount', header: sortableHeader('演出数'), enableSorting: true }]
    : []),
  { accessorKey: 'firstYear', header: sortableHeader('最早年份'), enableSorting: true },
  { accessorKey: 'lastYear', header: sortableHeader('最晚年份'), enableSorting: true },
])

/**
 * Inline style of one character chip: its image colour as the border, with a faint tint of
 * the same colour behind the name so light and dark themes both keep the text readable.
 */
const chipStyle = (name: string): Record<string, string> => {
  const color = characterColor(name)
  if (color === null) return {}
  return {
    borderColor: color,
    backgroundColor: `${color}1f`,
  }
}

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
  /** Selected 角色, comma-separated in the URL; empty means 全部. */
  character: string
  /** Selected 制作人, comma-separated in the URL; empty means 全部. */
  producer: string
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
  character: characterFilter.value.join(','),
  producer: producerFilter.value.join(','),
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
        mode: current.mode === 'event' ? 'event' : undefined,
        series: seriesIsDefault ? undefined : current.series.join(','),
        from: current.from || undefined,
        to: current.to || undefined,
        broadcast: current.broadcast ? '1' : undefined,
        medley: current.medley ? '1' : undefined,
        character: current.character === '' ? undefined : current.character,
        producer: current.producer === '' ? undefined : current.producer,
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
  if (readString(url.mode) === 'event') mode.value = 'event'
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
  /** Splits a comma-separated URL filter into its values, ignoring blanks. */
  const readList = (value: string): string[] =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry !== '')
  characterFilter.value = readList(readString(url.character))
  producerFilter.value = readList(readString(url.producer))
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
  mode.value = 'show'
  selectedSeries.value = catalog.value?.series.map((row) => row.id) ?? []
  yearFrom.value = YEAR_ANY
  yearTo.value = YEAR_ANY
  includeBroadcast.value = false
  includeMedleyComponents.value = false
  characterFilter.value = []
  producerFilter.value = []
  sorting.value = [{ id: 'count', desc: true }]
}

/** Active filter count, shown next to the reset button. */
const activeFilters = computed(() => {
  let count = 0
  if (mode.value === 'event') count++
  if (yearOrNull(yearFrom.value) !== null || yearOrNull(yearTo.value) !== null) count++
  if (includeBroadcast.value) count++
  if (includeMedleyComponents.value) count++
  if (characterFilter.value.length > 0) count++
  if (producerFilter.value.length > 0) count++
  const all = catalog.value?.series.map((row) => row.id) ?? []
  if (selectedSeries.value.length !== all.length) count++
  return count
})

/** Options for 角色, built from characters that occur in the current ranking so every choice returns rows. */
const characterItems = computed(() =>
  availableCharacters(ranked.value).map(({ name, count }) => ({ label: `${name}（${count}）`, value: name })),
)

/** Drops selected characters that no longer occur, so the selection never filters the ranking to nothing. */
const keepCharacterFilterValid = (): void => {
  if (!catalog.value) return
  const allowed = new Set(characterItems.value.map((item) => item.value))
  characterFilter.value = characterFilter.value.filter((value) => allowed.has(value))
}
watch(characterItems, keepCharacterFilterValid)

/** Options for 制作人, built from the credit shown in each row so every choice returns rows. */
const producerItems = computed(() =>
  availableProducers(ranked.value).map(({ name, count }) => ({ label: `${name}（${count}）`, value: name })),
)

/** Drops selected producers that no longer occur, so the selection never filters the ranking to nothing. */
const keepProducerFilterValid = (): void => {
  if (!catalog.value) return
  const allowed = new Set(producerItems.value.map((item) => item.value))
  producerFilter.value = producerFilter.value.filter((value) => allowed.has(value))
}
watch(producerItems, keepProducerFilterValid)
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
</script>

<template>
  <main class="space-y-6">
    <section class="pt-4 sm:pt-8">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Hatsune Miku Concert Statistics</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-5xl">
        初音未来演唱会<br class="sm:hidden">曲目统计
      </h1>
      <p class="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
        按场次或按演出统计每首歌出现的次数。按场次时，一个演出里的每一天各算一次，同一天的日场与夜场也分别计算；
        按演出时，每个城市站各算一次，不再把同一年同一系列的多个城市合并。
        例如魔法未来 2020 在大阪与东京各有一个演出：按演出计 2 次，按场次计 6 次。
        默认不计配信、线上和 VR 演出，也不把串烧的组成歌曲单独计入。
        同一首歌的 remix、声库与翻唱版本按人工核对的清单合并计数。
      </p>
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
          <UButton :variant="mode === 'show' ? 'solid' : 'outline'" label="按场次" @click="mode = 'show'" />
          <UButton :variant="mode === 'event' ? 'solid' : 'outline'" label="按演出" @click="mode = 'event'" />
        </UFieldGroup>
        <label class="grid gap-1 text-xs text-muted">
          起始年
          <USelect v-model="yearFrom" :items="yearFromItems" size="sm" class="w-24" />
        </label>
        <label class="grid gap-1 text-xs text-muted">
          结束年
          <USelect v-model="yearTo" :items="yearToItems" size="sm" class="w-24" />
        </label>
        <label class="grid gap-1 text-xs text-muted">
          角色
          <USelectMenu
            v-model="characterFilter"
            :items="characterItems"
            value-key="value"
            multiple
            search-input
            :filter-fields="['label']"
            placeholder="全部角色"
            size="sm"
            class="w-36"
          />
        </label>
        <label class="grid gap-1 text-xs text-muted">
          制作人
          <USelectMenu
            v-model="producerFilter"
            :items="producerItems"
            value-key="value"
            multiple
            search-input
            :filter-fields="['label']"
            placeholder="全部制作人"
            size="sm"
            class="w-40"
          />
        </label>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-rotate-ccw"
          :label="activeFilters > 0 ? `重置 ${activeFilters}` : '重置'"
          :disabled="activeFilters === 0"
          class="ml-auto"
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
        <p class="text-xs text-muted">「含 N 个版本」表示原版与并入的 remix、声库或翻唱版本共 N 个</p>
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
          <div class="flex flex-nowrap items-center gap-x-2 overflow-hidden" :style="{ maxWidth: `${NAME_WIDTH}px` }">
            <UTooltip :text="row.original.titleText" :content="{ side: 'top' }">
              <NuxtLink
                :to="`/songs/${row.original.songId}`"
                class="min-w-0 truncate text-highlighted no-underline hover:text-primary"
              >
                <SongTitle :song-id="row.original.songId" :original="row.original.name" truncate />
              </NuxtLink>
            </UTooltip>
            <UTooltip v-if="row.original.variantSongIds.length > 0" :text="`并入：${row.original.variantNames}`">
              <UBadge color="secondary" variant="subtle" size="sm" class="shrink-0">
                含 {{ row.original.versionCount }} 个版本
              </UBadge>
            </UTooltip>
            <ULink
              :to="songHref(row.original.songId)"
              :target="songHrefTarget(row.original.songId)"
              class="shrink-0 text-dimmed hover:text-primary"
              :aria-label="songHrefTarget(row.original.songId) ? '在 VocaDB 查看' : '在站内查看'"
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
          <div
            v-if="row.original.characterList.length > 0"
            class="flex w-full flex-nowrap items-center gap-1 overflow-hidden"
          >
            <span
              v-for="name in row.original.characterChips"
              :key="name"
              class="shrink-0 rounded border px-1.5 py-0.5 text-xs"
              :style="chipStyle(name)"
            >
              {{ name }}
            </span>
            <UTooltip
              v-if="row.original.hiddenCharacterChips.length > 0"
              :content="{ side: 'top' }"
            >
              <UButton
                color="neutral"
                variant="subtle"
                size="xs"
                class="shrink-0 rounded border px-1.5 py-0.5 text-xs font-normal"
                :label="`+${row.original.hiddenCharacterChips.length}`"
              />
              <template #content>
                <div class="flex max-w-60 flex-wrap items-center gap-1">
                  <span
                    v-for="name in row.original.hiddenCharacterChips"
                    :key="name"
                    class="rounded border px-1.5 py-0.5 text-xs"
                    :style="chipStyle(name)"
                  >
                    {{ name }}
                  </span>
                </div>
              </template>
            </UTooltip>
          </div>
          <span v-else class="text-muted">—</span>
        </template>
        <template #count-cell="{ row }">
          <UBadge v-if="!row.original.approximate" color="primary" variant="subtle">
            {{ row.original.count }}
          </UBadge>
          <UTooltip
            v-else
            :content="{ side: 'top', align: 'center' }"
            :ui="{ content: 'h-auto max-w-64 items-start whitespace-normal py-2' }"
          >
            <UBadge color="warning" variant="subtle" class="cursor-help" tabindex="0">
              ≈ {{ row.original.count }}
            </UBadge>
            <template #content>
              <div class="w-60 space-y-1">
                <p class="text-xs">以下演出尚未确认具体表演场次数：</p>
                <ul class="list-disc space-y-0.5 pl-4 text-xs">
                  <li v-for="show in row.original.approximateShows" :key="show.id">
                    <NuxtLink :to="`/shows/${show.id}`" class="text-primary underline-offset-2 hover:underline">
                      {{ show.name }}
                    </NuxtLink>
                  </li>
                </ul>
              </div>
            </template>
          </UTooltip>
        </template>
        <template #performanceCount-cell="{ row }">
          <span class="tabular-nums text-muted">{{ row.original.performanceCount }}</span>
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
            description="放宽年份与系列筛选。"
            variant="naked"
          />
        </template>
      </UTable>
      <USkeleton v-else class="h-72 w-full rounded-xl" />
    </section>
  </main>
</template>
