import type { Locale } from '../../shared/i18n/locale.ts'

/**
 * UI messages for the `rank` feature area.
 * All supported locales sit side by side; the i18n-split Nuxt module
 * projects each locale into `i18n/locales/<locale>/rank.json`.
 */
export default {
  'rank.allCharacters': {
    zh: '全部角色',
    'zh-Hant': '全部角色',
    ja: 'すべてのキャラクター',
    en: 'All characters',
  },
  'rank.allProducers': {
    zh: '全部制作人',
    'zh-Hant': '全部製作人',
    ja: 'すべてのプロデューサー',
    en: 'All producers',
  },
  'rank.approximateTitle': {
    zh: '以下演出尚未确认具体表演场次数：',
    'zh-Hant': '以下演出尚未確認具體表演場次數：',
    ja: '次の公演は実施回数が未確認です：',
    en: 'These performances have an unconfirmed number of shows:',
  },
  'rank.broadcast': {
    zh: '计入配信 / 线上 / VR',
    'zh-Hant': '計入配信 / 線上 / VR',
    ja: '配信 / オンライン / VR を含む',
    en: 'Include streamed / online / VR',
  },
  'rank.characters': {
    zh: '角色',
    'zh-Hant': '角色',
    ja: 'キャラクター',
    en: 'Characters',
  },
  'rank.clearSearch': {
    zh: '清除搜索筛选',
    'zh-Hant': '清除搜尋篩選',
    ja: '検索条件を解除',
    en: 'Clear search filter',
  },
  'rank.emptyDesc': {
    zh: '放宽年份与系列筛选。',
    'zh-Hant': '放寬年份與系列篩選。',
    ja: '年とシリーズの条件を広げてください。',
    en: 'Loosen the year and series filters.',
  },
  'rank.emptyTitle': {
    zh: '没有符合条件的歌曲',
    'zh-Hant': '沒有符合條件的歌曲',
    ja: '条件に合う楽曲がありません',
    en: 'No songs match these filters',
  },
  'rank.fromYear': {
    zh: '起始年',
    'zh-Hant': '起始年',
    ja: '開始年',
    en: 'From year',
  },
  'rank.heading1': {
    zh: '初音未来演唱会',
    'zh-Hant': '初音未來演唱會',
    ja: '初音ミク コンサート',
    en: 'Hatsune Miku concert',
  },
  'rank.heading2': {
    zh: '曲目统计',
    'zh-Hant': '曲目統計',
    ja: '楽曲統計',
    // Leading space: desktop joins heading1+heading2 without a break (`<br class="sm:hidden">`).
    en: ' song statistics',
  },
  'rank.medley': {
    zh: '计入串烧组成',
    'zh-Hant': '計入串燒組成',
    ja: 'メドレーの構成曲を含む',
    en: 'Include medley parts',
  },
  'rank.mergedInto': {
    zh: '并入：{names}',
    'zh-Hant': '併入：{names}',
    ja: '統合：{names}',
    en: 'Merged: {names}',
  },
  'rank.modeEvent': {
    zh: '按演出',
    'zh-Hant': '按演出',
    ja: '公演数',
    en: 'By performance',
  },
  'rank.modeShow': {
    zh: '按场次',
    'zh-Hant': '按場次',
    ja: '公演回数',
    en: 'By show',
  },
  'rank.notePerformances': {
    zh: '「演出数」：每次演出计为一次，单次演出包含多场实际表演也只计为一次；',
    'zh-Hant': '「演出數」：每次演出計為一次，單次演出包含多場實際表演也只計為一次；',
    ja: '「公演数」：公演ごとに 1 回。1 公演に複数の実施回があっても 1 回です。',
    en: '"Performances": each performance counts once even when it covers several shows.',
  },
  'rank.noteShows': {
    zh: '「场次数」：每场实际表演计为一次，同一天的日夜场都各自计为一次；',
    'zh-Hant': '「場次數」：每場實際表演計為一次，同一天的日夜場都各自計為一次；',
    ja: '「公演回数」：実際の公演ごとに 1 回。同じ日の昼公演・夜公演もそれぞれ 1 回と数えます。',
    en: '"Shows": each actual performance counts once, so a day show and a night show on the same day count separately.',
  },
  'rank.noteVersions': {
    zh: '「含 N 个版本」：表示包括原版与 remix、不同声库或翻唱版本共 N 个版本，全部合并计数。',
    'zh-Hant': '「含 N 個版本」：表示包括原版與 remix、不同聲庫或翻唱版本共 N 個版本，全部合併計數。',
    ja: '「{n} バージョンを含む」：原曲とリミックス・別音源・カバーを合わせた数で、まとめて集計します。',
    en: '"Includes N versions": the original plus remixes, alternate voicebanks, and covers, counted as one song.',
  },
  'rank.producer': {
    zh: '制作人',
    'zh-Hant': '製作人',
    ja: 'プロデューサー',
    en: 'Producers',
  },
  'rank.searchChip': {
    zh: '搜索：{query}',
    'zh-Hant': '搜尋：{query}',
    ja: '検索：{query}',
    en: 'Search: {query}',
  },
  'rank.tableTitle': {
    zh: '排行',
    'zh-Hant': '排行',
    ja: 'ランキング',
    en: 'Ranking',
  },
  'rank.title': {
    zh: '曲目排行',
    'zh-Hant': '曲目排行',
    ja: '楽曲ランキング',
    en: 'Song ranking',
  },
  'rank.toYear': {
    zh: '结束年',
    'zh-Hant': '結束年',
    ja: '終了年',
    en: 'To year',
  },
  'rank.versionsBadge': {
    zh: '含 {n} 个版本',
    'zh-Hant': '含 {n} 個版本',
    ja: '{n} バージョンを含む',
    en: 'Includes {n} versions',
  },
} as const satisfies Record<string, Record<Locale, string>>
