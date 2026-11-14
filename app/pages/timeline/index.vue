<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useCatalog } from '~/composables/useCatalog.ts'
import { characterNames, characterRules } from '~/composables/useCharacters.ts'
import { useCharacterNames } from '~/composables/useCharacterNames.ts'
import { placeNames, usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import { useSongVariants } from '~/composables/useSongVariants.ts'
import { useProducerFlags } from '~/composables/useProducerFlags.ts'
import { useLocale } from '~/composables/useLocale.ts'
import type { TimelineFilterDraft } from '~/utils/timeline-filter-draft.ts'
import { localeTag } from '~~/shared/i18n/index.ts'
import { buildCityIndex, cityLabel, matchCity } from '~~/shared/cities.ts'
import { buildProducerIndex } from '~~/shared/producers.ts'
import { emptySongVariantIndex } from '~~/shared/song-variants.ts'
import { buildTimeline, type NewSongBaseline, type TimelineCount } from '~~/shared/timeline.ts'
import { availablePerformanceYears, normalizeYearRange } from '~~/shared/year-range.ts'

/** One chart series passed to the SVG components. */
type ChartSeries = {
  key: string
  label: string
  color: string
  values: number[]
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

/** Years a chart can jump to, in page order. */
const CHARTS = computed(() => [
  { key: 'shows', label: t('timeline.chartShows') },
  { key: 'characters', label: t('timeline.chartCharacters') },
  { key: 'new-songs', label: t('timeline.chartNewSongs') },
  { key: 'series-spans', label: t('timeline.chartSeriesSpans') },
  { key: 'cities', label: t('timeline.chartCities') },
] as const)

/** Sentinel for an open side of the year range; Reka UI cannot bind an empty select value. */
const YEAR_ANY = 0

const { catalog, error, pending, load } = useCatalog()
const { locale, t } = useLocale()
const { localizePlace } = usePlaceNames()
const { localizeSeries, localizePerformanceSeries } = useSeriesTitles()
const { localizeCharacter, compareCharacters } = useCharacterNames()
const { songName } = useSongLookup()
const variants = useSongVariants()
const flags = useProducerFlags()
const route = useRoute()

/** Parsed once: the checked place list and its matchers never change at runtime. */
const cityIndex = buildCityIndex(placeNames)

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const selectedSeries = ref<number[]>([])
const selectedCities = ref<string[]>([])
const selectedProducers = ref<string[]>([])
const selectedCharacters = ref<string[]>([])
const yearFrom = ref<number>(YEAR_ANY)
const yearTo = ref<number>(YEAR_ANY)
const includeBroadcast = ref(true)
const mergeVariants = ref(false)
/** Share a chorus song's count across its characters instead of adding 1 to each. */
const splitChorusSongs = ref(false)
/** Draw every role's share of the year as a right-axis line on the character chart. */
const showCharacterShares = ref(false)
const newSongBaseline = ref<NewSongBaseline>('catalog')
/** Series ids the first chart focuses on; empty stacks the top series as before. */
const seriesFocus = ref<number[]>([])
const focusedChart = ref<string>('')

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
    includeBroadcast: includeBroadcast.value,
    seriesIds: selectedSeries.value,
    cityNames: selectedCities.value,
    producers: selectedProducers.value,
    characters: selectedCharacters.value,
    yearFrom: yearRange.value.from,
    yearTo: yearRange.value.to,
    variants: mergeVariants.value ? variants : emptySongVariantIndex(),
    characterRules,
    characterSongWeight: splitChorusSongs.value ? 'split' : 'per-song',
    cityIndex,
    newSongBaseline: newSongBaseline.value,
  })
})

/** Series row by id, used for labels and chart links. */
const seriesById = computed(() => new Map((catalog.value?.series ?? []).map((row) => [row.id, row])))

/** Series name in the site language; the id stands in when the catalog has no row. */
const seriesLabel = (id: number): string => {
  const series = seriesById.value.get(id)
  return series === undefined ? t('series.seriesFallback', { id }) : localizeSeries(series.name)
}

/** Series options for the filter and the chart focus control. */
const seriesItems = computed(() => {
  const rows = [...(catalog.value?.series ?? [])].sort(
    (left, right) => localizeSeries(left.name).localeCompare(localizeSeries(right.name), localeTag(locale.value)),
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
  return rows.map(([city, count]) => ({ label: `${cityLabel(cityIndex, city, locale.value)}（${count}）`, value: city }))})

/** Producer names from the catalog index, the same list `/producers` prints by default; labels never rank. */
const producerItems = computed(() => {
  if (!catalog.value) return []
  const index = buildProducerIndex(catalog.value, { flags })
  return index.countedRows.map((row) => ({ label: `${row.name}（${row.songCount}）`, value: row.name }))
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
  { label: t('common.anyYear'), value: YEAR_ANY },
  ...yearOptions.value.map((year) => ({ label: t('common.year', { year }), value: year })),
])

/** Series rows behind the stacked chart, grouped into the top five plus 其他. */
const seriesChartBars = computed<ChartSeries[]>(() => {
  const current = timeline.value
  if (current === null) return []
  const index = new Map<string, number>()
  for (const row of current.seriesByYear) index.set(`${row.year}:${row.seriesId}`, row.shows)
  const valuesOf = (seriesId: number): number[] => current.years.map((year) => index.get(`${year}:${seriesId}`) ?? 0)
  if (seriesFocus.value.length > 0) return seriesFocus.value.map((seriesId, position) => ({
    key: `series:${seriesId}`,
    label: seriesLabel(seriesId),
    color: PALETTE[position % PALETTE.length] ?? OTHER_COLOR,
    values: valuesOf(seriesId),
  }))
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
      label: t('timeline.otherSeries', { n: rest.length }),
      color: OTHER_COLOR,
      values: current.years.map((year) => rest.reduce((sum, span) => sum + (index.get(`${year}:${span.seriesId}`) ?? 0), 0)),
    })
  }
  return bars
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

/** One bucket of chart 3: its colour plus the per-year 曲目 numbers it is drawn from. */
type CharacterBucket = {
  key: string
  label: string
  color: string
  /** 曲目数 of the year, the stacked bars; fractional when chorus songs are split. */
  songs: number[]
  /** Members folded into a merged bucket, printed when the legend entry is hovered. */
  legendDetail?: string
  /** Members behind each year of a merged bucket, printed when its bar segment is hovered. */
  segmentDetails?: string[]
}

/**
 * Buckets shown by chart 3: the selected names, or the six most frequent plus 其他.
 * Each bucket takes the character's own `data/characters.json` colour, the same one the 演出角色 chips
 * use on the song ranking, so a name keeps one colour across the site instead of following its rank.
 * The picked rows keep their frequency ranking, then the legend prints them in `data/characters.json`
 * order (初音ミク → 鏡音リン → 鏡音レン → 巡音ルカ …) so the stack reads like the character filter.
 * 其他 merges its roles into one colour only: the names and their counts stay available on hover.
 */
const characterChartBuckets = computed<CharacterBucket[]>(() => {
  const current = timeline.value
  if (current === null) return []
  /** Per-year values of one bucket from the distinct-song index. */
  const valuesOf = (name: string): number[] =>
    current.years.map((year) => characterSongYearIndex.value.get(name)?.get(year) ?? 0)
  const known = current.characterTotals
  const shown = (selectedCharacters.value.length > 0
    ? known.filter((row) => selectedCharacters.value.includes(row.name))
    : known.slice(0, 6)
  ).sort(compareByCharacterRank)
  const buckets: CharacterBucket[] = shown.map((row) => ({
    key: row.name,
    label: localizeCharacter(row.name),
    color: characterColor(row.name) ?? OTHER_COLOR,
    songs: valuesOf(row.name),
  }))
  if (selectedCharacters.value.length === 0) {
    const shownNames = new Set(shown.map((row) => row.name))
    const rest = known.filter((row) => !shownNames.has(row.name))
    if (rest.length > 0) {
      buckets.push({
        key: '__other',
        label: t('timeline.otherCharacters', { n: rest.length }),
        color: OTHER_COLOR,
        songs: current.years.map((year) => rest.reduce((sum, row) => sum + (characterSongYearIndex.value.get(row.name)?.get(year) ?? 0), 0)),
        legendDetail: t('timeline.otherCharactersDetail', { n: rest.length, names: [...rest].sort(compareByCharacterRank).map((row) => localizeCharacter(row.name)).join(t('setlist.join')) }),
        segmentDetails: current.years.map((year) => rest
          .map((row) => ({ name: row.name, count: characterSongYearIndex.value.get(row.name)?.get(year) ?? 0 }))
          .filter((entry) => entry.count > 0)
          .sort((left, right) => right.count - left.count || compareCharacters(left.name, right.name))
          .map((entry) => `${localizeCharacter(entry.name)} ${formatSongCount(entry.count)}`)
          .join(t('setlist.join'))),
      })
    }
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
    legendDetail: bucket.legendDetail,
    details: bucket.segmentDetails,
  })),
)

/**
 * Chart 3 right-axis lines: every role's share of that year's character songs, drawn only while the
 * 占比开关 is on. Both sides of each ratio use the same song-count rule, so the lines follow the
 * 合唱 switch. 其他 is a colour-only merge and has no line, matching its "single bar" role.
 */
const characterShareLines = computed<ChartSeries[]>(() => {
  const current = timeline.value
  if (current === null || !showCharacterShares.value) return []
  const index = new Map<string, Map<number, number>>()
  for (const row of current.characterShareByYear) {
    const byYear = index.get(row.name) ?? new Map<number, number>()
    byYear.set(row.year, row.share)
    index.set(row.name, byYear)
  }
  return characterChartBuckets.value
    .filter((bucket) => bucket.key !== '__other')
    .map((bucket) => ({
      key: bucket.key,
      label: t('timeline.shareOf', { name: bucket.label }),
      color: bucket.color,
      values: current.years.map((year) => index.get(bucket.key)?.get(year) ?? 0),
    }))
})

/** Chart 4 bars: new and returning songs per year. */
const songChartBars = computed<ChartSeries[]>(() => {
  const current = timeline.value
  if (current === null) return []
  return [
    { key: 'new', label: t('timeline.newSong'), color: PALETTE[0], values: current.songByYear.map((row) => row.newSongs) },
    { key: 'returning', label: t('timeline.returning'), color: PALETTE[1], values: current.songByYear.map((row) => row.returning) },
  ]
})

/** Chart 4 right-axis line: the share of that year's distinct songs that were new. */
const songChartLines = computed<ChartSeries[]>(() => {
  const current = timeline.value
  if (current === null) return []
  return [{
    key: 'ratio',
    label: t('timeline.newRatio'),
    color: PALETTE[2],
    values: current.songByYear.map((row) => row.newRatio ?? 0),
  }]
})

/** Chart 6 bars: 演出 in Japan, abroad, online, and with no country code, stacked to the full total. */
const cityChartBars = computed<ChartSeries[]>(() => {
  const current = timeline.value
  if (current === null) return []
  return [
    { key: 'domestic', label: t('timeline.domestic'), color: PALETTE[0], values: current.cityByYear.map((row) => row.domestic) },
    { key: 'overseas', label: t('timeline.overseas'), color: PALETTE[1], values: current.cityByYear.map((row) => row.overseas) },
    { key: 'online', label: t('timeline.online'), color: PALETTE[5], values: current.cityByYear.map((row) => row.online) },
    { key: 'unknown-country', label: t('timeline.unknownCountry'), color: OTHER_COLOR, values: current.cityByYear.map((row) => row.unknownCountry) },
  ]
})

/** Chart 6 left line: cities that appeared for the first time that year. */
const cityChartLines = computed<ChartSeries[]>(() => {
  const current = timeline.value
  if (current === null) return []
  return [{
    key: 'new-cities',
    label: t('timeline.newCities'),
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
    label: t('timeline.overseasRatio'),
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

/** Character song counts of the picked year, most songs first; zero counts stay out of the list. */
const characterYearRows = computed(() => {
  const current = timeline.value
  if (current === null || characterYear.value === null) return []
  return current.characterSongByYear
    .filter((row) => row.year === characterYear.value && row.count > 0)
    .sort((left, right) => right.count - left.count || compareCharacters(left.name, right.name))
})

/** Song count text: whole numbers stay whole, split chorus counts keep at most two decimals. */
const formatSongCount = (value: number): string =>
  Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)

/** New and returning songs of the picked year. */
const songsYearRow = computed(() => {
  const current = timeline.value
  if (current === null || songsYear.value === null) return null
  return current.songByYear.find((row) => row.year === songsYear.value) ?? null
})

/**
 * City coverage of the picked year, or null when that year has no domestic / overseas / online /
 * unknown-country 演出 (a gap year keeps year-selection but does not open an empty detail strip).
 */
const cityYearRow = computed(() => {
  const current = timeline.value
  if (current === null || cityYear.value === null) return null
  const row = current.cityByYear.find((entry) => entry.year === cityYear.value)
  if (row === undefined) return null
  if (row.domestic + row.overseas + row.online + row.unknownCountry <= 0) return null
  return row
})

/** Query keys and hash mirrored into the URL. */
type FilterState = {
  series: string
  city: string
  producer: string
  character: string
  from: string
  to: string
  broadcast: string
  merge: string
  chorus: string
  share: string
  baseline: string
  /** Chart key, written to the hash so the URL scrolls to that chart. */
  chart: string
}

/** Current filter state in URL form; empty strings are dropped before navigating. */
const state = computed<FilterState>(() => ({
  series: selectedSeries.value.join(','),
  city: selectedCities.value.join(','),
  producer: selectedProducers.value.join(','),
  character: selectedCharacters.value.join(','),
  from: yearFrom.value === YEAR_ANY ? '' : String(yearFrom.value),
  to: yearTo.value === YEAR_ANY ? '' : String(yearTo.value),
  broadcast: includeBroadcast.value ? '' : '0',
  merge: mergeVariants.value ? '1' : '',
  chorus: splitChorusSongs.value ? '1' : '',
  share: showCharacterShares.value ? '1' : '',
  baseline: newSongBaseline.value === 'filtered' ? 'filtered' : '',
  chart: focusedChart.value,
}))

/** Replaces the filters and the chart hash without adding history entries. */
const syncUrl = (): void => {
  if (!mounted.value) return
  const current = state.value
  void navigateTo(
    {
      query: {
        series_id: current.series === '' ? undefined : current.series,
        city: current.city === '' ? undefined : current.city,
        producer: current.producer === '' ? undefined : current.producer,
        character: current.character === '' ? undefined : current.character,
        from: current.from === '' ? undefined : current.from,
        to: current.to === '' ? undefined : current.to,
        broadcast: current.broadcast === '' ? undefined : current.broadcast,
        merge: current.merge === '' ? undefined : current.merge,
        chorus: current.chorus === '' ? undefined : current.chorus,
        share: current.share === '' ? undefined : current.share,
        baseline: current.baseline === '' ? undefined : current.baseline,
      },
      hash: current.chart === '' ? undefined : `#${current.chart}`,
    },
    { replace: true },
  )
}
watch(state, syncUrl, { deep: true })

/** Chart key of a URL hash such as `#new-songs`; empty when the hash names no chart. */
const chartFromHash = (hash: string): string => {
  const key = hash.replace(/^#/, '')
  return CHARTS.value.some((entry) => entry.key === key) ? key : ''
}

/** Splits a comma-separated URL filter into its values, ignoring blanks. */
const readList = (value: string): string[] => value.split(',').map((entry) => entry.trim()).filter((entry) => entry !== '')

/** Restores filters from the URL. Runs after hydration so SSR output stays stable. */
const readUrl = (): void => {
  const query = route.query
  const read = (value: unknown): string => (typeof value === 'string' ? value : '')
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
  splitChorusSongs.value = read(query.chorus) === '1'
  showCharacterShares.value = read(query.share) === '1'
  newSongBaseline.value = read(query.baseline) === 'filtered' ? 'filtered' : 'catalog'
  focusedChart.value = chartFromHash(route.hash)
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
  if (!includeBroadcast.value) list.push({ key: 'broadcast', label: t('timeline.chipNoBroadcast') })
  if (mergeVariants.value) list.push({ key: 'merge', label: t('timeline.chipMerge') })
  if (splitChorusSongs.value) list.push({ key: 'chorus', label: t('timeline.chipChorus') })
  if (showCharacterShares.value) list.push({ key: 'share', label: t('timeline.chipShare') })
  if (newSongBaseline.value === 'filtered') list.push({ key: 'baseline', label: t('timeline.chipBaseline') })
  for (const id of selectedSeries.value) list.push({ key: `series:${id}`, label: seriesLabel(id) })
  for (const name of selectedCities.value) list.push({ key: `city:${name}`, label: t('timeline.chipCity', { name: cityLabel(cityIndex, name, locale.value) }) })
  for (const name of selectedProducers.value) list.push({ key: `producer:${name}`, label: t('timeline.chipProducer', { name }) })
  for (const name of selectedCharacters.value) list.push({ key: `character:${name}`, label: t('timeline.chipCharacter', { name }) })
  if (yearRange.value.from !== null || yearRange.value.to !== null) {
    list.push({
      key: 'range',
      label: t('timeline.chipRange', { from: yearRange.value.from ?? t('timeline.earliest'), to: yearRange.value.to ?? t('timeline.latest') }),
    })
  }
  return list
})

/** Count of active conditions, shown on the reset button. */
const activeCount = computed(() => chips.value.length)

/** Removes one condition from its chip. */
const removeChip = (key: string): void => {
  if (key === 'broadcast') {
    includeBroadcast.value = true
    return
  }
  if (key === 'merge') {
    mergeVariants.value = false
    return
  }
  if (key === 'chorus') {
    splitChorusSongs.value = false
    return
  }
  if (key === 'share') {
    showCharacterShares.value = false
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
  selectedSeries.value = []
  selectedCities.value = []
  selectedProducers.value = []
  selectedCharacters.value = []
  yearFrom.value = YEAR_ANY
  yearTo.value = YEAR_ANY
  includeBroadcast.value = true
  mergeVariants.value = false
  splitChorusSongs.value = false
  showCharacterShares.value = false
  newSongBaseline.value = 'catalog'
  seriesFocus.value = []
  focusedChart.value = ''
  showsYear.value = null
  characterYear.value = null
  songsYear.value = null
  cityYear.value = null
}

/** Scrolls to one chart and records the focus in the URL hash. */
const goToChart = async (key: string): Promise<void> => {
  focusedChart.value = key
  await nextTick()
  document.getElementById(`chart-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** Open state of the filter menu, shared by the rail button and the floating button. */
const menuOpen = ref(false)

/** Wrapper of the rail button and its panel; a click inside it never counts as "outside". */
const railMenuRoot = ref<HTMLElement | null>(null)

/** Wrapper of the floating button and its panel; a click inside it never counts as "outside". */
const floatingMenuRoot = ref<HTMLElement | null>(null)

/** Folds the floating button's text label on phones, in step with the feedback button opposite it. */
const floatingButtonCollapsed = useFloatingButtonCollapse()

/** Opens the menu; the panel fills its drafts from the live filters when it mounts. */
const openMenu = (): void => {
  menuOpen.value = true
}

/** Closes the menu and drops the drafts; the live filters keep their previous values. */
const closeMenu = (): void => {
  menuOpen.value = false
}

/** Opens the menu when closed and discards it when open; both buttons do the same. */
const toggleMenu = (): void => {
  if (menuOpen.value) {
    closeMenu()
    return
  }
  openMenu()
}

/**
 * Writes drafts into the live filters, then optionally closes the menu.
 * The rail panel keeps itself open and applies every change at once; the floating panel confirms.
 */
const applyFilterDraft = (draft: TimelineFilterDraft, close = true): void => {
  yearFrom.value = draft.yearFrom
  yearTo.value = draft.yearTo
  selectedSeries.value = [...draft.selectedSeries]
  selectedCities.value = [...draft.selectedCities]
  selectedProducers.value = [...draft.selectedProducers]
  selectedCharacters.value = [...draft.selectedCharacters]
  includeBroadcast.value = draft.includeBroadcast
  mergeVariants.value = draft.mergeVariants
  if (close) menuOpen.value = false
}

/** Closes the menu on Escape, discarding the drafts like every other dismissal. */
const closeOnEscape = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape' || !menuOpen.value) return
  menuOpen.value = false
}

/**
 * Closes the menu when a press lands outside it. Select and menu popups are teleported to `<body>`,
 * so a press inside those wrappers has to count as inside the menu; otherwise picking an option
 * would dismiss the panel before the selection lands.
 */
const closeOnOutsidePress = (event: PointerEvent): void => {
  if (!menuOpen.value) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (target instanceof Element && target.closest('[data-reka-popper-content-wrapper]') !== null) return
  if (railMenuRoot.value?.contains(target) === true) return
  if (floatingMenuRoot.value?.contains(target) === true) return
  menuOpen.value = false
}

/** Starts listening for the presses and keys that dismiss the menu. */
const startMenuDismiss = (): void => {
  window.addEventListener('keydown', closeOnEscape)
  document.addEventListener('pointerdown', closeOnOutsidePress, true)
}
onMounted(startMenuDismiss)

/** Releases the dismiss listeners. */
const stopMenuDismiss = (): void => {
  window.removeEventListener('keydown', closeOnEscape)
  document.removeEventListener('pointerdown', closeOnOutsidePress, true)
}
onUnmounted(stopMenuDismiss)

/** Scrolls to one chart from the menu and closes it, dropping any unconfirmed filters. */
const selectChartFromMenu = (key: string): void => {
  menuOpen.value = false
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

/** Note printed on the character chart; the share lines are only explained while they are drawn. */
const characterNote = computed(() => {
  const base = t('timeline.characterNote')
  if (!showCharacterShares.value) return base
  return `${base}${t('timeline.characterShareNote')}`
})

/** Note under the new-song chart, which explains the active baseline. */
const newSongNote = computed(() => t(newSongBaseline.value === 'catalog' ? 'timeline.newSongsCatalog' : 'timeline.newSongsFiltered'))

/** Note printed with the excluded-row totals at the top of the page. */
const exclusionNote = computed(() => {
  const current = timeline.value
  if (current === null) return ''
  const parts: string[] = [t('timeline.excludedUndated', { n: current.excludedUndated })]
  if (current.excludedByYear > 0) parts.push(t('timeline.excludedOutOfRange', { n: current.excludedByYear }))
  if (current.unknownCityPerformances > 0) {
    parts.push(t('timeline.excludedUnknownCity', { performances: current.unknownCityPerformances, shows: current.unknownCityShows }))
  }
  return `${parts.join(t('common.sentenceJoin'))}${t('common.sentenceEnd')}`
})

/** Number of identified cities in the catalog. */
const cityCount = computed(() => cityItems.value.length)

/** 演出 whose `country_code` is missing, so the domestic / overseas split cannot count them. */
const unknownCountryTotal = computed(() =>
  (timeline.value?.cityByYear ?? []).reduce((sum, row) => sum + row.unknownCountry, 0),
)

/** Year slots the charts size their drawing width for: the catalogue-wide span, so filters never narrow it. */
const chartSpan = computed(() => {
  const span = timeline.value?.catalogYears
  return span === null || span === undefined ? 0 : span.to - span.from + 1
})

/** Restores the chart scroll position when a shared link names a chart. */
watch(catalog, async (value) => {
  if (value === null || focusedChart.value === '') return
  await nextTick()
  document.getElementById(`chart-${focusedChart.value}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})

/** Keeps the selected chart in sync with the hash, including back / forward navigation. */
watch(() => route.hash, (value) => {
  focusedChart.value = chartFromHash(value)
})

useHead({ title: computed(() => t('timeline.title')) })
</script>

<template>
  <div class="relative">
    <!-- Chart rail sits in the left gutter, outside the body column, so the main column keeps
         the same width as every other page. `inset-y-0` makes the sticky list stick for the
         full page height. -->
    <nav
      class="pointer-events-none absolute inset-y-0 right-full mr-4 hidden w-36 rail:block"
      :aria-label="t('timeline.chartNav')"
    >
      <div class="pointer-events-auto sticky top-24 z-30">
        <p class="mb-1.5 px-2.5 text-xs font-medium tracking-[0.12em] text-muted uppercase">{{ t('timeline.charts') }}</p>
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

        <!-- The filter menu sits right under the chart list, so the wide layout keeps every
             control in the left gutter. Its panel opens down-right, clear of the list above, and
             applies each change immediately: the wide layout never needs a confirm step. -->
        <div ref="railMenuRoot" class="relative mt-3 border-t border-default/60 pt-3">
          <UButton
            block
            :icon="menuOpen ? 'i-lucide-x' : 'i-lucide-sliders-horizontal'"
            :color="menuOpen ? 'primary' : 'neutral'"
            :variant="menuOpen ? 'soft' : 'ghost'"
            size="sm"
            class="justify-start"
            :label="menuOpen ? t('feedback.close') : t('timeline.filter')"
            :aria-label="menuOpen ? t('timeline.closeMenu') : t('timeline.filter')"
            aria-haspopup="dialog"
            :aria-expanded="menuOpen"
            @click="toggleMenu"
          />
          <div
            v-if="menuOpen"
            role="dialog"
            :aria-label="t('timeline.floatingMenu')"
            class="absolute top-full left-0 z-50 mt-2 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-xl bg-elevated p-3 shadow-xl ring ring-default"
          >
            <TimelineFilterMenu
              :year-items="yearItems"
              :series-items="seriesItems"
              :city-items="cityItems"
              :producer-items="producerItems"
              :character-items="characterItems"
              :charts="CHARTS"
              :focused-chart="focusedChart"
              :show-charts="false"
              instant
              :year-from="yearFrom"
              :year-to="yearTo"
              :selected-series="selectedSeries"
              :selected-cities="selectedCities"
              :selected-producers="selectedProducers"
              :selected-characters="selectedCharacters"
              :include-broadcast="includeBroadcast"
              :merge-variants="mergeVariants"
              @update="applyFilterDraft($event, false)"
            />
          </div>
        </div>
      </div>
    </nav>

    <main class="min-w-0 space-y-6">
    <section class="pt-4 sm:pt-8">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Hatsune Miku Concert Statistics</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-5xl">
        {{ t('timeline.heading1') }}<br class="sm:hidden">{{ t('timeline.heading2') }}
      </h1>
      <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <UBadge v-if="timeline" color="primary" variant="subtle" icon="i-lucide-clock">{{ t('common.shows', { n: timeline.totals.shows }) }}</UBadge>
        <UBadge v-if="timeline" color="neutral" variant="subtle" icon="i-lucide-calendar-range">{{ t('common.performances', { n: timeline.totals.performances }) }}</UBadge>
        <UBadge v-if="timeline?.years.length" color="neutral" variant="subtle">
          {{ timeline.years[0] }}–{{ timeline.years[timeline.years.length - 1] }}
        </UBadge>
        <UBadge v-if="timeline" color="neutral" variant="subtle" icon="i-lucide-map-pin">{{ t('common.cities', { n: cityCount }) }}</UBadge>
        <UButton to="/series" color="neutral" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">{{ t('timeline.seriesOverview') }}</UButton>
        <UButton to="/" color="neutral" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">{{ t('timeline.viewRanking') }}</UButton>
      </div>
      <p v-if="timeline" class="mt-3 text-xs leading-relaxed text-muted">
        {{ exclusionNote }}
      </p>
    </section>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('common.catalogError')"
      :description="error"
    />

    <div v-else>
      <UCard>
        <TimelineFilters
          v-model:year-from="yearFrom"
          v-model:year-to="yearTo"
          v-model:selected-series="selectedSeries"
          v-model:selected-cities="selectedCities"
          v-model:selected-producers="selectedProducers"
          v-model:selected-characters="selectedCharacters"
          v-model:include-broadcast="includeBroadcast"
          v-model:merge-variants="mergeVariants"
          :year-items="yearItems"
          :series-items="seriesItems"
          :city-items="cityItems"
          :producer-items="producerItems"
          :character-items="characterItems"
          :active-count="activeCount"
          @reset="reset"
        />
      </UCard>
    </div>

    <div v-if="chips.length > 0" class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-muted">{{ t('timeline.selected') }}</span>
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
      <UButton color="neutral" variant="ghost" size="xs" :label="t('common.clear')" @click="reset" />
    </div>

    <template v-if="pending && !timeline">
      <USkeleton v-for="index in 2" :key="index" class="h-72 w-full" />
    </template>

    <template v-else-if="timeline">
      <section id="chart-shows" class="scroll-mt-24">
        <TimelineChartCard
          :title="t('timeline.chartShows')"
          :note="t('timeline.modeByShowNote')"
        >
          <template #actions>
            <FilterField :label="t('timeline.seriesFocus')">
              <USelectMenu
                v-model="seriesFocus"
                :items="seriesItems"
                value-key="value"
                multiple
                search-input
                :filter-fields="['label']"
                :placeholder="t('timeline.allSeries')"
                size="sm"
                class="w-48"
              />
            </FilterField>
          </template>
          <TimelineBarChart
            :years="timeline.years"
            :span="chartSpan"
            :bars="seriesChartBars"
            stacked
            :unit="t('timeline.unitShows')"
            @select="selectSeriesSegment"
          />
          <template #footer>
            <div v-if="showsYear !== null && showsYearPerformances.length > 0" class="mt-3 border-t border-default/60 pt-3">
              <p class="mb-2 text-xs text-muted">{{ t('timeline.yearShows', { year: showsYear, n: showsYearPerformances.length }) }}</p>
              <ul class="max-h-64 space-y-1 overflow-y-auto pr-1 text-xs">
                <li v-for="row in showsYearPerformances" :key="row.id" class="flex flex-wrap items-baseline gap-x-2">
                  <span class="font-mono text-dimmed">{{ row.startDate }}</span>
                  <NuxtLink :to="`/shows/${row.id}`" class="text-primary hover:underline">{{ row.label }}</NuxtLink>
                  <span class="text-muted">{{ t('common.showsShort', { n: row.shows }) }}</span>
                </li>
              </ul>
            </div>
          </template>
        </TimelineChartCard>
      </section>

      <section id="chart-characters" class="scroll-mt-24">
        <TimelineChartCard
          :title="t('timeline.characterTitle')"
          :note="characterNote"
        >
          <template #actions>
            <USwitch v-model="splitChorusSongs" :label="t('timeline.characterRuleSplit')" size="sm" />
            <USwitch v-model="showCharacterShares" :label="t('timeline.showShares')" size="sm" />
          </template>
          <TimelineBarChart
            :years="timeline.years"
            :span="chartSpan"
            :bars="characterChartBars"
            :right-lines="characterShareLines"
            :right-format="showCharacterShares ? 'percent' : 'number'"
            :right-unit="showCharacterShares ? t('timeline.unitShare') : ''"
            stacked
            :unit="t('timeline.unitSongs')"
            height="320"
            @select="selectCharacterYear"
          />
          <template #footer>
            <div v-if="characterYear !== null && characterYearRows.length > 0" class="mt-3 border-t border-default/60 pt-3">
              <p class="mb-2 text-xs text-muted">{{ t('timeline.yearCharacterSongs', { year: characterYear }) }}</p>
              <div class="flex flex-wrap gap-2">
                <UBadge v-for="row in characterYearRows" :key="row.name" color="neutral" variant="subtle" size="sm">
                  {{ localizeCharacter(row.name) }} {{ formatSongCount(row.count) }}
                </UBadge>
              </div>
            </div>
          </template>
        </TimelineChartCard>
      </section>

      <section id="chart-new-songs" class="scroll-mt-24">
        <TimelineChartCard
          :title="t('timeline.newSongsTitle')"
          :note="newSongNote"
        >
          <template #actions>
            <UFieldGroup size="sm">
              <UButton
                :variant="newSongBaseline === 'catalog' ? 'solid' : 'outline'"
                :label="t('timeline.baselineCatalog')"
                @click="newSongBaseline = 'catalog'"
              />
              <UButton
                :variant="newSongBaseline === 'filtered' ? 'solid' : 'outline'"
                :label="t('timeline.baselineFiltered')"
                @click="newSongBaseline = 'filtered'"
              />
            </UFieldGroup>
          </template>
          <TimelineBarChart
            :years="timeline.years"
            :span="chartSpan"
            :bars="songChartBars"
            :right-lines="songChartLines"
            right-format="percent"
            :unit="t('timeline.unitSongs')"
            :right-unit="t('timeline.unitShare')"
            @select="selectSongsYear"
          />
          <template #footer>
            <div v-if="songsYearRow" class="mt-3 space-y-2 border-t border-default/60 pt-3 text-xs">
              <p class="text-muted">
                {{ t('timeline.yearNewOld', { year: songsYearRow.year, newSongs: songsYearRow.newSongs, returning: songsYearRow.returning, distinct: songsYearRow.distinctSongs }) }}
                <template v-if="songsYearRow.newRatio !== null"> · {{ t('timeline.newRatio') }} {{ Math.round(songsYearRow.newRatio * 100) }}%</template>
              </p>
              <div class="max-h-56 overflow-y-auto pr-1">
                <p v-if="songsYearRow.newSongIds.length > 0" class="mb-1 font-medium text-highlighted">{{ t('timeline.newSong') }}</p>
                <ul class="mb-2 flex flex-wrap gap-x-3 gap-y-1">
                  <li v-for="songId in songsYearRow.newSongIds" :key="`new:${songId}`">
                    <NuxtLink :to="`/songs/${songId}`" class="text-primary hover:underline">{{ songName(songId) }}</NuxtLink>
                  </li>
                </ul>
                <p v-if="songsYearRow.returningSongIds.length > 0" class="mb-1 font-medium text-highlighted">{{ t('timeline.returning') }}</p>
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
          :title="t('timeline.seriesSpansTitle')"
          :note="t('timeline.seriesSpansNote')"
        >
          <TimelineGantt
            :years="timeline.years"
            :span="chartSpan"
            :rows="seriesSpans"
            @select="selectSeriesSpan"
          />
        </TimelineChartCard>
      </section>

      <section id="chart-cities" class="scroll-mt-24">
        <TimelineChartCard
          :title="t('timeline.citiesTitle')"
          :note="t('timeline.citiesNote', { unknownCountry: unknownCountryTotal, unknownCityPerformances: timeline.unknownCityPerformances, unknownCityShows: timeline.unknownCityShows })"
        >
          <TimelineBarChart
            :years="timeline.years"
            :span="chartSpan"
            :bars="cityChartBars"
            stacked
            :lines="cityChartLines"
            :right-lines="cityChartRatios"
            right-format="percent"
            :unit="t('timeline.unitPerformances')"
            :right-unit="t('timeline.overseasRatio')"
            @select="selectCityYear"
          />
          <template #footer>
            <div v-if="cityYearRow" class="mt-3 border-t border-default/60 pt-3 text-xs text-muted">
              {{ t('timeline.cityYear', { year: cityYearRow.year, cities: cityYearRow.cities, newCities: cityYearRow.newCities, domestic: cityYearRow.domestic, overseas: cityYearRow.overseas })
              }}<template v-if="cityYearRow.online > 0">{{ t('timeline.cityYearOnline', { n: cityYearRow.online }) }}</template
              ><template v-if="cityYearRow.unknownCountry > 0">{{ t('timeline.cityYearUnknown', { n: cityYearRow.unknownCountry }) }}</template>。
            </div>
          </template>
        </TimelineChartCard>
      </section>
    </template>
    </main>

    <!-- Below the rail breakpoint the chart list has no gutter to sit in, so one floating button
         folds the chart list and the filters together, mirroring the feedback button opposite it.
         The panel covers the whole viewport below `sm` and becomes a small popover above it. -->
    <div v-if="!error" ref="floatingMenuRoot" class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-40 sm:left-6 rail:hidden">
      <div
        v-if="menuOpen"
        role="dialog"
        :aria-label="t('timeline.floatingMenu')"
        class="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-default px-4 pt-4 pb-24 sm:absolute sm:inset-auto sm:bottom-full sm:left-0 sm:z-auto sm:mb-2 sm:block sm:h-auto sm:max-h-[70vh] sm:w-[min(22rem,calc(100vw-2rem))] sm:rounded-xl sm:bg-elevated sm:p-3 sm:ring sm:shadow-xl sm:ring-default"
      >
        <!-- Phones only: the panel covers the page, so it needs its own heading and close button. -->
        <div class="mb-3 flex items-center justify-between gap-2 border-b border-default/60 pb-2 sm:hidden">
          <p class="text-sm font-medium text-highlighted">{{ t('timeline.floatingMenu') }}</p>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('timeline.closeMenu')"
            @click="closeMenu"
          />
        </div>
        <TimelineFilterMenu
          :year-items="yearItems"
          :series-items="seriesItems"
          :city-items="cityItems"
          :producer-items="producerItems"
          :character-items="characterItems"
          :charts="CHARTS"
          :focused-chart="focusedChart"
          :year-from="yearFrom"
          :year-to="yearTo"
          :selected-series="selectedSeries"
          :selected-cities="selectedCities"
          :selected-producers="selectedProducers"
          :selected-characters="selectedCharacters"
          :include-broadcast="includeBroadcast"
          :merge-variants="mergeVariants"
          @apply="applyFilterDraft"
          @select-chart="selectChartFromMenu"
        />
      </div>

      <UButton
        color="primary"
        variant="solid"
        size="lg"
        class="relative z-[61] rounded-full shadow-lg shadow-black/25 transition-[gap,padding] duration-200 motion-reduce:transition-none"
        :class="floatingButtonCollapsed ? 'max-sm:gap-0 max-sm:px-2.5' : ''"
        :aria-label="menuOpen ? t('timeline.closeMenu') : t('timeline.floatingMenu')"
        aria-haspopup="dialog"
        :aria-expanded="menuOpen"
        @click="toggleMenu"
      >
        <UIcon :name="menuOpen ? 'i-lucide-x' : 'i-lucide-sliders-horizontal'" class="size-5" />
        <span
          class="overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 motion-reduce:transition-none"
          :class="floatingButtonCollapsed ? 'max-w-0 opacity-0 sm:max-w-24 sm:opacity-100' : 'max-w-24'"
        >{{ menuOpen ? t('feedback.close') : t('timeline.filter') }}</span>
      </UButton>
    </div>
  </div>
</template>
