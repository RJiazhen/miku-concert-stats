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
