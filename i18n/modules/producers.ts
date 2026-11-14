import type { Locale } from '../../shared/i18n/locale.ts'

/**
 * UI messages for the `producers` feature area.
 * All supported locales sit side by side; the i18n-split Nuxt module
 * projects each locale into `i18n/locales/<locale>/producers.json`.
 */
export default {
  'producers.appearances': {
    zh: '出场记录',
    'zh-Hant': '出場記錄',
    ja: '出演記録',
    en: 'Appearances',
  },
  'producers.appearancesNote': {
    zh: '同一演出只列一行；「歌曲」是这位制作人在该演出中被表演的曲目',
    'zh-Hant': '同一演出只列一行；「歌曲」是這位製作人在該演出中被表演的曲目',
    ja: '同じ公演は 1 行だけ。「曲」はこのプロデューサーの曲のうち、その公演で演奏されたものです',
    en: 'One row per performance; "Songs" lists this producer’s songs played there',
  },
  'producers.breadcrumb': {
    zh: '制作人',
    'zh-Hant': '製作人',
    ja: 'プロデューサー',
    en: 'Producers',
  },
  'producers.creditedSongs': {
    zh: '{n} 首署名曲目',
    'zh-Hant': '{n} 首署名曲目',
    ja: '{n} 曲のクレジット',
    en: '{n} credited songs',
  },
  'producers.emptyDesc': {
    zh: '换一个更短的名字。',
    'zh-Hant': '換一個更短的名字。',
    ja: 'もっと短い名前で試してください。',
    en: 'Try a shorter name.',
  },
  'producers.emptyTitle': {
    zh: '没有符合条件的制作人',
    'zh-Hant': '沒有符合條件的製作人',
    ja: '条件に合うプロデューサーがありません',
    en: 'No producers match',
  },
  'producers.filter': {
    zh: '搜索制作人',
    'zh-Hant': '搜尋製作人',
    ja: 'プロデューサーを検索',
    en: 'Search producers',
  },
  'producers.heading1': {
    zh: '制作人',
    'zh-Hant': '製作人',
    ja: 'プロデューサー',
    en: 'Producer',
  },
  'producers.heading2': {
    zh: '排行榜',
    'zh-Hant': '排行榜',
    ja: 'ランキング',
    // Leading space: desktop joins heading1+heading2 without a break (`<br class="sm:hidden">`).
    en: ' ranking',
  },
  'producers.includeLabels': {
    zh: '包含厂牌 / 团体（{n}）',
    'zh-Hant': '包含廠牌 / 團體（{n}）',
    ja: 'レーベル・団体を含める（{n}）',
    en: 'Include labels / groups ({n})',
  },
  'producers.indexTitle': {
    zh: '制作人排行',
    'zh-Hant': '製作人排行',
    ja: 'プロデューサーランキング',
    en: 'Producer ranking',
  },
  'producers.kindLabel': {
    zh: '厂牌 / 团体',
    'zh-Hant': '廠牌 / 團體',
    ja: 'レーベル / 団体',
    en: 'Label / group',
  },
  'producers.kindSupport': {
    zh: '协作方',
    'zh-Hant': '協作方',
    ja: '協力',
    en: 'Contributor',
  },
  'producers.noAppearances': {
    zh: '没有出场记录',
    'zh-Hant': '沒有出場記錄',
    ja: '出演記録がありません',
    en: 'No appearances',
  },
  'producers.noAppearancesDesc': {
    zh: '这位制作人的署名曲目还没有出现在已收录的歌单里。',
    'zh-Hant': '這位製作人的署名曲目還沒有出現在已收錄的歌單裡。',
    ja: 'このプロデューサーのクレジット曲はまだ収録済みのセットリストに登場していません。',
    en: 'This producer’s credited songs have not appeared in a recorded setlist yet.',
  },
  'producers.noSongs': {
    zh: '没有署名曲目',
    'zh-Hant': '沒有署名曲目',
    ja: 'クレジット曲がありません',
    en: 'No credited songs',
  },
  'producers.noSongsDesc': {
    zh: '目录里没有这位制作人的署名。',
    'zh-Hant': '目錄裡沒有這位製作人的署名。',
    ja: 'カタログにこのプロデューサーのクレジットがありません。',
    en: 'The catalog has no credits for this producer.',
  },
  'producers.notFound': {
    zh: '找不到这位制作人',
    'zh-Hant': '找不到這位製作人',
    ja: 'このプロデューサーが見つかりません',
    en: 'Producer not found',
  },
  'producers.notFoundDesc': {
    zh: '这个名字不在已提交的目录里。',
    'zh-Hant': '這個名字不在已提交的目錄裡。',
    ja: 'この名前は登録済みのカタログにありません。',
    en: 'This name is not in the committed catalog.',
  },
  'producers.noteCounts': {
    zh: '「表演次数」按场次累计，「演出数」每场演出计一次，「场次」按天计数、日场 / 夜场分开。',
    'zh-Hant': '「表演次數」按場次累計，「演出數」每場演出計一次，「場次」按天計數、日場 / 夜場分開。',
    ja: '「演奏回数」は実施回の累計、「公演数」は公演ごとに 1 回、「実施回」は日ごとに昼 / 夜を分けて数えます。',
    en: '"Appearances" sums shows, "performances" counts each event once, and "shows" counts days with day and night shows separately.',
  },
  'producers.notePerformed': {
    zh: '「演出曲目」：其中至少上过一场演唱会的歌曲数；',
    'zh-Hant': '「演出曲目」：其中至少上過一場演唱會的歌曲數；',
    ja: '「公演曲」：そのうち少なくとも 1 回コンサートで演奏された曲数。',
    en: '"Performed songs": how many of those appeared in at least one concert.',
  },
  'producers.noteSongs': {
    zh: '「曲目数」：有署名的不同歌曲数，不同版本分别计数；',
    'zh-Hant': '「曲目數」：有署名的不同歌曲數，不同版本分別計數；',
    ja: '「曲数」：クレジットのある異なる楽曲数。バージョン違いは別々に数えます。',
    en: '"Songs": distinct credited songs, with each version counted separately.',
  },
  'producers.performedSongs': {
    zh: '{n} 首上过演唱会',
    'zh-Hant': '{n} 首上過演唱會',
    ja: '{n} 曲がコンサートで演奏済み',
    en: '{n} performed in concert',
  },
  'producers.roleArranger': {
    zh: '编曲',
    'zh-Hant': '編曲',
    ja: '編曲',
    en: 'Arranger',
  },
  'producers.roleComposer': {
    zh: '作曲',
    'zh-Hant': '作曲',
    ja: '作曲',
    en: 'Composer',
  },
  'producers.roleProducer': {
    zh: '制作',
    'zh-Hant': '製作',
    ja: 'プロデュース',
    en: 'Producer',
  },
  'producers.roleVoiceManipulator': {
    zh: '调声',
    'zh-Hant': '調聲',
    ja: '調声',
    en: 'Tuning',
  },
  'producers.roles': {
    zh: '署名角色',
    'zh-Hant': '署名角色',
    ja: '担当',
    en: 'Credited roles',
  },
  'producers.signedSongs': {
    zh: '署名曲目',
    'zh-Hant': '署名曲目',
    ja: 'クレジット曲',
    en: 'Credited songs',
  },
  'producers.signedSongsNote': {
    zh: '「场次」是该曲在演唱会中被表演的场次数',
    'zh-Hant': '「場次」是該曲在演唱會中被表演的場次數',
    ja: '「実施回」はこの曲がコンサートで演奏された回数です',
    en: '"Shows" is how many times the song was performed in concert',
  },
  'producers.tableTitle': {
    zh: '排行',
    'zh-Hant': '排行',
    ja: 'ランキング',
    en: 'Ranking',
  },
  'producers.viewRanking': {
    zh: '查看曲目排行',
    'zh-Hant': '檢視曲目排行',
    ja: '楽曲ランキングを見る',
    en: 'View song ranking',
  },
  'producers.yearSpan': {
    zh: '年份 {span}',
    'zh-Hant': '年份 {span}',
    ja: '年 {span}',
    en: 'Years {span}',
  },
} as const satisfies Record<string, Record<Locale, string>>
