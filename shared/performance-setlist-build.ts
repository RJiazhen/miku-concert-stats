import {
  dayNightDatesFor,
  performanceSchedules,
  showsForNotes,
  type PerformanceShow,
} from './event-schedule.ts'
import { reviewRotations, type ResolvedRotationLine, type RotationReview } from './rotation.ts'
import type {
  Catalog,
  MedleyRow,
  MedleySongRow,
  PerformanceSetlistRow,
  PerformanceSetlistSourceRow,
  PerformanceShowSetlistItemRow,
  PerformanceShowSetlistRow,
  SetlistResolution,
} from './types.ts'
import type {
  CuratedSetlist,
  CuratedSetlistSong,
  PerformanceCuration,
  PerformanceSetlistCurationIndex,
} from './performance-setlist-curation.ts'
import { emptyCurationIndex } from './performance-setlist-curation.ts'
import { modeOf, parseReasons } from './performance-setlist-query.ts'

/** One derived row before it is numbered inside its 场次. */
type PendingItem = {
  sourcePosition: number | null
  songId: number | null
  medleyId: number | null
  evidence: 'note' | 'shared' | 'curated' | 'wiki'
  notes: string | null
}

/** Numbers the pending rows of one 场次 after sorting by source position. */
const numberItems = (items: readonly PendingItem[]): PendingItem[] => {
  return [...items].sort((left, right) => {
    const leftKey = left.sourcePosition ?? Number.MAX_SAFE_INTEGER
    const rightKey = right.sourcePosition ?? Number.MAX_SAFE_INTEGER
    return leftKey - rightKey
  })
}

/**
 * Whether a line's note names no show, so the line applies to every 场次.
 * Mirrors the rotation parser: blank notes and notes without a selector or date are shared.
 */
const isSharedLine = (line: ResolvedRotationLine): boolean => {
  const notes = line.notes
  if (notes === null || notes.trim() === '') return true
  return line.info.length > 0 && line.reasons.length === 0 && line.performanceIds.length > 1 && line.info.some((text) => text.trim() !== '')
}

/** Songs a source line contributes, resolved from the catalog. */
const songIdsOfLine = (catalog: Catalog, songListId: number, position: number): number[] => {
  return catalog.setlistItemSongs
    .filter((row) => row.song_list_id === songListId && row.position === position)
    .map((row) => row.song_id)
}

/** Result of deriving the 演出 layer from the source lists. */
export type PerformanceSetlistBuild = {
  setlists: PerformanceSetlistRow[]
  sources: PerformanceSetlistSourceRow[]
  shows: PerformanceShowSetlistRow[]
  items: PerformanceShowSetlistItemRow[]
  medleys: MedleyRow[]
  medleySongs: MedleySongRow[]
  statuses: { performance_id: number; status: string; note: string | null; source_url: string; accessed_at: string }[]
  /** Deterministic diagnostics for the report, not stored in the catalog. */
  stats: {
    performances: number
    shows: number
    items: number
    pendingReview: number
    conflicts: number
    unresolved: number
    inherited: number
    omittedRows: number
  }
}

/**
 * Expands the source song lists into one ordered setlist per 场次.
 *
 * VocaDB stores one song list for a whole run, and a shared list covers several city stops.
 * Each source line is attributed to the 场次 that its note covers, read by `showsForNotes`;
 * a line without a usable note applies to every 场次 of the 演出. Hand-checked curation can
 * assign, exclude, or add rows, and can supply the day/night dates the notes never carry.
 *
 * `note` on the derived 演出 row keeps the raw VocaDB note, but statistics no longer read it.
 */
export const buildPerformanceSetlists = (
  catalog: Catalog,
  review: RotationReview = reviewRotations(catalog),
  curation: PerformanceSetlistCurationIndex = emptyCurationIndex(),
): PerformanceSetlistBuild => {
  const schedules = performanceSchedules(catalog, review, curation.dayNight, curation.noShowDates, curation.halves)
  const setlists: PerformanceSetlistRow[] = []
  const sources: PerformanceSetlistSourceRow[] = []
  const shows: PerformanceShowSetlistRow[] = []
  const items: PerformanceShowSetlistItemRow[] = []
  const stats = {
    performances: 0,
    shows: 0,
    items: 0,
    pendingReview: 0,
    conflicts: 0,
    unresolved: 0,
    inherited: 0,
    omittedRows: 0,
  }
  /** 演出 whose rows came straight from a wiki table; their length is not comparable across cities. */
  const wikiSourced = new Set<number>()
  const linesByList = new Map<number, ResolvedRotationLine[]>()
  for (const line of review.lines) {
    const bucket = linesByList.get(line.songListId) ?? []
    bucket.push(line)
    linesByList.set(line.songListId, bucket)
  }
  for (const bucket of linesByList.values()) bucket.sort((left, right) => left.position - right.position)

  // Medley ids must be stable: number them in (song list, position) order.
  const medleyByKey = new Map<string, number>()
  const medleyNames = new Map<number, { name: string; url: string }>()
  let nextMedleyId = 1

  for (const performance of catalog.performances) {
    const listId = performance.song_list_id
    const performanceCuration = curation.performances.get(performance.id)
    // A 演出 with no upstream song list can still get one from a wiki table.
    if (listId === null && performanceCuration?.setlist === undefined) continue
    const songList = listId === null ? null : catalog.songLists.find((row) => row.id === listId)
    if (listId !== null && !songList) throw new Error(`Performance ${performance.id} points at missing song list ${listId}`)
    const listCuration = listId === null ? undefined : curation.lists.get(listId)
    const lines = listId === null ? [] : linesByList.get(listId) ?? []
    const schedule = schedules.get(performance.id) ?? []
    const showsOfRun: PerformanceShow[] =
      schedule.length > 0
        ? schedule
        : [{ key: `${performance.id}:unknown`, performanceId: performance.id, date: '', half: null, label: '日期未知' }]
    // A hand-checked `assign` may move a line that the note gave to another city, so a line that
    // names one of this 演出's 場次 counts as belonging to it even when the note did not.
    const runKeys = new Set(showsOfRun.map((show) => show.key))
    const assignedHere = new Set<number>()
    for (const [key, target] of Object.entries(listCuration?.assign ?? {})) {
      if (Array.isArray(target) && target.some((showKey) => runKeys.has(showKey))) assignedHere.add(Number(key))
    }
    const ownLines = lines.filter((line) => line.performanceIds.includes(performance.id) || assignedHere.has(line.position))
    /** A wiki setlist replaces the whole row set for this 演出. */
    const curatedSetlist = performanceCuration?.setlist
    // Without any source row the 演出 contributes nothing, unless a wiki supplied the whole list.
    if (ownLines.length === 0 && curatedSetlist === undefined) continue

    let curated = false
    // Whether this 演出's halves are known, so a half-naming note is exact: a curated
    // schedule says so, or the notes themselves both split a day and name the half.
    const halvesKnown =
      curation.dayNight.has(performance.id) ||
      curation.halves.has(performance.id) ||
      dayNightDatesFor(
        performance,
        ownLines.map((line) => line.notes),
      ).length > 0
    const excluded = new Set(listCuration?.exclude ?? [])
    const pendingByShow = new Map<string, PendingItem[]>()
    const addItem = (showKey: string, item: PendingItem): void => {
      const bucket = pendingByShow.get(showKey) ?? []
      bucket.push(item)
      pendingByShow.set(showKey, bucket)
    }

    if (curatedSetlist !== undefined) {
      // The outside list already says what each 場次 played, so the VocaDB rows are ignored.
      curated = true
      wikiSourced.add(performance.id)
      for (const show of showsOfRun) {
        for (const song of curatedSetlistSongs(curatedSetlist, show)) {
          addItem(show.key, {
            sourcePosition: null,
            songId: song.id,
            medleyId: null,
            evidence: 'wiki',
            notes: song.note ?? null,
          })
        }
      }
    }

    for (const line of curatedSetlist === undefined ? ownLines : []) {
      if (excluded.has(line.position)) {
        curated = true
        continue
      }
      const assign = listCuration?.assign?.[String(line.position)]
      // A wiki may prove the VocaDB note named the wrong city, day, or half.
      const correctedNote = listCuration?.notes?.[String(line.position)]
      const effectiveNotes = correctedNote ?? line.notes
      if (correctedNote !== undefined) curated = true
      let targets: PerformanceShow[]
      if (assign === true) {
        targets = showsOfRun
        curated = true
      } else if (Array.isArray(assign)) {
        const allowed = new Set(assign)
        targets = showsOfRun.filter((show) => allowed.has(show.key))
        curated = true
      } else {
        targets = showsForNotes(effectiveNotes, performance, showsOfRun)
      }
      // A wiki may also prove the note over-claims: the show is named but never played it.
      const dropped = listCuration?.dropShows?.[String(line.position)]
      if (dropped !== undefined && dropped.length > 0) {
        const skip = new Set(dropped)
        targets = targets.filter((show) => !skip.has(show.key))
        curated = true
      }
      if (targets.length === 0) continue
      const songIds = listId === null ? [] : songIdsOfLine(catalog, listId, line.position)
      if (songIds.length === 0) continue
      const shared = effectiveNotes === null || effectiveNotes.trim() === '' ? true : isSharedLine({ ...line, notes: effectiveNotes })
      const evidence: PendingItem['evidence'] =
        Array.isArray(assign) || assign === true || correctedNote !== undefined ? 'curated' : shared ? 'shared' : 'note'
      for (const show of targets) {
        if (songIds.length === 1) {
          addItem(show.key, {
            sourcePosition: line.position,
            songId: songIds[0] ?? null,
            medleyId: null,
            evidence,
            notes: effectiveNotes,
          })
          continue
        }
        const medleyKey = `${listId}:${line.position}`
        let medleyId = medleyByKey.get(medleyKey)
        if (medleyId === undefined) {
          medleyId = nextMedleyId
          nextMedleyId += 1
          medleyByKey.set(medleyKey, medleyId)
          medleyNames.set(medleyId, {
            name: catalog.songs.find((row) => row.id === line.listedSongId)?.name ?? String(line.listedSongId),
            url: catalog.songs.find((row) => row.id === line.listedSongId)?.source_url ?? '',
          })
        }
        addItem(show.key, {
          sourcePosition: line.position,
          songId: null,
          medleyId,
          evidence,
          notes: line.notes,
        })
      }
    }

    for (const extra of listCuration?.extra ?? []) {
      curated = true
      for (const showKey of extra.showKeys) {
        if (!showsOfRun.some((show) => show.key === showKey)) continue
        for (const songId of extra.songIds) {
          addItem(showKey, {
            sourcePosition: null,
            songId,
            medleyId: null,
            evidence: 'curated',
            notes: extra.note ?? null,
          })
        }
      }
    }

    // A wiki setlist is an outside attribution even when the notes alone would stay unresolved.
    const resolution =
      curatedSetlist !== undefined
        ? 'external'
        : listId === null
          ? 'unresolved'
          : resolveAttribution(performanceCuration, ownLines, catalog, listId, halvesKnown)
    const citedSources = performanceCuration?.sources ?? []
    const conflict =
      performanceCuration?.conflict === true || citedSources.some((source) => source.conflict === true) ? 1 : 0
    // A cited source, official or not, settles the question: the row keeps the URL and the
    // confidence so a reader can judge it, but nobody has to confirm it again. What still
    // needs a human is a 演出 nothing could locate, or one whose sources disagree.
    const pendingReview =
      conflict === 1 || (resolution === 'unresolved' && citedSources.length === 0 && curatedSetlist === undefined)
    const anyUncertain = ownLines.some((line) => line.uncertain)
    const everyShared = ownLines.every((line) => isSharedLine(line))
    const change: PerformanceSetlistRow['change'] = curated ? 'curated' : ownLines.length < lines.length ? 'filtered' : 'none'
    // `inherited` describes the rows: every line applies to every 場次 of the run, so the whole
    // source list stands in for the setlist. It is independent of whether a source confirmed the
    // schedule, which `resolution` and `performance_setlist_sources` already record.
    // A wiki setlist is a full per-演出 programme, so it is never "inherited" as a whole list.
    const status: PerformanceSetlistRow['status'] = conflict
      ? 'conflict'
      : curatedSetlist !== undefined
        ? pendingReview
          ? 'partial'
          : 'complete'
        : everyShared
          ? 'inherited'
          : anyUncertain || pendingReview
            ? 'partial'
            : 'complete'

    setlists.push({
      performance_id: performance.id,
      source_list_id: listId,
      // Rows replaced wholesale by a wiki table are wiki rows, whatever list VocaDB had.
      source_kind: curatedSetlist !== undefined ? 'wiki' : songList?.source ?? 'wiki',
      change,
      status,
      resolution,
      source_row_count:
        curatedSetlist === undefined
          ? lines.length
          : Math.max(...[curatedSetlist.songs, ...(curatedSetlist.slots ?? []).map((slot) => slot.songs)].map((songs) => songs.length)),
      day_night_dates: curation.dayNight.has(performance.id) ? JSON.stringify(curation.dayNight.get(performance.id)) : null,
      no_show_dates: curation.noShowDates.has(performance.id) ? JSON.stringify(curation.noShowDates.get(performance.id)) : null,
      single_show_dates: performanceCuration?.singleShowDates === undefined ? null : JSON.stringify(performanceCuration.singleShowDates),
      conflict,
      pending_review: pendingReview ? 1 : 0,
      note: performanceCuration?.note ?? listCuration?.note ?? null,
      page_note: performanceCuration?.pageNote ?? null,
    })
    stats.performances += 1
    if (pendingReview) stats.pendingReview += 1
    if (conflict) stats.conflicts += 1
    if (resolution === 'unresolved') stats.unresolved += 1
    if (status === 'inherited') stats.inherited += 1
    for (const source of citedSources) {
      sources.push({
        performance_id: performance.id,
        url: source.url,
        title: source.title,
        accessed_at: source.accessedAt,
        confidence: source.confidence,
        note: source.note ?? null,
        conflict: source.conflict === true ? 1 : 0,
      })
    }

    for (const show of showsOfRun) {
      const ordered = numberItems(pendingByShow.get(show.key) ?? [])
      const reasons = new Set<string>()
      if (anyUncertain) {
        for (const line of ownLines) {
          if (!line.uncertain) continue
          for (const reason of line.reasons) {
            // The derived layer resolves these two kinds, so inheriting them would report a
            // problem that no longer exists:
            //  - a half is known once the schedule was curated, so `day with day/night shows`
            //    no longer means anything for this 演出;
            //  - lengths are re-measured per 場次 at the end of the build.
            if (reason === 'day with day/night shows' && halvesKnown) continue
            if (reason.startsWith('setlist length mismatch')) continue
            // A cited source may confirm the city played one programme, which settles the
            // "which of this city's shows?" warning without changing which shows get the row.
            if (reason.startsWith('city-only when city has several shows') && listCuration?.citiesPlayOneSetlist === true) continue
            reasons.add(reason)
          }
        }
      }
      shows.push({
        performance_id: performance.id,
        show_key: show.key,
        date: show.date === '' ? null : show.date,
        half: show.half,
        item_count: ordered.length,
        omitted_count: Math.max(lines.length - ownLines.length, 0),
        uncertain: reasons.size > 0 || pendingReview ? 1 : 0,
        reasons: JSON.stringify([...reasons].sort()),
      })
      stats.shows += 1
      ordered.forEach((item, index) => {
        items.push({
          performance_id: performance.id,
          show_key: show.key,
          position: index + 1,
          source_position: item.sourcePosition,
          song_id: item.songId,
          medley_id: item.medleyId,
          evidence: item.evidence,
          notes: item.notes,
        })
        stats.items += 1
      })
    }
    stats.omittedRows += Math.max(lines.length - ownLines.length, 0)  }

  // Re-measure lengths per 場次: a 演出-level count is meaningless once the shows are split out.
  // The mode of the source list's shows is the expectation, so a genuine short or long show
  // still surfaces while a day that merely carried fewer rows stops looking like an error.
  const listByPerformance = new Map(catalog.performances.map((row) => [row.id, row.song_list_id]))
  const countsByList = new Map<number, number[]>()
  for (const row of shows) {
    const listId = listByPerformance.get(row.performance_id)
    if (listId === undefined || listId === null) continue
    const bucket = countsByList.get(listId) ?? []
    bucket.push(row.item_count)
    countsByList.set(listId, bucket)
  }
  const expectedByList = new Map<number, number>()
  for (const [listId, counts] of countsByList) expectedByList.set(listId, modeOf(counts))
  for (const row of shows) {
    const listId = listByPerformance.get(row.performance_id)
    if (listId === undefined || listId === null) continue
    // A cited reason settles the difference: it is not an error to be flagged again.
    if (curation.lists.get(listId)?.explainedLengths?.[row.show_key] !== undefined) continue
    // A wiki list is the per-city truth; cities of one year genuinely differ in length.
    if (wikiSourced.has(row.performance_id)) continue
    const expected = expectedByList.get(listId)
    if (expected === undefined || row.item_count === expected) continue
    const reasons = new Set<string>(parseReasons(row.reasons))
    reasons.add(`setlist length mismatch: ${row.item_count} vs expected ${expected}`)
    row.reasons = JSON.stringify([...reasons].sort())
    row.uncertain = 1
  }

  // Settle the 演出 status from what the 場次 rows actually report. A line-level warning that
  // the curated schedule already answered (a city-wide programme) drops out of the 場次 reasons,
  // so trusting the raw line flags here would leave the 演出 "partial" with no 場次 uncertain.
  const uncertainByPerformance = new Map<number, boolean>()
  for (const row of shows) {
    if (row.uncertain === 1) uncertainByPerformance.set(row.performance_id, true)
  }
  for (const row of setlists) {
    if (row.status === 'conflict' || row.status === 'inherited') continue
    row.status = uncertainByPerformance.get(row.performance_id) === true || row.pending_review === 1 ? 'partial' : 'complete'
  }

  const medleys = [...medleyNames.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([id, entry]) => ({ id, name: entry.name, note: null, source_url: entry.url }))
  const medleySongs = [...medleyByKey.entries()]
    .map(([key, id]) => {
      const [listId, position] = key.split(':').map(Number)
      const songIds = songIdsOfLine(catalog, listId ?? 0, position ?? 0)
      return { id, songIds }
    })
    .sort((left, right) => left.id - right.id)
    .flatMap((entry) => entry.songIds.map((songId, index) => ({ medley_id: entry.id, position: index + 1, song_id: songId })))

  const statusRows = [...curation.statuses.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([performanceId, entry]) => ({
      performance_id: performanceId,
      status: entry.status,
      note: entry.note ?? null,
      source_url: entry.source,
      accessed_at: entry.accessedAt,
    }))

  return { setlists, sources, shows, items, medleys, medleySongs, statuses: statusRows, stats }
}

/**
 * Whether a line's attribution is really open.
 * A length warning says the row count looks unusual, not that the row belongs to the wrong
 * 場次, so it must not make an otherwise exact attribution look unresolved.
 */
const attributionOpen = (line: ResolvedRotationLine, halvesKnown: boolean): boolean => {
  if (!line.uncertain) return false
  return line.reasons.some(
    (reason) =>
      !reason.startsWith('setlist length mismatch') && !(halvesKnown && reason === 'day with day/night shows'),
  )
}

/**
 * Attribution method for one 演出, preferring the hand-checked value.
 * An album tracklist applies to every 场次 of its 演出 as one release, so it counts as
 * `vocadb-shared`: `source_kind = 'album'` already tells the page where the rows came from.
 * A cited outside source only upgrades `unresolved` to `external`: when the notes already
 * placed the rows, the source confirmed the schedule rather than the attribution.
 */
const resolveAttribution = (
  curation: PerformanceCuration | undefined,
  lines: readonly ResolvedRotationLine[],
  catalog: Catalog,
  songListId: number,
  halvesKnown: boolean,
): SetlistResolution => {
  if (curation?.resolution !== undefined) return curation.resolution
  const songList = catalog.songLists.find((row) => row.id === songListId)
  if (songList?.source === 'album') return 'vocadb-shared'
  if (lines.length === 0) return 'unresolved'
  if (lines.every((line) => isSharedLine(line))) return 'vocadb-shared'
  if (lines.some((line) => !isSharedLine(line) && !attributionOpen(line, halvesKnown))) return 'vocadb-note'
  return curation?.sources !== undefined && curation.sources.length > 0 ? 'external' : 'unresolved'
}

/**
 * 场次 of every 演出, read from the materialized derived layer.
 *
 * The rows already applied the curated schedule, so pages and statistics simply read them
 * instead of recomputing the schedule; that keeps the show keys and counts identical
 * everywhere.
 */
/** Songs a 場次 played, preferring the most specific wiki slot that matches it. */
const curatedSetlistSongs = (setlist: CuratedSetlist, show: PerformanceShow): CuratedSetlistSong[] => {
  if (setlist.slots === undefined || setlist.slots.length === 0) return setlist.songs
  const half = show.half ?? ''
  const candidates = [
    show.key,
    half === '' ? '' : `${show.date}:${half}`,
    show.date,
    half,
  ].filter((value) => value !== '')
  for (const candidate of candidates) {
    const slot = setlist.slots.find((entry) => entry.match === candidate)
    if (slot !== undefined) return slot.songs
  }
  return setlist.songs
}

