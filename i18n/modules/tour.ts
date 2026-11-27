import type { Locale } from '../../shared/i18n/locale.ts'

/**
 * UI messages for the tour detail page.
 * All supported locales sit side by side; the i18n-split Nuxt module
 * projects each locale into `i18n/locales/<locale>/tour.json`.
 */
export default {
  'tour.notFound': {
    zh: '未找到该巡演',
    'zh-Hant': '未找到該巡演',
    ja: 'このツアーが見つかりません',
    ko: '해당 투어를 찾을 수 없습니다',
    en: 'Tour not found',
  },
  'tour.pageSummary': {
    zh: '{performances} 站 · {shows} 场',
    'zh-Hant': '{performances} 站 · {shows} 場',
    ja: '{performances} 都市 · {shows} 公演',
    ko: '{performances}개 도시 · {shows}회',
    en: '{performances} stops · {shows} shows',
  },
  'tour.songCount': {
    zh: '{n} 首曲目',
    'zh-Hant': '{n} 首曲目',
    ja: '{n} 曲',
    ko: '{n}곡',
    en: '{n} songs',
  },
  'tour.stopsHeading': {
    zh: '行程',
    'zh-Hant': '行程',
    ja: '日程',
    ko: '일정',
    en: 'Stops',
  },
  'tour.setlistHeading': {
    zh: '歌单',
    'zh-Hant': '歌單',
    ja: 'セットリスト',
    ko: '세트리스트',
    en: 'Setlist',
  },
  'tour.sharedSetlist': {
    zh: '各站相同歌单',
    'zh-Hant': '各站相同歌單',
    ja: '各都市で共通のセットリスト',
    ko: '모든 도시 동일 세트리스트',
    en: 'Same setlist across stops',
  },
  'tour.seriesLabel': {
    zh: '系列：{name}',
    'zh-Hant': '系列：{name}',
    ja: 'シリーズ：{name}',
    ko: '시리즈: {name}',
    en: 'Series: {name}',
  },
  'tour.officialSource': {
    zh: '官方页面',
    'zh-Hant': '官方頁面',
    ja: '公式ページ',
    ko: '공식 페이지',
    en: 'Official page',
  },
  'tour.noSetlistStops': {
    zh: '本巡演暂无歌单',
    'zh-Hant': '本巡演暫無歌單',
    ja: 'このツアーにはまだセットリストがありません',
    ko: '이 투어에는 아직 세트리스트가 없습니다',
    en: 'No setlist for this tour yet',
  },
  'tour.showCountLine': {
    zh: '· {n} 场',
    'zh-Hant': '· {n} 場',
    ja: '· {n} 公演',
    ko: '· {n}회',
    en: '· {n} shows',
  },
  'tour.timelineShowCount': {
    zh: '{n} 场',
    'zh-Hant': '{n} 場',
    ja: '{n} 公演',
    ko: '{n}회',
    en: '{n} shows',
  },
  'tour.timelineNoSetlist': {
    zh: '无歌单',
    'zh-Hant': '無歌單',
    ja: 'セットリストなし',
    ko: '세트리스트 없음',
    en: 'no setlist',
  },
  'tour.unknownCity': {
    zh: '未知城市',
    'zh-Hant': '未知城市',
    ja: '都市不明',
    ko: '도시 미상',
    en: 'Unknown city',
  },
  'tour.posterExpand': {
    zh: '全屏查看海报',
    'zh-Hant': '全螢幕查看海報',
    ja: 'ポスターを全画面表示',
    ko: '포스터 전체 화면으로 보기',
    en: 'View poster fullscreen',
  },
} satisfies Record<string, Record<Locale, string>>
