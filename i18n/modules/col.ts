import type { Locale } from '../../shared/i18n/locale.ts'

/**
 * UI messages for the `col` feature area.
 * All supported locales sit side by side; the i18n-split Nuxt module
 * projects each locale into `i18n/locales/<locale>/col.json`.
 */
export default {
  'col.appearanceCount': {
    zh: '表演次数',
    'zh-Hant': '表演次數',
    ja: '演奏回数',
    en: 'Appearances',
  },
  'col.characters': {
    zh: '歌手',
    'zh-Hant': '歌手',
    ja: '歌手',
    en: 'Singers',
  },
  'col.city': {
    zh: '城市',
    'zh-Hant': '城市',
    ja: '都市',
    en: 'City',
  },
  'col.date': {
    zh: '日期',
    'zh-Hant': '日期',
    ja: '日付',
    en: 'Date',
  },
  'col.firstShow': {
    zh: '首次演出',
    'zh-Hant': '首次演出',
    ja: '初公演',
    en: 'First show',
  },
  'col.firstYear': {
    zh: '最早年份',
    'zh-Hant': '最早年份',
    ja: '初登場年',
    en: 'First year',
  },
  'col.lastShow': {
    zh: '最近演出',
    'zh-Hant': '最近演出',
    ja: '最新公演',
    en: 'Latest show',
  },
  'col.lastYear': {
    zh: '最晚年份',
    'zh-Hant': '最晚年份',
    ja: '最終登場年',
    en: 'Last year',
  },
  'col.link': {
    zh: '链接',
    'zh-Hant': '連結',
    ja: 'リンク',
    en: 'Link',
  },
  'col.note': {
    zh: '备注',
    'zh-Hant': '備註',
    ja: '備考',
    en: 'Note',
  },
  'col.performance': {
    zh: '演出',
    'zh-Hant': '演出',
    ja: '公演',
    en: 'Performance',
  },
  'col.performanceCount': {
    zh: '演出数',
    'zh-Hant': '演出數',
    ja: '公演数',
    en: 'Performances',
  },
  'col.performanceCountShort': {
    zh: '演出数',
    'zh-Hant': '演出數',
    ja: '公演数',
    en: 'Perf.',
  },
  'col.performances': {
    zh: '演出数',
    'zh-Hant': '演出數',
    ja: '公演数',
    en: 'Performances',
  },
  'col.performedSongCount': {
    zh: '演出曲目',
    'zh-Hant': '演出曲目',
    ja: '公演曲',
    en: 'Performed songs',
  },
  'col.platform': {
    zh: '平台',
    'zh-Hant': '平台',
    ja: 'プラットフォーム',
    en: 'Platform',
  },
  'col.position': {
    zh: '序号',
    'zh-Hant': '序號',
    ja: '番号',
    en: 'No.',
  },
  'col.producers': {
    zh: '制作人',
    'zh-Hant': '製作人',
    ja: 'プロデューサー',
    en: 'Producers',
  },
  'col.publishYear': {
    zh: '投稿年份',
    'zh-Hant': '投稿年份',
    ja: '投稿年',
    en: 'Published',
  },
  'col.pvType': {
    zh: '类型',
    'zh-Hant': '類型',
    ja: '種類',
    en: 'Type',
  },
  'col.rank': {
    zh: '名次',
    'zh-Hant': '名次',
    ja: '順位',
    en: 'Rank',
  },
  'col.resolution': {
    zh: '归属方式',
    'zh-Hant': '歸屬方式',
    ja: '割り当て',
    en: 'Attribution',
  },
  'col.series': {
    zh: '系列',
    'zh-Hant': '系列',
    ja: 'シリーズ',
    en: 'Series',
  },
  'col.showCount': {
    zh: '场次数',
    'zh-Hant': '場次數',
    ja: '公演回数',
    en: 'Shows',
  },
  'col.shows': {
    zh: '场次',
    'zh-Hant': '場次',
    ja: '実施回',
    en: 'Shows',
  },
  'col.song': {
    zh: '歌曲',
    'zh-Hant': '歌曲',
    ja: '楽曲',
    en: 'Song',
  },
  'col.songCount': {
    zh: '曲目数',
    'zh-Hant': '曲目數',
    ja: '曲目数',
    en: 'Songs',
  },
  'col.songTitle': {
    zh: '曲名',
    'zh-Hant': '曲名',
    ja: '曲名',
    en: 'Song',
  },
  'col.songs': {
    zh: '歌曲',
    'zh-Hant': '歌曲',
    ja: '曲',
    en: 'Songs',
  },
  'col.sourceRows': {
    zh: '源行数',
    'zh-Hant': '源行數',
    ja: '元行数',
    en: 'Source rows',
  },
  'col.sources': {
    zh: '来源',
    'zh-Hant': '來源',
    ja: '出典',
    en: 'Sources',
  },
  'col.status': {
    zh: '状态',
    'zh-Hant': '狀態',
    ja: '状態',
    en: 'Status',
  },
  'col.title': {
    zh: '标题',
    'zh-Hant': '標題',
    ja: 'タイトル',
    en: 'Title',
  },
  'col.topSongs': {
    zh: '代表作',
    'zh-Hant': '代表作',
    ja: '代表作',
    en: 'Top songs',
  },
  'col.venue': {
    zh: '场馆',
    'zh-Hant': '場館',
    ja: '会場',
    en: 'Venue',
  },
  'col.years': {
    zh: '年份',
    'zh-Hant': '年份',
    ja: '年',
    en: 'Years',
  },
} as const satisfies Record<string, Record<Locale, string>>
