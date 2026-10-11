import { onMounted } from 'vue'
import { useState } from 'nuxt/app'
import raw from '../data/song-titles.zh-CN.json'
import { parseSongTitles, songTitleFor, type SongLanguage } from '../shared/song-titles.ts'

const STORAGE_KEY = 'miku-concert-stats-song-lang'

const titles = parseSongTitles(raw)

/** Starts as the original title so server HTML and hydration match. */
const originalLanguage = (): SongLanguage => 'original'

/**
 * Shares the song-title language across pages.
 * After mount, a stored choice wins; otherwise zh* browser languages select Chinese.
 */
export const useSongLanguage = () => {
  const language = useState<SongLanguage>('song-language', originalLanguage)

  /** Applies localStorage, or navigator.language when the visitor has not chosen. */
  const readLanguage = (): void => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'zh' || stored === 'original') {
      language.value = stored
      return
    }
    language.value = navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'original'
  }
  onMounted(readLanguage)

  /** Stores the visitor's title language and updates every SongTitle. */
  const setLanguage = (next: SongLanguage): void => {
    language.value = next
    localStorage.setItem(STORAGE_KEY, next)
  }

  /** Chinese title for a song, or null when this language is original or the file has no row. */
  const translationFor = (songId: number): string | null => {
    if (language.value !== 'zh') return null
    return songTitleFor(titles, songId)?.title ?? null
  }

  return { language, setLanguage, translationFor }
}
