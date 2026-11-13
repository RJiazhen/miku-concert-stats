import type { Locale } from '../../shared/i18n/locale.ts'

/**
 * UI messages for the `search` feature area.
 * All supported locales sit side by side; the i18n-split Nuxt module
 * projects each locale into `i18n/locales/<locale>/search.json`.
 */
export default {
  'search.aria': {
    zh: '站内搜索',
    'zh-Hant': '站內搜尋',
    ja: 'サイト内検索',
    en: 'Site search',
  },
  'search.ariaPage': {
    zh: '搜索站内内容',
    'zh-Hant': '搜尋站內內容',
    ja: 'サイト内を検索',
    en: 'Search this site',
  },
  'search.close': {
    zh: '关闭搜索',
    'zh-Hant': '關閉搜尋',
    ja: '検索を閉じる',
    en: 'Close search',
  },
  'search.noMatch': {
    zh: '没有找到，试试更短的名称。',
    'zh-Hant': '沒有找到，試試更短的名稱。',
    ja: '見つかりません。短い名前で試してください。',
    en: 'No matches. Try a shorter name.',
  },
  'search.notFound': {
    zh: '没有找到「{query}」',
    'zh-Hant': '沒有找到「{query}」',
    ja: '「{query}」は見つかりません',
    en: 'No results for “{query}”',
  },
  'search.notFoundDesc': {
    zh: '试试更短的名称，或换用日文、中文、英文写法。',
    'zh-Hant': '試試更短的名稱，或換用日文、中文、英文寫法。',
    ja: '短い名前にするか、日本語・中国語・英語の表記で試してください。',
    en: 'Try a shorter name, or a Japanese, Chinese, or English spelling.',
  },
  'search.placeholder': {
    zh: '搜索歌曲、系列、演出、地点或制作人',
    'zh-Hant': '搜尋歌曲、系列、演出、地點或製作人',
    ja: '楽曲・シリーズ・公演・会場・プロデューサーを検索',
    en: 'Search songs, series, performances, places, or producers',
  },
  'search.resultCount': {
    zh: '「{query}」共 {total} 条结果',
    'zh-Hant': '「{query}」共 {total} 條結果',
    ja: '「{query}」の結果 {total} 件',
    en: '{total} results for “{query}”',
  },
  'search.sectionPerformances': {
    zh: '演出',
    'zh-Hant': '演出',
    ja: '公演',
    en: 'Performances',
  },
  'search.sectionPlaces': {
    zh: '地点',
    'zh-Hant': '地點',
    ja: '会場',
    en: 'Places',
  },
  'search.sectionProducers': {
    zh: '制作人',
    'zh-Hant': '製作人',
    ja: 'プロデューサー',
    en: 'Producers',
  },
  'search.sectionSeries': {
    zh: '系列',
    'zh-Hant': '系列',
    ja: 'シリーズ',
    en: 'Series',
  },
  'search.sectionSongs': {
    zh: '歌曲',
    'zh-Hant': '歌曲',
    ja: '楽曲',
    en: 'Songs',
  },
  'search.shown': {
    zh: '· 已显示前 {n} 条',
    'zh-Hant': '· 已顯示前 {n} 條',
    ja: '· 先頭 {n} 件を表示',
    en: '· showing the first {n}',
  },
  'search.startDesc': {
    zh: '可以搜歌曲、系列、演出、地点或制作人；日文、中文和英文写法都能命中。',
    'zh-Hant': '可以搜歌曲、系列、演出、地點或製作人；日文、中文和英文寫法都能命中。',
    ja: '楽曲・シリーズ・公演・会場・プロデューサーを検索できます。日本語・中国語・英語の表記に対応します。',
    en: 'Search songs, series, performances, places, or producers in Japanese, Chinese, or English.',
  },
  'search.startTitle': {
    zh: '输入关键词开始搜索',
    'zh-Hant': '輸入關鍵詞開始搜尋',
    ja: 'キーワードを入力して検索',
    en: 'Type a keyword to search',
  },
  'search.title': {
    zh: '搜索',
    'zh-Hant': '搜尋',
    ja: '検索',
    en: 'Search',
  },
  'search.titleQuery': {
    zh: '{query} · 搜索',
    'zh-Hant': '{query} · 搜尋',
    ja: '{query} · 検索',
    en: '{query} · Search',
  },
  'search.trailingPerformances': {
    zh: '{n} 个演出',
    'zh-Hant': '{n} 個演出',
    ja: '公演 {n} 件',
    en: '{n} performances',
  },
  'search.trailingSongs': {
    zh: '{n} 首',
    'zh-Hant': '{n} 首',
    ja: '{n} 曲',
    en: '{n} songs',
  },
  'search.unitPerformances': {
    zh: '个',
    'zh-Hant': '個',
    ja: '件',
    en: 'performances',
  },
  'search.unitPlaces': {
    zh: '个',
    'zh-Hant': '個',
    ja: '件',
    en: 'places',
  },
  'search.unitProducers': {
    zh: '位',
    'zh-Hant': '位',
    ja: '名',
    en: 'producers',
  },
  'search.unitSeries': {
    zh: '个',
    'zh-Hant': '個',
    ja: '件',
    en: 'series',
  },
  'search.unitSongs': {
    zh: '首',
    'zh-Hant': '首',
    ja: '曲',
    en: 'songs',
  },
  'search.viewAll': {
    zh: '查看全部结果',
    'zh-Hant': '檢視全部結果',
    ja: 'すべての結果を見る',
    en: 'View all results',
  },
  'search.viewAllSongs': {
    zh: '查看全部 {n} 首',
    'zh-Hant': '檢視全部 {n} 首',
    ja: '全 {n} 曲を見る',
    en: 'View all {n} songs',
  },
} as const satisfies Record<string, Record<Locale, string>>
