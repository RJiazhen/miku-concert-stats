import { describe, expect, it } from 'vitest'
import {
  buildPerformanceSetlists,
  parsePerformanceSetlistCuration,
  validateCurationAgainstCatalog,
} from '../shared/performance-setlists.ts'
import { reviewRotations } from '../shared/rotation.ts'
import type {
  Catalog,
  PerformanceRow,
  SeriesRow,
  SetlistItemRow,
  SetlistItemSongRow,
  SongListRow,
  SongRow,
} from '../shared/types.ts'

/** Minimal catalog every fixture starts from. */
const catalog = (): Catalog => ({
  sources: [],
  series: [series(173, 'MIKU WITH YOU')],
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
  performanceStatus: [],
})

/** Series row with only the fields the derivation reads. */
const series = (id: number, name: string): SeriesRow => ({
  id,
  name,
  name_ja: null,
  description: null,
  source_url: `https://vocadb.net/Es/${id}`,
  retrieved_at: '2026-11-05T00:00:00.000Z',
})

/** 演出 fixture: an in-person show with a setlist. */
const performance = (
  overrides: Partial<PerformanceRow> & Pick<PerformanceRow, 'id' | 'name' | 'song_list_id'>,
): PerformanceRow => ({
  series_id: 173,
  name_ja: null,
  venue_name: null,
  country_code: 'CN',
  start_date: '2019-11-02',
  end_date: null,
  showtime_local: null,
  timezone: null,
  time_precision: 'day',
  time_evidence: null,
  role: 'show',
  series_number: 2019,
  series_suffix: null,
  vocadb_status: 'Finished',
  source_url: `https://vocadb.net/E/${overrides.id}`,
  retrieved_at: '2026-11-05T00:00:00.000Z',
  ...overrides,
})

/** Song list fixture. */
const songList = (id: number, overrides: Partial<SongListRow> = {}): SongListRow => ({
  id,
  name: `List ${id}`,
  featured_category: 'Concerts',
  source_url: `https://vocadb.net/L/${id}`,
  retrieved_at: '2026-11-05T00:00:00.000Z',
  announced_at: null,
  source: 'vocadb',
  album_id: null,
  medium: null,
  ...overrides,
})

/** Song fixture. */
const song = (id: number, name: string): SongRow => ({
  id,
  name,
  name_ja: null,
  name_en: null,
  artist_string: null,
  song_type: 'Original',
  publish_date: null,
  length_seconds: null,
  source_url: `https://vocadb.net/S/${id}`,
  retrieved_at: '2026-11-05T00:00:00.000Z',
})

/** One printed line plus its counted song. */
const line = (songListId: number, position: number, songId: number, notes: string | null = null): [SetlistItemRow, SetlistItemSongRow] => [
  { song_list_id: songListId, position, listed_song_id: songId, notes },
  { song_list_id: songListId, position, song_id: songId, role: 'listed' },
]

/** Catalog holding one shared list across four city stops with A/B replacement lines. */
const mikuWithYou2019 = (): Catalog => {
  const base = catalog()
  base.songLists = [songList(9359)]
  base.performances = [
    performance({ id: 3752, name: 'MIKU WITH YOU 2019 in Shanghai', song_list_id: 9359, start_date: '2019-11-02', end_date: '2019-11-03' }),
    performance({ id: 3753, name: 'MIKU WITH YOU 2019 in Chengdu', song_list_id: 9359, start_date: '2019-11-09' }),
    performance({ id: 3754, name: 'MIKU WITH YOU 2019 in Beijing', song_list_id: 9359, start_date: '2019-11-16' }),
    performance({ id: 3755, name: 'MIKU WITH YOU 2019 in Guangzhou', song_list_id: 9359, start_date: '2019-11-23', end_date: '2019-11-24' }),
  ]
  const rows: [SetlistItemRow, SetlistItemSongRow][] = [
    line(9359, 1, 100),
    line(9359, 2, 101),
    line(9359, 3, 200, 'Shanghai, Beijing'),
    line(9359, 4, 201, 'Chengdu, Guangzhou'),
    line(9359, 5, 300, 'Encore'),
  ]
  base.setlistItems = rows.map((row) => row[0])
  base.setlistItemSongs = rows.map((row) => row[1])
  base.songs = [song(100, 'common'), song(101, 'common2'), song(200, 'A version'), song(201, 'B version'), song(300, 'encore')]
  return base
}

describe('performance setlist derivation', () => {
  it('splits a shared list into one full setlist per 场次', () => {
    const base = mikuWithYou2019()
    const build = buildPerformanceSetlists(base, reviewRotations(base))
    expect(build.stats.performances).toBe(4)
    // Shanghai and Guangzhou span two days; Chengdu and Beijing one day each.
    expect(build.stats.shows).toBe(6)
    const shanghai = build.shows.filter((row) => row.performance_id === 3752)
    // 100, 101, the A-version line, and the Encore line.
    expect(shanghai.map((row) => row.item_count)).toEqual([4, 4])
    const chengdu = build.shows.filter((row) => row.performance_id === 3753)
    expect(chengdu.map((row) => row.item_count)).toEqual([4])
  })

  it('keeps the A lines for Shanghai and the B lines for Chengdu', () => {
    const base = mikuWithYou2019()
    const build = buildPerformanceSetlists(base, reviewRotations(base))
    const shanghai = build.items.filter((row) => row.performance_id === 3752 && row.show_key === '3752:2019-11-02')
    const chengdu = build.items.filter((row) => row.performance_id === 3753)
    expect(shanghai.map((row) => row.song_id)).toEqual([100, 101, 200, 300])
    expect(chengdu.map((row) => row.song_id)).toEqual([100, 101, 201, 300])
  })

  it('marks the shared suffix as shared and the city lines as note evidence', () => {
    const base = mikuWithYou2019()
    const build = buildPerformanceSetlists(base, reviewRotations(base))
    const shanghai = build.items.filter((row) => row.show_key === '3752:2019-11-02')
    expect(shanghai.filter((row) => row.evidence === 'shared').map((row) => row.song_id)).toEqual([100, 101, 300])
    expect(shanghai.filter((row) => row.evidence === 'note').map((row) => row.song_id)).toEqual([200])
  })

  it('records how many source rows each 演出 dropped', () => {
    const base = mikuWithYou2019()
    const build = buildPerformanceSetlists(base, reviewRotations(base))
    const shanghai = build.setlists.find((row) => row.performance_id === 3752)
    expect(shanghai?.source_row_count).toBe(5)
    expect(shanghai?.change).toBe('filtered')
    expect(build.shows.find((row) => row.performance_id === 3752)?.omitted_count).toBe(1)
  })

  it('splits a day into 日场 / 夜场 when the curated schedule says so', () => {
    const base = mikuWithYou2019()
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      performances: { 3752: { dayNight: ['2019-11-02', '2019-11-03'] } },
    })
    const build = buildPerformanceSetlists(base, reviewRotations(base), curation)
    const shows = build.shows.filter((row) => row.performance_id === 3752)
    expect(shows.map((row) => row.show_key)).toEqual([
      '3752:2019-11-02:day',
      '3752:2019-11-02:night',
      '3752:2019-11-03:day',
      '3752:2019-11-03:night',
    ])
    expect(build.setlists.find((row) => row.performance_id === 3752)?.day_night_dates).toBe('["2019-11-02","2019-11-03"]')
  })

  it('drops an exhibition-only day from the run', () => {
    const base = mikuWithYou2019()
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      performances: { 3752: { noShowDates: ['2019-11-02'] } },
    })
    const build = buildPerformanceSetlists(base, reviewRotations(base), curation)
    const shows = build.shows.filter((row) => row.performance_id === 3752)
    expect(shows.map((row) => row.show_key)).toEqual(['3752:2019-11-03'])
  })

  it('keeps a first day with only a night show as one half', () => {
    const base = mikuWithYou2019()
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      performances: { 3752: { dayNight: ['2019-11-03'], halves: { '2019-11-02': ['night'] } } },
    })
    const build = buildPerformanceSetlists(base, reviewRotations(base), curation)
    const shows = build.shows.filter((row) => row.performance_id === 3752)
    expect(shows.map((row) => row.show_key)).toEqual([
      '3752:2019-11-02:night',
      '3752:2019-11-03:day',
      '3752:2019-11-03:night',
    ])
  })

  it('settles a run whose single-show days a source confirms', () => {
    const base = mikuWithYou2019()
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      performances: { 3752: { singleShowDates: ['2019-11-02', '2019-11-03'] } },
    })
    const build = buildPerformanceSetlists(base, reviewRotations(base), curation)
    const shows = build.shows.filter((row) => row.performance_id === 3752)
    // A confirmed "one show a day" keeps the plain day keys and records the evidence.
    expect(shows.map((row) => row.show_key)).toEqual(['3752:2019-11-02', '3752:2019-11-03'])
    expect(build.setlists.find((row) => row.performance_id === 3752)?.single_show_dates).toBe('["2019-11-02","2019-11-03"]')
  })

  it('rejects a single-show date outside the run', () => {
    const base = mikuWithYou2019()
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      performances: { 3753: { singleShowDates: ['2019-11-10'] } },
    })
    expect(() => validateCurationAgainstCatalog(curation, base, reviewRotations(base))).toThrow(/outside/)
  })

  it('marks a fully shared list as inherited', () => {
    const base = catalog()
    base.songLists = [songList(6571)]
    base.performances = [
      performance({ id: 1859, name: 'MIKU EXPO 2016 Seattle', song_list_id: 6571, start_date: '2016-04-23' }),
      performance({ id: 1930, name: 'MIKU EXPO 2016 San Francisco', song_list_id: 6571, start_date: '2016-04-30' }),
    ]
    const rows = [line(6571, 1, 100), line(6571, 2, 101)]
    base.setlistItems = rows.map((row) => row[0])
    base.setlistItemSongs = rows.map((row) => row[1])
    base.songs = [song(100, 'a'), song(101, 'b')]
    const build = buildPerformanceSetlists(base, reviewRotations(base))
    expect(build.setlists.map((row) => row.status)).toEqual(['inherited', 'inherited'])
    expect(build.setlists.map((row) => row.resolution)).toEqual(['vocadb-shared', 'vocadb-shared'])
    expect(build.stats.items).toBe(4)
  })

  it('treats an album tracklist as one shared programme', () => {
    const base = catalog()
    base.songLists = [songList(1_000_003_0961, { source: 'album', album_id: 30961, medium: 'bluray' })]
    base.performances = [
      performance({ id: 2959, name: 'Symphony 2017 Tokyo', song_list_id: 1_000_003_0961, series_id: 256, start_date: '2017-11-29' }),
    ]
    const rows = [line(1_000_003_0961, 1, 100)]
    base.setlistItems = rows.map((row) => row[0])
    base.setlistItemSongs = rows.map((row) => row[1])
    base.songs = [song(100, 'a')]
    const build = buildPerformanceSetlists(base, reviewRotations(base))
    expect(build.setlists[0]?.source_kind).toBe('album')
    expect(build.setlists[0]?.resolution).toBe('vocadb-shared')
    expect(build.setlists[0]?.pending_review).toBe(0)
  })

  it('adopts a medium-confidence wiki source without asking for review again', () => {
    const base = mikuWithYou2019()
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      performances: {
        3752: {
          resolution: 'external',
          sources: [
            {
              url: 'https://zh.moegirl.org.cn/example',
              title: '萌娘百科',
              accessedAt: '2026-11-05',
              confidence: 'medium',
              note: 'A 版由上海、北京使用',
            },
          ],
        },
      },
    })
    const build = buildPerformanceSetlists(base, reviewRotations(base), curation)
    const row = build.setlists.find((entry) => entry.performance_id === 3752)
    expect(row?.resolution).toBe('external')
    // The source is kept for the audit trail, but nobody has to confirm it a second time.
    expect(row?.pending_review).toBe(0)
    expect(build.sources).toHaveLength(1)
    expect(build.sources[0]?.confidence).toBe('medium')
    expect(build.sources[0]?.accessed_at).toBe('2026-11-05')
  })

  it('keeps an unresolved attribution open for review', () => {
    const base = mikuWithYou2019()
    // Neither a note nor a source places the rows, so a human still has to look.
    for (const row of base.setlistItems) row.notes = 'Mystery Day 9'
    const build = buildPerformanceSetlists(base, reviewRotations(base))
    expect(build.setlists.every((row) => row.resolution === 'unresolved')).toBe(true)
    expect(build.setlists.every((row) => row.pending_review === 1)).toBe(true)
  })

  it('does not flag a high-confidence source for review', () => {
    const base = mikuWithYou2019()
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      performances: {
        3752: {
          resolution: 'external',
          sources: [{ url: 'https://magicalmirai.com/', title: 'Official', accessedAt: '2026-11-05', confidence: 'high' }],
        },
      },
    })
    const build = buildPerformanceSetlists(base, reviewRotations(base), curation)
    expect(build.setlists.find((entry) => entry.performance_id === 3752)?.pending_review).toBe(0)
  })

  it('marks a conflict when a source disagrees', () => {
    const base = mikuWithYou2019()
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      performances: {
        3755: {
          resolution: 'external',
          conflict: true,
          sources: [
            {
              url: 'https://zh.moegirl.org.cn/example',
              title: '萌娘百科',
              accessedAt: '2026-11-05',
              confidence: 'medium',
              conflict: true,
            },
          ],
        },
      },
    })
    const build = buildPerformanceSetlists(base, reviewRotations(base), curation)
    const row = build.setlists.find((entry) => entry.performance_id === 3755)
    expect(row?.conflict).toBe(1)
    expect(row?.status).toBe('conflict')
    expect(build.stats.conflicts).toBe(1)
  })

  it('applies assign, exclude, and extra corrections', () => {
    const base = mikuWithYou2019()
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      lists: {
        9359: {
          source: 'https://example.com/setlist',
          accessedAt: '2026-11-05',
          confidence: 'medium',
          assign: { 3: ['3753:2019-11-09'] },
          exclude: [4],
          extra: [{ showKeys: ['3752:2019-11-02'], songIds: [400], afterPosition: 5, note: '上海限定' }],
        },
      },
    })
    const build = buildPerformanceSetlists(base, reviewRotations(base), curation)
    const chengdu = build.items.filter((row) => row.performance_id === 3753)
    // Position 3 moves to Chengdu; position 4 is excluded everywhere.
    expect(chengdu.map((row) => row.song_id)).toEqual([100, 101, 200, 300])
    const shanghaiFirst = build.items.filter((row) => row.show_key === '3752:2019-11-02')
    expect(shanghaiFirst.map((row) => row.song_id)).toEqual([100, 101, 300, 400])
    expect(shanghaiFirst.at(-1)?.evidence).toBe('curated')
    expect(build.setlists.find((row) => row.performance_id === 3752)?.change).toBe('curated')
  })

  it('numbers positions from one for every 场次', () => {
    const base = mikuWithYou2019()
    const build = buildPerformanceSetlists(base, reviewRotations(base))
    for (const show of build.shows) {
      const items = build.items.filter((row) => row.show_key === show.show_key)
      expect(items.map((row) => row.position)).toEqual(items.map((_, index) => index + 1))
      expect(items).toHaveLength(show.item_count)
    }
  })

  it('is deterministic', () => {
    const base = mikuWithYou2019()
    const first = buildPerformanceSetlists(base, reviewRotations(base))
    const second = buildPerformanceSetlists(base, reviewRotations(base))
    expect(second.items).toEqual(first.items)
    expect(second.shows).toEqual(first.shows)
  })
})

describe('wiki-sourced setlists and statuses', () => {
  it('replaces the VocaDB rows with a complete outside setlist', () => {
    const base = mikuWithYou2019()
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      performances: {
        3752: {
          setlist: {
            source: 'https://w.atwiki.jp/hmiku/pages/1.html',
            title: 'Wiki list',
            accessedAt: '2026-11-05',
            confidence: 'medium',
            label: '上海公演',
            songs: [
              { id: 100, title: 'common' },
              { id: 300, title: 'encore', note: 'アンコール' },
            ],
          },
        },
      },
    })
    const build = buildPerformanceSetlists(base, reviewRotations(base), curation)
    const rows = build.items.filter((row) => row.performance_id === 3752)
    // Two shows, two rows each; the VocaDB rows are gone.
    expect(rows).toHaveLength(4)
    expect(rows.every((row) => row.evidence === 'wiki')).toBe(true)
    expect(rows.map((row) => row.song_id)).toEqual([100, 300, 100, 300])
    const setlist = build.setlists.find((row) => row.performance_id === 3752)
    expect(setlist?.resolution).toBe('external')
    expect(setlist?.pending_review).toBe(0)
    expect(setlist?.change).toBe('curated')
  })

  it('rejects a wiki setlist that cites an unknown song', () => {
    const base = mikuWithYou2019()
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      performances: {
        3752: {
          setlist: {
            source: 'https://example.com',
            title: 'Wiki list',
            accessedAt: '2026-11-05',
            confidence: 'medium',
            songs: [{ id: 999999, title: 'not in catalog' }],
          },
        },
      },
    })
    expect(() => validateCurationAgainstCatalog(curation, base, reviewRotations(base))).toThrow(/unknown song/)
  })

  it('gives a performance without a VocaDB list a wiki setlist', () => {
    const base = mikuWithYou2019()
    // 3753 loses its upstream list, so the wiki table is the only source.
    const chengdu = base.performances.find((row) => row.id === 3753)
    if (chengdu) chengdu.song_list_id = null
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      performances: {
        3753: {
          setlist: {
            source: 'https://w.atwiki.jp/hmiku/pages/1.html',
            title: 'Wiki list',
            accessedAt: '2026-11-05',
            confidence: 'medium',
            songs: [{ id: 100, title: 'common' }, { id: 201, title: 'B version' }],
          },
        },
      },
    })
    const build = buildPerformanceSetlists(base, reviewRotations(base), curation)
    const row = build.setlists.find((entry) => entry.performance_id === 3753)
    expect(row?.source_list_id).toBeNull()
    expect(row?.source_kind).toBe('wiki')
    expect(row?.resolution).toBe('external')
    expect(row?.status).toBe('complete')
    expect(build.items.filter((item) => item.performance_id === 3753).map((item) => item.song_id)).toEqual([100, 201])
  })

  it('records a cancelled show without a setlist row', () => {
    const base = mikuWithYou2019()
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      statuses: {
        9999: {
          status: 'cancelled',
          note: '2020 疫情取消',
          source: 'https://twitter.com/mikuexpo/status/1',
          accessedAt: '2026-11-05',
        },
      },
    })
    // 9999 is not in this fixture, so validation rejects it rather than storing a dangling row.
    expect(() => validateCurationAgainstCatalog(curation, base, reviewRotations(base))).toThrow(/unknown performance/)
    const ok = parsePerformanceSetlistCuration({
      version: 1,
      statuses: { 3753: { status: 'cancelled', source: 'https://example.com', accessedAt: '2026-11-05' } },
    })
    expect(() => validateCurationAgainstCatalog(ok, base, reviewRotations(base))).not.toThrow()
    const build = buildPerformanceSetlists(base, reviewRotations(base), ok)
    expect(build.statuses).toEqual([
      { performance_id: 3753, status: 'cancelled', note: null, source_url: 'https://example.com', accessed_at: '2026-11-05' },
    ])
  })
})

describe('setlist curation validation', () => {
  it('rejects an external attribution without a source', () => {
    expect(() => parsePerformanceSetlistCuration({ version: 1, performances: { 3752: { resolution: 'external' } } })).toThrow(
      /cites no source/,
    )
  })

  it('rejects a malformed accessed date', () => {
    expect(() =>
      parsePerformanceSetlistCuration({
        version: 1,
        performances: {
          3752: { sources: [{ url: 'https://a.example', title: 'a', accessedAt: '2026/11/05', confidence: 'high' }] },
        },
      }),
    ).toThrow(/accessedAt/)
  })

  it('rejects an unknown confidence', () => {
    expect(() =>
      parsePerformanceSetlistCuration({
        version: 1,
        performances: {
          3752: { sources: [{ url: 'https://a.example', title: 'a', accessedAt: '2026-11-05', confidence: 'certain' }] },
        },
      }),
    ).toThrow(/confidence/)
  })

  it('rejects a repeated source url', () => {
    expect(() =>
      parsePerformanceSetlistCuration({
        version: 1,
        performances: {
          3752: {
            resolution: 'external',
            sources: [
              { url: 'https://a.example', title: 'a', accessedAt: '2026-11-05', confidence: 'high' },
              { url: 'https://a.example', title: 'b', accessedAt: '2026-11-05', confidence: 'high' },
            ],
          },
        },
      }),
    ).toThrow(/repeats source/)
  })

  it('rejects a correction that cites no source', () => {
    expect(() =>
      parsePerformanceSetlistCuration({ version: 1, lists: { 9359: { exclude: [3] } } }),
    ).toThrow(/cites no source/)
  })

  it('rejects a day/night date outside the run', () => {
    const base = mikuWithYou2019()
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      performances: { 3753: { dayNight: ['2019-11-10'] } },
    })
    expect(() => validateCurationAgainstCatalog(curation, base, reviewRotations(base))).toThrow(/outside/)
  })

  it('rejects an unknown show key', () => {
    const base = mikuWithYou2019()
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      lists: {
        9359: {
          source: 'https://example.com',
          accessedAt: '2026-11-05',
          assign: { 3: ['9999:2019-11-02'] },
        },
      },
    })
    expect(() => validateCurationAgainstCatalog(curation, base, reviewRotations(base))).toThrow(/unknown show/)
  })

  it('accepts a well-formed file', () => {
    const base = mikuWithYou2019()
    const curation = parsePerformanceSetlistCuration({
      version: 1,
      performances: {
        3752: {
          dayNight: ['2019-11-02'],
          resolution: 'external',
          sources: [{ url: 'https://a.example', title: 'a', accessedAt: '2026-11-05', confidence: 'medium' }],
        },
      },
    })
    expect(() => validateCurationAgainstCatalog(curation, base, reviewRotations(base))).not.toThrow()
    expect(curation.size).toBe(1)
    expect(curation.dayNight.get(3752)).toEqual(['2019-11-02'])
  })
})
