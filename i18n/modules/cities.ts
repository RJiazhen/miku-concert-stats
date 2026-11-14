import type { Locale } from '../../shared/i18n/locale.ts'

/**
 * UI messages for the `cities` feature area.
 * All supported locales sit side by side; the i18n-split Nuxt module
 * projects each locale into `i18n/locales/<locale>/cities.json`.
 */
export default {
  'cities.count': {
    zh: '{cities} 个城市 · {performances} 个演出 · {shows} 个场次',
    'zh-Hant': '{cities} 個城市 · {performances} 個演出 · {shows} 個場次',
    ja: '{cities} 都市 · 公演 {performances} 件 · 実施回 {shows} 回',
    en: '{cities} cities · {performances} performances · {shows} shows',
  },
  'cities.emptyDesc': {
    zh: '目录里还没有带城市名称的演出。',
    'zh-Hant': '目錄裡還沒有帶城市名稱的演出。',
    ja: 'カタログに都市名のある公演がまだありません。',
    en: 'The catalog has no performances with a city name yet.',
  },
  'cities.emptyTitle': {
    zh: '没有可统计的城市',
    'zh-Hant': '沒有可統計的城市',
    ja: '集計できる都市がありません',
    en: 'No cities to rank',
  },
  'cities.heading1': {
    zh: '城市演出场次',
    'zh-Hant': '城市演出場次',
    ja: '都市別 公演回数',
    en: 'Concerts by city',
  },
  'cities.heading2': {
    zh: '排名',
    'zh-Hant': '排名',
    ja: 'ランキング',
    // Leading space: desktop joins heading1+heading2 without a break (`<br class="sm:hidden">`).
    en: ' ranking',
  },
  'cities.note': {
    zh: '「场次」按演出日计数，日场 / 夜场分别计数',
    'zh-Hant': '「場次」按演出日計數，日場 / 夜場分別計數',
    ja: '「実施回」は公演日ごとに数え、昼公演 / 夜公演は別々に数えます',
    en: '"Shows" counts performance days, with day and night shows counted separately',
  },
  'cities.sortBadge': {
    zh: '按场次排序',
    'zh-Hant': '按場次排序',
    ja: '実施回順',
    en: 'Sorted by shows',
  },
  'cities.tableTitle': {
    zh: '排行',
    'zh-Hant': '排行',
    ja: 'ランキング',
    en: 'Ranking',
  },
  'cities.title': {
    zh: '城市排行',
    'zh-Hant': '城市排行',
    ja: '都市ランキング',
    en: 'City ranking',
  },
  'cities.unknown': {
    zh: '另有 {n} 个线上或没有标明城市的演出未计入排名。',
    'zh-Hant': '另有 {n} 個線上或沒有標明城市的演出未計入排名。',
    ja: 'ほかにオンラインまたは都市不明の公演 {n} 件はランキングに含まれていません。',
    en: 'Another {n} streamed performances or performances without a stated city are not ranked.',
  },
  'cities.viewRanking': {
    zh: '查看曲目排行',
    'zh-Hant': '檢視曲目排行',
    ja: '楽曲ランキングを見る',
    en: 'View song ranking',
  },
} as const satisfies Record<string, Record<Locale, string>>
