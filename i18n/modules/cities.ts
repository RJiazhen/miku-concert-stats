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
    ko: '{cities}개 도시 · {performances}개 공연 · {shows}개 회차',
    en: '{cities} cities · {performances} performances · {shows} shows',
  },
  'cities.emptyDesc': {
    zh: '目录里还没有带城市名称的演出。',
    'zh-Hant': '目錄裡還沒有帶城市名稱的演出。',
    ja: 'カタログに都市名のある公演がまだありません。',
    ko: '아직 도시명이 있는 공연이 카탈로그에 없습니다.',
    en: 'The catalog has no performances with a city name yet.',
  },
  'cities.emptyTitle': {
    zh: '没有可统计的城市',
    'zh-Hant': '沒有可統計的城市',
    ja: '集計できる都市がありません',
    ko: '순위할 도시가 없습니다',
    en: 'No cities to rank',
  },
  'cities.heading1': {
    zh: '城市演出场次',
    'zh-Hant': '城市演出場次',
    ja: '都市別 公演回数',
    ko: '도시별 콘서트',
    en: 'Concerts by city',
  },
  'cities.heading2': {
    zh: '排名',
    'zh-Hant': '排名',
    ja: 'ランキング',
    ko: '순위',
    // Leading space: desktop joins heading1+heading2 without a break (`<br class="sm:hidden">`).
    en: ' ranking',
  },
  'cities.note': {
    zh: '「场次」按演出日计数，日场 / 夜场分别计数',
    'zh-Hant': '「場次」按演出日計數，日場 / 夜場分別計數',
    ja: '「実施回」は公演日ごとに数え、昼公演 / 夜公演は別々に数えます',
    ko: '「회차」는 공연일을 세며, 낮 공연과 밤 공연은 따로 계산합니다',
    en: '"Shows" counts performance days, with day and night shows counted separately',
  },
  'cities.sortBadge': {
    zh: '按场次排序',
    'zh-Hant': '按場次排序',
    ja: '実施回順',
    ko: '회차순 정렬',
    en: 'Sorted by shows',
  },
  'cities.tableTitle': {
    zh: '排行',
    'zh-Hant': '排行',
    ja: 'ランキング',
    ko: '순위',
    en: 'Ranking',
  },
  'cities.title': {
    zh: '城市排行',
    'zh-Hant': '城市排行',
    ja: '都市ランキング',
    ko: '도시 순위',
    en: 'City ranking',
  },
  'cities.unknown': {
    zh: '另有 {n} 个线上或没有标明城市的演出未计入排名。',
    'zh-Hant': '另有 {n} 個線上或沒有標明城市的演出未計入排名。',
    ja: 'ほかにオンラインまたは都市不明の公演 {n} 件はランキングに含まれていません。',
    ko: '도시가 명시되지 않았거나 스트리밍된 공연 {n}개는 순위에 넣지 않았습니다.',
    en: 'Another {n} streamed performances or performances without a stated city are not ranked.',
  },
  'cities.viewRanking': {
    zh: '查看曲目排行',
    'zh-Hant': '檢視曲目排行',
    ja: '楽曲ランキングを見る',
    ko: '곡 순위 보기',
    en: 'View song ranking',
  },
} as const satisfies Record<string, Record<Locale, string>>
