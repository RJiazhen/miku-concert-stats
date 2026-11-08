/**
 * Maintains the show-location table in `data/show-locations.json` and the generated
 * `data/increments/0013-show-locations.sql` that fills blank `performances.country_code`.
 *
 * Usage:
 *   pnpm locations                         list every location with its country
 *   pnpm locations --search 温哥华          search city / alias / venue / country
 *   pnpm locations --missing               only locations without a country
 *   pnpm locations --sync                  refresh aliases and venues, infer new countries
 *   pnpm locations --set 温哥华 --country CA  record one city's country
 *   pnpm locations --generate              rewrite the SQL increment
 *   pnpm locations --check                 fail when the SQL increment is stale (CI)
 */

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { applyCatalogSql, repoRoot } from './build-catalog.ts'
import { loadCatalog } from '../shared/catalog.ts'
import { buildCityIndex, showCount } from '../shared/cities.ts'
import { showCountsByPerformance } from '../shared/performance-setlist-query.ts'
import { parsePlaceNames } from '../shared/place-names.ts'
import { reviewRotations } from '../shared/rotation.ts'
import {
  countryName,
  filterLocations,
  findLocationByKey,
  groupPerformancesByLocation,
  mergeLocationGroups,
  parseShowLocations,
  planShowLocationUpdates,
  renderShowLocationSql,
  serializeShowLocations,
  setLocationCountry,
  type LocationGroup,
  type ShowLocation,
  type ShowLocationIndex,
  type ShowLocationPlan,
} from '../shared/show-locations.ts'
import type { Catalog, SqlRow } from '../shared/types.ts'

const TABLE_FILE = path.join('data', 'show-locations.json')
const SQL_NAME = '0013-show-locations.sql'
const SQL_FILE = path.join('data', 'increments', SQL_NAME)

/** One parsed command line. */
type Options = {
  command: 'list' | 'sync' | 'set' | 'generate' | 'check' | 'help'
  search: string | null
  missing: boolean
  /** City key or alias passed to `--set`. */
  key: string | null
  country: string | null
}

/** Prints the command summary. */
const usage = (): string => {
  return [
    'Usage: pnpm locations [command] [options]',
    '',
    'Commands:',
    '  (none)                  list every show location with its country',
    '  --search <text>         filter by city, alias, venue, or country',
    '  --missing               keep only locations without a country',
    '  --sync                  refresh aliases / venues and infer new countries',
    '  --set <city|alias>      set one location country; requires --country',
    '  --generate              rewrite data/increments/0013-show-locations.sql',
    '  --check                 exit 1 when that increment is stale',
    '',
    'Options:',
    '  --country <ISO>         ISO 3166-1 alpha-2 code, e.g. CA or JP',
    '  --help                  print this text',
  ].join('\n')
}

/** Reads one option value, accepting both `--name value` and `--name=value`. */
const optionValue = (args: readonly string[], name: string): string | null => {
  const index = args.indexOf(name)
  if (index !== -1) {
    const value = args[index + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`${name} needs a value`)
    return value
  }
  const prefix = `${name}=`
  const inline = args.find((arg) => arg.startsWith(prefix))
  return inline === undefined ? null : inline.slice(prefix.length)
}

/** Parses the supported flags; unknown flags are an error so a typo never silently lists everything. */
const parseOptions = (args: readonly string[]): Options => {
  if (args.includes('--help') || args.includes('-h')) {
    return { command: 'help', search: null, missing: false, key: null, country: null }
  }
  const command = args.includes('--sync')
    ? 'sync'
    : args.includes('--generate')
      ? 'generate'
      : args.includes('--check')
        ? 'check'
        : args.includes('--set')
          ? 'set'
          : 'list'
  const switches = new Set(['--sync', '--generate', '--check', '--missing'])
  const valued = new Set(['--set', '--country', '--search'])
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] as string
    const name = arg.split('=')[0] as string
    if (switches.has(name)) continue
    if (!valued.has(name)) throw new Error(`Unknown option ${arg}`)
    if (arg.includes('=')) continue
    const value = args[index + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`${name} needs a value`)
    index += 1
  }
  return {
    command,
    search: optionValue(args, '--search'),
    missing: args.includes('--missing'),
    key: optionValue(args, '--set'),
    country: optionValue(args, '--country'),
  }
}

/** Repository-relative file path for messages. */
const displayPath = (root: string, file: string): string => path.relative(root, path.join(root, file))

/**
 * Runs the committed SQL in memory and loads the resulting catalog.
 * The generated location increment is skipped, otherwise its own output would look like
 * VocaDB data and every location would appear to need no fill.
 */
const readCatalog = (root: string): Catalog => {
  const db = new Database(':memory:')
  try {
    applyCatalogSql(db, root, [SQL_NAME])
    return loadCatalog({
      /** Runs one read-only query against the in-memory catalog. */
      all: (sql: string) => db.prepare(sql).all() as SqlRow[],
    })
  } finally {
    db.close()
  }
}

/** Reads the table, treating a missing file as empty so the first `--sync` creates it. */
const readTable = (root: string): ShowLocationIndex => {
  try {
    return parseShowLocations(JSON.parse(readFileSync(path.join(root, TABLE_FILE), 'utf8')))
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return parseShowLocations({ version: 1, locations: [] })
    }
    throw error
  }
}

/** City groups derived from the catalog; also returns the ids that resolved to no city. */
const readGroups = (root: string, catalog: Catalog): { groups: LocationGroup[]; unknownCityIds: number[] } => {
  const places = parsePlaceNames({
    zh: JSON.parse(readFileSync(path.join(root, 'data', 'place-names.zh-CN.json'), 'utf8')),
    en: JSON.parse(readFileSync(path.join(root, 'data', 'place-names.en.json'), 'utf8')),
  })
  return groupPerformancesByLocation(catalog.performances, buildCityIndex(places))
}

/** Writes the table and its generated SQL increment, printing what changed. */
const saveTable = (root: string, index: ShowLocationIndex, plan: ShowLocationPlan): void => {
  writeFileSync(path.join(root, TABLE_FILE), serializeShowLocations(index))
  writeFileSync(path.join(root, SQL_FILE), renderShowLocationSql(plan))
  console.log(`Wrote ${displayPath(root, TABLE_FILE)} (${index.locations.length} locations)`)
  console.log(`Wrote ${displayPath(root, SQL_FILE)} (${plan.updates.reduce((sum, row) => sum + row.performanceIds.length, 0)} performances to fill)`)
}

/** Display width of a string, counting CJK code points as two columns. */
const displayWidth = (value: string): number => {
  let width = 0
  for (const character of value) width += (character.codePointAt(0) ?? 0) > 0x2e7f ? 2 : 1
  return width
}

/** Left-aligns a cell to a display width, padding with spaces. */
const pad = (value: string, width: number): string => `${value}${' '.repeat(Math.max(0, width - displayWidth(value)))}`

/** Cuts a string to at most `max` display columns, with an ellipsis when shortened. */
const truncate = (value: string, max: number): string => {
  if (displayWidth(value) <= max) return value
  let result = ''
  for (const character of value) {
    if (displayWidth(`${result}${character}…`) > max) break
    result += character
  }
  return `${result}…`
}

/** Prints the location table with one line per city. */
const printTable = (
  index: ShowLocationIndex,
  rows: readonly ShowLocation[],
  groups: readonly LocationGroup[],
  catalog: Catalog,
  plan: ShowLocationPlan,
): void => {
  const showCounts = showCountsByPerformance(catalog, reviewRotations(catalog))
  const performanceById = new Map(catalog.performances.map((performance) => [performance.id, performance]))
  const groupByCity = new Map(groups.map((group) => [group.city, group]))
  const header = ['城市', '国家', '演出', '场次', '场馆']
  const cells = rows.map((location) => {
    const group = groupByCity.get(location.city)
    const country = location.country === null
      ? '— 未登记'
      : `${location.country} ${countryName(location.country)}`
    const aliases = location.aliases.length === 0 ? '' : `  ${location.aliases.join(' / ')}`
    const shows = (group?.performances ?? []).reduce((sum, entry) => {
      const counted = showCounts.get(entry.id)
      if (counted !== undefined) return sum + counted
      const performance = performanceById.get(entry.id)
      return sum + (performance === undefined ? 0 : showCount(performance))
    }, 0)
    return [
      `${location.city}${aliases}`,
      country,
      String(group?.performances.length ?? 0),
      String(shows),
      truncate(location.venues.join(' / '), 64),
    ]
  })
  const widths = header.map((title, column) => {
    return Math.max(displayWidth(title), ...cells.map((row) => displayWidth(row[column] ?? '')))
  })
  console.log(header.map((title, column) => pad(title, widths[column] ?? 0)).join('  '))
  for (const row of cells) {
    console.log(row.map((value, column) => pad(value, widths[column] ?? 0)).join('  '))
  }
  if (rows.length === 0) {
    console.log('没有符合条件的地点。')
    return
  }
  const missing = rows.filter((location) => location.country === null).length
  const fillable = plan.updates.reduce((sum, row) => sum + row.performanceIds.length, 0)
  console.log('')
  console.log(
    `显示 ${rows.length} / ${index.locations.length} 个地点，其中 ${missing} 个未登记国家；`
    + `本表为 ${fillable} 个演出补 country_code（只填空值），${plan.conflicts.length} 个与目录已有代码冲突（不覆盖）。`,
  )
}

/** Runs `--sync`: refreshes catalog-derived fields and infers countries for empty rows. */
const runSync = (root: string, index: ShowLocationIndex, groups: readonly LocationGroup[], unknownCityIds: number[]): void => {
  const merged = mergeLocationGroups(index, groups)
  const plan = planShowLocationUpdates(groups, merged.index)
  saveTable(root, merged.index, plan)
  if (merged.stale.length > 0) {
    console.log(`Kept ${merged.stale.length} location(s) the catalog no longer names: ${merged.stale.map((row) => row.city).join('、')}`)
  }
  if (plan.missingCities.length > 0) {
    console.log(`Still without a country: ${plan.missingCities.join('、')}`)
    console.log('Set one with: pnpm locations --set <城市> --country <ISO>')
  }
  if (unknownCityIds.length > 0) {
    console.log(`${unknownCityIds.length} 个演出没有可识别的城市，未进入本表。`)
  }
  if (plan.conflicts.length > 0) {
    for (const conflict of plan.conflicts) {
      console.log(`Conflict: performance ${conflict.performanceId} (${conflict.city}) stores ${conflict.stored}, table says ${conflict.expected}; kept as is.`)
    }
  }
}

/** Resolves `--set` to one row: an exact city / alias first, then a unique search hit. */
const resolveOne = (index: ShowLocationIndex, key: string): ShowLocation => {
  const exact = findLocationByKey(index, key)
  if (exact !== null) return exact
  const hits = filterLocations(index, key)
  if (hits.length === 1) return hits[0] as ShowLocation
  if (hits.length === 0) throw new Error(`No location matches ${key}`)
  throw new Error(`Several locations match ${key}: ${hits.map((row) => row.city).join('、')}；pass the exact city name.`)
}

/** Runs one command and returns the process exit code. */
const run = (): number => {
  const options = parseOptions(process.argv.slice(2))
  if (options.command === 'help') {
    console.log(usage())
    return 0
  }
  const root = repoRoot()
  const table = readTable(root)
  const catalog = readCatalog(root)
  const { groups, unknownCityIds } = readGroups(root, catalog)
  const plan = planShowLocationUpdates(groups, table)

  if (options.command === 'sync') {
    runSync(root, table, groups, unknownCityIds)
    return 0
  }

  if (options.command === 'set') {
    if (options.key === null) throw new Error('--set needs a city name or alias')
    if (options.country === null) throw new Error('--set needs --country <ISO code>')
    const location = resolveOne(table, options.key)
    const updated = setLocationCountry(table, location.city, options.country)
    saveTable(root, updated, planShowLocationUpdates(groups, updated))
    console.log(`${location.city} → ${countryName(options.country.toUpperCase())} (${options.country.toUpperCase()})`)
    return 0
  }

  if (options.command === 'generate') {
    writeFileSync(path.join(root, SQL_FILE), renderShowLocationSql(plan))
    console.log(`Wrote ${displayPath(root, SQL_FILE)}`)
    return 0
  }

  if (options.command === 'check') {
    const expected = renderShowLocationSql(plan)
    let actual = ''
    try {
      actual = readFileSync(path.join(root, SQL_FILE), 'utf8')
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
    }
    if (actual !== expected) {
      console.error(`${displayPath(root, SQL_FILE)} is stale. Run \`pnpm locations --generate\` and commit the result.`)
      return 1
    }
    console.log(`${displayPath(root, SQL_FILE)} is up to date.`)
    return 0
  }

  let rows = table.locations
  if (options.search !== null) rows = filterLocations(table, options.search)
  if (options.missing) rows = rows.filter((location) => location.country === null)
  printTable(table, rows, groups, catalog, plan)
  return 0
}

try {
  process.exitCode = run()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
