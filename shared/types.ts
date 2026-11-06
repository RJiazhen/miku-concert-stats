/** A read-only row source used by both better-sqlite3 and sql.js. */
export type Queryable = {
  /** Returns every row of a read-only SELECT as column maps. */
  all: (sql: string) => SqlRow[]
}

/** Column map returned by a SQLite driver before narrowing. */
export type SqlRow = Record<string, SqlValue>

/** Values SQLite may return for the columns this catalog stores. */
export type SqlValue = string | number | null | Uint8Array

/** Platform keys stored in videos and snapshots. */
export type Platform = 'niconico' | 'youtube' | 'bilibili'

/** Whether a dated performance can count as a premiere. */
export type PerformanceRole = 'show' | 'broadcast'

/** Fixed playback bands, plus songs that have no snapshot. */
export type BandId = 'none' | 'under_100k' | '100k_1m' | '1m_10m' | '10m_plus'

/** How compare mode groups 演出 before counting songs. */
export type CompareGrouping = 'series' | 'edition' | 'year'

/** VocaDB attribution row. */
export type SourceRow = {
  id: string
  name: string
  url: string
  license: string
  notes: string
}

/** One concert series, keyed by the VocaDB series id. */
export type SeriesRow = {
  id: number
  name: string
  name_ja: string | null
  description: string | null
  source_url: string
  retrieved_at: string
}

/** One 演出 inside a series: one VocaDB release event / one city stop. */
export type PerformanceRow = {
  id: number
  series_id: number
  name: string
  name_ja: string | null
  venue_name: string | null
  country_code: string | null
  start_date: string | null
  end_date: string | null
  showtime_local: string | null
  timezone: string | null
  time_precision: 'day'
  time_evidence: string | null
  role: PerformanceRole
  series_number: number | null
  series_suffix: string | null
  song_list_id: number | null
  vocadb_status: string | null
  source_url: string
  retrieved_at: string
}

/** Web link copied from a VocaDB event, including official sites. */
export type PerformanceLinkRow = {
  performance_id: number
  url: string
  description: string | null
}

/** Earliest non-broadcast 演出 of a series year. */
export type EditionPremiereRow = {
  series_id: number
  series_number: number
  premiere_performance_id: number
  premiere_date: string
  premiere_showtime_local: string | null
  rule: string
}

/** Where a setlist came from: the event's own VocaDB song list, a release tracklist, or a wiki. */
export type SetlistSource = 'vocadb' | 'album' | 'wiki'

/** Physical medium of a release whose tracklist stands in for a missing setlist. */
export type ReleaseMedium = 'bluray' | 'cd' | 'dvd'

/** Song list attached to one or more performances. */
export type SongListRow = {
  id: number
  name: string
  featured_category: string | null
  source_url: string
  retrieved_at: string
  announced_at: string | null
  /** Upstream performance list, or an album tracklist used as a fallback. */
  source: SetlistSource
  /** VocaDB album id when `source` is `album`. */
  album_id: number | null
  /** Release medium when `source` is `album`. */
  medium: ReleaseMedium | null
}

/** One structured producer-side credit attached to a song for display and filtering. */
export type SongProducerCredit = {
  /** VocaDB artist id; one real artist stays one option even across name variants. */
  artistId: number
  /** Display name, preferring the credit's custom name over the canonical artist name. */
  name: string
  /** Lower-cased evidence behind the credit, e.g. `producer, composer`. */
  roles: string
}

/** Stored producer credit row from `song_producers`. */
export type SongProducerRow = {
  song_id: number
  artist_id: number
  name: string
  roles: string
}

/** Song entry used for counting and lookup. */
export type SongRow = {
  id: number
  name: string
  name_ja: string | null
  name_en: string | null
  artist_string: string | null
  song_type: string
  publish_date: string | null
  length_seconds: number | null
  /** Credited vocalists from VocaDB's artists list; empty when the song has no structured credit. */
  vocalists?: string[]
  /** Producer-side credits from `song_producers`; empty when VocaDB names none. */
  producers?: SongProducerCredit[]
  source_url: string
  retrieved_at: string
}

/** One printed setlist line before medley splitting. */
export type SetlistItemRow = {
  song_list_id: number
  position: number
  listed_song_id: number
  notes: string | null
}

/** Song ids that a setlist line contributes to the counts. */
export type SetlistItemSongRow = {
  song_list_id: number
  position: number
  song_id: number
  role: 'listed' | 'component'
}

/** Mashup line that could not be split into verifiable components. */
export type MedleyQuarantineRow = {
  song_list_id: number
  position: number
  listed_song_id: number
  reason: string
}

/** How the row set of one 演出 was attributed to its 场次. */
export type SetlistResolution = 'vocadb-note' | 'vocadb-shared' | 'external' | 'unresolved'

/** Confidence of one outside source. */
export type SetlistConfidence = 'high' | 'medium' | 'low'

/** Derived 演出 layer: one row per performance, with the attribution and its sources. */
export type PerformanceSetlistRow = {
  performance_id: number
  /** Null when the rows come from a wiki table and VocaDB has no song list for this 演出. */
  source_list_id: number | null
  source_kind: SetlistSource
  /** `none` keeps every source row, `filtered` drops some, `curated` was hand-corrected. */
  change: 'none' | 'filtered' | 'curated'
  status: 'complete' | 'partial' | 'conflict' | 'inherited'
  resolution: SetlistResolution
  source_row_count: number
  /** JSON array of dates verified to have a daytime and a night-time show. */
  day_night_dates: string | null
  /** JSON array of dates inside the run that had no live show. */
  no_show_dates: string | null
  /** JSON array of dates verified to have exactly one show. */
  single_show_dates: string | null
  conflict: number
  /** 1 when the attribution is still open: no source located it, or its sources disagree. */
  pending_review: number
  note: string | null
}

/** Outside evidence behind one 演出's attribution. */
export type PerformanceSetlistSourceRow = {
  performance_id: number
  url: string
  title: string
  accessed_at: string
  confidence: SetlistConfidence
  note: string | null
  conflict: number
}

/** One 场次 of the derived layer; parser facts only. */
export type PerformanceShowSetlistRow = {
  performance_id: number
  show_key: string
  date: string | null
  half: 'day' | 'night' | null
  item_count: number
  omitted_count: number
  uncertain: number
  /** JSON array of rotation reason codes. */
  reasons: string
}

/** One ordered setlist line of one 场次. */
export type PerformanceShowSetlistItemRow = {
  performance_id: number
  show_key: string
  position: number
  source_position: number | null
  song_id: number | null
  medley_id: number | null
  evidence: 'note' | 'shared' | 'curated' | 'wiki'
  notes: string | null
}

/** Hand-checked outcome of a 演出 that has no setlist row. */
export type PerformanceStatusValue = 'cancelled' | 'postponed' | 'upcoming'

/** Stored status row from `performance_status`. */
export type PerformanceStatusRow = {
  performance_id: number
  status: PerformanceStatusValue
  note: string | null
  source_url: string
  accessed_at: string
}

/** One complete medley entry referenced by a setlist line. */
export type MedleyRow = {
  id: number
  name: string
  note: string | null
  source_url: string
}

/** One song inside a medley, in performance order. */
export type MedleySongRow = {
  medley_id: number
  position: number
  song_id: number
}

/** One VocaDB PV kept for niconico, YouTube, or bilibili. */
export type VideoRow = {
  vocadb_pv_id: number
  song_id: number
  platform: Platform
  platform_video_id: string
  url: string
  title: string | null
  author: string | null
  pv_type: string | null
  publish_date: string | null
  disabled: number
}

/** One observed view count. */
export type ViewSnapshotRow = {
  platform: Platform
  platform_video_id: string
  collected_at: string
  view_count: number
  source: string
  source_url: string
}

/** Immutable milestone. Empty unless a sourced achievement time exists. */
export type MilestoneRow = {
  platform: Platform
  platform_video_id: string
  kind: string
  threshold: number
  achieved_at: string
  source: string
  source_url: string
}

/** Versioned niconico-to-YouTube formula, published only after gates pass. */
export type ConversionFormulaRow = {
  id: string
  status: 'published' | 'unpublished'
  version: string | null
  scope: string | null
  sample_period: string | null
  train_metrics_json: string | null
  holdout_metrics_json: string | null
  formula_json: string | null
  reason: string
}

/** Tables the browser loads before aggregating in TypeScript. */
export type Catalog = {
  sources: SourceRow[]
  series: SeriesRow[]
  performances: PerformanceRow[]
  performanceLinks: PerformanceLinkRow[]
  premieres: EditionPremiereRow[]
  songLists: SongListRow[]
  songs: SongRow[]
  setlistItems: SetlistItemRow[]
  setlistItemSongs: SetlistItemSongRow[]
  medleyQuarantine: MedleyQuarantineRow[]
  videos: VideoRow[]
  snapshots: ViewSnapshotRow[]
  milestones: MilestoneRow[]
  formulas: ConversionFormulaRow[]
  /** Derived 演出 layer, one row per performance with a source song list. */
  performanceSetlists: PerformanceSetlistRow[]
  /** Outside evidence cited by those rows. */
  performanceSetlistSources: PerformanceSetlistSourceRow[]
  /** One row per 场次 of the derived layer. */
  performanceShowSetlists: PerformanceShowSetlistRow[]
  /** The ordered setlist of every 场次. */
  performanceShowSetlistItems: PerformanceShowSetlistItemRow[]
  medleys: MedleyRow[]
  medleySongs: MedleySongRow[]
  /** Hand-checked outcome for 演出 that have no setlist row (cancelled, postponed, upcoming). */
  performanceStatus: PerformanceStatusRow[]
}
