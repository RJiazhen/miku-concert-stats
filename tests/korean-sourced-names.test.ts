import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseSongTitles, songTitleFor, formatSongTitle } from '../shared/song-titles.ts'
import { nameIn, parseNameMaps } from '../shared/name-map.ts'
import { localizeCharacterName, parseCharacterNames } from '../shared/character-names.ts'

const readJson = (relative: string): unknown =>
  JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'))

const titlesKo = parseSongTitles(readJson('../data/song-titles.ko.json'))
const charactersKo = parseCharacterNames({
  zh: {},
  ko: readJson('../data/characters.ko.json'),
})
const acceptedSongs = readJson('../docs/research/korean-names/songs-korean-accepted.json') as {
  items: Array<{
    catalog_id: number
    recommended_title: string
    source_url: string
    api_url: string
    source_field: string
    source: string
    official: boolean
  }>
}
const excludedSongs = readJson('../docs/research/korean-names/songs-korean-excluded-ambiguous.json') as {
  items: Array<{ catalog_id: number }>
}
const researchedCharacters = readJson('../docs/research/korean-names/characters-korean.json') as {
  items: Array<{
    canonical_id: string
    recommended_korean_display: string | null
  }>
}

describe('sourced Korean song titles', () => {
  it('loads exactly the 51 live-verified community aliases, with a page and API URL on each row', () => {
    const ids = Object.keys(titlesKo)
    expect(ids).toHaveLength(51)
    expect(ids).not.toContain('8241')
    for (const item of acceptedSongs.items) {
      const entry = songTitleFor(titlesKo, item.catalog_id)
      expect(entry).not.toBeNull()
      expect(entry!.title).toBe(item.recommended_title)
      expect(entry!.source).toBe('vocadb-community-alias')
      expect(item.official).toBe(false)
      expect(item.source).toBe('vocadb-community-alias')
      expect(entry!.comment).toContain(item.source_url)
      expect(entry!.comment).toContain(item.api_url)
      expect(item.source_field).toMatch(/names\[\]/)
    }
    expect(acceptedSongs.items).toHaveLength(51)
  })

  it('keeps variant qualifiers in the sourced title instead of shortening them', () => {
    expect(songTitleFor(titlesKo, 8215)?.title).toBe('하츠네 미쿠의 격창 (LONG VERSION)')
    expect(songTitleFor(titlesKo, 630477)?.title).toBe('비너스 (short)')
  })

  it('shows a sourced Korean title and falls back to the original for unsourced or excluded songs', () => {
    const sourced = formatSongTitle('ko', {
      jaTitle: '裏表ラバーズ',
      translation: songTitleFor(titlesKo, 1508)?.title ?? null,
      zhTitle: '里外恋人',
      nameEn: 'Ura-Omote Lovers',
    })
    expect(sourced.primary).toBe('겉과 속의 러버즈')
    expect(sourced.originalNames).toContain('裏表ラバーズ')

    const unsourced = formatSongTitle('ko', {
      jaTitle: 'メルト',
      translation: songTitleFor(titlesKo, 1322)?.title ?? null,
      zhTitle: '融化',
      nameEn: 'Melt',
    })
    expect(songTitleFor(titlesKo, 1322)).toBeNull()
    expect(unsourced.primary).toBe('メルト')
    expect(unsourced.originalNames).toEqual([])

    const excluded = excludedSongs.items.find((item) => item.catalog_id === 8241)
    expect(excluded).toBeDefined()
    expect(songTitleFor(titlesKo, 8241)).toBeNull()
    const ambiguous = formatSongTitle('ko', {
      jaTitle: '番凩',
      translation: songTitleFor(titlesKo, 8241)?.title ?? null,
    })
    expect(ambiguous.primary).toBe('番凩')
  })
})

describe('sourced Korean character labels', () => {
  it('uses the seven sourced labels and keeps original or unresolved names on the catalog spelling', () => {
    const expected: Record<string, string> = {
      初音ミク: '하츠네 미쿠',
      鏡音リン: '카가미네 린',
      鏡音レン: '카가미네 렌',
      SeeU: '시유',
      重音テト: '카사네 테토',
      可不: '카후',
      星界: '세카이',
    }
    expect(Object.keys(charactersKo.ko)).toHaveLength(7)
    expect(charactersKo.ko).toEqual(expected)
    for (const [name, label] of Object.entries(expected)) {
      expect(localizeCharacterName(charactersKo, name, 'ko')).toBe(label)
    }

    expect(charactersKo.ko['巡音ルカ']).toBeUndefined()
    expect(localizeCharacterName(charactersKo, '巡音ルカ', 'ko')).toBe('巡音ルカ')
    expect(localizeCharacterName(charactersKo, 'MEIKO', 'ko')).toBe('MEIKO')
    expect(localizeCharacterName(charactersKo, '音街ウナ', 'ko')).toBe('音街ウナ')

    const recommended = researchedCharacters.items.filter((item) => item.recommended_korean_display !== null)
    const unresolved = researchedCharacters.items.filter((item) => item.canonical_id === '巡音ルカ')
    const kept = researchedCharacters.items.filter(
      (item) => item.recommended_korean_display === null && item.canonical_id !== '巡音ルカ',
    )
    expect(recommended).toHaveLength(7)
    expect(unresolved).toHaveLength(1)
    expect(kept).toHaveLength(14)
    for (const item of recommended) {
      expect(charactersKo.ko[item.canonical_id]).toBe(item.recommended_korean_display)
    }
    for (const item of [...unresolved, ...kept]) {
      expect(charactersKo.ko[item.canonical_id]).toBeUndefined()
    }
  })

  it('does not take Chinese or English names as Korean stand-ins when no Korean row exists', () => {
    const maps = parseNameMaps({
      zh: { 巡音ルカ: '巡音流歌' },
      'zh-Hant': { 巡音ルカ: '巡音流歌' },
      en: { 巡音ルカ: 'Megurine Luka' },
    }, 'Character name')
    expect(nameIn(maps, '巡音ルカ', 'zh')).toBe('巡音流歌')
    expect(nameIn(maps, '巡音ルカ', 'en')).toBe('Megurine Luka')
    expect(nameIn(maps, '巡音ルカ', 'ko')).toBeNull()
    expect(nameIn(maps, '初音ミク', 'ko')).toBeNull()
  })

  it('reads a sourced Korean character row from the name map', () => {
    expect(nameIn(charactersKo, '初音ミク', 'ko')).toBe('하츠네 미쿠')
    expect(nameIn(charactersKo, '初音ミク', 'ja')).toBeNull()
  })
})
