import type { Locale } from '../../shared/i18n/locale.ts'

/**
 * UI messages for the `series` feature area.
 * All supported locales sit side by side; the i18n-split Nuxt module
 * projects each locale into `i18n/locales/<locale>/series.json`.
 */
export default {
  'series.all': {
    zh: '全部系列',
    'zh-Hant': '全部系列',
    ja: 'すべてのシリーズ',
    en: 'All series',
  },
  'series.allSeries': {
    zh: '全部系列',
    'zh-Hant': '全部系列',
    ja: 'すべてのシリーズ',
    en: 'All series',
  },
  'series.clearPlace': {
    zh: '清除地点筛选',
    'zh-Hant': '清除地點篩選',
    ja: '会場の条件を解除',
    en: 'Clear venue filter',
  },
  'series.emptyDesc': {
    zh: '目录里还没有系列记录。',
    'zh-Hant': '目錄裡還沒有系列記錄。',
    ja: 'カタログにまだシリーズの記録がありません。',
    en: 'The catalog has no series yet.',
  },
  'series.emptyPerformances': {
    zh: '没有符合条件的演出',
    'zh-Hant': '沒有符合條件的演出',
    ja: '条件に合う公演がありません',
    en: 'No performances match',
  },
  'series.emptyPerformancesDesc': {
    zh: '换一个系列或地点筛选。',
    'zh-Hant': '換一個系列或地點篩選。',
    ja: 'シリーズか会場の条件を変えてください。',
    en: 'Try another series or venue filter.',
  },
  'series.emptyTitle': {
    zh: '没有系列',
    'zh-Hant': '沒有系列',
    ja: 'シリーズがありません',
    en: 'No series',
  },
  'series.filterPlace': {
    zh: '地点：{place}',
    'zh-Hant': '地點：{place}',
    ja: '会場：{place}',
    en: 'Venue: {place}',
  },
  'series.filteredCount': {
    zh: '筛选后 {shown} / {total} 个',
    'zh-Hant': '篩選後 {shown} / {total} 個',
    ja: '絞り込み後 {shown} / {total} 件',
    en: '{shown} / {total} after filtering',
  },
  'series.heading1': {
    zh: '系列与演出',
    'zh-Hant': '系列與演出',
    ja: 'シリーズと公演',
    en: 'Series and',
  },
  'series.heading2': {
    zh: '总览',
    'zh-Hant': '總覽',
    ja: '一覧',
    // Leading space: desktop joins heading1+heading2 without a break (`<br class="sm:hidden">`).
    en: ' performances',
  },
  'series.indexTitle': {
    zh: '系列与演出总览',
    'zh-Hant': '系列與演出總覽',
    ja: 'シリーズと公演の一覧',
    en: 'Series and performances',
  },
  'series.noPerformances': {
    zh: '这个系列没有演出记录。',
    'zh-Hant': '這個系列沒有演出記錄。',
    ja: 'このシリーズには公演の記録がありません。',
    en: 'This series has no recorded performances.',
  },
  'series.noSetlist': {
    zh: '暂无歌单',
    'zh-Hant': '暫無歌單',
    ja: 'セットリストなし',
    en: 'No setlist',
  },
  'series.noSetlistLine': {
    zh: '· 无歌单',
    'zh-Hant': '· 無歌單',
    ja: '· セットリストなし',
    en: '· no setlist',
  },
  'series.note': {
    zh: '「场次」按演出日计数，日场 / 夜场分别计数',
    'zh-Hant': '「場次」按演出日計數，日場 / 夜場分別計數',
    ja: '「実施回」は公演日ごとに数え、昼公演 / 夜公演は別々に数えます',
    en: '"Shows" counts performance days, with day and night shows counted separately',
  },
  'series.pageNotFound': {
    zh: '找不到这个系列',
    'zh-Hant': '找不到這個系列',
    ja: 'このシリーズが見つかりません',
    en: 'Series not found',
  },
  'series.pageSummary': {
    zh: '系列主页 · {performances} 个演出 · {shows} 个场次',
    'zh-Hant': '系列主頁 · {performances} 個演出 · {shows} 個場次',
    ja: 'シリーズページ · 公演 {performances} 件 · 実施回 {shows} 回',
    en: 'Series page · {performances} performances · {shows} shows',
  },
  'series.performanceCount': {
    zh: '{n} 个',
    'zh-Hant': '{n} 個',
    ja: '{n} 件',
    en: '{n}',
  },
  'series.performancesHeading': {
    zh: '演出',
    'zh-Hant': '演出',
    ja: '公演',
    en: 'Performances',
  },
  'series.performancesTitle': {
    zh: '演出',
    'zh-Hant': '演出',
    ja: '公演',
    en: 'Performances',
  },
  'series.seriesFallback': {
    zh: '系列 {id}',
    'zh-Hant': '系列 {id}',
    ja: 'シリーズ {id}',
    en: 'Series {id}',
  },
  'series.showCountLine': {
    zh: '· {n} 个场次',
    'zh-Hant': '· {n} 個場次',
    ja: '· 実施回 {n} 回',
    en: '· {n} shows',
  },
  'series.sourcePage': {
    zh: '查看这个演出的来源页面',
    'zh-Hant': '檢視這個演出的來源頁面',
    ja: 'この公演の出典ページを見る',
    en: 'View this performance’s source page',
  },
  'series.tableTitle': {
    zh: '系列',
    'zh-Hant': '系列',
    ja: 'シリーズ',
    en: 'Series',
  },
  'series.viewRanking': {
    zh: '查看曲目排行',
    'zh-Hant': '檢視曲目排行',
    ja: '楽曲ランキングを見る',
    en: 'View song ranking',
  },
} as const satisfies Record<string, Record<Locale, string>>
