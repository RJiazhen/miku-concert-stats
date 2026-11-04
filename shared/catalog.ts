import type {
  Catalog,
  ConversionFormulaRow,
  EditionPremiereRow,
  MedleyQuarantineRow,
  MilestoneRow,
  PerformanceLinkRow,
  PerformanceRole,
  PerformanceRow,
  Platform,
  Queryable,
  ReleaseMedium,
  SeriesRow,
  SetlistItemRow,
  SetlistItemSongRow,
  SetlistSource,
  SongListRow,
  SongRow,
  SourceRow,
  SqlRow,
  VideoRow,
  ViewSnapshotRow,
} from './types.ts'

/** Reads a required string column. */
const text = (row: SqlRow, key: string): string => {
  const value = row[key]
  if (typeof value !== 'string') throw new Error(`Expected text in ${key}`)
  return value
}

/** Reads a nullable string column. */
const textOrNull = (row: SqlRow, key: string): string | null => {
  const value = row[key]
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') throw new Error(`Expected text in ${key}`)
  return value
}

/** Reads a required integer column. */
const int = (row: SqlRow, key: string): number => {
  const value = row[key]
  if (typeof value !== 'number') throw new Error(`Expected number in ${key}`)
  return value
}

/** Reads a nullable integer column. */
const intOrNull = (row: SqlRow, key: string): number | null => {
  const value = row[key]
  if (value === null || value === undefined) return null
  if (typeof value !== 'number') throw new Error(`Expected number in ${key}`)
  return value
}

/** Narrows a platform column. */
const platform = (row: SqlRow, key: string): Platform => {
  const value = text(row, key)
  if (value !== 'niconico' && value !== 'youtube' && value !== 'bilibili') {
    throw new Error(`Unknown platform ${value}`)
  }
  return value
}

/** Narrows a setlist-song role column. */
const setlistRole = (row: SqlRow): 'listed' | 'component' => {
  const value = text(row, 'role')
  if (value === 'listed' || value === 'component') return value
  throw new Error(`Unknown setlist song role ${value}`)
}

/** Narrows a performance role column. */
const role = (row: SqlRow, key: string): PerformanceRole => {
  const value = text(row, key)
  if (value !== 'show' && value !== 'broadcast') throw new Error(`Unknown role ${value}`)
  return value
}

/** Narrows a song list source column. Older rows without the column default to the upstream list. */
const setlistSource = (row: SqlRow): SetlistSource => {
  const value = row.source
  if (value === undefined || value === null) return 'vocadb'
  if (value === 'vocadb' || value === 'album') return value
  throw new Error(`Unknown song list source ${String(value)}`)
}

/** Reads an album medium column. */
const releaseMedium = (row: SqlRow): ReleaseMedium | null => {
  const value = row.medium
  if (value === undefined || value === null) return null
  if (value === 'bluray' || value === 'cd' || value === 'dvd') return value
  throw new Error(`Unknown release medium ${String(value)}`)
}

/** Loads every catalog table. Aggregation stays outside SQL. */
export const loadCatalog = (db: Queryable): Catalog => {
  const sources = db.all('SELECT * FROM sources ORDER BY id').map((row): SourceRow => ({
    id: text(row, 'id'),
    name: text(row, 'name'),
    url: text(row, 'url'),
    license: text(row, 'license'),
    notes: text(row, 'notes'),
  }))
  const series = db.all('SELECT * FROM series ORDER BY id').map((row): SeriesRow => ({
    id: int(row, 'id'),
    name: text(row, 'name'),
    name_ja: textOrNull(row, 'name_ja'),
    description: textOrNull(row, 'description'),
    source_url: text(row, 'source_url'),
    retrieved_at: text(row, 'retrieved_at'),
  }))
  const performances = db.all('SELECT * FROM performances ORDER BY id').map((row): PerformanceRow => ({
    id: int(row, 'id'),
    series_id: int(row, 'series_id'),
    name: text(row, 'name'),
    name_ja: textOrNull(row, 'name_ja'),
    venue_name: textOrNull(row, 'venue_name'),
    country_code: textOrNull(row, 'country_code'),
    start_date: textOrNull(row, 'start_date'),
    end_date: textOrNull(row, 'end_date'),
    showtime_local: textOrNull(row, 'showtime_local'),
    timezone: textOrNull(row, 'timezone'),
    time_precision: 'day',
    time_evidence: textOrNull(row, 'time_evidence'),
    role: role(row, 'role'),
    series_number: intOrNull(row, 'series_number'),
    series_suffix: textOrNull(row, 'series_suffix'),
    song_list_id: intOrNull(row, 'song_list_id'),
    vocadb_status: textOrNull(row, 'vocadb_status'),
    source_url: text(row, 'source_url'),
    retrieved_at: text(row, 'retrieved_at'),
  }))
  const performanceLinks = db.all('SELECT * FROM performance_links ORDER BY performance_id, url').map((row): PerformanceLinkRow => ({
    performance_id: int(row, 'performance_id'),
    url: text(row, 'url'),
    description: textOrNull(row, 'description'),
  }))
  const premieres = db.all('SELECT * FROM edition_premieres ORDER BY series_id, series_number').map((row): EditionPremiereRow => ({
    series_id: int(row, 'series_id'),
    series_number: int(row, 'series_number'),
    premiere_performance_id: int(row, 'premiere_performance_id'),
    premiere_date: text(row, 'premiere_date'),
    premiere_showtime_local: textOrNull(row, 'premiere_showtime_local'),
    rule: text(row, 'rule'),
  }))
  const songLists = db.all('SELECT * FROM song_lists ORDER BY id').map((row): SongListRow => ({
    id: int(row, 'id'),
    name: text(row, 'name'),
    featured_category: textOrNull(row, 'featured_category'),
    source_url: text(row, 'source_url'),
    retrieved_at: text(row, 'retrieved_at'),
    announced_at: textOrNull(row, 'announced_at'),
    source: setlistSource(row),
    album_id: intOrNull(row, 'album_id'),
    medium: releaseMedium(row),
  }))
  const songs = db.all('SELECT * FROM songs ORDER BY id').map((row): SongRow => ({
    id: int(row, 'id'),
    name: text(row, 'name'),
    name_ja: textOrNull(row, 'name_ja'),
    name_en: textOrNull(row, 'name_en'),
    artist_string: textOrNull(row, 'artist_string'),
    song_type: text(row, 'song_type'),
    publish_date: textOrNull(row, 'publish_date'),
    length_seconds: intOrNull(row, 'length_seconds'),
    source_url: text(row, 'source_url'),
    retrieved_at: text(row, 'retrieved_at'),
  }))
  const setlistItems = db.all('SELECT * FROM setlist_items ORDER BY song_list_id, position').map((row): SetlistItemRow => ({
    song_list_id: int(row, 'song_list_id'),
    position: int(row, 'position'),
    listed_song_id: int(row, 'listed_song_id'),
    notes: textOrNull(row, 'notes'),
  }))
  const setlistItemSongs = db.all('SELECT * FROM setlist_item_songs ORDER BY song_list_id, position, song_id').map((row): SetlistItemSongRow => ({
    song_list_id: int(row, 'song_list_id'),
    position: int(row, 'position'),
    song_id: int(row, 'song_id'),
    role: setlistRole(row),
  }))
  const medleyQuarantine = db.all('SELECT * FROM medley_quarantine ORDER BY song_list_id, position').map((row): MedleyQuarantineRow => ({
    song_list_id: int(row, 'song_list_id'),
    position: int(row, 'position'),
    listed_song_id: int(row, 'listed_song_id'),
    reason: text(row, 'reason'),
  }))
  const videos = db.all('SELECT * FROM videos ORDER BY vocadb_pv_id').map((row): VideoRow => ({
    vocadb_pv_id: int(row, 'vocadb_pv_id'),
    song_id: int(row, 'song_id'),
    platform: platform(row, 'platform'),
    platform_video_id: text(row, 'platform_video_id'),
    url: text(row, 'url'),
    title: textOrNull(row, 'title'),
    author: textOrNull(row, 'author'),
    pv_type: textOrNull(row, 'pv_type'),
    publish_date: textOrNull(row, 'publish_date'),
    disabled: int(row, 'disabled'),
  }))
  const snapshots = db.all('SELECT * FROM view_snapshots ORDER BY collected_at').map((row): ViewSnapshotRow => ({
    platform: platform(row, 'platform'),
    platform_video_id: text(row, 'platform_video_id'),
    collected_at: text(row, 'collected_at'),
    view_count: int(row, 'view_count'),
    source: text(row, 'source'),
    source_url: text(row, 'source_url'),
  }))
  const milestones = db.all('SELECT * FROM milestones ORDER BY achieved_at').map((row): MilestoneRow => ({
    platform: platform(row, 'platform'),
    platform_video_id: text(row, 'platform_video_id'),
    kind: text(row, 'kind'),
    threshold: int(row, 'threshold'),
    achieved_at: text(row, 'achieved_at'),
    source: text(row, 'source'),
    source_url: text(row, 'source_url'),
  }))
  const formulas = db.all('SELECT * FROM conversion_formulas ORDER BY id').map((row): ConversionFormulaRow => ({
    id: text(row, 'id'),
    status: text(row, 'status') === 'published' ? 'published' : 'unpublished',
    version: textOrNull(row, 'version'),
    scope: textOrNull(row, 'scope'),
    sample_period: textOrNull(row, 'sample_period'),
    train_metrics_json: textOrNull(row, 'train_metrics_json'),
    holdout_metrics_json: textOrNull(row, 'holdout_metrics_json'),
    formula_json: textOrNull(row, 'formula_json'),
    reason: text(row, 'reason'),
  }))
  return {
    sources,
    series,
    performances,
    performanceLinks,
    premieres,
    songLists,
    songs,
    setlistItems,
    setlistItemSongs,
    medleyQuarantine,
    videos,
    snapshots,
    milestones,
    formulas,
  }
}
