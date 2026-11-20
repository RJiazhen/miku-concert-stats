/**
 * Pure homepage helpers: site-wide catalog totals, source-retrieval summaries,
 * recent concerts, and classified concert links.
 *
 * Concert calendar dates and catalog source timestamps are kept in separate
 * fields so a concert night is never presented as a data-update time.
 *
 * There is no tour entity in the current catalog. Official websites and other
 * concert links stay attached to individual 演出 (`performance_links`).
 *
 * Poster images and carousels are out of scope (issue #67).
 */
import { showsForPerformance } from './event-schedule.ts'
import { performanceHeaderFacts } from './performance-header.ts'
import { setlistPerformanceIds, showCountsByPerformance } from './performance-setlists.ts'
import { reviewRotations } from './rotation.ts'
import { performanceYear } from './stats.ts'
import type {
  Catalog,
  PerformanceLinkRow,
  PerformanceRow,
  PerformanceSetlistSourceRow,
  PerformanceStatusValue,
} from './types.ts'

/** Site root, the dedicated landing page. */
export const HOME_PATH = '/'

/** Song-appearance ranking, previously served at `/`. */
export const RANKING_PATH = '/rank'

/** Concert detail path for one 演出. */
export const showPath = (performanceId: number): string => `/shows/${performanceId}`

/** How many recent 演出 the homepage lists by default. */
export const RECENT_CONCERT_LIMIT = 8

/** How many dated 演出 can contribute links to the related-links section. */
export const RELATED_LINK_PERFORMANCE_LIMIT = 16

/** Feature modules the homepage offers as navigation, in header order. */
export const HOMEPAGE_FEATURE_MODULES = [
  {
    id: 'songs',
    to: RANKING_PATH,
    icon: 'i-lucide-music',
    titleKey: 'home.featureSongsTitle',
    descKey: 'home.featureSongsDesc',
  },
  {
    id: 'producers',
    to: '/producers',
    icon: 'i-lucide-user-round',
    titleKey: 'home.featureProducersTitle',
    descKey: 'home.featureProducersDesc',
  },
  {
    id: 'timeline',
    to: '/timeline',
    icon: 'i-lucide-chart-line',
    titleKey: 'home.featureTimelineTitle',
    descKey: 'home.featureTimelineDesc',
  },
  {
    id: 'series',
    to: '/series',
    icon: 'i-lucide-layers',
    titleKey: 'home.featureSeriesTitle',
    descKey: 'home.featureSeriesDesc',
  },
  {
    id: 'cities',
    to: '/cities',
    icon: 'i-lucide-map-pin',
    titleKey: 'home.featureCitiesTitle',
    descKey: 'home.featureCitiesDesc',
  },
] as const

/** Catalog-wide totals. Concert date fields are calendar dates, never retrieval times. */
export type SiteWideStats = {
  series: number
  performances: number
  shows: number
  songs: number
  showPerformances: number
  broadcastPerformances: number
  cancelledPerformances: number
  performancesWithSetlist: number
  /** Earliest 演出 `start_date`; a concert date, not a catalog update. */
  firstConcertDate: string | null
  /** Latest 演出 `start_date`; a concert date, not a catalog update. */
  lastConcertDate: string | null
  firstConcertYear: number | null
  lastConcertYear: number | null
}

/**
 * One batch of catalog rows that share the same `retrieved_at` source timestamp.
 * `retrievedAt` is a source-retrieval time, never a concert date.
 */
export type RetrievalBatch = {
  retrievedAt: string
  series: number
  performances: number
  songs: number
  songLists: number
}

/**
 * One batch of source-access timestamps (`accessed_at` on setlist sources or
 * hand-checked 演出 status). These are access times, never concert dates.
 */
export type AccessBatch = {
  accessedAt: string
  setlistSources: number
  performanceStatus: number
}

/** Recently updated catalog metadata, taken only from retrieval/access fields. */
export type RecentlyUpdatedSummary = {
  latestRetrievedAt: string | null
  retrievalBatches: RetrievalBatch[]
  latestAccessedAt: string | null
  accessBatches: AccessBatch[]
}

/**
 * A homepage concert link whose official status is classified from catalog text.
 * `official-website` means the source description explicitly says official website
 * or official webpage. `website` is a generic VocaDB "Website" label whose official
 * status is not confirmed.
 */
export type ClassifiedWebsiteKind = 'official-website' | 'website'

/** One classified official or generic website link for a 演出. */
export type ClassifiedWebsiteLink = {
  performanceId: number
  url: string
  /** Raw catalog description; never invented. */
  sourceDescription: string | null
  kind: ClassifiedWebsiteKind
}

/** A verified Bilibili concert-recording video URL attached to a 演出. */
export type BilibiliRecordingLink = {
  performanceId: number
  url: string
  /** Raw catalog description or setlist-source title; never invented. */
  sourceLabel: string | null
  origin: 'performance_links' | 'performance_setlist_sources'
}

/** One recent 演出 for the text-only homepage list. No poster or image fields. */
export type RecentConcert = {
  id: number
  name: string
  seriesId: number
  seriesNumber: number | null
  /** Concert calendar date (`performances.start_date`), not a retrieval time. */
  startDate: string
  /** Formatted concert date or range already used on 演出 pages. */
  dates: string | null
  venue: string | null
  countryCode: string | null
  status: PerformanceStatusValue | null
  href: string
  websiteLinks: ClassifiedWebsiteLink[]
}

/** Related concert links gathered from recent dated 演出. */
export type RelatedConcertLinks = {
  websites: ClassifiedWebsiteLink[]
  bilibiliRecordings: BilibiliRecordingLink[]
}

/** 场次 of one 演出, matching the overview index fallback. */
const showsOf = (performance: PerformanceRow, showCounts: ReadonlyMap<number, number>): number => {
  const counted = showCounts.get(performance.id)
  if (counted !== undefined) return counted
  const days = showsForPerformance(performance).length
  return days === 0 ? 1 : days
}

/**
 * Formats a catalog source timestamp for display without converting it into a concert date.
 * Date-only `accessed_at` values stay `YYYY-MM-DD`. Instant timestamps keep their UTC clock time.
 */
export const formatSourceTimestamp = (stamp: string): string => {
  const value = stamp.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?Z$/)
  if (match) return `${match[1]} ${match[2]} UTC`
  return value
}

/** Compares ISO-like timestamps; missing values sort last. */
const compareStampDesc = (left: string, right: string): number => right.localeCompare(left)

/** Status of one 演出, or null when the catalog has no hand-checked row. */
const statusOf = (catalog: Catalog, performanceId: number): PerformanceStatusValue | null =>
  catalog.performanceStatus.find((row) => row.performance_id === performanceId)?.status ?? null

/**
 * Totals for the homepage site-wide statistics summary.
 * Show counts reuse the same derived-layer-first rule as the series and 演出 indexes.
 */
export const buildSiteWideStats = (catalog: Catalog): SiteWideStats => {
  const review = reviewRotations(catalog)
  const showCounts = showCountsByPerformance(catalog, review)
  const setlistIds = setlistPerformanceIds(catalog)
  let firstConcertDate: string | null = null
  let lastConcertDate: string | null = null
  let shows = 0
  let showPerformances = 0
  let broadcastPerformances = 0
  for (const performance of catalog.performances) {
    shows += showsOf(performance, showCounts)
    if (performance.role === 'broadcast') broadcastPerformances += 1
    else showPerformances += 1
    const date = performance.start_date
    if (date !== null) {
      if (firstConcertDate === null || date < firstConcertDate) firstConcertDate = date
      if (lastConcertDate === null || date > lastConcertDate) lastConcertDate = date
    }
  }
  return {
    series: catalog.series.length,
    performances: catalog.performances.length,
    shows,
    songs: catalog.songs.length,
    showPerformances,
    broadcastPerformances,
    cancelledPerformances: catalog.performanceStatus.filter((row) => row.status === 'cancelled').length,
    performancesWithSetlist: setlistIds.size,
    firstConcertDate,
    lastConcertDate,
    firstConcertYear: performanceYear(firstConcertDate),
    lastConcertYear: performanceYear(lastConcertDate),
  }
}

/**
 * Groups catalog `retrieved_at` / `accessed_at` metadata into newest-first batches.
 * Concert `start_date` / `end_date` values are ignored on purpose.
 */
export const buildRecentlyUpdatedSummary = (catalog: Catalog): RecentlyUpdatedSummary => {
  const retrieval = new Map<string, RetrievalBatch>()
  const bumpRetrieval = (retrievedAt: string, field: Exclude<keyof RetrievalBatch, 'retrievedAt'>): void => {
    const stamp = retrievedAt.trim()
    if (stamp === '') return
    const current = retrieval.get(stamp) ?? { retrievedAt: stamp, series: 0, performances: 0, songs: 0, songLists: 0 }
    current[field] += 1
    retrieval.set(stamp, current)
  }
  for (const row of catalog.series) bumpRetrieval(row.retrieved_at, 'series')
  for (const row of catalog.performances) bumpRetrieval(row.retrieved_at, 'performances')
  for (const row of catalog.songs) bumpRetrieval(row.retrieved_at, 'songs')
  for (const row of catalog.songLists) bumpRetrieval(row.retrieved_at, 'songLists')

  const access = new Map<string, AccessBatch>()
  const bumpAccess = (accessedAt: string, field: Exclude<keyof AccessBatch, 'accessedAt'>): void => {
    const stamp = accessedAt.trim()
    if (stamp === '') return
    const current = access.get(stamp) ?? { accessedAt: stamp, setlistSources: 0, performanceStatus: 0 }
    current[field] += 1
    access.set(stamp, current)
  }
  for (const row of catalog.performanceSetlistSources) bumpAccess(row.accessed_at, 'setlistSources')
  for (const row of catalog.performanceStatus) bumpAccess(row.accessed_at, 'performanceStatus')

  const retrievalBatches = [...retrieval.values()].sort((left, right) => compareStampDesc(left.retrievedAt, right.retrievedAt))
  const accessBatches = [...access.values()].sort((left, right) => compareStampDesc(left.accessedAt, right.accessedAt))
  return {
    latestRetrievedAt: retrievalBatches[0]?.retrievedAt ?? null,
    retrievalBatches,
    latestAccessedAt: accessBatches[0]?.accessedAt ?? null,
    accessBatches,
  }
}

/** Description text used for classification; empty becomes null. */
const descriptionOf = (value: string | null | undefined): string | null => {
  const text = value?.trim() ?? ''
  return text === '' ? null : text
}

/**
 * Classifies a performance link as an official website, a generic website, or neither.
 * Only the catalog description is used; host heuristics never upgrade a link to official.
 */
export const classifyPerformanceWebsiteLink = (
  link: Pick<PerformanceLinkRow, 'performance_id' | 'url' | 'description'>,
): ClassifiedWebsiteLink | null => {
  const url = link.url.trim()
  if (url === '') return null
  const description = descriptionOf(link.description)
  if (description === null) return null
  if (/official\s+web\s*(?:page|site)/i.test(description)) {
    return { performanceId: link.performance_id, url, sourceDescription: description, kind: 'official-website' }
  }
  if (/^website\b/i.test(description)) {
    return { performanceId: link.performance_id, url, sourceDescription: description, kind: 'website' }
  }
  return null
}

/** Hostnames that can serve a Bilibili video page. Short links are not accepted. */
const BILIBILI_VIDEO_HOSTS = new Set(['bilibili.com', 'www.bilibili.com', 'm.bilibili.com'])

/**
 * True only for a Bilibili *video* URL that can reasonably be a concert recording.
 * Profile, space, homepage, live, and opaque `b23.tv` short links are rejected,
 * including the site header's Bilibili profile URL.
 */
export const isBilibiliConcertRecordingUrl = (url: string): boolean => {
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
  const host = parsed.hostname.toLowerCase()
  if (!BILIBILI_VIDEO_HOSTS.has(host)) return false
  return /^\/video\/[A-Za-z0-9]+/.test(parsed.pathname)
}

/** Collects verified Bilibili recording URLs from 演出-level catalog sources only. */
export const collectBilibiliRecordingLinks = (
  links: readonly PerformanceLinkRow[],
  sources: readonly PerformanceSetlistSourceRow[],
): BilibiliRecordingLink[] => {
  const seen = new Set<string>()
  const recordings: BilibiliRecordingLink[] = []
  const add = (performanceId: number, url: string, sourceLabel: string | null, origin: BilibiliRecordingLink['origin']): void => {
    const href = url.trim()
    if (!isBilibiliConcertRecordingUrl(href)) return
    const key = `${performanceId}\0${href}`
    if (seen.has(key)) return
    seen.add(key)
    recordings.push({ performanceId, url: href, sourceLabel, origin })
  }
  for (const link of links) add(link.performance_id, link.url, descriptionOf(link.description), 'performance_links')
  for (const source of sources) add(source.performance_id, source.url, descriptionOf(source.title), 'performance_setlist_sources')
  return recordings
}

/** Website links for one 演出, official rows first, then generic website rows. */
const websiteLinksFor = (catalog: Catalog, performanceId: number): ClassifiedWebsiteLink[] => {
  const links: ClassifiedWebsiteLink[] = []
  for (const link of catalog.performanceLinks) {
    if (link.performance_id !== performanceId) continue
    const classified = classifyPerformanceWebsiteLink(link)
    if (classified !== null) links.push(classified)
  }
  return links.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === 'official-website' ? -1 : 1
    return left.url.localeCompare(right.url)
  })
}

/**
 * Recent 演出, newest concert `start_date` first.
 * Undated 演出 are omitted because "recent" needs a concert date, not a retrieval time.
 */
export const buildRecentConcerts = (catalog: Catalog, limit = RECENT_CONCERT_LIMIT): RecentConcert[] => {
  const dated = catalog.performances.filter((row): row is PerformanceRow & { start_date: string } => row.start_date !== null)
  dated.sort((left, right) => right.start_date.localeCompare(left.start_date) || right.id - left.id)
  return dated.slice(0, limit).map((performance) => ({
    id: performance.id,
    name: performance.name,
    seriesId: performance.series_id,
    seriesNumber: performance.series_number,
    startDate: performance.start_date,
    dates: performanceHeaderFacts(performance).dates,
    venue: performance.venue_name,
    countryCode: performance.country_code,
    status: statusOf(catalog, performance.id),
    href: showPath(performance.id),
    websiteLinks: websiteLinksFor(catalog, performance.id),
  }))
}

/**
 * Official and generic website links, plus verified Bilibili recordings,
 * taken from the most recent dated 演出 that actually have such links.
 * Song PV rows in `videos` are ignored: they are not concert recordings.
 */
export const buildRelatedConcertLinks = (
  catalog: Catalog,
  limit = RELATED_LINK_PERFORMANCE_LIMIT,
): RelatedConcertLinks => {
  const dated = catalog.performances.filter((row): row is PerformanceRow & { start_date: string } => row.start_date !== null)
  dated.sort((left, right) => right.start_date.localeCompare(left.start_date) || right.id - left.id)
  const recordingsByPerformance = new Map<number, BilibiliRecordingLink[]>()
  for (const recording of collectBilibiliRecordingLinks(catalog.performanceLinks, catalog.performanceSetlistSources)) {
    const bucket = recordingsByPerformance.get(recording.performanceId) ?? []
    bucket.push(recording)
    recordingsByPerformance.set(recording.performanceId, bucket)
  }
  const websites: ClassifiedWebsiteLink[] = []
  const bilibiliRecordings: BilibiliRecordingLink[] = []
  let used = 0
  for (const performance of dated) {
    if (used >= limit) break
    const sites = websiteLinksFor(catalog, performance.id)
    const recordings = recordingsByPerformance.get(performance.id) ?? []
    if (sites.length === 0 && recordings.length === 0) continue
    websites.push(...sites)
    bilibiliRecordings.push(...recordings)
    used += 1
  }
  return { websites, bilibiliRecordings }
}
