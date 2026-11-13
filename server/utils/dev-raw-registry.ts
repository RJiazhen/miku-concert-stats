/**
 * Dataset catalog for the dev-only `/raw` browser: SQLite tables plus tracked JSON under `data/`.
 * Overlay field names are joined onto songs / series / performances even though they live in other files.
 */

/** Locale slots used by string-map overlays under `data/`. */
export type LocaleSlot = 'zh-CN' | 'zh-Hant' | 'en'

/** How a cell maps back to a local source file. */
export type FieldOwner =
  | { kind: 'catalog'; table: string; column: string }
  | { kind: 'song-title'; locale: 'zh-CN' | 'zh-Hant'; prop: 'title' | 'aliases' }
  | { kind: 'song-alias'; prop: 'title' | 'aliases' }
  | { kind: 'series-title'; locale: 'zh-CN' | 'zh-Hant' | 'en' }
  | { kind: 'json-file'; file: string; mode: 'record-value' | 'record-json' | 'array-json' }
  | { kind: 'locale-map'; locale: LocaleSlot }
  | { kind: 'wiki-raw-file' }
  | { kind: 'readonly' }

/** One browsable dataset shown in the sidebar. */
export type RawDataset = {
  id: string
  label: string
  kind: 'catalog' | 'json' | 'locale-map' | 'wiki-raw'
  /** Relative path under the repo root for single-file JSON datasets. */
  file?: string
  /**
   * Locale → relative JSON path for a merged name-map dataset.
   * On disk the project still keeps one file per locale; the browser shows them as one table.
   */
  localeFiles?: Partial<Record<LocaleSlot, string>>
  /** SQLite table name for catalog datasets. */
  table?: string
  /** Primary-key column names used to identify a row. */
  primaryKey: string[]
  /** Columns returned to the UI (catalog columns plus enrichment). */
  columns: string[]
  /** Field → write-back owner. Missing fields are treated as readonly. */
  owners: Record<string, FieldOwner>
  /** True when collect/derive may overwrite edits unless patched via 0011. */
  derived?: boolean
  warning?: string
}

/** Columns that every SQLite table exposes as editable catalog fields by default. */
const catalogOwner = (table: string, columns: string[]): Record<string, FieldOwner> => {
  const owners: Record<string, FieldOwner> = {}
  for (const column of columns) {
    owners[column] = { kind: 'catalog', table, column }
  }
  for (const key of ['id', ...columns.filter((name) => name.endsWith('_id') && name !== 'listed_song_id')]) {
    if (owners[key]) owners[key] = { kind: 'readonly' }
  }
  return owners
}

/** Song catalog columns plus translation / alias overlays. */
const SONG_COLUMNS = [
  'id',
  'name',
  'name_ja',
  'name_en',
  'artist_string',
  'song_type',
  'category',
  'publish_date',
  'length_seconds',
  'source_url',
  'retrieved_at',
  'title_zh',
  'aliases_zh',
  'title_zh_Hant',
  'aliases_zh_Hant',
  'alias_title_ja',
  'aliases_ja_en',
] as const

/** Series catalog columns plus localized titles. */
const SERIES_COLUMNS = [
  'id',
  'name',
  'name_ja',
  'description',
  'source_url',
  'retrieved_at',
  'title_zh',
  'title_zh_Hant',
  'title_en',
] as const

/** Performance catalog columns plus resolved localization helpers. */
const PERFORMANCE_COLUMNS = [
  'id',
  'series_id',
  'name',
  'name_ja',
  'venue_name',
  'country_code',
  'start_date',
  'end_date',
  'showtime_local',
  'timezone',
  'time_precision',
  'time_evidence',
  'role',
  'series_number',
  'series_suffix',
  'song_list_id',
  'vocadb_status',
  'source_url',
  'retrieved_at',
  'series_name',
  'name_zh',
  'name_en',
  'venue_en',
  'series_title_zh',
  'series_title_zh_Hant',
  'series_title_en',
] as const

/** Builds the song field owners: catalog columns write SQL; overlays write JSON. */
const songOwners = (): Record<string, FieldOwner> => {
  const owners = catalogOwner('songs', [
    'name',
    'name_ja',
    'name_en',
    'artist_string',
    'song_type',
    'category',
    'publish_date',
    'length_seconds',
    'source_url',
    'retrieved_at',
  ])
  owners.id = { kind: 'readonly' }
  owners.title_zh = { kind: 'song-title', locale: 'zh-CN', prop: 'title' }
  owners.aliases_zh = { kind: 'song-title', locale: 'zh-CN', prop: 'aliases' }
  owners.title_zh_Hant = { kind: 'song-title', locale: 'zh-Hant', prop: 'title' }
  owners.aliases_zh_Hant = { kind: 'song-title', locale: 'zh-Hant', prop: 'aliases' }
  owners.alias_title_ja = { kind: 'song-alias', prop: 'title' }
  owners.aliases_ja_en = { kind: 'song-alias', prop: 'aliases' }
  return owners
}

/** Builds series field owners including localized title overlays keyed by `name`. */
const seriesOwners = (): Record<string, FieldOwner> => {
  const owners = catalogOwner('series', ['name', 'name_ja', 'description', 'source_url', 'retrieved_at'])
  owners.id = { kind: 'readonly' }
  owners.title_zh = { kind: 'series-title', locale: 'zh-CN' }
  owners.title_zh_Hant = { kind: 'series-title', locale: 'zh-Hant' }
  owners.title_en = { kind: 'series-title', locale: 'en' }
  return owners
}

/** Builds performance owners; resolved localization columns stay read-only. */
const performanceOwners = (): Record<string, FieldOwner> => {
  const owners = catalogOwner('performances', [
    'series_id',
    'name',
    'name_ja',
    'venue_name',
    'country_code',
    'start_date',
    'end_date',
    'showtime_local',
    'timezone',
    'time_precision',
    'time_evidence',
    'role',
    'series_number',
    'series_suffix',
    'song_list_id',
    'vocadb_status',
    'source_url',
    'retrieved_at',
  ])
  owners.id = { kind: 'readonly' }
  owners.series_name = { kind: 'readonly' }
  owners.name_zh = { kind: 'readonly' }
  owners.name_en = { kind: 'readonly' }
  owners.venue_en = { kind: 'readonly' }
  owners.series_title_zh = { kind: 'readonly' }
  owners.series_title_zh_Hant = { kind: 'readonly' }
  owners.series_title_en = { kind: 'readonly' }
  return owners
}

/** Declares a plain catalog table with every listed column writable except primary keys. */
const catalogTable = (
  id: string,
  label: string,
  table: string,
  primaryKey: string[],
  columns: string[],
  options: { derived?: boolean; warning?: string } = {},
): RawDataset => {
  const owners = catalogOwner(table, columns.filter((column) => !primaryKey.includes(column)))
  for (const key of primaryKey) owners[key] = { kind: 'readonly' }
  return {
    id,
    label,
    kind: 'catalog',
    table,
    primaryKey,
    columns: [...primaryKey.filter((key) => !columns.includes(key)), ...columns],
    owners,
    derived: options.derived,
    warning: options.warning,
  }
}

/** Declares a JSON object file whose values are objects shown as a JSON string. */
const recordJsonFile = (id: string, label: string, file: string): RawDataset => ({
  id,
  label,
  kind: 'json',
  file,
  primaryKey: ['key'],
  columns: ['key', 'value'],
  owners: {
    key: { kind: 'readonly' },
    value: { kind: 'json-file', file, mode: 'record-json' },
  },
})

/**
 * Declares a merged string-map dataset spanning one file per locale.
 * Empty locales are omitted from columns; writes still go to the matching on-disk file.
 */
const localeMapBundle = (
  id: string,
  label: string,
  localeFiles: Partial<Record<LocaleSlot, string>>,
): RawDataset => {
  const locales = (Object.keys(localeFiles) as LocaleSlot[]).filter((locale) => localeFiles[locale])
  const columns = ['key', ...locales]
  const owners: Record<string, FieldOwner> = { key: { kind: 'readonly' } }
  for (const locale of locales) owners[locale] = { kind: 'locale-map', locale }
  return {
    id,
    label,
    kind: 'locale-map',
    localeFiles,
    primaryKey: ['key'],
    columns,
    owners,
  }
}

/** All datasets the `/raw` browser can open. */
export const RAW_DATASETS: readonly RawDataset[] = [
  {
    id: 'songs',
    label: 'songs (+ titles / aliases)',
    kind: 'catalog',
    table: 'songs',
    primaryKey: ['id'],
    columns: [...SONG_COLUMNS],
    owners: songOwners(),
  },
  {
    id: 'series',
    label: 'series (+ localized titles)',
    kind: 'catalog',
    table: 'series',
    primaryKey: ['id'],
    columns: [...SERIES_COLUMNS],
    owners: seriesOwners(),
  },
  {
    id: 'performances',
    label: 'performances (+ localized names)',
    kind: 'catalog',
    table: 'performances',
    primaryKey: ['id'],
    columns: [...PERFORMANCE_COLUMNS],
    owners: performanceOwners(),
  },
  catalogTable('sources', 'sources', 'sources', ['id'], [
    'id',
    'name',
    'url',
    'license',
    'notes',
  ]),
  catalogTable('performance_links', 'performance_links', 'performance_links', ['performance_id', 'url'], [
    'performance_id',
    'url',
    'description',
  ]),
  catalogTable('edition_premieres', 'edition_premieres', 'edition_premieres', ['series_id', 'series_number'], [
    'series_id',
    'series_number',
    'premiere_performance_id',
    'premiere_date',
    'premiere_showtime_local',
    'rule',
  ]),
  catalogTable('song_lists', 'song_lists', 'song_lists', ['id'], [
    'id',
    'name',
    'featured_category',
    'source_url',
    'retrieved_at',
    'announced_at',
    'source',
    'album_id',
    'medium',
  ]),
  catalogTable('song_vocalists', 'song_vocalists', 'song_vocalists', ['song_id', 'name'], ['song_id', 'name'], {
    derived: true,
    warning: 'Regenerated by collect:vocalists; prefer that script for bulk changes.',
  }),
  catalogTable('song_producers', 'song_producers', 'song_producers', ['song_id', 'artist_id'], [
    'song_id',
    'artist_id',
    'name',
    'roles',
  ], {
    derived: true,
    warning: 'Regenerated by collect:producers; prefer that script for bulk changes.',
  }),
  catalogTable('setlist_items', 'setlist_items', 'setlist_items', ['song_list_id', 'position'], [
    'song_list_id',
    'position',
    'listed_song_id',
    'notes',
  ]),
  catalogTable(
    'setlist_item_songs',
    'setlist_item_songs',
    'setlist_item_songs',
    ['song_list_id', 'position', 'song_id'],
    ['song_list_id', 'position', 'song_id', 'role'],
  ),
  catalogTable(
    'medley_quarantine',
    'medley_quarantine',
    'medley_quarantine',
    ['song_list_id', 'position'],
    ['song_list_id', 'position', 'listed_song_id', 'reason'],
  ),
  catalogTable(
    'performance_setlists',
    'performance_setlists',
    'performance_setlists',
    ['performance_id'],
    [
      'performance_id',
      'source_list_id',
      'source_kind',
      'change',
      'status',
      'resolution',
      'source_row_count',
      'day_night_dates',
      'no_show_dates',
      'single_show_dates',
      'conflict',
      'pending_review',
      'note',
      'page_note',
    ],
    {
      derived: true,
      warning: 'Derived by derive:setlists; edits land in 0011 and may need a re-derive later.',
    },
  ),
  catalogTable(
    'performance_setlist_sources',
    'performance_setlist_sources',
    'performance_setlist_sources',
    ['performance_id', 'url'],
    ['performance_id', 'url', 'title', 'accessed_at', 'confidence', 'note', 'conflict'],
    { derived: true, warning: 'Usually maintained via performance-setlists.json + derive:setlists.' },
  ),
  catalogTable(
    'performance_show_setlists',
    'performance_show_setlists',
    'performance_show_setlists',
    ['performance_id', 'show_key'],
    ['performance_id', 'show_key', 'date', 'half', 'item_count', 'omitted_count', 'uncertain', 'reasons'],
    { derived: true, warning: 'Derived show layer; prefer source JSON / derive:setlists.' },
  ),
  catalogTable(
    'performance_show_setlist_items',
    'performance_show_setlist_items',
    'performance_show_setlist_items',
    ['performance_id', 'show_key', 'position'],
    ['performance_id', 'show_key', 'position', 'source_position', 'song_id', 'medley_id', 'evidence', 'notes'],
    { derived: true, warning: 'Derived show items; prefer source JSON / derive:setlists.' },
  ),
  catalogTable('performance_status', 'performance_status', 'performance_status', ['performance_id'], [
    'performance_id',
    'status',
    'note',
    'source_url',
    'accessed_at',
  ]),
  catalogTable('medleys', 'medleys', 'medleys', ['id'], ['id', 'name', 'note', 'source_url']),
  catalogTable('medley_songs', 'medley_songs', 'medley_songs', ['medley_id', 'position'], [
    'medley_id',
    'position',
    'song_id',
  ]),
  catalogTable('videos', 'videos', 'videos', ['vocadb_pv_id'], [
    'vocadb_pv_id',
    'song_id',
    'platform',
    'platform_video_id',
    'url',
    'title',
    'author',
    'pv_type',
    'publish_date',
    'disabled',
  ]),
  // Song titles / aliases already appear as enrichment columns on `songs`; no separate sidebar entries.
  localeMapBundle('series-titles', 'series-titles', {
    'zh-CN': 'data/series-titles.zh-CN.json',
    'zh-Hant': 'data/series-titles.zh-Hant.json',
    en: 'data/series-titles.en.json',
  }),
  localeMapBundle('place-names', 'place-names', {
    'zh-CN': 'data/place-names.zh-CN.json',
    'zh-Hant': 'data/place-names.zh-Hant.json',
    en: 'data/place-names.en.json',
  }),
  localeMapBundle('venue-names', 'venue-names', {
    en: 'data/venue-names.en.json',
  }),
  recordJsonFile('characters', 'characters.json', 'data/characters.json'),
  localeMapBundle('character-names', 'character-names', {
    'zh-CN': 'data/characters.zh-CN.json',
    'zh-Hant': 'data/characters.zh-Hant.json',
    en: 'data/characters.en.json',
  }),
  recordJsonFile('song-variants', 'song-variants.json', 'data/song-variants.json'),
  recordJsonFile('setlist-merges', 'setlist-merges.json', 'data/setlist-merges.json'),
  recordJsonFile('performance-setlists', 'performance-setlists.json', 'data/performance-setlists.json'),
  recordJsonFile('album-setlists', 'album-setlists.json', 'data/album-setlists.json'),
  recordJsonFile('show-locations', 'show-locations.json', 'data/show-locations.json'),
  recordJsonFile('producer-flags', 'producer-flags.json', 'data/producer-flags.json'),
  recordJsonFile('song-notes', 'song-notes.json', 'data/song-notes.json'),
  recordJsonFile('wiki-repertoire', 'wiki-repertoire.json', 'data/wiki-repertoire.json'),
  recordJsonFile('wiki-setlists', 'wiki-setlists.json', 'data/wiki-setlists.json'),
  recordJsonFile('wiki-songs', 'wiki-songs.json', 'data/wiki-songs.json'),
  recordJsonFile('wiki-title-aliases', 'wiki-title-aliases.json', 'data/wiki-title-aliases.json'),
  {
    id: 'wiki-raw',
    label: 'wiki-raw/',
    kind: 'wiki-raw',
    primaryKey: ['file'],
    columns: ['file', 'value'],
    owners: {
      file: { kind: 'readonly' },
      value: { kind: 'wiki-raw-file' },
    },
  },
]

/** Looks up a dataset by id, or null when unknown. */
export const datasetById = (id: string): RawDataset | null => {
  return RAW_DATASETS.find((dataset) => dataset.id === id) ?? null
}

/** Builds a stable row key string from primary-key column values. */
export const rowKeyOf = (dataset: RawDataset, row: Record<string, unknown>): string => {
  return dataset.primaryKey.map((column) => String(row[column] ?? '')).join('\u0001')
}

/** Parses a row key produced by `rowKeyOf` back into column values (all strings). */
export const parseRowKey = (dataset: RawDataset, key: string): Record<string, string> => {
  const parts = key.split('\u0001')
  if (parts.length !== dataset.primaryKey.length) {
    throw new Error(`Row key does not match ${dataset.id} primary key`)
  }
  const out: Record<string, string> = {}
  dataset.primaryKey.forEach((column, index) => {
    out[column] = parts[index] ?? ''
  })
  return out
}
