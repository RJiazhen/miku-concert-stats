import type { SongCategory, SongRow } from './types.ts'

/**
 * Lowest id reserved for repertoire VocaDB does not list. Those rows have no VocaDB page, so any
 * job that calls `vocadb.net/api/songs/{id}` must skip ids at or above this value.
 */
export const LOCAL_SONG_ID_BASE = 2_000_000_000

/**
 * Lowest id reserved for 演出 VocaDB does not list at all. Such a row has no release event, so its
 * `source_url` points at the schedule source instead of `vocadb.net/E/{id}`, and any job that calls
 * `vocadb.net/api/releaseEvents/{id}` must skip ids at or above this value.
 */
export const LOCAL_PERFORMANCE_ID_BASE = 3_000_000_000

/**
 * Repertoire VocaDB does not list, registered from a wiki setlist so a 場次 keeps its complete
 * programme. The classification is stored on `songs.category`; `vocaloid` is the normal case.
 */
export const songCategoryLabels: Record<SongCategory, string> = {
  vocaloid: 'VOCALOID 歌曲',
  classical: '古典・管弦乐曲',
  traditional: '民谣・传统曲',
  instrumental: '器乐曲',
}

/** Fields needed to tell where a song entry came from. */
type SongSource = Pick<SongRow, 'id' | 'category' | 'source_url'>

/**
 * Whether a song is a synth-voice song. A false result means the row is real repertoire that
 * VocaDB has no entry for: it has no vocalist, and the page says so instead of implying a missing credit.
 */
export const isVocaloidSong = (song: Pick<SongRow, 'category'> | null | undefined): boolean => {
  return (song?.category ?? 'vocaloid') === 'vocaloid'
}

/** Whether the row came from VocaDB rather than from a wiki setlist. */
export const fromVocaDB = (song: Pick<SongRow, 'source_url'> | null | undefined): boolean => {
  return (song?.source_url ?? '').startsWith('https://vocadb.net/')
}

/**
 * Badge text for a row the catalog registered outside VocaDB; null hides the badge.
 * A VOCALOID song still gets a badge when VocaDB only had covers, so the missing structured
 * credits never look like a data bug.
 */
export const catalogBadge = (song: SongSource | null | undefined): string | null => {
  if (song === null || song === undefined || fromVocaDB(song)) return null
  if (!isVocaloidSong(song)) return `非 VocaDB 曲目・${songCategoryLabels[song.category]}`
  return '百科登记・VOCALOID 歌曲'
}

/**
 * One-line provenance note for a setlist row, or null for a normal VocaDB song.
 * Only repertoire has no singer, so that clause is kept to the non-VOCALOID cases.
 */
export const catalogSourceNote = (song: SongSource | null | undefined): string | null => {
  if (song === null || song === undefined || fromVocaDB(song)) return null
  if (!isVocaloidSong(song)) return `非 VocaDB 曲目（${songCategoryLabels[song.category]}），没有对应歌手`
  return '百科登记（VOCALOID 歌曲，VocaDB 无对应条目）'
}

/**
 * One sentence for the song page: why the entry exists, whether it has a singer,
 * and that VocaDB is not the source.
 */
export const repertoireExplanation = (song: SongSource): string => {
  if (isVocaloidSong(song)) {
    return '这条曲目按演唱会的百科逐曲表登记：它是 VOCALOID 歌曲，但 VocaDB 上可直接对应的条目只有同名翻唱，因此没有结构化的歌手与制作人信息。'
  }
  return `这条曲目来自演唱会的百科逐曲表，属于${songCategoryLabels[song.category]}，不是 VOCALOID 歌曲，因此没有对应的虚拟歌手，VocaDB 也没有收录。`
}
