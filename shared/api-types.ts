import type { SongCategory } from './types.ts'

/**
 * Counts that differ from the site's default ranking because a broadcast-style 演出 was included.
 * Only present when it is not identical to the base numbers.
 */
export type ApiSongAltCounts = {
  show: number
  event: number
  firstYear: number | null
  lastYear: number | null
  /** Series id to `[showCount, eventCount]`. */
  series: Record<string, [number, number]>
  /** Calendar year to `[showCount, eventCount]`. */
  year: Record<string, [number, number]>
}

/**
 * One song row bundled into the Worker for the dynamic search, rank, and debut routes.
 * Counts follow the site's default ranking: broadcast-style 演出 and medley placeholders are excluded.
 */
export type ApiSongRow = {
  id: number
  name: string
  nameJa: string | null
  nameEn: string | null
  nameZh: string | null
  /** Other accepted Chinese titles, matched by search but never displayed. */
  nameZhAliases?: string[]
  /** Producer-side credit text shown for the row. */
  producer: string | null
  category: SongCategory
  show: number
  event: number
  firstYear: number | null
  lastYear: number | null
  approximate: boolean
  /** Base character names of the merged variant group, in config order. */
  characters: string[]
  /** Producer names the producer filter matches, structured credits first. */
  producers: string[]
  series: Record<string, [number, number]>
  year: Record<string, [number, number]>
  /** Series id to the first series year the song appeared in. */
  firstSeries: Record<string, number>
  /** Numbers with broadcast / livestream / VR 演出 included. */
  withBroadcast?: ApiSongAltCounts
}

/** One producer offered by the ranking filter and the producer search. */
export type ApiProducerOption = {
  /** Stable key used by `producers/{id}.json`. */
  id: string
  name: string
  /** Producer-side roles that have at least one credited song. */
  roles: string[]
  songCount: number
}

/** One series offered by the ranking filter. */
export type ApiSeriesOption = {
  id: number
  name: string
  performanceCount: number
  showCount: number
}

/** One character offered by the ranking filter. */
export type ApiCharacterOption = {
  name: string
  /** Number of ranked songs that credit this character. */
  count: number
}

/** Payload of `server/assets/api/rank.json`, bundled into the Worker for the dynamic routes. */
export type ApiRankFile = {
  generatedAt: string
  catalogVersion: string
  songs: ApiSongRow[]
  producers: ApiProducerOption[]
  series: ApiSeriesOption[]
  characters: ApiCharacterOption[]
  yearFrom: number | null
  yearTo: number | null
}
