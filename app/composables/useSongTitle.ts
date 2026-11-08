import { computed } from 'vue'
import { useLocale } from './useLocale.ts'
import { useSongAliases } from './useSongAliases.ts'
import { useSongLookup } from './useSongLookup.ts'
import rawTitles from '~~/data/song-titles.zh-CN.json'
import {
  formatSongTitle,
  matchSongTitle,
  parseSongTitles,
  songTitleFor,
  songTitleSpellings,
  type SongTitleHit,
  type SongTitleView,
} from '~~/shared/song-titles.ts'

const titles = parseSongTitles(rawTitles)

/**
 * Song titles in the active language.
 * Japanese shows the Japanese title alone (plus the catalog name in gray when an alias replaced
 * it); Chinese and English show the translated title over the Japanese original.
 */
export const useSongTitle = () => {
  const { locale, showOriginalTitle } = useLocale()
  const { songById } = useSongLookup()
  const { japaneseTitle, aliasOthers, aliasTitles } = useSongAliases()

  /** Checked Chinese title even when another language shows; null when the file has no row. */
  const chineseTitle = (songId: number): string | null => songTitleFor(titles, songId)?.title ?? null

  /** Title shown in the active language, or null when neither the catalog nor a file has one. */
  const translationFor = (songId: number): string | null => {
    if (locale.value === 'zh') return chineseTitle(songId)
    if (locale.value === 'en') {
      const nameEn = songById(songId)?.name_en ?? ''
      return nameEn.trim() === '' ? null : nameEn
    }
    return null
  }

  /** Every spelling search may match: registered Japanese/English names, Chinese names, and `name_en`. */
  const spellings = (songId: number): string[] => {
    const nameEn = songById(songId)?.name_en ?? ''
    return [...aliasTitles(songId), ...songTitleSpellings(titles, songId), ...(nameEn === '' ? [] : [nameEn])]
  }

  /** Primary title, gray Japanese names, and other names of the active language. */
  const titleView = (songId: number, fallback: string): SongTitleView => {
    const song = songById(songId)
    return formatSongTitle(locale.value, {
      jaTitle: song === null ? fallback : japaneseTitle(song),
      catalogName: song?.name ?? fallback,
      translation: translationFor(songId),
      zhAliases: songTitleFor(titles, songId)?.aliases ?? [],
      originalAliases: aliasOthers(songId),
      nameEn: song?.name_en ?? null,
      zhTitle: chineseTitle(songId),
    }, { showOriginalTitle: showOriginalTitle.value })
  }

  /** Title view that also says which alias a search query matched. */
  const titleHit = (songId: number, fallback: string, query: string): SongTitleHit => {
    const song = songById(songId)
    return matchSongTitle(query, locale.value, {
      jaTitle: song === null ? fallback : japaneseTitle(song),
      catalogName: song?.name ?? fallback,
      translation: translationFor(songId),
      zhAliases: songTitleFor(titles, songId)?.aliases ?? [],
      originalAliases: aliasOthers(songId),
      nameEn: song?.name_en ?? null,
      zhTitle: chineseTitle(songId),
    }, { showOriginalTitle: showOriginalTitle.value })
  }

  /** Other names of the active language, shown under the title; empty hides the line. */
  const aliasesOf = (songId: number, fallback: string): string[] => titleView(songId, fallback).aliases

  /** Reactive copy so callers can `computed` over it. */
  const language = computed(() => locale.value)

  return { language, chineseTitle, translationFor, spellings, titleView, titleHit, aliasesOf }
}
