import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { parsePlaceNames } from '../../shared/place-names.ts'
import { parseSeriesTitles } from '../../shared/series-titles.ts'
import { parseSongAliases } from '../../shared/song-aliases.ts'
import { parseSongTitles } from '../../shared/song-titles.ts'
import { parseVenueNames } from '../../shared/venue-names.ts'
import { allPerformanceNames, venueNameEn } from '../../shared/localized-names.ts'
import { sqlLiteral } from '../../scripts/sql/emit.ts'
import {
  datasetById,
  parseRowKey,
  RAW_DATASETS,
  rowKeyOf,
  type FieldOwner,
  type RawDataset,
} from './dev-raw-registry.ts'

/** Absolute repo root for the current Nitro process (worktree cwd). */
export const rawRepoRoot = (): string => process.cwd()

/**
 * Rebuilds `public/data/catalog.sqlite` in a child process so Nitro never bundles the
 * offline build scripts (better-sqlite3 writers, API asset emitters) into the server graph.
 */
const rebuildCatalog = (root = rawRepoRoot()): void => {
  const result = spawnSync('pnpm', ['exec', 'tsx', 'scripts/build-catalog.ts'], {
    cwd: root,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || 'build:catalog failed').trim()
    throw createError({ statusCode: 500, statusMessage: detail.slice(0, 500) })
  }
}

/** One row as string-keyed cells for the UI table. */
export type RawRow = Record<string, string | null>

/** Dataset list payload for the sidebar. */
export type DatasetSummary = {
  id: string
  label: string
  kind: 'catalog' | 'json' | 'locale-map' | 'wiki-raw'
  rowCount: number
  derived?: boolean
  warning?: string
}

/** Page of rows for one dataset. */
export type DatasetPage = {
  id: string
  label: string
  columns: string[]
  primaryKey: string[]
  editable: string[]
  derived?: boolean
  warning?: string
  /** On-disk paths this dataset reads/writes (locale bundles list every sibling file). */
  files?: string[]
  total: number
  offset: number
  limit: number
  rows: Array<{ key: string; cells: RawRow }>
}

/** Absolute path to the built catalog sqlite. */
const catalogPath = (root = rawRepoRoot()): string => path.join(root, 'public', 'data', 'catalog.sqlite')

/** Opens the built catalog for reading; throws when it has not been built yet. */
const openCatalog = (root = rawRepoRoot()): Database.Database => {
  const file = catalogPath(root)
  if (!existsSync(file)) {
    throw createError({ statusCode: 503, statusMessage: 'catalog.sqlite missing — run vp dev / build:catalog first' })
  }
  return new Database(file, { readonly: true, fileMustExist: true })
}

/** Reads a JSON file relative to the repo root. */
const readJsonFile = (relative: string, root = rawRepoRoot()): unknown => {
  const file = path.join(root, relative)
  return JSON.parse(readFileSync(file, 'utf8')) as unknown
}

/**
 * Rebuilds a song-title / song-alias entry with the committed field order
 * (`title`, optional `aliases`, `source`, optional `comment`) so a one-cell edit
 * does not reshuffle every object in the file.
 */
const orderedTitleEntry = (
  entry: { title: string; aliases?: string[]; source: string; comment?: string },
): Record<string, unknown> => {
  const ordered: Record<string, unknown> = { title: entry.title }
  if (entry.aliases && entry.aliases.length > 0) ordered.aliases = entry.aliases
  ordered.source = entry.source
  if (entry.comment !== undefined) ordered.comment = entry.comment
  return ordered
}

/** Rewrites a song-title / song-alias file while keeping each entry's field order stable. */
const writeSongOverlayFile = (
  relative: string,
  file: Record<string, { title: string; aliases?: string[]; source: string; comment?: string }>,
  root = rawRepoRoot(),
): void => {
  const ordered: Record<string, Record<string, unknown>> = {}
  for (const [id, entry] of Object.entries(file)) {
    ordered[id] = orderedTitleEntry(entry)
  }
  writeJsonFile(relative, ordered, root)
}

/** Writes a JSON value with stable two-space formatting and a trailing newline. */
const writeJsonFile = (relative: string, value: unknown, root = rawRepoRoot()): void => {
  const file = path.join(root, relative)
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

/** Formats a cell for the UI: null stays null, objects become JSON text. */
const cellText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

/** Joins string aliases for a single table cell. */
const joinAliases = (aliases: readonly string[] | undefined): string | null => {
  if (!aliases || aliases.length === 0) return null
  return aliases.join(' | ')
}

/** Splits an aliases cell back into a list; empty clears the list. */
const splitAliases = (value: string | null): string[] | undefined => {
  if (value === null || value.trim() === '') return undefined
  const aliases = value.split('|').map((part) => part.trim()).filter(Boolean)
  return aliases.length > 0 ? aliases : undefined
}

/** Coerces a patched catalog value into a SQL literal input. */
const catalogValue = (raw: string | null, column: string): string | number | null => {
  if (raw === null || raw === '') return null
  if (
    column === 'id'
    || column.endsWith('_id')
    || column === 'series_number'
    || column === 'position'
    || column === 'length_seconds'
    || column === 'album_id'
    || column === 'disabled'
    || column === 'conflict'
    || column === 'pending_review'
    || column === 'source_row_count'
    || column === 'item_count'
    || column === 'omitted_count'
    || column === 'uncertain'
    || column === 'vocadb_pv_id'
    || column === 'artist_id'
  ) {
    const number = Number(raw)
    if (!Number.isFinite(number)) throw createError({ statusCode: 400, statusMessage: `${column} must be a number` })
    return number
  }
  return raw
}

/** Loads song title / alias overlays used when enriching song rows. */
const loadSongOverlays = (root = rawRepoRoot()) => {
  const zh = parseSongTitles(readJsonFile('data/song-titles.zh-CN.json', root))
  const hant = parseSongTitles(readJsonFile('data/song-titles.zh-Hant.json', root))
  const aliases = parseSongAliases(readJsonFile('data/song-aliases.json', root))
  return { zh, hant, aliases }
}

/** Loads series / place / venue overlays used when enriching series and performances. */
const loadNameOverlays = (root = rawRepoRoot()) => {
  const seriesTitles = parseSeriesTitles({
    zh: readJsonFile('data/series-titles.zh-CN.json', root),
    'zh-Hant': readJsonFile('data/series-titles.zh-Hant.json', root),
    en: readJsonFile('data/series-titles.en.json', root),
  })
  const places = parsePlaceNames({
    zh: readJsonFile('data/place-names.zh-CN.json', root),
    'zh-Hant': readJsonFile('data/place-names.zh-Hant.json', root),
    en: readJsonFile('data/place-names.en.json', root),
  })
  const venues = parseVenueNames(readJsonFile('data/venue-names.en.json', root))
  return { seriesTitles, places, venues }
}

/** Context loaded once per page read for song / series / performance enrichment. */
type EnrichmentContext = {
  songs?: ReturnType<typeof loadSongOverlays>
  names?: ReturnType<typeof loadNameOverlays>
  seriesById?: Map<number, string>
}

/** Turns a SQLite row into string cells, optionally enriching songs / series / performances. */
const enrichCatalogRow = (
  dataset: RawDataset,
  row: Record<string, unknown>,
  context: EnrichmentContext,
): RawRow => {
  const cells: RawRow = {}
  for (const column of dataset.columns) {
    if (column in row) cells[column] = cellText(row[column])
    else cells[column] = null
  }

  if (dataset.id === 'songs' && context.songs) {
    const id = String(row.id)
    const zh = context.songs.zh[id]
    const hant = context.songs.hant[id]
    const alias = context.songs.aliases[id]
    cells.title_zh = zh?.title ?? null
    cells.aliases_zh = joinAliases(zh?.aliases)
    cells.title_zh_Hant = hant?.title ?? null
    cells.aliases_zh_Hant = joinAliases(hant?.aliases)
    cells.alias_title_ja = alias?.title ?? null
    cells.aliases_ja_en = joinAliases(alias?.aliases)
  }

  if (dataset.id === 'series' && context.names) {
    const name = String(row.name ?? '')
    cells.title_zh = context.names.seriesTitles.zh[name] ?? null
    cells.title_zh_Hant = context.names.seriesTitles['zh-Hant'][name] ?? null
    cells.title_en = context.names.seriesTitles.en[name] ?? null
  }

  if (dataset.id === 'performances' && context.names) {
    const seriesId = Number(row.series_id)
    const seriesName = context.seriesById?.get(seriesId) ?? ''
    cells.series_name = seriesName || null
    const names = allPerformanceNames({
      name: String(row.name ?? ''),
      seriesName,
      seriesNumber: typeof row.series_number === 'number' ? row.series_number : Number(row.series_number) || null,
      seriesTitles: context.names.seriesTitles,
      places: context.names.places,
    })
    cells.name_zh = names.zh
    cells.name_en = names.en
    cells.venue_en = venueNameEn(
      context.names.venues,
      typeof row.venue_name === 'string' ? row.venue_name : null,
    )
    cells.series_title_zh = context.names.seriesTitles.zh[seriesName] ?? null
    cells.series_title_zh_Hant = context.names.seriesTitles['zh-Hant'][seriesName] ?? null
    cells.series_title_en = context.names.seriesTitles.en[seriesName] ?? null
  }

  return cells
}

/** Every registered dataset (wiki-raw captures are one merged table, not one entry per file). */
export const allDatasets = (): RawDataset[] => [...RAW_DATASETS]

/** Resolves a dataset id against the static registry. */
export const resolveDataset = (id: string): RawDataset => {
  const found = allDatasets().find((dataset) => dataset.id === id) ?? datasetById(id)
  if (!found) throw createError({ statusCode: 404, statusMessage: `Unknown dataset ${id}` })
  return found
}

/** Reads one locale string-map file as `Record<string, string>`. */
const readStringMap = (relative: string, root = rawRepoRoot()): Record<string, string> => {
  const value = readJsonFile(relative, root)
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw createError({ statusCode: 500, statusMessage: `${relative} is not a string map` })
  }
  const out: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string') out[key] = entry
  }
  return out
}

/** Loads a merged locale-map dataset (one row per spelling key, columns per locale). */
const localeMapRows = (dataset: RawDataset, root = rawRepoRoot()): Array<{ key: string; cells: RawRow }> => {
  if (!dataset.localeFiles) return []
  const maps: Partial<Record<string, Record<string, string>>> = {}
  const keys = new Set<string>()
  for (const [locale, relative] of Object.entries(dataset.localeFiles)) {
    if (!relative) continue
    const map = readStringMap(relative, root)
    maps[locale] = map
    for (const key of Object.keys(map)) keys.add(key)
  }
  return [...keys].sort((left, right) => left.localeCompare(right, 'ja')).map((key) => {
    const cells: RawRow = { key }
    for (const locale of Object.keys(dataset.localeFiles ?? {})) {
      cells[locale] = maps[locale]?.[key] ?? null
    }
    return { key: rowKeyOf(dataset, cells), cells }
  })
}

/** Loads every file under `data/wiki-raw/` as one row (`file` + JSON `value`). */
const wikiRawRows = (dataset: RawDataset, root = rawRepoRoot()): Array<{ key: string; cells: RawRow }> => {
  const directory = path.join(root, 'data', 'wiki-raw')
  if (!existsSync(directory)) return []
  return readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const relative = `data/wiki-raw/${name}`
      const cells: RawRow = {
        file: name,
        value: JSON.stringify(readJsonFile(relative, root), null, 2),
      }
      return { key: rowKeyOf(dataset, cells), cells }
    })
}

/** Counts rows for one dataset without loading every cell. */
const countDataset = (dataset: RawDataset, root = rawRepoRoot()): number => {
  if (dataset.kind === 'catalog' && dataset.table) {
    const db = openCatalog(root)
    try {
      const row = db.prepare(`SELECT COUNT(*) AS n FROM ${dataset.table}`).get() as { n: number }
      return row.n
    } finally {
      db.close()
    }
  }
  if (dataset.kind === 'locale-map' && dataset.localeFiles) {
    const keys = new Set<string>()
    for (const relative of Object.values(dataset.localeFiles)) {
      if (!relative) continue
      for (const key of Object.keys(readStringMap(relative, root))) keys.add(key)
    }
    return keys.size
  }
  if (dataset.kind === 'wiki-raw') {
    const directory = path.join(root, 'data', 'wiki-raw')
    if (!existsSync(directory)) return 0
    return readdirSync(directory).filter((name) => name.endsWith('.json')).length
  }
  if (!dataset.file) return 0
  const value = readJsonFile(dataset.file, root)
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') return Object.keys(value).length
  return 0
}

/** Summaries for the sidebar. */
export const listDatasetSummaries = (root = rawRepoRoot()): DatasetSummary[] => {
  return allDatasets().map((dataset) => ({
    id: dataset.id,
    label: dataset.label,
    kind: dataset.kind,
    rowCount: countDataset(dataset, root),
    derived: dataset.derived,
    warning: dataset.warning,
  }))
}

/** Loads every raw row for a JSON dataset as `{ key, cells }`. */
const jsonRows = (dataset: RawDataset, root = rawRepoRoot()): Array<{ key: string; cells: RawRow }> => {
  if (!dataset.file) return []
  const value = readJsonFile(dataset.file, root)
  const owner = dataset.owners.value
  if (!owner || owner.kind !== 'json-file') return []

  if (owner.mode === 'array-json') {
    if (!Array.isArray(value)) throw createError({ statusCode: 500, statusMessage: `${dataset.file} is not an array` })
    return value.map((entry, index) => {
      const cells: RawRow = { index: String(index), value: JSON.stringify(entry, null, 2) }
      return { key: rowKeyOf(dataset, cells), cells }
    })
  }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw createError({ statusCode: 500, statusMessage: `${dataset.file} is not an object` })
  }

  return Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
    const cells: RawRow = {
      key,
      value: owner.mode === 'record-value'
        ? (typeof entry === 'string' ? entry : JSON.stringify(entry))
        : JSON.stringify(entry, null, 2),
    }
    return { key: rowKeyOf(dataset, cells), cells }
  })
}

/** Loads catalog rows for one table, with enrichment for songs / series / performances. */
const catalogRows = (dataset: RawDataset, root = rawRepoRoot()): Array<{ key: string; cells: RawRow }> => {
  if (!dataset.table) return []
  const db = openCatalog(root)
  try {
    const context: EnrichmentContext = {}
    if (dataset.id === 'songs') context.songs = loadSongOverlays(root)
    if (dataset.id === 'series' || dataset.id === 'performances') context.names = loadNameOverlays(root)
    if (dataset.id === 'performances') {
      context.seriesById = new Map(
        (db.prepare('SELECT id, name FROM series').all() as Array<{ id: number; name: string }>)
          .map((row) => [row.id, row.name]),
      )
    }
    const rows = db.prepare(`SELECT * FROM ${dataset.table}`).all() as Record<string, unknown>[]
    return rows.map((row) => {
      const cells = enrichCatalogRow(dataset, row, context)
      return { key: rowKeyOf(dataset, cells), cells }
    })
  } finally {
    db.close()
  }
}

/** Whether a row matches the free-text search box. */
const rowMatches = (row: { cells: RawRow }, query: string): boolean => {
  if (!query) return true
  const needle = query.toLowerCase()
  return Object.values(row.cells).some((value) => (value ?? '').toLowerCase().includes(needle))
}

/** Returns a searchable, paginated page of rows for one dataset. */
export const readDatasetPage = (
  id: string,
  options: { q?: string; offset?: number; limit?: number } = {},
  root = rawRepoRoot(),
): DatasetPage => {
  const dataset = resolveDataset(id)
  const query = (options.q ?? '').trim()
  const offset = Math.max(0, options.offset ?? 0)
  const limit = Math.min(500, Math.max(1, options.limit ?? 100))
  const loaded =
    dataset.kind === 'catalog'
      ? catalogRows(dataset, root)
      : dataset.kind === 'locale-map'
        ? localeMapRows(dataset, root)
        : dataset.kind === 'wiki-raw'
          ? wikiRawRows(dataset, root)
          : jsonRows(dataset, root)
  const rows = loaded.filter((row) => rowMatches(row, query))
  const page = rows.slice(offset, offset + limit)
  const editable = dataset.columns.filter((column) => {
    const owner = dataset.owners[column]
    return owner !== undefined && owner.kind !== 'readonly'
  })
  const files = dataset.localeFiles
    ? (Object.values(dataset.localeFiles).filter(Boolean) as string[])
    : dataset.kind === 'wiki-raw'
      ? ['data/wiki-raw/*.json']
      : dataset.file
        ? [dataset.file]
        : dataset.table
          ? [`data/schema.sql → ${dataset.table}`, 'data/increments/*.sql']
          : undefined

  return {
    id: dataset.id,
    label: dataset.label,
    columns: dataset.columns,
    primaryKey: dataset.primaryKey,
    editable,
    derived: dataset.derived,
    warning: dataset.warning,
    files,
    total: rows.length,
    offset,
    limit,
    rows: page,
  }
}

/** Builds an idempotent single-column UPDATE statement for a catalog patch file. */
const catalogUpdateSql = (
  table: string,
  column: string,
  value: string | number | null,
  where: Record<string, string>,
): string => {
  const whereSql = Object.entries(where)
    .map(([key, raw]) => {
      const number = Number(raw)
      const literal = raw !== '' && Number.isFinite(number) && String(number) === raw
        ? sqlLiteral(number)
        : sqlLiteral(raw)
      return `${key} = ${literal}`
    })
    .join(' AND ')
  return `UPDATE ${table} SET ${column} = ${sqlLiteral(value)} WHERE ${whereSql};`
}

/**
 * Upserts one UPDATE into a manual SQL increment: replaces an existing same-target line, or
 * inserts before COMMIT. Keeps the surrounding BEGIN/COMMIT wrapper intact.
 */
const upsertSqlPatch = (relative: string, statement: string, root = rawRepoRoot()): void => {
  const file = path.join(root, relative)
  let text = readFileSync(file, 'utf8')
  const normalized = statement.trim().replace(/\s+/g, ' ')
  const match = /UPDATE\s+(\w+)\s+SET\s+(\w+)\s*=/i.exec(normalized)
  const whereMatch = /WHERE\s+(.+);?\s*$/i.exec(normalized)
  if (!match || !whereMatch) throw createError({ statusCode: 500, statusMessage: 'Invalid SQL patch shape' })
  const table = match[1]
  const column = match[2]
  const where = whereMatch[1].replace(/;$/, '').trim()
  const pattern = new RegExp(
    String.raw`^\s*UPDATE\s+${table}\s+SET\s+${column}\s*=.+?WHERE\s+${where.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\s*;\s*$`,
    'gim',
  )
  const nextStatement = `${statement.trim().replace(/;?\s*$/, '')};`
  if (pattern.test(text)) {
    text = text.replace(pattern, nextStatement)
  } else if (/^COMMIT;\s*$/m.test(text)) {
    text = text.replace(/^COMMIT;\s*$/m, `${nextStatement}\n\nCOMMIT;`)
  } else {
    text = `${text.trimEnd()}\n${nextStatement}\n`
  }
  writeFileSync(file, text.endsWith('\n') ? text : `${text}\n`, 'utf8')
}

/** Applies a song-title overlay edit and re-validates the file. */
const patchSongTitle = (
  locale: 'zh-CN' | 'zh-Hant',
  songId: string,
  prop: 'title' | 'aliases',
  value: string | null,
  root = rawRepoRoot(),
): void => {
  const relative = `data/song-titles.${locale}.json`
  const file = parseSongTitles(readJsonFile(relative, root))
  const existing = file[songId]
  if (prop === 'title') {
    if (value === null || value.trim() === '') {
      delete file[songId]
    } else if (existing) {
      existing.title = value.trim()
    } else {
      file[songId] = { title: value.trim(), source: '人工核定' }
    }
  } else {
    const aliases = splitAliases(value)
    if (!existing) {
      if (!aliases) return
      throw createError({ statusCode: 400, statusMessage: 'Set the Chinese title before aliases' })
    }
    if (!aliases) delete existing.aliases
    else existing.aliases = aliases
  }
  parseSongTitles(file)
  writeSongOverlayFile(relative, file, root)
}

/** Applies a song-alias overlay edit and re-validates the file. */
const patchSongAlias = (
  songId: string,
  prop: 'title' | 'aliases',
  value: string | null,
  root = rawRepoRoot(),
): void => {
  const relative = 'data/song-aliases.json'
  const file = parseSongAliases(readJsonFile(relative, root))
  const existing = file[songId]
  if (prop === 'title') {
    if (value === null || value.trim() === '') {
      delete file[songId]
    } else if (existing) {
      existing.title = value.trim()
    } else {
      file[songId] = { title: value.trim(), source: '人工核定' }
    }
  } else {
    const aliases = splitAliases(value)
    if (!existing) {
      if (!aliases) return
      throw createError({ statusCode: 400, statusMessage: 'Set the Japanese alias title before aliases' })
    }
    if (!aliases) delete existing.aliases
    else existing.aliases = aliases
  }
  parseSongAliases(file)
  writeSongOverlayFile(relative, file, root)
}

/** Applies a series-title overlay edit keyed by the series catalog name. */
const patchSeriesTitle = (
  locale: 'zh-CN' | 'zh-Hant' | 'en',
  seriesName: string,
  value: string | null,
  root = rawRepoRoot(),
): void => {
  const relative = `data/series-titles.${locale}.json`
  const file = readJsonFile(relative, root)
  if (file === null || typeof file !== 'object' || Array.isArray(file)) {
    throw createError({ statusCode: 500, statusMessage: `${relative} is not an object` })
  }
  const map = file as Record<string, string>
  if (value === null || value.trim() === '') delete map[seriesName]
  else map[seriesName] = value.trim()
  parseSeriesTitles({
    zh: locale === 'zh-CN' ? map : readJsonFile('data/series-titles.zh-CN.json', root),
    'zh-Hant': locale === 'zh-Hant' ? map : readJsonFile('data/series-titles.zh-Hant.json', root),
    en: locale === 'en' ? map : readJsonFile('data/series-titles.en.json', root),
  })
  writeJsonFile(relative, map, root)
}

/** Applies a direct JSON-file cell edit for record or array datasets. */
const patchJsonFile = (
  owner: Extract<FieldOwner, { kind: 'json-file' }>,
  keyParts: Record<string, string>,
  value: string | null,
  root = rawRepoRoot(),
): void => {
  const current = readJsonFile(owner.file, root)
  if (owner.mode === 'array-json') {
    if (!Array.isArray(current)) throw createError({ statusCode: 500, statusMessage: `${owner.file} is not an array` })
    const index = Number(keyParts.index)
    if (!Number.isInteger(index) || index < 0 || index >= current.length) {
      throw createError({ statusCode: 404, statusMessage: 'Array index out of range' })
    }
    if (value === null) current.splice(index, 1)
    else current[index] = JSON.parse(value) as unknown
    writeJsonFile(owner.file, current, root)
    return
  }

  if (current === null || typeof current !== 'object' || Array.isArray(current)) {
    throw createError({ statusCode: 500, statusMessage: `${owner.file} is not an object` })
  }
  const record = current as Record<string, unknown>
  const key = keyParts.key
  if (value === null || value === '') {
    delete record[key]
  } else if (owner.mode === 'record-value') {
    record[key] = value
  } else {
    record[key] = JSON.parse(value) as unknown
  }
  writeJsonFile(owner.file, record, root)
}

/** Looks up the series catalog name for a series id (needed for series-title overlays). */
const seriesNameById = (id: string, root = rawRepoRoot()): string => {
  const db = openCatalog(root)
  try {
    const row = db.prepare('SELECT name FROM series WHERE id = ?').get(Number(id)) as { name: string } | undefined
    if (!row) throw createError({ statusCode: 404, statusMessage: `Series ${id} not found` })
    return row.name
  } finally {
    db.close()
  }
}

/**
 * Patches one cell and returns the refreshed row. Catalog SQL edits rebuild `catalog.sqlite`;
 * JSON overlay edits only rewrite the overlay file.
 */
export const patchDatasetCell = (
  datasetId: string,
  key: string,
  field: string,
  value: string | null,
  root = rawRepoRoot(),
): { key: string; cells: RawRow; rebuiltCatalog: boolean } => {
  const dataset = resolveDataset(datasetId)
  const owner = dataset.owners[field]
  if (!owner || owner.kind === 'readonly') {
    throw createError({ statusCode: 400, statusMessage: `Field ${field} is read-only` })
  }
  const keyParts = parseRowKey(dataset, key)
  let rebuiltCatalog = false

  if (owner.kind === 'catalog') {
    const sqlValue = catalogValue(value, owner.column)
    const statement = catalogUpdateSql(owner.table, owner.column, sqlValue, keyParts)
    const patchFile = owner.table === 'songs' && owner.column === 'name_en'
      ? 'data/increments/0012-song-english-names.sql'
      : 'data/increments/0011-manual-corrections.sql'
    upsertSqlPatch(patchFile, statement, root)
    rebuildCatalog(root)
    rebuiltCatalog = true
  } else if (owner.kind === 'song-title') {
    patchSongTitle(owner.locale, keyParts.id, owner.prop, value, root)
  } else if (owner.kind === 'song-alias') {
    patchSongAlias(keyParts.id, owner.prop, value, root)
  } else if (owner.kind === 'series-title') {
    const seriesName = seriesNameById(keyParts.id, root)
    patchSeriesTitle(owner.locale, seriesName, value, root)
  } else if (owner.kind === 'json-file') {
    patchJsonFile(owner, keyParts, value, root)
  } else if (owner.kind === 'locale-map') {
    const relative = dataset.localeFiles?.[owner.locale]
    if (!relative) throw createError({ statusCode: 500, statusMessage: `No file for locale ${owner.locale}` })
    const map = readStringMap(relative, root)
    const mapKey = keyParts.key
    if (value === null || value.trim() === '') delete map[mapKey]
    else map[mapKey] = value.trim()
    writeJsonFile(relative, map, root)
  } else if (owner.kind === 'wiki-raw-file') {
    const fileName = keyParts.file
    if (!fileName || fileName.includes('/') || fileName.includes('..') || !fileName.endsWith('.json')) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid wiki-raw file name' })
    }
    const relative = `data/wiki-raw/${fileName}`
    if (value === null || value.trim() === '') {
      throw createError({ statusCode: 400, statusMessage: 'Clearing a wiki-raw file is not supported here' })
    }
    writeJsonFile(relative, JSON.parse(value) as unknown, root)
  }

  const page = readDatasetPage(datasetId, { q: '', offset: 0, limit: 1_000_000 }, root)
  const refreshed = page.rows.find((row) => row.key === key)
    ?? page.rows.find((row) => dataset.primaryKey.every((column) => String(row.cells[column] ?? '') === keyParts[column]))
  if (!refreshed) {
    // Row may have disappeared (JSON delete); return empty cells with the original key.
    return { key, cells: Object.fromEntries(dataset.columns.map((column) => [column, null])), rebuiltCatalog }
  }
  return { ...refreshed, rebuiltCatalog }
}
