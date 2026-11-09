import { albumIdFromSongListId, albumPageUrl, albumSetlistNotice } from '../../shared/album-setlists.ts'
import type { LocalizedText } from '../../shared/localized-names.ts'
import type { ProducerFlagIndex } from '../../shared/producer-flags.ts'
import { isBroadcastAppearance } from '../../shared/stats.ts'
import { songCategoryLabel } from '../../shared/repertoire.ts'
import { japaneseAliasTitle, type SongAliasFile } from '../../shared/song-aliases.ts'
import type { SongTitleFile } from '../../shared/song-titles.ts'
import type { SongVariantIndex } from '../../shared/song-variants.ts'
import type { CharacterRule } from '../../shared/characters.ts'
import type { Catalog, PerformanceRow, PerformanceShowSetlistItemRow, SongRow } from '../../shared/types.ts'
import { charactersOf, producersOf, type AppearanceSummary } from './appearances.ts'

/** Public origin used in every link the API returns. */
export const BASE_URL = 'https://miku-concert-stats.rjiazhen.top'

/** The three site spellings of one song title, as every song reference carries them. */
export type SongNameFields = {
  name: string
  nameJa: string | null
  nameEn: string | null
  nameZh: string | null
}

/**
 * Titles of one song in the three site languages.
 * The Japanese title prefers a registered alias, and the Chinese title comes from the checked
 * song-title file; both stay null instead of falling back to another language, so a reader can
 * tell a translation from an untranslated title.
 */
export const songNameFields = (
  song: SongRow,
  titlesZh: SongTitleFile,
  aliases: SongAliasFile = {},
): SongNameFields => {
  return {
    name: song.name,
    nameJa: japaneseAliasTitle(aliases, song.id) ?? song.name_ja,
    nameEn: song.name_en,
    nameZh: titlesZh[String(song.id)]?.title ?? null,
  }
}

/** English and Chinese fields of one localized name, spread into a payload row. */
export const localizedNameFields = (names: LocalizedText): { nameEn: string; nameZh: string } => {
  return { nameEn: names.en, nameZh: names.zh }
}

/** Public summary shared by the song list and the song detail file. */
type SongSummaryPayload = {
  id: number
  name: string
  nameJa: string | null
  nameEn: string | null
  nameZh: string | null
  producer: string | null
  producers: string[]
  characters: string[]
  category: SongRow['category']
  categoryLabel: string
  publishDate: string | null
  showCount: number
  eventCount: number
  performanceCount: number
  seriesCount: number
  firstYear: number | null
  lastYear: number | null
  approximate: boolean
  firstPerformance: {
    id: number
    name: string
    nameJa: string | null
    nameEn: string | null
    nameZh: string | null
    startDate: string | null
  } | null
  variantCount: number
  sourceUrl: string
  url: string
}

/** Public projection of one song used by both the list and the detail files. */
export const songSummary = (input: {
  song: SongRow
  summary: AppearanceSummary
  first: PerformanceRow | null
  variants: SongVariantIndex
  groupSongs: readonly SongRow[]
  rules: readonly CharacterRule[]
  titlesZh: Record<string, { title: string }>
  /** Japanese title the site shows; a registered `ja` alias already wins over `songs.name_ja`. */
  nameJa: string | null
  /** Checked producer flags, so a label never appears in the exported producer field. */
  flags: ProducerFlagIndex
  /** Localizes the first 演出 name, so the row carries all three languages. */
  performanceNamesOf: (performance: PerformanceRow) => LocalizedText
}): SongSummaryPayload => {
  const { song, summary, first, variants, groupSongs, rules, titlesZh, nameJa, flags, performanceNamesOf } = input
  const producers = producersOf(groupSongs, flags)
  return {
    id: song.id,
    name: song.name,
    nameJa,
    nameEn: song.name_en,
    nameZh: titlesZh[String(song.id)]?.title ?? null,
    producer: producers.length === 0 ? null : producers.join(', '),
    producers,
    characters: charactersOf(groupSongs, rules),
    category: song.category,
    categoryLabel: songCategoryLabel(song.category, 'zh'),
    publishDate: song.publish_date,
    showCount: summary.show,
    eventCount: summary.event,
    performanceCount: summary.performanceCount,
    seriesCount: summary.seriesCount,
    firstYear: summary.firstYear,
    lastYear: summary.lastYear,
    approximate: summary.approximate,
    firstPerformance:
      first === null
        ? null
        : {
            id: first.id,
            name: first.name,
            nameJa: first.name_ja,
            ...localizedNameFields(performanceNamesOf(first)),
            startDate: first.start_date,
          },
    variantCount: variants.variantSongIdsOf(song.id).length,
    sourceUrl: song.source_url,
    url: `${BASE_URL}/songs/${song.id}`,
  }
}

/** Public projection of one 演出, shared by the series index, the flat list, and the detail file. */
type PerformanceSummary = {
  id: number
  name: string
  nameJa: string | null
  /** English and Chinese name of this 演出; series label and place names are already translated. */
  nameEn: string
  nameZh: string
  series: { id: number; name: string; nameEn: string; nameZh: string }
  seriesNumber: number | null
  seriesSuffix: string | null
  venue: string | null
  /** English venue name when the venue list has a row; the catalog spelling otherwise. */
  venueEn: string | null
  countryCode: string | null
  startDate: string | null
  endDate: string | null
  role: PerformanceRow['role']
  broadcast: boolean
  showCount: number
  hasSetlist: boolean
  status: string | null
  sourceUrl: string
  url: string
}

/** Builds the public projection of one 演出. */
export const performanceSummary = (input: {
  performance: PerformanceRow
  seriesName: string
  showCount: number
  hasSetlist: boolean
  status: string | null
  /** This 演出's name in all three languages. */
  names: LocalizedText
  /** Its series' name in all three languages. */
  seriesNames: LocalizedText
  /** English venue name, or null when the catalog has no venue. */
  venueEn: string | null
}): PerformanceSummary => {
  const { performance, seriesName, showCount, hasSetlist, status, names, seriesNames, venueEn } = input
  return {
    id: performance.id,
    name: performance.name,
    nameJa: performance.name_ja,
    ...localizedNameFields(names),
    series: { id: performance.series_id, name: seriesName, nameEn: seriesNames.en, nameZh: seriesNames.zh },
    seriesNumber: performance.series_number,
    seriesSuffix: performance.series_suffix,
    venue: performance.venue_name,
    venueEn,
    countryCode: performance.country_code,
    startDate: performance.start_date,
    endDate: performance.end_date,
    role: performance.role,
    broadcast: isBroadcastAppearance(performance),
    showCount,
    hasSetlist,
    status,
    sourceUrl: performance.source_url,
    url: `${BASE_URL}/shows/${performance.id}`,
  }
}

/** One ordered setlist row, with a medley expanded to its parts. */
export const setlistItemPayload = (
  catalog: Catalog,
  item: PerformanceShowSetlistItemRow,
  songsById: Map<number, SongRow>,
  medleyNames: Map<number, string>,
  titlesZh: SongTitleFile,
  aliases: SongAliasFile = {},
): Record<string, unknown> => {
  const base = { position: item.position, evidence: item.evidence, notes: item.notes }
  /** Titles in the three languages, with a plain id string only when the song row is missing. */
  const namesOf = (songId: number): SongNameFields => {
    const song = songsById.get(songId)
    if (song === undefined) return { name: String(songId), nameJa: null, nameEn: null, nameZh: null }
    return songNameFields(song, titlesZh, aliases)
  }
  if (item.song_id !== null) {
    return { ...base, songId: item.song_id, ...namesOf(item.song_id) }
  }
  const songIds = catalog.medleySongs
    .filter((row) => row.medley_id === item.medley_id)
    .sort((left, right) => left.position - right.position)
    .map((row) => row.song_id)
  return {
    ...base,
    medleyId: item.medley_id,
    medleyName: item.medley_id === null ? null : (medleyNames.get(item.medley_id) ?? null),
    songIds,
    songs: songIds.map((songId) => ({ songId, ...namesOf(songId) })),
  }
}

/** PV rows of a merged variant group. */
export const videosOf = (catalog: Catalog, songIds: readonly number[]): Record<string, unknown>[] => {
  const wanted = new Set(songIds)
  return catalog.videos
    .filter((row) => wanted.has(row.song_id))
    .sort((left, right) => left.platform.localeCompare(right.platform) || left.vocadb_pv_id - right.vocadb_pv_id)
    .map((video) => ({
      vocadbPvId: video.vocadb_pv_id,
      songId: video.song_id,
      platform: video.platform,
      url: video.url,
      title: video.title,
      author: video.author,
      pvType: video.pv_type,
      publishDate: video.publish_date,
      disabled: video.disabled === 1,
    }))
}

/** Album tracklist behind a 演出 whose setlist is a release fallback, or null for an upstream list. */
export const albumFallbackOf = (catalog: Catalog, performance: PerformanceRow): Record<string, unknown> | null => {
  if (performance.song_list_id === null) return null
  const albumId = albumIdFromSongListId(performance.song_list_id)
  if (albumId === null) return null
  const songList = catalog.songLists.find((row) => row.id === performance.song_list_id)
  const medium = songList?.medium ?? null
  const albumName = songList?.name ?? String(albumId)
  return {
    albumId,
    albumName,
    albumUrl: albumPageUrl(albumId),
    medium,
    notice: medium === null ? null : `${albumSetlistNotice(medium).before}${albumName}${albumSetlistNotice(medium).after}`,
  }
}

/** Normalizes a title so two entries that differ only in version wording collide. */
export const normalizeTitle = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/-\s*[^-]*\b(remix|mix|ver\.?|version|edit|edition)\b[^-]*-\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

