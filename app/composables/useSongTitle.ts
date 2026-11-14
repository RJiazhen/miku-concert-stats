import { computed } from 'vue'
import { useLocale } from './useLocale.ts'
import { useSongAliases } from './useSongAliases.ts'
import { useSongLookup } from './useSongLookup.ts'
import rawTitles from '~~/data/song-titles.zh-CN.json'
import rawHantTitles from '~~/data/song-titles.zh-Hant.json'
import rawKoTitles from '~~/data/song-titles.ko.json'
import {
  formatSongTitle,
  matchSongTitle,
  parseSongTitles,
  songTitleFor,
  songTitleSpellings,
  type SongTitleEntry,
  type SongTitleHit,
  type SongTitleView,
} from '~~/shared/song-titles.ts'

const titles = parseSongTitles(rawTitles)
const hantTitles = parseSongTitles(rawHantTitles)
const koTitles = parseSongTitles(rawKoTitles)

/**
 * Song titles in the active language.
 * Japanese shows the Japanese title alone (plus the catalog name in gray when an alias replaced
 * it); Chinese, English, and sourced Korean show the translated title over the Japanese original.
 */
export const useSongTitle = () => {
  const { locale, showOriginalTitle } = useLocale()
  const { songById } = useSongLookup()
  const { japaneseTitle, aliasOthers, aliasTitles } = useSongAliases()

  /** Checked Simplified Chinese entry even when another language shows; null when the file has no row. */
  const chineseEntry = (songId: number): SongTitleEntry | null => songTitleFor(titles, songId)

  /** Checked Traditional Chinese entry, falling back to the Simplified row when it has none. */
  const hantEntry = (songId: number): SongTitleEntry | null => songTitleFor(hantTitles, songId) ?? chineseEntry(songId)

  /** Checked Korean entry; missing ids stay on the original catalog title. */
  const koreanEntry = (songId: number): SongTitleEntry | null => songTitleFor(koTitles, songId)

  /** Title shown in the active language, or null when neither the catalog nor a file has one. */
  const translationFor = (songId: number): string | null => {
    if (locale.value === 'zh') return chineseEntry(songId)?.title ?? null
    if (locale.value === 'zh-Hant') return hantEntry(songId)?.title ?? null
    if (locale.value === 'ko') return koreanEntry(songId)?.title ?? null
    if (locale.value === 'en') {
      const nameEn = songById(songId)?.name_en ?? ''
      return nameEn.trim() === '' ? null : nameEn
    }
    return null
  }

  /** Every spelling search may match: registered Japanese/English names, both Chinese titles, and `name_en`. */
  const spellings = (songId: number): string[] => {
    const nameEn = songById(songId)?.name_en ?? ''
    return [
      ...aliasTitles(songId),
      ...songTitleSpellings(titles, songId),
      ...songTitleSpellings(hantTitles, songId),
      ...songTitleSpellings(koTitles, songId),
      ...(nameEn === '' ? [] : [nameEn]),
    ]
  }

  /** Primary title, gray Japanese names, and other names of the active language. */
  const titleView = (songId: number, fallback: string): SongTitleView => {
    const song = songById(songId)
    return formatSongTitle(locale.value, {
      jaTitle: song === null ? fallback : japaneseTitle(song),
      catalogName: song?.name ?? fallback,
      translation: translationFor(songId),
      zhAliases: chineseEntry(songId)?.aliases ?? [],
      hantAliases: hantEntry(songId)?.aliases ?? [],
      originalAliases: aliasOthers(songId),
      nameEn: song?.name_en ?? null,
      zhTitle: chineseEntry(songId)?.title ?? null,
      hantTitle: hantEntry(songId)?.title ?? null,
      koTitle: koreanEntry(songId)?.title ?? null,
    }, { showOriginalTitle: showOriginalTitle.value })
  }

  /** Title view that also says which alias a search query matched. */
  const titleHit = (songId: number, fallback: string, query: string): SongTitleHit => {
    const song = songById(songId)
    return matchSongTitle(query, locale.value, {
      jaTitle: song === null ? fallback : japaneseTitle(song),
      catalogName: song?.name ?? fallback,
      translation: translationFor(songId),
      zhAliases: chineseEntry(songId)?.aliases ?? [],
      hantAliases: hantEntry(songId)?.aliases ?? [],
      originalAliases: aliasOthers(songId),
      nameEn: song?.name_en ?? null,
      zhTitle: chineseEntry(songId)?.title ?? null,
      hantTitle: hantEntry(songId)?.title ?? null,
      koTitle: koreanEntry(songId)?.title ?? null,
    }, { showOriginalTitle: showOriginalTitle.value })
  }

  /** Other names of the active language, shown under the title; empty hides the line. */
  const aliasesOf = (songId: number, fallback: string): string[] => titleView(songId, fallback).aliases

  /** Reactive copy so callers can `computed` over it. */
  const language = computed(() => locale.value)

  return { language, translationFor, spellings, titleView, titleHit, aliasesOf }
}
