import { readFileSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { loadCatalog } from '../shared/catalog.ts'
import { parseCharacterConfig } from '../shared/characters.ts'
import { buildCityIndex } from '../shared/cities.ts'
import { parsePlaceNames } from '../shared/place-names.ts'
import { parseSongVariants } from '../shared/song-variants.ts'
import { buildTimeline, type TimelineOptions } from '../shared/timeline.ts'
import { buildTimelineAsset, timelineCatalogFromAsset } from '../shared/timeline-api.ts'
import type { SqlRow } from '../shared/types.ts'
import { applyCatalogSql, repoRoot } from '../scripts/build-catalog.ts'

/** Reads one committed JSON data file as the raw value the runtime parsers receive. */
const readData = (name: string): unknown =>
  JSON.parse(readFileSync(path.join(repoRoot(), 'data', name), 'utf8')) as unknown

/** Committed catalog plus the JSON files the timeline asset ships alongside it. */
const fixture = () => {
  const db = new Database(':memory:')
  let catalog
  try {
    applyCatalogSql(db)
    catalog = loadCatalog({
      /** Reads the in-memory catalog built from committed SQL. */
      all: (sql: string) => db.prepare(sql).all() as SqlRow[],
    })
  } finally {
    db.close()
  }
  return {
    catalog,
    characters: readData('characters.json'),
    variants: readData('song-variants.json'),
    places: readData('place-names.zh-CN.json'),
  }
}

describe('timeline API asset', () => {
  it('rebuilds a catalog that aggregates to the same timeline as the page', () => {
    const { catalog, characters, variants, places } = fixture()
    const asset = buildTimelineAsset({
      catalog,
      generatedAt: 'test',
      catalogVersion: 'test',
      nameZhOf: () => null,
      characters,
      variants,
      places,
    })
    const rebuilt = timelineCatalogFromAsset(asset)
    const rules = parseCharacterConfig(characters)
    const cityIndex = buildCityIndex(parsePlaceNames(places))
    const samples: TimelineOptions[] = [
      {},
      { characterSongWeight: 'split', includeBroadcast: true },
      { seriesIds: [81], characterRules: rules, cityIndex },
      { characters: ['初音ミク'], yearFrom: 2015, yearTo: 2025, characterRules: rules, cityIndex, includeBroadcast: true },
      { producers: ['kz'], variants: parseSongVariants(variants), characterRules: rules, cityIndex, newSongBaseline: 'filtered' },
      { cityNames: ['东京'], characterRules: rules, cityIndex },
    ]
    for (const options of samples) {
      expect(buildTimeline(rebuilt, options)).toEqual(buildTimeline(catalog, options))
    }
  })

  it('keeps one asset show per counted 場次', () => {
    const { catalog, characters, variants, places } = fixture()
    const asset = buildTimelineAsset({
      catalog,
      generatedAt: 'test',
      catalogVersion: 'test',
      nameZhOf: () => null,
      characters,
      variants,
      places,
    })
    const rebuilt = timelineFrom(asset)
    const shows = asset.performances.reduce((total, row) => total + row.shows.length, 0)
    expect(shows).toBe(rebuilt.totals.shows)
    expect(asset.performances.length).toBe(catalog.performances.length)
    expect(asset.performances.some((row) => row.shows.length > 1)).toBe(true)
  })
})

/** Timeline of the rebuilt asset with no filters, for shape assertions. */
const timelineFrom = (asset: ReturnType<typeof buildTimelineAsset>) =>
  buildTimeline(timelineCatalogFromAsset(asset), { includeBroadcast: true })
