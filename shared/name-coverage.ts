import { assignCharacters, type CharacterRule } from './characters.ts'
import type { SongAliasFile } from './song-aliases.ts'
import type { SongTitleFile } from './song-titles.ts'
import type { Catalog, SongCategory, SongRow } from './types.ts'

/** One song that still has no checked Chinese title, plus how often it was performed. */
export type UntranslatedSong = {
  id: number
  /** Japanese title the site shows: the alias title, else `name_ja`, else the catalog name. */
  title: string
  category: SongCategory
  /** Printed setlist appearances; 0 when the song was never performed. */
  appearances: number
}

/**
 * Why a vocalist token is not folded into a character.
 * `aggregated` is VocaDB's `feat. various` placeholder, `producer` also holds a producer-side
 * credit on some song, `synth-voice` is a voicebank that is not a character (e.g. AquesTalk),
 * and `unknown` needs a human decision — usually a human guest vocalist or a group.
 */
export type UnmatchedSingerKind = 'aggregated' | 'producer' | 'synth-voice' | 'unknown'

/** One vocalist token that no character rule matches, with the songs that credit it. */
export type UnmatchedSinger = {
  token: string
  kind: UnmatchedSingerKind
  songs: { id: number; title: string }[]
}

/** Chinese-title and character-rule coverage of the catalog. */
export type NameCoverage = {
  songs: number
  /** Songs with a row in `data/song-titles.zh-CN.json`. */
  translated: number
  /** Songs with a row in `data/song-titles.zh-Hant.json`. */
  translatedHant: number
  untranslatedPerformed: UntranslatedSong[]
  untranslatedNeverPerformed: UntranslatedSong[]
  unmatched: UnmatchedSinger[]
}

/** Options for {@link buildNameCoverage}. */
export type NameCoverageInput = {
  catalog: Catalog
  characterRules: readonly CharacterRule[]
  zhTitles: SongTitleFile
  hantTitles: SongTitleFile
  songAliases: SongAliasFile
}

/** Title the site shows for a song: the alias file first, then `name_ja`, then `name`. */
const displayTitle = (song: SongRow, aliases: SongAliasFile): string => {
  return aliases[String(song.id)]?.title ?? song.name_ja ?? song.name
}

/** Counts printed setlist appearances per song id. */
const appearanceCounts = (catalog: Catalog): Map<number, number> => {
  const counts = new Map<number, number>()
  for (const row of catalog.setlistItemSongs) {
    counts.set(row.song_id, (counts.get(row.song_id) ?? 0) + 1)
  }
  return counts
}

/** Producer-side names on every song, used to explain a vocalist token that is really a producer. */
const producerNames = (songs: readonly SongRow[]): Set<string> => {
  const names = new Set<string>()
  for (const song of songs) {
    for (const credit of song.producers ?? []) names.add(credit.name)
  }
  return names
}

/** Decides why an unmatched vocalist token was not folded into a character. */
const classifyToken = (token: string, producers: ReadonlySet<string>): UnmatchedSingerKind => {
  if (/^various$/i.test(token.trim())) return 'aggregated'
  if (/AquesTalk/i.test(token)) return 'synth-voice'
  if (producers.has(token)) return 'producer'
  return 'unknown'
}

/**
 * Builds the coverage worklist for `data/song-titles.zh-CN.json` and `data/characters.json`.
 * Songs without a Chinese title are split by whether a printed setlist ever performed them,
 * so the first rows are the ones readers actually see. Unmatched vocalist tokens keep every
 * song that credits them, which is what a reviewer needs to decide a merge.
 */
export const buildNameCoverage = (input: NameCoverageInput): NameCoverage => {
  const appearances = appearanceCounts(input.catalog)
  const producers = producerNames(input.catalog.songs)
  const untranslated: UntranslatedSong[] = []
  const tokens = new Map<string, { id: number; title: string }[]>()

  for (const song of input.catalog.songs) {
    const title = displayTitle(song, input.songAliases)
    if (!(String(song.id) in input.zhTitles)) {
      untranslated.push({ id: song.id, title, category: song.category, appearances: appearances.get(song.id) ?? 0 })
    }
    const assignment = assignCharacters(input.characterRules, {
      vocalists: song.vocalists ?? null,
      artistString: song.artist_string,
    })
    for (const token of assignment.unmatched) {
      if (!tokens.has(token)) tokens.set(token, [])
      tokens.get(token)!.push({ id: song.id, title })
    }
  }

  /** Performed songs first, then by appearance count; ties keep catalog id order. */
  const byPriority = (left: UntranslatedSong, right: UntranslatedSong): number => {
    if (left.appearances !== right.appearances) return right.appearances - left.appearances
    return left.id - right.id
  }
  const unmatched = [...tokens.entries()]
    .map(([token, songs]) => ({
      token,
      kind: classifyToken(token, producers),
      songs: songs.sort((left, right) => left.id - right.id),
    }))
    .sort((left, right) => right.songs.length - left.songs.length || (left.token < right.token ? -1 : left.token > right.token ? 1 : 0))

  return {
    songs: input.catalog.songs.length,
    translated: Object.keys(input.zhTitles).length,
    translatedHant: Object.keys(input.hantTitles).length,
    untranslatedPerformed: untranslated.filter((song) => song.appearances > 0).sort(byPriority),
    untranslatedNeverPerformed: untranslated.filter((song) => song.appearances === 0).sort(byPriority),
    unmatched,
  }
}

/** Percent of the catalog that has a Chinese title, one decimal. */
export const coveragePercent = (coverage: NameCoverage): string => {
  if (coverage.songs === 0) return '0.0'
  return ((coverage.translated / coverage.songs) * 100).toFixed(1)
}

/** How a token kind reads in the report. */
const kindLabel = (kind: UnmatchedSingerKind): string => {
  if (kind === 'aggregated') return '`feat. various` 占位，缺真实名单'
  if (kind === 'producer') return '同时是制作人署名'
  if (kind === 'synth-voice') return '非角色的合成音源'
  return '待人工判断（多为真人歌手或团体）'
}

/** Renders the local worklist `tmp/name-coverage.md`. Deterministic: no dates, so two runs match. */
export const renderNameCoverage = (coverage: NameCoverage): string => {
  const latin = (song: UntranslatedSong): boolean => !/[\u3040-\u30ff\u4e00-\u9fff]/.test(song.title)
  const kana = (song: UntranslatedSong): boolean => /[\u3040-\u30ff]/.test(song.title)
  const performedKana = coverage.untranslatedPerformed.filter(kana)
  const performedKanji = coverage.untranslatedPerformed.filter((song) => !latin(song) && !kana(song))
  const performedLatin = coverage.untranslatedPerformed.filter(latin)
  const lines: string[] = []
  lines.push('# 中文名与角色映射覆盖')
  lines.push('')
  lines.push('由 `pnpm report:names` 从已提交的 `data/` 生成，输出到 `tmp/name-coverage.md`（不进仓库）。')
  lines.push('用来跟踪 [#5](https://github.com/RJiazhen/miku-concert-stats/issues/5)：补完 `data/song-titles.zh-CN.json` 或 `data/characters.json` 后重新生成。')
  lines.push('')
  lines.push('## 总览')
  lines.push('')
  lines.push('| 项目 | 数量 |')
  lines.push('| --- | --- |')
  lines.push(`| 目录歌曲 | ${coverage.songs} |`)
  lines.push(`| 已登记简体中文名 | ${coverage.translated}（${coveragePercent(coverage)}%） |`)
  lines.push(`| 已登记繁体中文名 | ${coverage.translatedHant} |`)
  lines.push(`| 未登记中文名的演出曲目 | ${coverage.untranslatedPerformed.length}（含假名 ${performedKana.length}、汉字同名 ${performedKanji.length}、拉丁字母 ${performedLatin.length}） |`)
  lines.push(`| 未登记中文名的未演出曲目 | ${coverage.untranslatedNeverPerformed.length} |`)
  lines.push(`| 没有角色规则匹配的歌手写法 | ${coverage.unmatched.length} |`)
  lines.push('')
  lines.push('拉丁字母标题不必翻译（`Tell Your World`、`Just Be Friends` 之类直接沿用原名）；')
  lines.push('汉字标题多为中日同形（`劣等上等`、`炉心融解`、`深海少女`），按规则不登记，登记只会虚增条数。')
  lines.push('真正要找译名的是「含假名」那一节，其次是拉丁标题里确实有通行中文译名的少数几首。精确数字与逐首清单用 `pnpm report:names` 生成到 `tmp/name-coverage.md`（本地临时文件，不进仓库）。')
  lines.push('')
  lines.push('## 含假名、演出过、还没有中文名')
  lines.push('')
  lines.push('| 场次次数 | song id | 日文标题 | 类别 |')
  lines.push('| --- | --- | --- | --- |')
  for (const song of performedKana) {
    lines.push(`| ${song.appearances} | ${song.id} | ${song.title} | ${song.category} |`)
  }
  lines.push('')
  lines.push('## 汉字标题、演出过、还没有中文名')
  lines.push('')
  lines.push('中日写法相同或只差简繁，按 `.cursor/skills/update-concert-data` 的规则不登记；若要补译名或别名，先确认百科有不同写法。')
  lines.push('')
  lines.push('| 场次次数 | song id | 标题 | 类别 |')
  lines.push('| --- | --- | --- | --- |')
  for (const song of performedKanji) {
    lines.push(`| ${song.appearances} | ${song.id} | ${song.title} | ${song.category} |`)
  }
  lines.push('')
  lines.push('## 拉丁字母标题、演出过、还没有中文名')
  lines.push('')
  lines.push('按站内规则直接沿用原名即可；列在这里只为了说明覆盖缺口不是漏查。')
  lines.push('')
  lines.push('| 场次次数 | song id | 标题 |')
  lines.push('| --- | --- | --- |')
  for (const song of performedLatin) {
    lines.push(`| ${song.appearances} | ${song.id} | ${song.title} |`)
  }
  lines.push('')
  lines.push('## 从未演出、还没有中文名的曲目')
  lines.push('')
  lines.push('| song id | 标题 | 类别 |')
  lines.push('| --- | --- | --- |')
  for (const song of coverage.untranslatedNeverPerformed) {
    lines.push(`| ${song.id} | ${song.title} | ${song.category} |`)
  }
  lines.push('')
  lines.push('## 没有匹配到角色的歌手写法')
  lines.push('')
  lines.push('| 出现歌曲数 | 写法 | 判断 | song id |')
  lines.push('| --- | --- | --- | --- |')
  for (const singer of coverage.unmatched) {
    const ids = singer.songs.map((song) => song.id).join(', ')
    lines.push(`| ${singer.songs.length} | ${singer.token} | ${kindLabel(singer.kind)} | ${ids} |`)
  }
  lines.push('')
  lines.push('`feat. various` 是 VocaDB 把整组歌手折叠成一个词，不是角色；要补真实名单得改 `song_vocalists`。')
  lines.push('其余写法是真人歌手、乐队、制作人（VocaDB 同时把他标成 Vocalist）或非角色的合成音源，')
  lines.push('不套用角色规则是正确的。复查结论记在 `docs/data-issues.md`。')
  lines.push('')
  return lines.join('\n')
}
