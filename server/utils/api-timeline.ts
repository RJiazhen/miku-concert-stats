import { createError } from 'h3'
import { useStorage } from 'nitropack/runtime'
import type { CharacterRule } from '../../shared/characters.ts'
import type { CityIndex } from '../../shared/cities.ts'
import type { SongVariantIndex } from '../../shared/song-variants.ts'
import {
  timelineCharactersFromAsset,
  timelineCityIndexFromAsset,
  timelineCatalogFromAsset,
  timelineSongNamesFromAsset,
  timelineVariantsFromAsset,
  type TimelineAsset,
} from '../../shared/timeline-api.ts'
import type { Catalog } from '../../shared/types.ts'

/** Everything one timeline request needs, parsed once per Worker instance. */
export type TimelineApiData = {
  asset: TimelineAsset
  /** Catalog rebuilt from the asset, so `buildTimeline` runs the page's own aggregation. */
  catalog: Catalog
  characters: CharacterRule[]
  variants: SongVariantIndex
  cityIndex: CityIndex
  songNames: Map<number, { name: string; nameJa: string | null; nameZh: string | null }>
}

/** Error returned whenever the bundled timeline asset is missing or malformed. */
const unavailable = () => createError({
  statusCode: 503,
  statusMessage: 'API data unavailable',
  message: 'API 数据不可用',
})

/** Rejects a payload the build should never emit, keeping a bad bundle from being half-served. */
const isTimelineAsset = (value: unknown): value is TimelineAsset => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const asset = value as Partial<TimelineAsset>
  return (
    typeof asset.generatedAt === 'string' &&
    typeof asset.catalogVersion === 'string' &&
    Array.isArray(asset.series) &&
    Array.isArray(asset.songs) &&
    Array.isArray(asset.performances) &&
    asset.characters !== null &&
    typeof asset.characters === 'object' &&
    asset.variants !== null &&
    typeof asset.variants === 'object' &&
    asset.places !== null &&
    typeof asset.places === 'object' &&
    asset.performances.every((row) => Array.isArray(row.shows))
  )
}

/** Parses the raw text form the storage driver may return instead of parsed JSON. */
const parseTimelineText = (raw: string): TimelineAsset => {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw unavailable()
  }
  if (!isTimelineAsset(parsed)) throw unavailable()
  return parsed
}

/** Derives everything once; a failed load is retried by the next request. */
const prepare = (asset: TimelineAsset): TimelineApiData => ({
  asset,
  catalog: timelineCatalogFromAsset(asset),
  characters: timelineCharactersFromAsset(asset),
  variants: timelineVariantsFromAsset(asset),
  cityIndex: timelineCityIndexFromAsset(asset),
  songNames: timelineSongNamesFromAsset(asset),
})

let dataPromise: Promise<TimelineApiData> | null = null

/** Loads and caches the bundled timeline asset and the catalog rebuilt from it. */
export const loadTimelineApi = async (): Promise<TimelineApiData> => {
  if (dataPromise !== null) return dataPromise
  dataPromise = (async () => {
    const raw = await useStorage('assets:api').getItem<unknown>('timeline.json')
    if (raw === null || raw === undefined) throw unavailable()
    const asset = typeof raw === 'string' ? parseTimelineText(raw) : raw
    if (!isTimelineAsset(asset)) throw unavailable()
    return prepare(asset)
  })()
  dataPromise = dataPromise.catch((error: unknown) => {
    dataPromise = null
    throw error
  })
  return dataPromise
}
