import { describe, expect, it } from 'vitest'
import { bandForCount } from '../shared/bands.ts'
import { compareBy, observeWindow, playbackForSongs, representativeVideo, summarizeBands } from '../shared/stats.ts'
import type { Catalog } from '../shared/types.ts'

/** Empty catalog overridden per test. */
const baseCatalog = (): Catalog => ({
  sources: [],
  series: [{ id: 81, name: 'マジカルミライ', name_ja: null, description: null, source_url: 'https://vocadb.net/Event/SeriesDetails/81', retrieved_at: '2026-10-12T00:00:00.000Z' }],
  performances: [],
  performanceLinks: [],
  premieres: [],
  songLists: [],
  songs: [],
  setlistItems: [],
  setlistItemSongs: [],
  medleyQuarantine: [],
  videos: [],
  snapshots: [],
  milestones: [],
  formulas: [],
  performanceSetlists: [],
  performanceSetlistSources: [],
  performanceShowSetlists: [],
  performanceShowSetlistItems: [],
  medleys: [],
  medleySongs: [],
})

describe('representative videos and bands', () => {
  it('prefers an enabled Original PV, then the lowest PV id', () => {
    const catalog = baseCatalog()
    catalog.videos = [
      { vocadb_pv_id: 3, song_id: 1, platform: 'youtube', platform_video_id: 'c', url: 'https://youtu.be/c', title: null, author: null, pv_type: 'Reprint', publish_date: null, disabled: 0 },
      { vocadb_pv_id: 8, song_id: 1, platform: 'youtube', platform_video_id: 'b', url: 'https://youtu.be/b', title: null, author: null, pv_type: 'Original', publish_date: null, disabled: 0 },
      { vocadb_pv_id: 2, song_id: 1, platform: 'youtube', platform_video_id: 'a', url: 'https://youtu.be/a', title: null, author: null, pv_type: 'Original', publish_date: null, disabled: 1 },
    ]
    expect(representativeVideo(catalog.videos, 1, 'youtube')?.vocadb_pv_id).toBe(8)
    expect(bandForCount(null)).toBe('none')
    expect(bandForCount(100_000)).toBe('100k_1m')
    expect(bandForCount(10_000_000)).toBe('10m_plus')
  })

  it('does not invent a view count when no snapshot exists', () => {
    const catalog = baseCatalog()
    catalog.videos = [
      { vocadb_pv_id: 1, song_id: 5, platform: 'youtube', platform_video_id: 'abc', url: 'https://youtu.be/abc', title: null, author: null, pv_type: 'Original', publish_date: null, disabled: 0 },
    ]
    const playback = playbackForSongs(catalog, [5], 'youtube')
    expect(playback[0]?.viewCount).toBeNull()
    expect(summarizeBands(playback)[0]).toMatchObject({ id: 'none', count: 1, ratio: 1 })
  })

  it('drops quarantined mashups from the denominator and counts components once', () => {
    const catalog = baseCatalog()
    catalog.performances = [
      { id: 1, series_id: 81, name: 'A', name_ja: null, venue_name: null, country_code: 'JP', start_date: '2014-08-30', end_date: null, showtime_local: null, timezone: null, time_precision: 'day', time_evidence: null, role: 'show', series_number: 2014, series_suffix: null, song_list_id: 10, vocadb_status: 'Approved', source_url: 'https://vocadb.net/E/1', retrieved_at: '2026-10-12T00:00:00.000Z' },
      { id: 2, series_id: 81, name: 'B', name_ja: null, venue_name: null, country_code: 'JP', start_date: '2014-09-20', end_date: null, showtime_local: null, timezone: null, time_precision: 'day', time_evidence: null, role: 'show', series_number: 2014, series_suffix: null, song_list_id: 10, vocadb_status: 'Approved', source_url: 'https://vocadb.net/E/2', retrieved_at: '2026-10-12T00:00:00.000Z' },
    ]
    catalog.setlistItemSongs = [
      { song_list_id: 10, position: 1, song_id: 5, role: 'listed' },
      { song_list_id: 10, position: 2, song_id: 6, role: 'component' },
      { song_list_id: 10, position: 2, song_id: 7, role: 'component' },
    ]
    catalog.medleyQuarantine = [
      { song_list_id: 10, position: 3, listed_song_id: 9, reason: 'unsplit' },
    ]
    catalog.setlistItemSongs.push({ song_list_id: 10, position: 3, song_id: 9, role: 'listed' })
    const rows = compareBy(catalog, 'youtube', 'edition')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.songCount).toBe(3)
  })
})

describe('observation windows', () => {
  it('reports insufficient when either side has no snapshot', () => {
    const catalog = baseCatalog()
    catalog.videos = [
      { vocadb_pv_id: 1, song_id: 5, platform: 'youtube', platform_video_id: 'abc', url: 'https://youtu.be/abc', title: null, author: null, pv_type: 'Original', publish_date: null, disabled: 0 },
    ]
    catalog.snapshots = [
      { platform: 'youtube', platform_video_id: 'abc', collected_at: '2014-08-01T00:00:00.000Z', view_count: 10, source: 'youtube-data-api-v3', source_url: 'https://www.googleapis.com/youtube/v3/videos?part=statistics&id=abc' },
    ]
    const missingAfter = observeWindow(catalog, [5], 'youtube', '2014-08-30T00:00:00.000Z')
    expect(missingAfter[0]?.status).toBe('insufficient')
    expect(missingAfter[0]?.delta).toBeNull()
    const missingInstant = observeWindow(catalog, [5], 'youtube', null)
    expect(missingInstant[0]?.status).toBe('insufficient')
  })

  it('subtracts the surrounding snapshots without treating an equal timestamp as before', () => {
    const catalog = baseCatalog()
    catalog.videos = [
      { vocadb_pv_id: 1, song_id: 5, platform: 'youtube', platform_video_id: 'abc', url: 'https://youtu.be/abc', title: null, author: null, pv_type: 'Original', publish_date: null, disabled: 0 },
    ]
    catalog.snapshots = [
      { platform: 'youtube', platform_video_id: 'abc', collected_at: '2014-08-01T00:00:00.000Z', view_count: 10, source: 'youtube-data-api-v3', source_url: 'https://www.googleapis.com/youtube/v3/videos?part=statistics&id=abc' },
      { platform: 'youtube', platform_video_id: 'abc', collected_at: '2014-08-30T00:00:00.000Z', view_count: 15, source: 'youtube-data-api-v3', source_url: 'https://www.googleapis.com/youtube/v3/videos?part=statistics&id=abc' },
      { platform: 'youtube', platform_video_id: 'abc', collected_at: '2014-09-06T00:00:00.000Z', view_count: 40, source: 'youtube-data-api-v3', source_url: 'https://www.googleapis.com/youtube/v3/videos?part=statistics&id=abc' },
    ]
    const observation = observeWindow(catalog, [5], 'youtube', '2014-08-30T00:00:00.000Z')
    expect(observation[0]).toMatchObject({ status: 'ok', before: 10, after: 40, delta: 30 })
  })
})
