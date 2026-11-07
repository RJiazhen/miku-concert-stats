import { computed, onMounted } from 'vue'
import { useState } from 'nuxt/app'
import raw from '~~/data/song-titles.zh-CN.json'
import { parseSongTitles, songTitleFor, songTitleSpellings, type SongLanguage } from '~~/shared/song-titles.ts'

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

  /** Stores the visitor's choice and updates every SongTitle. */
  const setLanguage = (next: SongLanguage): void => {
    language.value = next
    localStorage.setItem(STORAGE_KEY, next)
  }

  /** Switch binding: on shows Chinese titles, off keeps the original. */
  const showChinese = computed<boolean>({
    get: () => language.value === 'zh',
    set: (next: boolean) => setLanguage(next ? 'zh' : 'original'),
  })

  /** Chinese title for a song, or null when this language is original or the file has no row. */
  const translationFor = (songId: number): string | null => {
    if (language.value !== 'zh') return null
    return songTitleFor(titles, songId)?.title ?? null
  }

  /**
   * Chinese title and its recorded aliases for a song, for search.
   * Independent of the display language, so typing a Chinese name finds the song while the page
   * still shows the original title.
   */
  const chineseSpellings = (songId: number): string[] => songTitleSpellings(titles, songId)

  return { language, setLanguage, showChinese, translationFor, chineseSpellings }
}
