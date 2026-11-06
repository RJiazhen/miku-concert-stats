import { isUnknownArtist, producerCredit } from './credit.ts'
import { fromVocaDB } from './repertoire.ts'
import type { Catalog, SongRow } from './types.ts'

/**
 * How a song's structured producer roster (`song_producers`, from VocaDB `fields=Artists`)
 * relates to the free-text credit in `songs.artist_string`.
 *
 * The structured roster is authoritative. The free-text string is only a fallback for songs
 * VocaDB records no producer for, so every non-`agree` value is a disagreement the maintainer
 * must confirm rather than something the code may resolve silently.
 */
export type ProducerConflictCategory =
  | 'agree'
  | 'structured-only'
  | 'extra-in-text'
  | 'extra-in-structured'
  | 'conflicting'

/** One structured producer shown with the evidence stored in `song_producers.roles`. */
export type ProducerConflictCredit = {
  /** Display name after de-duplication; VocaDB placeholders are already dropped. */
  name: string
  /** Lower-cased evidence, e.g. `producer, composer`. */
  roles: string
}

/** One song's producer-source comparison. */
export type ProducerConflictRow = {
  songId: number
  name: string
  /** `songs.song_type`, e.g. `Original` / `Remix`. */
  songType: string
  category: ProducerConflictCategory
  /** Structured names with their roles evidence, in catalog order. */
  structured: ProducerConflictCredit[]
  /** Producer names parsed from the free-text `artist_string`. */
  text: string[]
  /** Free-text names the structured roster does not have. */
  onlyInText: string[]
  /** Structured names the free text does not have. */
  onlyInStructured: string[]
}

/** Classified songs plus the per-category counts the report prints. */
export type ProducerConflictReport = {
  /** Every classified song, severity first and then song id. */
  rows: ProducerConflictRow[]
  /** Count per category, including `agree`; every key is present. */
  counts: Record<ProducerConflictCategory, number>
  /** Songs where neither source names a producer; deliberately not classified. */
  ignoredCount: number
}

/** Chinese label for each category, shared by the report sections and the summary table. */
export const PRODUCER_CONFLICT_LABELS: Record<ProducerConflictCategory, string> = {
  conflicting: '双方各有对方没有的制作人',
  'extra-in-text': '自由文本多出制作人',
  'extra-in-structured': '结构化多出制作人',
  'structured-only': '只有结构化署名',
  agree: '两边一致',
}

/** Short explanation of each category for the summary table. */
const CATEGORY_MEANINGS: Record<ProducerConflictCategory, string> = {
  conflicting: '两边都有自己的名字，任何一边都不是另一边的子集',
  'extra-in-text': '自由文本给出结构化名单没有的名字（Publisher、社团、厂牌等常落在这里）',
  'extra-in-structured': '结构化名单比自由文本多出名字，自由文本只覆盖了一部分',
  'structured-only': '歌曲条目有结构化署名，自由文本没有给出任何制作人',
  agree: '两边解析出的名字集合相同',
}

/**
 * Severity order used by the report and the row sort.
 * `conflicting` is the most serious because both sources claim a name the other lacks.
 */
const CATEGORY_ORDER: readonly ProducerConflictCategory[] = [
  'conflicting',
  'extra-in-text',
  'extra-in-structured',
  'structured-only',
  'agree',
]

/** Categories printed as their own section; `agree` only appears in the summary table. */
const PRINTED_CATEGORIES = CATEGORY_ORDER.filter((category) => category !== 'agree')

/**
 * Structured producer names from `song_producers`, de-duplicated by name and paired with the
 * merged `roles` evidence, in first-seen order. Placeholder names are dropped so a VocaDB
 * `Unknown producer(s)` row cannot create a fake conflict.
 */
const structuredCredits = (song: SongRow): ProducerConflictCredit[] => {
  const rolesByName = new Map<string, Set<string>>()
  for (const credit of song.producers ?? []) {
    const name = credit.name.trim()
    if (name === '' || isUnknownArtist(name)) continue
    const roles = rolesByName.get(name) ?? new Set<string>()
    for (const role of credit.roles.split(',')) {
      const token = role.trim()
      if (token !== '') roles.add(token)
    }
    rolesByName.set(name, roles)
  }
  return [...rolesByName].map(([name, roles]) => ({ name, roles: [...roles].join(', ') }))
}

/**
 * Producer names parsed from the free-text `artist_string`, de-duplicated in source order.
 * `producerCredit` already strips the `feat.` segment and VocaDB's unnamed placeholders.
 */
const freeTextNames = (song: SongRow): string[] => {
  const credit = producerCredit(song.artist_string)
  if (credit === null) return []
  return [
    ...new Set(
      credit
        .split(', ')
        .map((name) => name.trim())
        .filter((name) => name !== '' && !isUnknownArtist(name)),
    ),
  ]
}

/**
 * Classifies one song from both name sets.
 * Returns null when neither side names a producer, which the report ignores entirely.
 */
const classify = (structured: readonly string[], text: readonly string[]): ProducerConflictCategory | null => {
  if (structured.length === 0 && text.length === 0) return null
  const structuredSet = new Set(structured)
  const textSet = new Set(text)
  const onlyInText = text.filter((name) => !structuredSet.has(name))
  const onlyInStructured = structured.filter((name) => !textSet.has(name))
  if (text.length === 0) return 'structured-only'
  if (structured.length === 0) return 'extra-in-text'
  if (onlyInText.length === 0 && onlyInStructured.length === 0) return 'agree'
  if (onlyInStructured.length === 0) return 'extra-in-text'
  if (onlyInText.length === 0) return 'extra-in-structured'
  return 'conflicting'
}

/**
 * Builds one comparison row, or null when neither source names a producer.
 * A wiki-registered row has no VocaDB credit pair to compare, so it is skipped.
 */
const rowForSong = (song: SongRow): ProducerConflictRow | null => {
  if (!fromVocaDB(song)) return null
  const structured = structuredCredits(song)
  const text = freeTextNames(song)
  const structuredNames = structured.map((credit) => credit.name)
  const category = classify(structuredNames, text)
  if (category === null) return null
  const structuredSet = new Set(structuredNames)
  const textSet = new Set(text)
  return {
    songId: song.id,
    name: song.name,
    songType: song.song_type,
    category,
    structured,
    text,
    onlyInText: text.filter((name) => !structuredSet.has(name)),
    onlyInStructured: structuredNames.filter((name) => !textSet.has(name)),
  }
}

/**
 * Compares every song's structured producer roster with its free-text credit.
 *
 * Songs are ordered by conflict severity first (`conflicting`, `extra-in-text`,
 * `extra-in-structured`, `structured-only`, `agree`) and then by song id, so the report is
 * stable across runs. Songs where neither source names a producer are counted in
 * `ignoredCount` but produce no row.
 */
export const buildProducerConflictReport = (catalog: Pick<Catalog, 'songs'>): ProducerConflictReport => {
  const rows: ProducerConflictRow[] = []
  let ignoredCount = 0
  for (const song of catalog.songs) {
    const row = rowForSong(song)
    if (row === null) {
      ignoredCount++
      continue
    }
    rows.push(row)
  }
  rows.sort((left, right) => {
    const severity = CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category)
    if (severity !== 0) return severity
    return left.songId - right.songId
  })
  const counts = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, 0])) as Record<
    ProducerConflictCategory,
    number
  >
  for (const row of rows) counts[row.category]++
  return { rows, counts, ignoredCount }
}

/** Wraps one producer name in inline code so punctuation in names stays literal. */
const code = (name: string): string => `\`${name}\``

/** Joins producer names for display, escaping each name for inline Markdown. */
const nameList = (names: readonly string[]): string => (names.length === 0 ? '（无）' : names.map(code).join('、'))

/** Formats the structured roster with its evidence, e.g. `` `kz`（producer, composer） ``. */
const structuredList = (credits: readonly ProducerConflictCredit[]): string => {
  if (credits.length === 0) return '（无）'
  return credits.map((credit) => `${code(credit.name)}（${credit.roles}）`).join('、')
}

/** Writes the precise difference between the two name sets for one row. */
const differenceText = (row: ProducerConflictRow): string => {
  const parts: string[] = []
  if (row.category === 'structured-only') parts.push('自由文本没有制作人署名')
  if (row.onlyInText.length > 0) parts.push(`自由文本多出 ${nameList(row.onlyInText)}`)
  if (row.onlyInStructured.length > 0) parts.push(`结构化多出 ${nameList(row.onlyInStructured)}`)
  if (row.category === 'extra-in-text' && row.structured.length === 0) {
    parts.push('结构化名单为空，按规则 ② 用自由文本作为回退')
  }
  return parts.length === 0 ? '没有差异' : parts.join('；')
}

/** Renders one song bullet for a category section. */
const rowBullet = (row: ProducerConflictRow): string => {
  const heading = `- **${row.name}**（[vocadb.net/S/${row.songId}](https://vocadb.net/S/${row.songId})，${code(row.songType)}）`
  return [
    heading,
    `  - 结构化（\`song_producers\`）：${structuredList(row.structured)}`,
    `  - 自由文本（\`artist_string\`）：${nameList(row.text)}`,
    `  - 差异：${differenceText(row)}`,
  ].join('\n')
}

/** Suggested action per category; every printed section carries one. */
const HANDLING: Record<Exclude<ProducerConflictCategory, 'agree'>, string> = {
  conflicting:
    '如何处理：显示仍以结构化名单为准；两边各自独有的名字都要先请维护者确认是不是制作人，确认后再改 VocaDB 或本仓库数据，不要为了消除冲突直接改 `artist_string`。',
  'extra-in-text':
    '如何处理：显示仍以结构化名单为准；自由文本多出的名字通常是 Publisher、社团或厂牌署名，请维护者确认不是制作人，必要时修正 VocaDB 的歌曲署名，而不是改本报告的结论。',
  'extra-in-structured':
    '如何处理：显示仍以结构化名单为准；结构化多出的名字来自 VocaDB 的制作侧职务，属于补全，不用改自由文本。',
  'structured-only':
    '如何处理：歌曲条目已有结构化署名，自由文本没有可回退的内容；显示结构化名单即可，不用改任何数据。',
}

/**
 * Renders the committed Chinese Markdown report: the rule, a summary table of counts, then one
 * section per non-`agree` category. Each row carries the structured names with `roles`
 * evidence, the free-text names, and the precise difference. The report is generated — never
 * edit it by hand; run `pnpm report:producers`.
 */
export const renderProducerConflictMarkdown = (report: ProducerConflictReport): string => {
  const header = [
    '# 制作人署名冲突报告',
    '',
    '本文件由 `pnpm report:producers` 生成，请勿手工编辑；重新生成用 `pnpm report:producers`，CI 用 `pnpm report:producers --check` 校验已提交的版本是否过期。',
    '数据来自已提交的 VocaDB 增量 SQL。',
    '',
    '## 规则',
    '',
    '1. 歌曲条目里的制作人名单（`song_producers`，来自 VocaDB `fields=Artists`）为准。',
    '2. 仅当歌曲条目没有任何制作人记录时，才用 `artist_string`（歌单里显示的署名）解析。',
    '3. 两者冲突时显示仍按 ①，同时把冲突写进本报告，人工确认后才改。',
    '',
    '结构化名单只收录制作侧职务：`Producer` 类别，以及 `Composer` / `Arranger` / `VoiceManipulator` 角色。',
    'Publisher、Illustrator、Animator、Lyricist、Mixer、Mastering、Instrumentalist，以及只有 Label / Circle 的署名都不算制作人。',
    '',
    '## 总览',
    '',
    '| 分类 | 歌曲数 | 含义 |',
    '| --- | --- | --- |',
    ...CATEGORY_ORDER.map(
      (category) =>
        `| ${PRODUCER_CONFLICT_LABELS[category]} | ${report.counts[category]} | ${CATEGORY_MEANINGS[category]} |`,
    ),
    '',
    `另有 ${report.ignoredCount} 首歌两边都没有制作人署名，未分类。`,
    '',
  ]
  const sections = PRINTED_CATEGORIES.flatMap((category) => {
    const rows = report.rows.filter((row) => row.category === category)
    const heading = `## ${PRODUCER_CONFLICT_LABELS[category]}（${report.counts[category]} 首）`
    const handling = HANDLING[category as Exclude<ProducerConflictCategory, 'agree'>]
    if (rows.length === 0) return [heading, '', handling, '', '没有这类歌曲。', '']
    return [heading, '', handling, '', ...rows.map(rowBullet), '']
  })
  return [...header, ...sections].join('\n')
}
