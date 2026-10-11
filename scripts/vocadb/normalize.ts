import { decideMedley } from '../../shared/medley.ts'
import { performanceRole } from '../../shared/premiere.ts'
import { parseShowtime } from '../../shared/showtime.ts'
import type { PerformanceLinkRow, PerformanceRow, Platform, SeriesRow, SongRow, VideoRow } from '../../shared/types.ts'
import type { ApiEvent, ApiName, ApiPv, ApiSeries, ApiSong, ApiWebLink } from './api-types.ts'

/** Platforms this catalog keeps. Other PV services are ignored. */
const PLATFORMS: Record<string, Platform> = {
  NicoNicoDouga: 'niconico',
  Youtube: 'youtube',
  Bilibili: 'bilibili',
}

/** Reads a language-specific name when VocaDB has one. */
export const nameIn = (names: readonly ApiName[] | undefined, language: string): string | null => {
  const found = names?.find((entry) => entry.language === language)
  return found ? found.value : null
}

/** Keeps the calendar day from a VocaDB timestamp. The API does not provide a show clock here. */
export const vocadbDay = (value: string | null | undefined): string | null => {
  if (!value) return null
  const day = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  return day
}

/** Series page on VocaDB. */
export const seriesUrl = (id: number): string => `https://vocadb.net/Event/SeriesDetails/${id}`

/** Event page on VocaDB. */
export const eventUrl = (id: number): string => `https://vocadb.net/E/${id}`

/** Song page on VocaDB. */
export const songUrl = (id: number): string => `https://vocadb.net/S/${id}`

/** Song list page on VocaDB. */
export const songListUrl = (id: number): string => `https://vocadb.net/L/${id}`

/** Maps a series payload into a table row. Refuses a series that is not a concert. */
export const normalizeSeries = (series: ApiSeries, retrievedAt: string): SeriesRow => {
  if (series.category !== 'Concert') {
    throw new Error(`Series ${series.id} category is ${series.category ?? 'missing'}, expected Concert`)
  }
  return {
    id: series.id,
    name: series.name,
    name_ja: nameIn(series.names, 'Japanese'),
    description: series.description ?? null,
    source_url: seriesUrl(series.id),
    retrieved_at: retrievedAt,
  }
}

/** Maps one event into a performance row. Premiere selection happens later. */
export const normalizePerformance = (event: ApiEvent, seriesId: number, retrievedAt: string): PerformanceRow => {
  const description = event.description ?? null
  const country = event.venue?.addressCountryCode ?? null
  const showtime = parseShowtime(description, country)
  return {
    id: event.id,
    series_id: seriesId,
    name: event.name,
    name_ja: nameIn(event.names, 'Japanese'),
    venue_name: event.venue?.name ?? event.venueName ?? null,
    country_code: country,
    start_date: vocadbDay(event.date),
    end_date: vocadbDay(event.endDate),
    showtime_local: showtime?.showtime_local ?? null,
    timezone: showtime?.timezone ?? null,
    time_precision: 'day',
    time_evidence: showtime?.time_evidence ?? null,
    role: performanceRole(event.name, description),
    series_number: event.seriesNumber ?? null,
    series_suffix: event.seriesSuffix ? event.seriesSuffix : null,
    song_list_id: event.songList?.id ?? null,
    vocadb_status: event.status ?? null,
    source_url: eventUrl(event.id),
    retrieved_at: retrievedAt,
  }
}

/** Keeps enabled web links for the performance_links table. */
export const normalizeLinks = (event: ApiEvent): PerformanceLinkRow[] => {
  return (event.webLinks ?? [])
    .filter((link) => link.disabled !== true && link.url)
    .map((link) => ({
      performance_id: event.id,
      url: link.url,
      description: link.description ?? null,
    }))
}

/** Maps a song into a table row. songType defaults only when the API omitted it. */
export const normalizeSong = (song: ApiSong, retrievedAt: string): SongRow => {
  return {
    id: song.id,
    name: song.name,
    name_ja: nameIn(song.names, 'Japanese'),
    name_en: nameIn(song.names, 'English'),
    artist_string: song.artistString ?? null,
    song_type: song.songType ?? 'Unspecified',
    publish_date: vocadbDay(song.publishDate),
    length_seconds: song.lengthSeconds ?? null,
    source_url: songUrl(song.id),
    retrieved_at: retrievedAt,
  }
}

/** Maps supported PVs. Disabled flags are stored so representative selection can skip them. */
export const normalizeVideos = (song: ApiSong): VideoRow[] => {
  const rows: VideoRow[] = []
  for (const pv of song.pvs ?? []) {
    const mapped = platformOf(pv)
    if (!mapped || !pv.pvId || !pv.url) continue
    rows.push({
      vocadb_pv_id: pv.id,
      song_id: song.id,
      platform: mapped,
      platform_video_id: pv.pvId,
      url: pv.url,
      title: pv.name ?? null,
      author: pv.author ?? null,
      pv_type: pv.pvType ?? null,
      publish_date: vocadbDay(pv.publishDate),
      disabled: pv.disabled ? 1 : 0,
    })
  }
  return rows
}

/** Returns the catalog platform for a PV service, or null when we do not store it. */
export const platformOf = (pv: ApiPv): Platform | null => PLATFORMS[pv.service] ?? null

/** Enabled web link URLs used as mashup evidence. */
export const linkUrls = (links: readonly ApiWebLink[] | undefined): string[] => {
  return (links ?? []).filter((link) => link.disabled !== true && link.url).map((link) => link.url)
}

/**
 * Decides how a setlist line is stored.
 * The caller still inserts the song row for the listed mashup so the quarantine can be audited.
 */
export const lineDecision = (song: ApiSong, notes: string | null) => {
  return decideMedley({
    songType: song.songType ?? 'Unspecified',
    listedSongId: song.id,
    notes,
    webLinkUrls: linkUrls(song.webLinks),
  })
}
