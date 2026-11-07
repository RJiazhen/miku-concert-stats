import { computed, type Ref } from 'vue'
import { albumIdFromSongListId } from '~~/shared/album-setlists.ts'
import { setlistPerformanceIds } from '~~/shared/performance-setlists.ts'
import { fromVocaDB } from '~~/shared/repertoire.ts'
import type { Catalog } from '~~/shared/types.ts'
import type { SetlistMergeIndex } from '~~/shared/edition-setlists.ts'
import type { RotationReview } from '~~/shared/rotation.ts'
import type { SongVariantIndex } from '~~/shared/song-variants.ts'

/** Quality-report inputs computed from the loaded catalog. */
export const useRawQuality = (
  catalog: Ref<Catalog | null>,
  variants: SongVariantIndex,
  merges: SetlistMergeIndex,
  review: Ref<RotationReview | null>,
) => {
/** VocaDB songs that have no PV link at all; the wiki repertoire has none by definition. */
const songsWithoutVideo = computed(() => {
  if (!catalog.value) return []
  const withVideo = new Set(catalog.value.videos.map((row) => row.song_id))
  return catalog.value.songs.filter((song) => fromVocaDB(song) && !withVideo.has(song.id))
})

/** Performances that cannot contribute a setlist: no setlist at all, or no date to place shows. */
const incompletePerformances = computed(() => {
  if (!catalog.value) return []
  const withSetlist = setlistPerformanceIds(catalog.value)
  return catalog.value.performances.filter((row) => !withSetlist.has(row.id) || row.start_date === null)
})

/** Performances whose setlist came from an album tracklist instead of the event. */
const albumFallbackPerformances = computed(() => {
  if (!catalog.value) return []
  return catalog.value.performances.filter((row) => row.song_list_id !== null && albumIdFromSongListId(row.song_list_id) !== null)
})

/** Distinct album tracklists used as setlists. */
const albumFallbackLists = computed(() => new Set(albumFallbackPerformances.value.map((row) => row.song_list_id)).size)

/** Upstream setlists without an announcement time. Album tracklists are not upstream setlists. */
const listsWithoutAnnouncement = computed(() => {
  if (!catalog.value) return []
  return catalog.value.songLists.filter((row) => row.source === 'vocadb' && row.announced_at === null)
})

/** Rotation lines the parser could not assign exactly. */
const uncertainLines = computed(() => review.value?.lines.filter((line) => line.uncertain) ?? [])

/** Shows whose parsed setlist length differs from the list's usual length. */
const mismatchedShows = computed(() => review.value?.shows ?? [])

/** Normalized title used to propose duplicate song entries. */
const normalizeTitle = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/-\s*[^-]*\b(remix|mix|ver\.?|version|edit|edition)\b[^-]*-\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Songs that share a normalized title but are not merged yet. */
const duplicateCandidates = computed(() => {
  if (!catalog.value) return []
  const merged = new Set<number>(variants.entries.keys())
  const forCanonical = new Set<number>([...variants.entries.values()].map((entry) => entry.canonical))
  const buckets = new Map<string, { id: number; name: string }[]>()
  for (const song of catalog.value.songs) {
    if (merged.has(song.id)) continue
    const key = normalizeTitle(song.name)
    const list = buckets.get(key) ?? []
    list.push({ id: song.id, name: song.name })
    buckets.set(key, list)
  }
  return [...buckets.entries()]
    .filter(([, list]) => list.length > 1 && list.some((song) => !forCanonical.has(song.id)))
    .map(([key, list]) => ({ key, songs: list }))
})

/** Counts shown at the top of the quality view. */
const qualitySummary = computed(() => {
  if (!catalog.value) return []
  return [
    { label: '歌曲', value: catalog.value.songs.length },
    { label: '演出', value: catalog.value.performances.length },
    { label: '歌单', value: catalog.value.songLists.length },
    { label: '投稿链接', value: catalog.value.videos.length },
    { label: '已合并版本', value: variants.size },
    { label: '已合并歌单组', value: merges.groups.size },
  ]
})


  return {
    songsWithoutVideo,
    incompletePerformances,
    albumFallbackPerformances,
    albumFallbackLists,
    listsWithoutAnnouncement,
    uncertainLines,
    mismatchedShows,
    duplicateCandidates,
    qualitySummary,
  }
}
