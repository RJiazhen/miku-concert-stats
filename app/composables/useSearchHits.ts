import { computed, type Ref } from 'vue'
import { useCatalog } from './useCatalog.ts'
import { usePlaceNames } from './usePlaceNames.ts'
import { useSeriesTitles } from './useSeriesTitles.ts'
import { useVenueNames } from './useVenueNames.ts'
import { useSongTitle } from './useSongTitle.ts'
import { useLocale } from './useLocale.ts'
import { displayArtistString } from '~~/shared/credit.ts'
import {
  LOOKUP_LIMITS,
  localPerformanceMatches,
  localPlaceMatches,
  localProducerMatches,
  localSeriesMatches,
  localSongMatches,
  type LookupResult,
  type PerformanceLookupHit,
  type PlaceLookupHit,
  type SeriesLookupHit,
} from '~~/shared/lookup.ts'
import { producerPath, producerRoleLabel, type ProducerLookupHit, type ProducerRole } from '~~/shared/producers.ts'
import type { PerformanceRow, SeriesRow, SongRow } from '~~/shared/types.ts'

/** Types listed by the header panel and the results page, in display order. */
export const SEARCH_SECTIONS = ['series', 'performances', 'places', 'producers', 'songs'] as const

/** One result type of the shared search. */
export type SearchSectionKey = (typeof SEARCH_SECTIONS)[number]

/** Localized heading and counting unit of each result type. */
const sectionText = (key: SearchSectionKey, t: ReturnType<typeof useLocale>['t']): { label: string; unit: string } => {
  if (key === 'series') return { label: t('search.sectionSeries'), unit: t('search.unitSeries') }
  if (key === 'performances') return { label: t('search.sectionPerformances'), unit: t('search.unitPerformances') }
  if (key === 'places') return { label: t('search.sectionPlaces'), unit: t('search.unitPlaces') }
  if (key === 'producers') return { label: t('search.sectionProducers'), unit: t('search.unitProducers') }
  return { label: t('search.sectionSongs'), unit: t('search.unitSongs') }
}

/** One display row, already localized; the panel and the results page print the same row. */
export type SearchRow = {
  /** Stable list key, unique across result types. */
  key: string
  /** Detail page or index link the row opens. */
  to: string
  icon: string
  /** Plain title; songs leave this as a fallback and render through `SongTitle`. */
  title: string
  /** Optional second line, e.g. 演出 date · venue or the song's producer credit. */
  meta?: string
  /** Right-aligned count, e.g. `12 个演出`. */
  trailing?: string
  /** Producer role badges. */
  badges?: string[]
  /** Song id plus the titles the alias-aware song row needs for the active language. */
  song?: { id: number; original: string; nameEn: string | null }
}

/** One non-empty result type with its localized rows and its real total. */
export type SearchSection = {
  key: SearchSectionKey
  label: string
  unit: string
  /** Every hit of this type, before the lookup cap. */
  total: number
  /** Rows the lookup returned; fewer than `total` when the panel cap applied. */
  rows: SearchRow[]
  /** Whether `rows` shows only the first part of `total`. */
  truncated: boolean
}

/** Per-type row caps; omitted types use the header panel defaults. */
export type SearchLimits = Partial<Record<SearchSectionKey, number>>

/** Empty result for a catalog that has not loaded yet, keeping the requested cap visible. */
const emptyLookup = <T,>(limit: number): LookupResult<T> => ({ items: [], total: 0, limit })

/** Localized role labels of one producer hit, or the plain producer role when none is recorded. */
const roleLabels = (roles: readonly ProducerRole[], locale: ReturnType<typeof useLocale>['locale']): string[] => {
  const labels = roles.map((role) => producerRoleLabel(role, locale.value))
  return labels.length === 0 ? [producerRoleLabel('producer', locale.value)] : labels
}

/**
 * Full results-page path for one query, with the term in `?q=`.
 * A blank query points at the bare page, so links never carry an empty `q`.
 */
export const searchPagePath = (query: string): string => {
  const needle = query.trim()
  return needle === '' ? '/search' : `/search?q=${encodeURIComponent(needle)}`
}

/**
 * Catalog matches shared by the header panel and `/search`.
 *
 * Both callers pass the query they own; the panel keeps the default caps while the results page
 * asks for `LOOKUP_ALL`, so the two views cannot drift in matching, ordering, or section order.
 * Rows are already localized and carry their detail link, so both views print the same component.
 */
export const useSearchHits = (query: Ref<string>, limits: SearchLimits = {}) => {
  const { catalog } = useCatalog()
  const { localizePlace } = usePlaceNames()
  const { localizeVenue } = useVenueNames()
  const { localizeSeries, localizePerformanceSeries } = useSeriesTitles()
  const { spellings } = useSongTitle()
  const { locale, t } = useLocale()

  const caps: Record<SearchSectionKey, number> = {
    series: limits.series ?? LOOKUP_LIMITS.series,
    performances: limits.performances ?? LOOKUP_LIMITS.performances,
    places: limits.places ?? LOOKUP_LIMITS.places,
    producers: limits.producers ?? LOOKUP_LIMITS.producers,
    songs: limits.songs ?? LOOKUP_LIMITS.songs,
  }

  /** Series names also match their Chinese title when one is recorded. */
  const seriesSpellings = (row: SeriesRow): string[] => [localizeSeries(row.name)]

  /** Series names by id, so a 演出 hit can translate the series label inside its name. */
  const seriesNames = computed(() => new Map((catalog.value?.series ?? []).map((row) => [row.id, row.name])))

  /** 演出 names also match their localized series label and place spelling. */
  const performanceSpellings = (row: PerformanceRow): string[] => {
    const seriesName = seriesNames.value.get(row.series_id) ?? ''
    return [localizePlace(localizePerformanceSeries(row.name, seriesName, row.series_number))]
  }

  /** Venue names also match the localized venue and place spelling. */
  const placeSpellings = (venue: string): string[] => [localizePlace(localizeVenue(venue) ?? venue)]

  /** Every registered, translated, and English spelling of a song. */
  const songSpellings = (song: SongRow): string[] => spellings(song.id)

  const hits = computed(() => {
    const data = catalog.value
    if (data === null) {
      return {
        series: emptyLookup<SeriesLookupHit>(caps.series),
        performances: emptyLookup<PerformanceLookupHit>(caps.performances),
        places: emptyLookup<PlaceLookupHit>(caps.places),
        producers: emptyLookup<ProducerLookupHit>(caps.producers),
        songs: emptyLookup<SongRow>(caps.songs),
      }
    }
    return {
      series: localSeriesMatches(data, query.value, seriesSpellings, caps.series),
      performances: localPerformanceMatches(data, query.value, performanceSpellings, caps.performances),
      places: localPlaceMatches(data, query.value, placeSpellings, caps.places),
      producers: localProducerMatches(data, query.value, caps.producers),
      songs: localSongMatches(data, query.value, songSpellings, caps.songs),
    }
  })

  /** Series hits as rows: name plus the 演出 count. */
  const seriesRows = (result: LookupResult<SeriesLookupHit>): SearchRow[] =>
    result.items.map((hit) => ({
      key: `series:${hit.seriesId}`,
      to: `/series/${hit.seriesId}`,
      icon: 'i-lucide-layers',
      title: localizeSeries(hit.name),
      trailing: t('common.performances', { n: hit.performanceCount }),
    }))

  /** 演出 hits as rows: localized name plus date · venue. */
  const performanceRows = (result: LookupResult<PerformanceLookupHit>): SearchRow[] =>
    result.items.map((hit) => {
      const venue = hit.venue === null ? '' : localizePlace(localizeVenue(hit.venue) ?? hit.venue)
      const meta = [hit.startDate, venue].filter((part) => part !== null && part !== '').join(' · ')
      return {
        key: `performance:${hit.performanceId}`,
        to: `/shows/${hit.performanceId}`,
        icon: 'i-lucide-calendar',
        title: localizePlace(localizePerformanceSeries(hit.name, hit.seriesName, hit.seriesNumber)),
        meta: meta === '' ? undefined : meta,
      }
    })

  /** Place hits as rows: localized venue plus its 演出 count. */
  const placeRows = (result: LookupResult<PlaceLookupHit>): SearchRow[] =>
    result.items.map((hit) => ({
      key: `place:${hit.name}`,
      to: `/series?place=${encodeURIComponent(hit.name)}`,
      icon: 'i-lucide-map-pin',
      title: localizeVenue(hit.name) ?? hit.name,
      trailing: t('common.performances', { n: hit.performanceCount }),
    }))

  /** Producer hits as rows: name, role badges, and the 曲目数. */
  const producerRows = (result: LookupResult<ProducerLookupHit>): SearchRow[] =>
    result.items.map((hit) => ({
      key: `producer:${hit.name}`,
      to: producerPath(hit.name),
      icon: 'i-lucide-user-round',
      title: hit.name,
      badges: roleLabels(hit.roles, locale),
      trailing: t('common.songs', { n: hit.songCount }),
    }))

  /** Song hits as rows: the song row renders the active language and the alias the query hit. */
  const songRows = (result: LookupResult<SongRow>): SearchRow[] =>
    result.items.map((song) => ({
      key: `song:${song.id}`,
      to: `/songs/${song.id}`,
      icon: 'i-lucide-music',
      title: song.name_ja || song.name,
      meta: displayArtistString(song.artist_string) ?? t('common.notRecorded'),
      song: { id: song.id, original: song.name_ja || song.name, nameEn: song.name_en },
    }))

  /** Every non-empty result type, in the shared display order. */
  const sections = computed<SearchSection[]>(() => {
    const all = hits.value
    const rows: Record<SearchSectionKey, SearchRow[]> = {
      series: seriesRows(all.series),
      performances: performanceRows(all.performances),
      places: placeRows(all.places),
      producers: producerRows(all.producers),
      songs: songRows(all.songs),
    }
    const totals: Record<SearchSectionKey, number> = {
      series: all.series.total,
      performances: all.performances.total,
      places: all.places.total,
      producers: all.producers.total,
      songs: all.songs.total,
    }
    return SEARCH_SECTIONS.flatMap((key) => {
      const total = totals[key]
      if (total === 0) return []
      const meta = sectionText(key, t)
      return [{
        key,
        label: meta.label,
        unit: meta.unit,
        total,
        rows: rows[key],
        truncated: rows[key].length < total,
      }]
    })
  })

  /** Sum of every real hit count, for the results page headline. */
  const total = computed(() => sections.value.reduce((sum, section) => sum + section.total, 0))

  return { sections, total }
}
