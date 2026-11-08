<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useCatalog } from '~/composables/useCatalog.ts'
import { characterNames, characterRules } from '~/composables/useCharacters.ts'
import { useCharacterNames } from '~/composables/useCharacterNames.ts'
import { placeNames, usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import { useSongVariants } from '~/composables/useSongVariants.ts'
import { buildCityIndex, matchCity } from '~~/shared/cities.ts'
import { buildProducerIndex } from '~~/shared/producers.ts'
import { emptySongVariantIndex } from '~~/shared/song-variants.ts'
import type { RankingMode } from '~~/shared/stats.ts'
import { buildTimeline, UNKNOWN_CHARACTER, type NewSongBaseline, type TimelineCount } from '~~/shared/timeline.ts'
import { availablePerformanceYears, normalizeYearRange } from '~~/shared/year-range.ts'

/** One chart series passed to the SVG components; `dashed` is ignored by the bar chart. */
type ChartSeries = {
  key: string
  label: string
  color: string
  values: number[]
  dashed?: boolean
}

/** Palette taken from the `@theme` tokens in `app/assets/css/main.css` plus Tailwind's default scales. */
const PALETTE = [
  'var(--color-miku-400)',
  'var(--color-magenta-500)',
  'var(--color-amber-500)',
  'var(--color-violet-500)',
  'var(--color-sky-500)',
  'var(--color-emerald-500)',
  'var(--color-rose-500)',
] as const
const OTHER_COLOR = 'var(--color-slate-400)'
const UNKNOWN_COLOR = 'var(--color-slate-500)'

/** Years a chart can jump to, in page order. */
const CHARTS = [
  { key: 'shows', label: '场次 / 系列' },
  { key: 'characters', label: '角色出场' },
  { key: 'new-songs', label: '新曲 / 复演' },
  { key: 'series-spans', label: '系列活跃' },
  { key: 'cities', label: '城市迁移' },
] as const

/** Sentinel for an open side of the year range; Reka UI cannot bind an empty select value. */
const YEAR_ANY = 0

const { catalog, error, pending, load } = useCatalog()
const { localizePlace } = usePlaceNames()
const { localizeSeries, localizePerformanceSeries } = useSeriesTitles()
const { localizeCharacter, compareCharacters } = useCharacterNames()
const { songName } = useSongLookup()
const variants = useSongVariants()
const route = useRoute()

/** Parsed once: the checked place list and its matchers never change at runtime. */
const cityIndex = buildCityIndex(placeNames)

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const mode = ref<RankingMode>('show')
const selectedSeries = ref<number[]>([])
const selectedCities = ref<string[]>([])
const selectedProducers = ref<string[]>([])
const selectedCharacters = ref<string[]>([])
const yearFrom = ref<number>(YEAR_ANY)
const yearTo = ref<number>(YEAR_ANY)
const includeBroadcast = ref(true)
const mergeVariants = ref(false)
const newSongBaseline = ref<NewSongBaseline>('catalog')
const seriesFocus = ref<number>(0)
const focusedChart = ref<string>('')
/** Whether chart 3 also draws the 未识别 bucket, which is usually much larger than any single character. */
const showUnknownCharacters = ref(false)

/** Mirrors the filter state into the URL once the page is interactive. */
const mounted = ref(false)

/** Four-digit year, or null for an open side. */
const yearOrNull = (value: string): number | null => {
  if (!/^\d{4}$/.test(value.trim())) return null
  return Number(value.trim())
}

/** Selected bounds with an inverted range swapped, matching the ranking pickers. */
const yearRange = computed(() => normalizeYearRange({
  from: yearFrom.value === YEAR_ANY ? null : yearFrom.value,
  to: yearTo.value === YEAR_ANY ? null : yearTo.value,
}))

/** Catalog-wide aggregation of the current filters; null until the catalog is loaded. */
const timeline = computed(() => {
  if (!catalog.value) return null
  return buildTimeline(catalog.value, {
    mode: mode.value,
    includeBroadcast: includeBroadcast.value,
    seriesIds: selectedSeries.value,
    cityNames: selectedCities.value,
    producers: selectedProducers.value,
    characters: selectedCharacters.value,
    yearFrom: yearRange.value.from,
    yearTo: yearRange.value.to,
    variants: mergeVariants.value ? variants : emptySongVariantIndex(),
    characterRules,
    cityIndex,
    newSongBaseline: newSongBaseline.value,
  })
})

/** Series row by id, used for labels and chart links. */
const seriesById = computed(() => new Map((catalog.value?.series ?? []).map((row) => [row.id, row])))

/** Series name in the site language; the id stands in when the catalog has no row. */
const seriesLabel = (id: number): string => {
  const series = seriesById.value.get(id)
  return series === undefined ? `系列 ${id}` : localizeSeries(series.name)
}

/** Series options for the filter and the chart focus control. */
const seriesItems = computed(() => {
  const rows = [...(catalog.value?.series ?? [])].sort(
    (left, right) => localizeSeries(left.name).localeCompare(localizeSeries(right.name), 'zh'),
  )
  return rows.map((series) => ({ label: localizeSeries(series.name), value: series.id }))
})

/** Cities recognised in the catalog, most 演出 first; unknown cities never enter the list. */
const cityItems = computed(() => {
  const counts = new Map<string, number>()
  for (const performance of catalog.value?.performances ?? []) {
    const match = matchCity(performance, cityIndex)
    if (match === null) continue
    counts.set(match.city, (counts.get(match.city) ?? 0) + 1)
  }
  const rows = [...counts].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'zh'))
  return rows.map(([city, count]) => ({ label: `${city}（${count}）`, value: city }))
})

/** Producer names from the catalog index, the same list `/producers` prints. */
const producerItems = computed(() => {
  if (!catalog.value) return []
  const index = buildProducerIndex(catalog.value)
  return index.rows.map((row) => ({ label: `${row.name}（${row.songCount}）`, value: row.name }))
})

/** Character options from `data/characters.json`, in config order; `value` stays the canonical name. */
const characterItems = computed(() => [...characterNames]
  .sort(compareCharacters)
  .map((name) => ({ label: localizeCharacter(name), value: name })))

/** Position of a character in `data/characters.json`; unknown names sort last. */
const characterRank = new Map(characterNames.map((name, index) => [name, index]))

/** Compares two character buckets by their `data/characters.json` position. */
const compareByCharacterRank = (left: TimelineCount, right: TimelineCount): number =>
  (characterRank.get(left.name) ?? Number.MAX_SAFE_INTEGER) - (characterRank.get(right.name) ?? Number.MAX_SAFE_INTEGER)

/** Calendar years present in the catalog, newest first. */
const yearOptions = computed(() => availablePerformanceYears(catalog.value?.performances ?? []))

/** Items shared by both year pickers. */
const yearItems = computed(() => [
  { label: '不限', value: YEAR_ANY },
  ...yearOptions.value.map((year) => ({ label: `${year} 年`, value: year })),
])

/** Series rows behind the stacked chart, grouped into the top five plus 其他. */
const seriesChartBars = computed<ChartSeries[]>(() => {
  const current = timeline.value
  if (current === null) return []
  const index = new Map<string, number>()
  for (const row of current.seriesByYear) index.set(`${row.year}:${row.seriesId}`, row.shows)
  const valuesOf = (seriesId: number): number[] => current.years.map((year) => index.get(`${year}:${seriesId}`) ?? 0)
  if (seriesFocus.value !== 0) return [{
    key: `series:${seriesFocus.value}`,
    label: seriesLabel(seriesFocus.value),
    color: PALETTE[0],
    values: valuesOf(seriesFocus.value),
  }]
  const ordered = [...current.seriesSpans].sort(
    (left, right) => right.shows - left.shows || left.seriesId - right.seriesId,
  )
  const top = ordered.slice(0, 5)
  const rest = ordered.slice(5)
  const bars: ChartSeries[] = top.map((span, position) => ({
    key: `series:${span.seriesId}`,
    label: seriesLabel(span.seriesId),
    color: PALETTE[position % PALETTE.length] ?? OTHER_COLOR,
    values: valuesOf(span.seriesId),
  }))
  if (rest.length > 0) {
    bars.push({
      key: 'other',
      label: `其他（${rest.length} 个系列）`,
      color: OTHER_COLOR,
      values: current.years.map((year) => rest.reduce((sum, span) => sum + (index.get(`${year}:${span.seriesId}`) ?? 0), 0)),
    })
  }
  return bars
})

/** Series focus options: 全部 plus every catalog series. */
const seriesFocusItems = computed(() => [{ label: '全部系列', value: 0 }, ...seriesItems.value])

/** Character counts by year, split by bucket name. */
const characterYearIndex = computed(() => {
  const index = new Map<string, Map<number, number>>()
  for (const row of timeline.value?.characterByYear ?? []) {
    const byYear = index.get(row.name) ?? new Map<number, number>()
    byYear.set(row.year, row.count)
    index.set(row.name, byYear)
  }
  return index
})

/** Distinct-song counts of each character bucket by year, behind the stacked bars of chart 3. */
const characterSongYearIndex = computed(() => {
  const index = new Map<string, Map<number, number>>()
  for (const row of timeline.value?.characterSongByYear ?? []) {
    const byYear = index.get(row.name) ?? new Map<number, number>()
    byYear.set(row.year, row.count)
    index.set(row.name, byYear)
  }
  return index
})

/** One bucket of chart 3: its colour plus the per-year 出场 and 曲目 numbers it is drawn from. */
type CharacterBucket = {
  key: string
  label: string
  color: string
  /** 出场数, the lines on the right axis. */
  appearances: number[]
  /** 曲目数 of the year, the stacked bars. */
  songs: number[]
  dashed: boolean
}

/**
 * Buckets shown by chart 3: the selected names, or the six most frequent plus 其他 and 未识别.
 * The picked rows keep their frequency ranking, then the legend prints them in `data/characters.json`
 * order (初音ミク → 鏡音リン → 鏡音レン → 巡音ルカ …) so the stack reads like the character filter.
 */
const characterChartBuckets = computed<CharacterBucket[]>(() => {
  const current = timeline.value
  if (current === null) return []
  /** Per-year values of one bucket from one of the two indices. */
  const valuesOf = (index: Map<string, Map<number, number>>, name: string): number[] =>
    current.years.map((year) => index.get(name)?.get(year) ?? 0)
  const known = current.characterTotals.filter((row) => row.name !== UNKNOWN_CHARACTER)
  const shown = (selectedCharacters.value.length > 0
    ? known.filter((row) => selectedCharacters.value.includes(row.name))
    : known.slice(0, 6)
  ).sort(compareByCharacterRank)
  const buckets: CharacterBucket[] = shown.map((row, position) => ({
    key: row.name,
    label: localizeCharacter(row.name),
    color: PALETTE[position % PALETTE.length] ?? OTHER_COLOR,
    appearances: valuesOf(characterYearIndex.value, row.name),
    songs: valuesOf(characterSongYearIndex.value, row.name),
    dashed: false,
  }))
  if (selectedCharacters.value.length === 0) {
    const shownNames = new Set(shown.map((row) => row.name))
    const rest = known.filter((row) => !shownNames.has(row.name))
    if (rest.length > 0) {
      buckets.push({
        key: '__other',
        label: `其他（${rest.length} 位）`,
        color: OTHER_COLOR,
        appearances: current.years.map((year) => rest.reduce((sum, row) => sum + (characterYearIndex.value.get(row.name)?.get(year) ?? 0), 0)),
        songs: current.years.map((year) => rest.reduce((sum, row) => sum + (characterSongYearIndex.value.get(row.name)?.get(year) ?? 0), 0)),
        dashed: false,
      })
    }
  }
  if (showUnknownCharacters.value && current.characterTotals.some((row) => row.name === UNKNOWN_CHARACTER)) {
    buckets.push({
      key: UNKNOWN_CHARACTER,
      label: UNKNOWN_CHARACTER,
      color: UNKNOWN_COLOR,
      appearances: valuesOf(characterYearIndex.value, UNKNOWN_CHARACTER),
      songs: valuesOf(characterSongYearIndex.value, UNKNOWN_CHARACTER),
      dashed: true,
    })
  }
  return buckets
})

/** Chart 3 bars: distinct songs per bucket, stacked so every year's column is one colour per role. */
const characterChartBars = computed<ChartSeries[]>(() =>
  characterChartBuckets.value.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    color: bucket.color,
    values: bucket.songs,
  })),
)

/** Chart 3 right-axis lines: 出场数 per bucket, one line per role in the same colours as the bars. */
const characterChartSeries = computed<ChartSeries[]>(() =>
  characterChartBuckets.value.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    color: bucket.color,
    values: bucket.appearances,
    dashed: bucket.dashed,
  })),
)

/** Appearance count of the 未识别 bucket, shown next to its toggle and in the note. */
const unknownCharacterCount = computed(() =>
  timeline.value?.characterTotals.find((row) => row.name === UNKNOWN_CHARACTER)?.count ?? 0,
)

/** Chart 4 bars: new and returning songs per year. */
const songChartBars = computed<ChartSeries[]>(() => {
  const current = timeline.value
  if (current === null) return []
  return [
    { key: 'new', label: '新曲', color: PALETTE[0], values: current.songByYear.map((row) => row.newSongs) },
    { key: 'returning', label: '复演曲', color: PALETTE[1], values: current.songByYear.map((row) => row.returning) },
  ]
})

/** Chart 4 right-axis line: the share of that year's distinct songs that were new. */
const songChartLines = computed<ChartSeries[]>(() => {
  const current = timeline.value
  if (current === null) return []
  return [{
    key: 'ratio',
    label: '新曲占比',
    color: PALETTE[2],
    values: current.songByYear.map((row) => row.newRatio ?? 0),
  }]
})

/** Chart 6 bars: 演出 in Japan, abroad, and with no country code, stacked to the full total. */
const cityChartBars = computed<ChartSeries[]>(() => {
  const current = timeline.value
  if (current === null) return []
  return [
    { key: 'domestic', label: '日本国内', color: PALETTE[0], values: current.cityByYear.map((row) => row.domestic) },
    { key: 'overseas', label: '海外', color: PALETTE[1], values: current.cityByYear.map((row) => row.overseas) },
    { key: 'unknown-country', label: '国家未知', color: OTHER_COLOR, values: current.cityByYear.map((row) => row.unknownCountry) },
  ]
})

/** Chart 6 left line: cities that appeared for the first time that year. */
const cityChartLines = computed<ChartSeries[]>(() => {
  const current = timeline.value
  if (current === null) return []
  return [{
    key: 'new-cities',
    label: '当年新城市',
    color: PALETTE[2],
    values: current.cityByYear.map((row) => row.newCities),
  }]
})

/** Chart 6 right line: the overseas share of that year's Japan-vs-abroad 演出. */
const cityChartRatios = computed<ChartSeries[]>(() => {
  const current = timeline.value
  if (current === null) return []
  return [{
    key: 'overseas-ratio',
    label: '海外占比',
    color: PALETTE[4],
    values: current.cityByYear.map((row) => row.overseasRatio ?? 0),
  }]
})

/** Gantt rows of the series chart, most 演出 first. */
const seriesSpans = computed(() => {
  const current = timeline.value
  if (current === null) return []
  return [...current.seriesSpans]
    .sort((left, right) => right.performances - left.performances || left.seriesId - right.seriesId)
    .map((span, position) => ({
      key: `series:${span.seriesId}`,
      label: seriesLabel(span.seriesId),
      color: PALETTE[position % PALETTE.length] ?? OTHER_COLOR,
      first: span.firstYear,
      last: span.lastYear,
      count: span.performances,
    }))
})

/** Year picked on chart 1, whose 演出 are listed under it. */
const showsYear = ref<number | null>(null)
/** Year picked on chart 3, whose character buckets are listed under it. */
const characterYear = ref<number | null>(null)
/** Year picked on chart 4, whose new and returning songs are listed under it. */
const songsYear = ref<number | null>(null)
/** Year picked on chart 6, whose coverage numbers are listed under it. */
const cityYear = ref<number | null>(null)

/** 演出 of the picked year, with their names and links. */
const showsYearPerformances = computed(() => {
  const current = timeline.value
  if (current === null || showsYear.value === null) return []
  const byId = new Map((catalog.value?.performances ?? []).map((row) => [row.id, row]))
  return current.performances
    .filter((row) => row.year === showsYear.value)
    .flatMap((row) => {
      const performance = byId.get(row.id)
      if (performance === undefined) return []
      const series = seriesById.value.get(performance.series_id)
      const label = localizePlace(localizePerformanceSeries(performance.name, series?.name ?? '', performance.series_number))
      return [{ ...row, label }]
    })
})

/** Character buckets of the picked year. */
const characterYearRows = computed(() => {
  const current = timeline.value
  if (current === null || characterYear.value === null) return []
  return current.characterByYear
    .filter((row) => row.year === characterYear.value)
    .sort((left, right) => right.count - left.count || compareCharacters(left.name, right.name))
})

/** New and returning songs of the picked year. */
const songsYearRow = computed(() => {
  const current = timeline.value
  if (current === null || songsYear.value === null) return null
  return current.songByYear.find((row) => row.year === songsYear.value) ?? null
})

/** City coverage of the picked year. */
const cityYearRow = computed(() => {
  const current = timeline.value
  if (current === null || cityYear.value === null) return null
  return current.cityByYear.find((row) => row.year === cityYear.value) ?? null
})

/** Query keys mirrored into the URL. */
type FilterState = {
  mode: string
  series: string
  city: string
  producer: string
  character: string
  from: string
  to: string
  broadcast: string
  merge: string
  baseline: string
  chart: string
}

/** Current filter state in URL form; empty strings are dropped before navigating. */
const state = computed<FilterState>(() => ({
  mode: mode.value === 'event' ? 'event' : '',
  series: selectedSeries.value.join(','),
  city: selectedCities.value.join(','),
  producer: selectedProducers.value.join(','),
  character: selectedCharacters.value.join(','),
  from: yearFrom.value === YEAR_ANY ? '' : String(yearFrom.value),
  to: yearTo.value === YEAR_ANY ? '' : String(yearTo.value),
  broadcast: includeBroadcast.value ? '' : '0',
  merge: mergeVariants.value ? '1' : '',
  baseline: newSongBaseline.value === 'filtered' ? 'filtered' : '',
  chart: focusedChart.value,
}))

/** Replaces the query string without adding history entries. */
const syncUrl = (): void => {
  if (!mounted.value) return
  const current = state.value
  void navigateTo(
    {
      query: {
        mode: current.mode === '' ? undefined : current.mode,
        series_id: current.series === '' ? undefined : current.series,
        city: current.city === '' ? undefined : current.city,
        producer: current.producer === '' ? undefined : current.producer,
        character: current.character === '' ? undefined : current.character,
        from: current.from === '' ? undefined : current.from,
        to: current.to === '' ? undefined : current.to,
        broadcast: current.broadcast === '' ? undefined : current.broadcast,
        merge: current.merge === '' ? undefined : current.merge,
        baseline: current.baseline === '' ? undefined : current.baseline,
        chart: current.chart === '' ? undefined : current.chart,
      },
    },
    { replace: true },
  )
}
watch(state, syncUrl, { deep: true })

/** Splits a comma-separated URL filter into its values, ignoring blanks. */
const readList = (value: string): string[] => value.split(',').map((entry) => entry.trim()).filter((entry) => entry !== '')

/** Restores filters from the URL. Runs after hydration so SSR output stays stable. */
const readUrl = (): void => {
  const query = route.query
  const read = (value: unknown): string => (typeof value === 'string' ? value : '')
  if (read(query.mode) === 'event') mode.value = 'event'
  const series = readList(read(query.series_id))
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
  if (series.length > 0) selectedSeries.value = series
  selectedCities.value = readList(read(query.city))
  selectedProducers.value = readList(read(query.producer))
  selectedCharacters.value = readList(read(query.character))
  const restored = normalizeYearRange({ from: yearOrNull(read(query.from)), to: yearOrNull(read(query.to)) })
  yearFrom.value = restored.from === null ? YEAR_ANY : restored.from
  yearTo.value = restored.to === null ? YEAR_ANY : restored.to
  includeBroadcast.value = read(query.broadcast) !== '0'
  mergeVariants.value = read(query.merge) === '1'
  newSongBaseline.value = read(query.baseline) === 'filtered' ? 'filtered' : 'catalog'
  const chart = read(query.chart)
  focusedChart.value = CHARTS.some((entry) => entry.key === chart) ? chart : ''
  mounted.value = true
}

/** Drops a series selection equal to the whole catalog, so 全部 needs no query value. */
const normalizeSeriesSelection = (): void => {
  if (catalog.value === null) return
  if (selectedSeries.value.length === catalog.value.series.length) selectedSeries.value = []
}
watch(selectedSeries, normalizeSeriesSelection, { deep: true })

/** Restores the URL once at mount. */
onMounted(() => {
  readUrl()
})

/** One removable condition. */
type Chip = { key: string; label: string }

/** Every non-default condition, in display order. */
const chips = computed<Chip[]>(() => {
  const list: Chip[] = []
  if (mode.value === 'event') list.push({ key: 'mode', label: '按演出' })
  if (!includeBroadcast.value) list.push({ key: 'broadcast', label: '不含配信' })
  if (mergeVariants.value) list.push({ key: 'merge', label: '合并版本' })
  if (newSongBaseline.value === 'filtered') list.push({ key: 'baseline', label: '新曲基准：当前筛选' })
  for (const id of selectedSeries.value) list.push({ key: `series:${id}`, label: seriesLabel(id) })
  for (const name of selectedCities.value) list.push({ key: `city:${name}`, label: `城市：${name}` })
  for (const name of selectedProducers.value) list.push({ key: `producer:${name}`, label: `P主：${name}` })
  for (const name of selectedCharacters.value) list.push({ key: `character:${name}`, label: `角色：${name}` })
  if (yearRange.value.from !== null || yearRange.value.to !== null) {
    list.push({ key: 'range', label: `年份：${yearRange.value.from ?? '最早'}–${yearRange.value.to ?? '最近'}` })
  }
  return list
})

/** Count of active conditions, shown on the reset button. */
const activeCount = computed(() => chips.value.length)

/** Removes one condition from its chip. */
const removeChip = (key: string): void => {
  if (key === 'mode') {
    mode.value = 'show'
    return
  }
  if (key === 'broadcast') {
    includeBroadcast.value = true
    return
  }
  if (key === 'merge') {
    mergeVariants.value = false
    return
  }
  if (key === 'baseline') {
    newSongBaseline.value = 'catalog'
    return
  }
  if (key === 'range') {
    yearFrom.value = YEAR_ANY
    yearTo.value = YEAR_ANY
    return
  }
  const [kind, ...rest] = key.split(':')
  const value = rest.join(':')
  if (kind === 'series') selectedSeries.value = selectedSeries.value.filter((id) => String(id) !== value)
  if (kind === 'city') selectedCities.value = selectedCities.value.filter((name) => name !== value)
  if (kind === 'producer') selectedProducers.value = selectedProducers.value.filter((name) => name !== value)
  if (kind === 'character') selectedCharacters.value = selectedCharacters.value.filter((name) => name !== value)
}

/** Clears every filter and chart focus back to the default view. */
const reset = (): void => {
  mode.value = 'show'
  selectedSeries.value = []
  selectedCities.value = []
  selectedProducers.value = []
  selectedCharacters.value = []
  yearFrom.value = YEAR_ANY
  yearTo.value = YEAR_ANY
  includeBroadcast.value = true
  mergeVariants.value = false
  newSongBaseline.value = 'catalog'
  seriesFocus.value = 0
  focusedChart.value = ''
  showUnknownCharacters.value = false
  showsYear.value = null
  characterYear.value = null
  songsYear.value = null
  cityYear.value = null
}

/** Scrolls to one chart and records the focus in the URL. */
const goToChart = async (key: string): Promise<void> => {
  focusedChart.value = key
  await nextTick()
  document.getElementById(`chart-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** Open state of the folded chart navigation shown below the side-rail breakpoint. */
const chartMenuOpen = ref(false)

/** Scrolls to one chart from the folded menu and closes it. */
const selectChartFromMenu = (key: string): void => {
  chartMenuOpen.value = false
  void goToChart(key)
}

/** Chart 1's click handler: a bar segment opens its series, empty band space toggles the year list. */
const selectSeriesSegment = (payload: { year: number; key: string }): void => {
  if (payload.key === '') {
    showsYear.value = showsYear.value === payload.year ? null : payload.year
    return
  }
  const id = Number(payload.key.replace('series:', ''))
  if (Number.isInteger(id) && id > 0) void navigateTo(`/series/${id}`)
}

/** Opens the series page behind a gantt strip. */
const selectSeriesSpan = (payload: { key: string }): void => {
  const id = Number(payload.key.replace('series:', ''))
  if (Number.isInteger(id) && id > 0) void navigateTo(`/series/${id}`)
}

/** Toggles the detail list of one year on chart 3. */
const selectCharacterYear = (payload: { year: number }): void => {
  characterYear.value = characterYear.value === payload.year ? null : payload.year
}

/** Toggles the detail list of one year on chart 4. */
const selectSongsYear = (payload: { year: number }): void => {
  songsYear.value = songsYear.value === payload.year ? null : payload.year
}

/** Toggles the coverage note of one year on chart 6. */
const selectCityYear = (payload: { year: number }): void => {
  cityYear.value = cityYear.value === payload.year ? null : payload.year
}

/** Unit line printed on the character chart. */
const characterUnit = computed(() =>
  `柱=曲目数（按角色堆叠），线=出场数 · ${mode.value === 'show' ? '按场次去重' : '按演出去重'}`,
)

/** Note under the new-song chart, which explains the active baseline. */
const newSongNote = computed(() => (newSongBaseline.value === 'catalog'
  ? '新曲 = 站内最早演出年份等于该年的曲目（全目录基准，不受系列 / 城市 / 角色筛选影响）；复演曲 = 更早年份已经登场。'
  : '新曲 = 当前筛选范围内最早演出年份等于该年的曲目；复演曲 = 筛选范围内更早年份已经登场。'))

/** Note printed with the excluded-row totals at the top of the page. */
const exclusionNote = computed(() => {
  const current = timeline.value
  if (current === null) return ''
  const parts: string[] = [`无日期的演出 ${current.excludedUndated} 个未进入年份图表`]
  if (current.excludedByYear > 0) parts.push(`另 ${current.excludedByYear} 个演出在年份范围外`)
  if (current.unknownCityPerformances > 0) {
    parts.push(`${current.unknownCityPerformances} 个演出（${current.unknownCityShows} 场次）未识别城市`)
  }
  return `${parts.join('；')}。`
})

/** Number of identified cities in the catalog. */
const cityCount = computed(() => cityItems.value.length)

/** Character tokens that matched no rule, joined for the note under chart 3; the list is capped so the page stays readable. */
const unknownCharacterNote = computed(() => {
  const rows = timeline.value?.unknownCharacterTokens ?? []
  if (rows.length === 0) return ''
  const shown = rows.slice(0, 8).map((row) => `${row.name}（${row.count}）`)
  const rest = rows.length - shown.length
  return rest > 0 ? `${shown.join('、')} 等 ${rows.length} 个署名` : shown.join('、')
})

/** 演出 whose `country_code` is missing, so the domestic / overseas split cannot count them. */
const unknownCountryTotal = computed(() =>
  (timeline.value?.cityByYear ?? []).reduce((sum, row) => sum + row.unknownCountry, 0),
)

/** Restores the chart scroll position when a shared link names a chart. */
watch(catalog, async (value) => {
  if (value === null || focusedChart.value === '') return
  await nextTick()
  document.getElementById(`chart-${focusedChart.value}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})

/** Keeps the selected chart in sync with back / forward navigation. */
watch(() => route.query.chart, (value) => {
  const chart = typeof value === 'string' ? value : ''
  focusedChart.value = CHARTS.some((entry) => entry.key === chart) ? chart : ''
})
</script>

<template>
  <div class="xl:flex xl:items-start xl:gap-8">
    <nav class="hidden xl:sticky xl:top-24 xl:block xl:w-36 xl:shrink-0" aria-label="图表导航">
      <p class="mb-1.5 px-2.5 text-xs font-medium tracking-[0.12em] text-muted uppercase">图表</p>
      <ul class="flex flex-col gap-0.5">
        <li v-for="chart in CHARTS" :key="chart.key">
          <UButton
            block
            :variant="focusedChart === chart.key ? 'soft' : 'ghost'"
            color="neutral"
            size="sm"
            class="justify-start"
            :label="chart.label"
            @click="goToChart(chart.key)"
          />
        </li>
      </ul>
    </nav>

    <main class="min-w-0 flex-1 space-y-6">
    <section class="pt-4 sm:pt-8">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Hatsune Miku Concert Statistics</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-5xl">
        演唱会<br class="sm:hidden">时间线
      </h1>
      <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <UBadge v-if="timeline" color="primary" variant="subtle" icon="i-lucide-clock">{{ timeline.totals.shows }} 个场次</UBadge>
        <UBadge v-if="timeline" color="neutral" variant="subtle" icon="i-lucide-calendar-range">{{ timeline.totals.performances }} 个演出</UBadge>
        <UBadge v-if="timeline?.years.length" color="neutral" variant="subtle">
          {{ timeline.years[0] }}–{{ timeline.years[timeline.years.length - 1] }}
        </UBadge>
        <UBadge v-if="timeline" color="neutral" variant="subtle" icon="i-lucide-map-pin">{{ cityCount }} 个城市</UBadge>
        <UButton to="/series" color="neutral" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">系列总览</UButton>
        <UButton to="/" color="neutral" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">曲目排行</UButton>
      </div>
      <p v-if="timeline" class="mt-3 text-xs leading-relaxed text-muted">
        统计在浏览器里完成，口径与 /series、/cities、/producers、曲目排行一致。{{ exclusionNote }}
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
        <FilterField label="起始年">
          <USelect v-model="yearFrom" :items="yearItems" size="sm" class="w-24" />
        </FilterField>
        <FilterField label="结束年">
          <USelect v-model="yearTo" :items="yearItems" size="sm" class="w-24" />
        </FilterField>
        <FilterField label="系列">
          <USelectMenu
            v-model="selectedSeries"
            :items="seriesItems"
            value-key="value"
            multiple
            search-input
            :filter-fields="['label']"
            placeholder="全部系列"
            size="sm"
            class="w-44"
          />
        </FilterField>
        <FilterField label="城市">
          <USelectMenu
            v-model="selectedCities"
            :items="cityItems"
            value-key="value"
            multiple
            search-input
            :filter-fields="['label']"
            placeholder="全部城市"
            size="sm"
            class="w-36"
          />
        </FilterField>
        <FilterField label="制作人">
          <USelectMenu
            v-model="selectedProducers"
            :items="producerItems"
            value-key="value"
            multiple
            search-input
            :filter-fields="['label']"
            placeholder="全部制作人"
            size="sm"
            class="w-40"
          />
        </FilterField>
        <FilterField label="角色">
          <USelectMenu
            v-model="selectedCharacters"
            :items="characterItems"
            value-key="value"
            multiple
            search-input
            :filter-fields="['label']"
            placeholder="全部角色"
            size="sm"
            class="w-36"
          />
        </FilterField>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-rotate-ccw"
          :label="activeCount > 0 ? `重置 ${activeCount}` : '重置'"
          :disabled="activeCount === 0"
          class="ml-auto"
          @click="reset"
        />
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <UCheckbox v-model="includeBroadcast" label="计入配信 / 线上 / VR" size="sm" />
        <UCheckbox v-model="mergeVariants" label="合并版本" size="sm" />
        <span class="text-xs text-muted">默认连线上直播和 VR 演出一起统计，所以总数与「系列总览」一致；取消勾选后只算现场演唱会，与「城市」「曲目排行」的口径一致。</span>
      </div>
    </UCard>

    <div v-if="chips.length > 0" class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-muted">已选条件</span>
      <UButton
        v-for="chip in chips"
        :key="chip.key"
        color="neutral"
        variant="subtle"
        size="xs"
        trailing-icon="i-lucide-x"
        :label="chip.label"
        @click="removeChip(chip.key)"
      />
      <UButton color="neutral" variant="ghost" size="xs" label="清空" @click="reset" />
    </div>

    <template v-if="pending && !timeline">
      <USkeleton v-for="index in 2" :key="index" class="h-72 w-full" />
    </template>

    <template v-else-if="timeline">
      <section id="chart-shows" class="scroll-mt-24">
        <TimelineChartCard
          title="场次数年度变化"
          unit="按场次计数 · 颜色区分系列"
          note="默认堆叠前 5 个系列，其余并入「其他」；日场 / 夜场由场次说明中已核实的昼夜证据拆分。点击柱段进入系列页，点击柱间空白展开该年演出列表。"
        >
          <template #actions>
            <FilterField label="系列聚焦">
              <USelect v-model="seriesFocus" :items="seriesFocusItems" size="sm" class="w-48" />
            </FilterField>
          </template>
          <TimelineBarChart
            :years="timeline.years"
            :bars="seriesChartBars"
            stacked
            unit="场次"
            @select="selectSeriesSegment"
          />
          <template #footer>
            <div v-if="showsYear !== null" class="mt-3 border-t border-default/60 pt-3">
              <p class="mb-2 text-xs text-muted">{{ showsYear }} 年 · {{ showsYearPerformances.length }} 个演出</p>
              <ul class="max-h-64 space-y-1 overflow-y-auto pr-1 text-xs">
                <li v-for="row in showsYearPerformances" :key="row.id" class="flex flex-wrap items-baseline gap-x-2">
                  <span class="font-mono text-dimmed">{{ row.startDate }}</span>
                  <NuxtLink :to="`/shows/${row.id}`" class="text-primary hover:underline">{{ row.label }}</NuxtLink>
                  <span class="text-muted">{{ row.shows }} 场</span>
                </li>
              </ul>
            </div>
          </template>
        </TimelineChartCard>
      </section>

      <section id="chart-characters" class="scroll-mt-24">
        <TimelineChartCard
          title="角色出场数与曲目数年度变化"
          :unit="characterUnit"
          note="柱是该年演出过的、带该角色的不同曲目数，按角色堆叠，每段用该角色的颜色；折线是出场数：同一场演出里同一角色多首歌只计一次，跨日场 / 夜场按场次分别计。未识别角色单独计入「未识别」。"
        >
          <template #actions>
            <UCheckbox
              v-if="unknownCharacterCount > 0"
              v-model="showUnknownCharacters"
              :label="`显示未识别（${unknownCharacterCount}）`"
              size="sm"
            />
          </template>
          <TimelineBarChart
            :years="timeline.years"
            :bars="characterChartBars"
            :right-lines="characterChartSeries"
            stacked
            unit="曲目"
            right-unit="出场"
            height="320"
            @select="selectCharacterYear"
          />
          <template #footer>
            <div v-if="characterYear !== null" class="mt-3 border-t border-default/60 pt-3">
              <p class="mb-2 text-xs text-muted">{{ characterYear }} 年角色出场</p>
              <div class="flex flex-wrap gap-2">
                <UBadge v-for="row in characterYearRows" :key="row.name" color="neutral" variant="subtle" size="sm">
                  {{ localizeCharacter(row.name) }} {{ row.count }}
                </UBadge>
              </div>
            </div>
            <p v-if="unknownCharacterNote" class="mt-2 text-xs text-muted">未识别署名：{{ unknownCharacterNote }}</p>
          </template>
        </TimelineChartCard>
      </section>

      <section id="chart-new-songs" class="scroll-mt-24">
        <TimelineChartCard
          title="新曲 / 复演曲年度变化"
          unit="柱=曲目数，右轴线=新曲占比"
          :note="newSongNote"
        >
          <template #actions>
            <UFieldGroup size="sm">
              <UButton
                :variant="newSongBaseline === 'catalog' ? 'solid' : 'outline'"
                label="全目录基准"
                @click="newSongBaseline = 'catalog'"
              />
              <UButton
                :variant="newSongBaseline === 'filtered' ? 'solid' : 'outline'"
                label="当前筛选范围"
                @click="newSongBaseline = 'filtered'"
              />
            </UFieldGroup>
          </template>
          <TimelineBarChart
            :years="timeline.years"
            :bars="songChartBars"
            :right-lines="songChartLines"
            right-format="percent"
            unit="曲目"
            right-unit="占比"
            @select="selectSongsYear"
          />
          <template #footer>
            <div v-if="songsYearRow" class="mt-3 space-y-2 border-t border-default/60 pt-3 text-xs">
              <p class="text-muted">
                {{ songsYearRow.year }} 年 · 新曲 {{ songsYearRow.newSongs }} · 复演 {{ songsYearRow.returning }} ·
                当年曲目 {{ songsYearRow.distinctSongs }}
                <template v-if="songsYearRow.newRatio !== null"> · 新曲占比 {{ Math.round(songsYearRow.newRatio * 100) }}%</template>
              </p>
              <div class="max-h-56 overflow-y-auto pr-1">
                <p v-if="songsYearRow.newSongIds.length > 0" class="mb-1 font-medium text-highlighted">新曲</p>
                <ul class="mb-2 flex flex-wrap gap-x-3 gap-y-1">
                  <li v-for="songId in songsYearRow.newSongIds" :key="`new:${songId}`">
                    <NuxtLink :to="`/songs/${songId}`" class="text-primary hover:underline">{{ songName(songId) }}</NuxtLink>
                  </li>
                </ul>
                <p v-if="songsYearRow.returningSongIds.length > 0" class="mb-1 font-medium text-highlighted">复演曲</p>
                <ul class="flex flex-wrap gap-x-3 gap-y-1">
                  <li v-for="songId in songsYearRow.returningSongIds" :key="`returning:${songId}`">
                    <NuxtLink :to="`/songs/${songId}`" class="text-muted hover:text-primary">{{ songName(songId) }}</NuxtLink>
                  </li>
                </ul>
              </div>
            </div>
          </template>
        </TimelineChartCard>
      </section>

      <section id="chart-series-spans" class="scroll-mt-24">
        <TimelineChartCard
          title="系列活跃年份"
          unit="横轴=年份，条带=该系列首末演出年份"
          note="点击条带进入系列页；条带按演出数从多到少排列。"
        >
          <TimelineGantt :years="timeline.years" :rows="seriesSpans" @select="selectSeriesSpan" />
        </TimelineChartCard>
      </section>

      <section id="chart-cities" class="scroll-mt-24">
        <TimelineChartCard
          title="巡演城市迁移"
          unit="柱=日本国内 / 海外 / 国家未知演出数，线=当年新城市与海外占比"
          :note="`城市由 buildCityIndex / matchCity 归一化；${unknownCountryTotal} 个演出没有国家代码，未计入国内外拆分；${timeline.unknownCityPerformances} 个演出（${timeline.unknownCityShows} 场次）未识别城市，只在页头计数。`"
        >
          <TimelineBarChart
            :years="timeline.years"
            :bars="cityChartBars"
            stacked
            :lines="cityChartLines"
            :right-lines="cityChartRatios"
            right-format="percent"
            unit="演出"
            right-unit="海外占比"
            @select="selectCityYear"
          />
          <template #footer>
            <div v-if="cityYearRow" class="mt-3 border-t border-default/60 pt-3 text-xs text-muted">
              {{ cityYearRow.year }} 年：{{ cityYearRow.cities }} 个城市，其中新出现 {{ cityYearRow.newCities }} 个；
              日本国内 {{ cityYearRow.domestic }} 个演出，海外 {{ cityYearRow.overseas }} 个
              <template v-if="cityYearRow.unknownCountry > 0">，{{ cityYearRow.unknownCountry }} 个国家未知</template>。
            </div>
          </template>
        </TimelineChartCard>
      </section>
    </template>
    </main>

    <!-- Below xl the side rail folds into one floating button at the bottom left. -->
    <div class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-40 sm:left-6 xl:hidden">
      <UPopover v-model:open="chartMenuOpen" :content="{ align: 'start', side: 'top' }">
        <UButton
          icon="i-lucide-list"
          color="neutral"
          variant="solid"
          size="sm"
          class="rounded-full shadow-lg shadow-black/25"
          aria-label="图表导航"
          aria-haspopup="dialog"
          :aria-expanded="chartMenuOpen"
        />
        <template #content>
          <div class="flex w-44 flex-col gap-0.5 p-1">
            <UButton
              v-for="chart in CHARTS"
              :key="chart.key"
              :variant="focusedChart === chart.key ? 'soft' : 'ghost'"
              color="neutral"
              size="sm"
              class="justify-start"
              :label="chart.label"
              @click="selectChartFromMenu(chart.key)"
            />
          </div>
        </template>
      </UPopover>
    </div>
  </div>
</template>
