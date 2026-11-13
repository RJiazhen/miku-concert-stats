import type { Locale } from '../../shared/i18n/locale.ts'

/**
 * UI messages for the `song` feature area.
 * All supported locales sit side by side; the i18n-split Nuxt module
 * projects each locale into `i18n/locales/<locale>/song.json`.
 */
export default {
  'album.title': {
    zh: '歌单来自专辑曲目',
    'zh-Hant': '歌單來自專輯曲目',
    ja: 'セットリストはアルバム曲目によるもの',
    en: 'Setlist taken from an album track list',
  },
  'category.classical': {
    zh: '古典・管弦乐曲',
    'zh-Hant': '古典・管絃樂曲',
    ja: 'クラシック・管弦楽曲',
    en: 'Classical / orchestral',
  },
  'category.instrumental': {
    zh: '器乐曲',
    'zh-Hant': '器樂曲',
    ja: '器楽曲',
    en: 'Instrumental',
  },
  'category.traditional': {
    zh: '民谣・传统曲',
    'zh-Hant': '民謠・傳統曲',
    ja: '民謡・伝統曲',
    en: 'Folk / traditional',
  },
  'category.vocaloid': {
    zh: 'VOCALOID 歌曲',
    'zh-Hant': 'VOCALOID 歌曲',
    ja: 'VOCALOID 曲',
    en: 'VOCALOID song',
  },
  'song.appearances': {
    zh: '出场记录',
    'zh-Hant': '出場記錄',
    ja: '出演記録',
    en: 'Appearances',
  },
  'song.appearancesCount': {
    zh: '{performances} 个演出 · {series} 个系列',
    'zh-Hant': '{performances} 個演出 · {series} 個系列',
    ja: '公演 {performances} 件 · シリーズ {series} 件',
    en: '{performances} performances · {series} series',
  },
  'song.breadcrumb': {
    zh: '歌曲',
    'zh-Hant': '歌曲',
    ja: '楽曲',
    en: 'Songs',
  },
  'song.composer': {
    zh: '作曲 {name}',
    'zh-Hant': '作曲 {name}',
    ja: '作曲 {name}',
    en: 'Composed by {name}',
  },
  'song.noAppearances': {
    zh: '没有出场记录',
    'zh-Hant': '沒有出場記錄',
    ja: '出演記録がありません',
    en: 'No appearances',
  },
  'song.noAppearancesDesc': {
    zh: '没有在已收录的歌单里出现。',
    'zh-Hant': '沒有在已收錄的歌單裡出現。',
    ja: '収録済みのセットリストに登場していません。',
    en: 'It does not appear in any recorded setlist.',
  },
  'song.noVideos': {
    zh: '没有投稿链接',
    'zh-Hant': '沒有投稿連結',
    ja: '投稿リンクがありません',
    en: 'No upload links',
  },
  'song.noVideosOutside': {
    zh: '这首曲目不在 VocaDB 上，没有登记投稿链接。',
    'zh-Hant': '這首曲目不在 VocaDB 上，沒有登記投稿連結。',
    ja: 'この曲は VocaDB にないため、投稿リンクが登録されていません。',
    en: 'This song is not on VocaDB, so no upload links are registered.',
  },
  'song.noVideosVocadb': {
    zh: 'VocaDB 上没有登记投稿链接。',
    'zh-Hant': 'VocaDB 上沒有登記投稿連結。',
    ja: 'VocaDB に投稿リンクが登録されていません。',
    en: 'VocaDB has no upload links registered.',
  },
  'song.notFound': {
    zh: '找不到这首歌',
    'zh-Hant': '找不到這首歌',
    ja: 'この曲が見つかりません',
    en: 'Song not found',
  },
  'song.otherNames': {
    zh: '其他名称',
    'zh-Hant': '其他名稱',
    ja: 'その他の名前',
    en: 'Other names',
  },
  'song.otherVersion': {
    zh: '其他版本',
    'zh-Hant': '其他版本',
    ja: 'その他のバージョン',
    en: 'Other version',
  },
  'song.otherVersions': {
    zh: '其他版本',
    'zh-Hant': '其他版本',
    ja: 'その他のバージョン',
    en: 'Other versions',
  },
  'song.performedBy': {
    zh: '演出角色',
    'zh-Hant': '演出角色',
    ja: '歌唱キャラクター',
    en: 'Performed by',
  },
  'song.playVersion': {
    zh: '演唱会演奏的版本',
    'zh-Hant': '演唱會演奏的版本',
    ja: 'コンサートでの演奏バージョン',
    en: 'Version played in concert',
  },
  'song.producer': {
    zh: '制作人',
    'zh-Hant': '製作人',
    ja: 'プロデューサー',
    en: 'Producers',
  },
  'song.publishedAt': {
    zh: '投稿日期 {date}',
    'zh-Hant': '投稿日期 {date}',
    ja: '投稿日 {date}',
    en: 'Published {date}',
  },
  'song.versionNote': {
    zh: '版本：{note}',
    'zh-Hant': '版本：{note}',
    ja: 'バージョン：{note}',
    en: 'Version: {note}',
  },
  'song.videos': {
    zh: '相关投稿',
    'zh-Hant': '相關投稿',
    ja: '関連投稿',
    en: 'Related uploads',
  },
  'song.wiki': {
    zh: '初音ミク Wiki',
    'zh-Hant': '初音ミク Wiki',
    ja: '初音ミク Wiki',
    en: 'Hatsune Miku Wiki',
  },
  'variant.cover': {
    zh: '翻唱',
    'zh-Hant': '翻唱',
    ja: 'カバー',
    en: 'Cover',
  },
  'variant.language': {
    zh: '语言',
    'zh-Hant': '語言',
    ja: '言語',
    en: 'Language',
  },
  'variant.other': {
    zh: '其他版本',
    'zh-Hant': '其他版本',
    ja: 'その他のバージョン',
    en: 'Other version',
  },
  'variant.remaster': {
    zh: '重制',
    'zh-Hant': '重製',
    ja: 'リマスター',
    en: 'Remaster',
  },
  'variant.remix': {
    zh: '混音',
    'zh-Hant': '混音',
    ja: 'リミックス',
    en: 'Remix',
  },
  'variant.voicebank': {
    zh: '声库',
    'zh-Hant': '聲庫',
    ja: '音源',
    en: 'Voicebank',
  },
} as const satisfies Record<string, Record<Locale, string>>
