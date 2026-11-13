import type { Locale } from '../../shared/i18n/locale.ts'

/**
 * UI messages for the `show` feature area.
 * All supported locales sit side by side; the i18n-split Nuxt module
 * projects each locale into `i18n/locales/<locale>/show.json`.
 */
export default {
  'rotation.cityOnly': {
    zh: '该城市有多场',
    'zh-Hant': '該城市有多場',
    ja: 'この都市には複数の公演があります',
    en: 'The city has several shows',
  },
  'rotation.cityOnlyCount': {
    zh: '共 {n} 场',
    'zh-Hant': '共 {n} 場',
    ja: '全 {n} 回',
    en: '{n} shows',
  },
  'rotation.dayNight': {
    zh: '备注写到日场 / 夜场或当天有多场，解析器只定位到当天',
    'zh-Hant': '備註寫到日場 / 夜場或當天有多場，解析器只定位到當天',
    ja: '注記が昼公演 / 夜公演または同日複数回を示すため、解析器はその日までしか特定できません',
    en: 'The note names a day/night half or several shows that day, so the parser could only pin down the day',
  },
  'rotation.lengthMismatch': {
    zh: '本场 {count} 首，同歌单其他场次多为 {expected} 首',
    'zh-Hant': '本場 {count} 首，同歌單其他場次多為 {expected} 首',
    ja: 'この回は {count} 曲、同じセットリストの他の回は主に {expected} 曲',
    en: 'This show has {count} songs, while most shows on the same setlist have {expected}',
  },
  'rotation.unknownFormat': {
    zh: '备注写法未识别',
    'zh-Hant': '備註寫法未識別',
    ja: '注記の書き方を解析できません',
    en: 'Unrecognised note format',
  },
  'rotation.unmatchedCity': {
    zh: '城市没有对到任何一场',
    'zh-Hant': '城市沒有對到任何一場',
    ja: '都市がどの公演にも一致しません',
    en: 'The city matches no show',
  },
  'setlist.everyShow': {
    zh: '每场 {n} 首',
    'zh-Hant': '每場 {n} 首',
    ja: '各回 {n} 曲',
    en: '{n} songs each show',
  },
  'setlist.join': {
    zh: '、',
    'zh-Hant': '、',
    ja: '・',
    en: ', ',
  },
  'setlist.medley': {
    zh: '串烧 {id}',
    'zh-Hant': '串燒 {id}',
    ja: 'メドレー {id}',
    en: 'Medley {id}',
  },
  'setlist.medleyParts': {
    zh: '（串烧：{songs}）',
    'zh-Hant': '（串燒：{songs}）',
    ja: '（メドレー：{songs}）',
    en: ' (medley: {songs})',
  },
  'setlist.mergedTitle': {
    zh: '合并歌单',
    'zh-Hant': '合併歌單',
    ja: '統合セットリスト',
    en: 'Merged setlist',
  },
  'setlist.noSetlist': {
    zh: '无歌单',
    'zh-Hant': '無歌單',
    ja: 'セットリストなし',
    en: 'No setlist',
  },
  'setlist.onlyDate': {
    zh: '仅 {date}',
    'zh-Hant': '僅 {date}',
    ja: '{date} のみ',
    en: '{date} only',
  },
  'setlist.onlyDay': {
    zh: '仅日场',
    'zh-Hant': '僅日場',
    ja: '昼公演のみ',
    en: 'Day shows only',
  },
  'setlist.onlyNight': {
    zh: '仅夜场',
    'zh-Hant': '僅夜場',
    ja: '夜公演のみ',
    en: 'Night shows only',
  },
  'setlist.onlyShows': {
    zh: '仅 {shows}',
    'zh-Hant': '僅 {shows}',
    ja: '{shows} のみ',
    en: '{shows} only',
  },
  'setlist.perShow': {
    zh: '各场 {list} 首',
    'zh-Hant': '各場 {list} 首',
    ja: '各回 {list} 曲',
    en: '{list} songs per show',
  },
  'setlist.slotCount': {
    zh: '{n} 个序号',
    'zh-Hant': '{n} 個序號',
    ja: '番号 {n} 個',
    en: '{n} slots',
  },
  'setlist.title': {
    zh: '歌单',
    'zh-Hant': '歌單',
    ja: 'セットリスト',
    en: 'Setlist',
  },
  'show.albumTracks': {
    zh: '专辑曲目',
    'zh-Hant': '專輯曲目',
    ja: 'アルバム曲目',
    en: 'Album track list',
  },
  'show.cancelled': {
    zh: '这场演出已取消',
    'zh-Hant': '這場演出已取消',
    ja: 'この公演は中止されました',
    en: 'This performance was cancelled',
  },
  'show.eventSource': {
    zh: '演出来源',
    'zh-Hant': '演出來源',
    ja: '公演の出典',
    en: 'Event source',
  },
  'show.noSetlist': {
    zh: '暂无歌单',
    'zh-Hant': '暫無歌單',
    ja: 'セットリストなし',
    en: 'No setlist yet',
  },
  'show.notDerivedDesc': {
    zh: '目录里没有该演出的场次级数据，无法列出曲目。',
    'zh-Hant': '目錄裡沒有該演出的場次級資料，無法列出曲目。',
    ja: 'カタログに実施回ごとのデータがないため、曲目を表示できません。',
    en: 'The catalog has no per-show data for this performance, so its songs cannot be listed.',
  },
  'show.notDerivedTitle': {
    zh: '这个演出还没有派生的场次歌单',
    'zh-Hant': '這個演出還沒有派生的場次歌單',
    ja: 'この公演の実施回セットリストはまだありません',
    en: 'No derived show setlist for this performance yet',
  },
  'show.notFound': {
    zh: '找不到这个演出',
    'zh-Hant': '找不到這個演出',
    ja: 'この公演が見つかりません',
    en: 'Performance not found',
  },
  'show.pageNoteTitle': {
    zh: '歌单说明',
    'zh-Hant': '歌單說明',
    ja: 'セットリストの注記',
    en: 'Setlist note',
  },
  'show.postponed': {
    zh: '这场演出已延期',
    'zh-Hant': '這場演出已延期',
    ja: 'この公演は延期されました',
    en: 'This performance was postponed',
  },
  'show.seriesLabel': {
    zh: '{name} 系列',
    'zh-Hant': '{name} 系列',
    ja: '{name} シリーズ',
    en: '{name} series',
  },
  'show.showsHeading': {
    zh: '场次（{n}）：',
    'zh-Hant': '場次（{n}）：',
    ja: '実施回（{n}）：',
    en: 'Shows ({n}):',
  },
  'show.showtime': {
    zh: '开演 {time}',
    'zh-Hant': '開演 {time}',
    ja: '開演 {time}',
    en: 'Starts {time}',
  },
  'show.upcoming': {
    zh: '这场演出尚未举行',
    'zh-Hant': '這場演出尚未舉行',
    ja: 'この公演はまだ開催されていません',
    en: 'This performance has not taken place yet',
  },
  'show.vocadbEvent': {
    zh: 'VocaDB 演出',
    'zh-Hant': 'VocaDB 演出',
    ja: 'VocaDB の公演',
    en: 'VocaDB event',
  },
  'show.vocadbSetlist': {
    zh: 'VocaDB 歌单',
    'zh-Hant': 'VocaDB 歌單',
    ja: 'VocaDB セットリスト',
    en: 'VocaDB setlist',
  },
} as const satisfies Record<string, Record<Locale, string>>
