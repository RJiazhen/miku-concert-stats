import type { Locale } from '../../shared/i18n/locale.ts'

/**
 * UI messages for the `report` feature area.
 * All supported locales sit side by side; the i18n-split Nuxt module
 * projects each locale into `i18n/locales/<locale>/report.json`.
 */
export default {
  'report.all': {
    zh: '全部',
    'zh-Hant': '全部',
    ja: 'すべて',
    en: 'All',
  },
  'report.allGrades': {
    zh: '全部分级',
    'zh-Hant': '全部分級',
    ja: 'すべての等級',
    en: 'All grades',
  },
  'report.copied': {
    zh: '已复制 Markdown 报告',
    'zh-Hant': '已複製 Markdown 報告',
    ja: 'Markdown レポートをコピーしました',
    en: 'Markdown report copied',
  },
  'report.copyFailed': {
    zh: '复制失败，请手动选择文本',
    'zh-Hant': '複製失敗，請手動選擇文字',
    ja: 'コピーに失敗しました。テキストを手動で選択してください',
    en: 'Copy failed; select the text manually',
  },
  'report.copyMarkdown': {
    zh: '复制为 Markdown',
    'zh-Hant': '複製為 Markdown',
    ja: 'Markdown としてコピー',
    en: 'Copy as Markdown',
  },
  'report.copyReport': {
    zh: 'Markdown 报告',
    'zh-Hant': 'Markdown 報告',
    ja: 'Markdown レポート',
    en: 'Markdown report',
  },
  'report.description': {
    zh: '同一系列不同演出之间的曲目数量与编排差异，分级越高越值得优先核对。',
    'zh-Hant': '同一系列不同演出之間的曲目數量與編排差異，分級越高越值得優先核對。',
    ja: '同じシリーズ内の公演間で曲数と構成の違いを比べます。等級が高いほど優先して確認する価値があります。',
    en: 'Song counts and running-order differences between performances of one series; the higher the grade, the more worth checking first.',
  },
  'report.encoreDelta': {
    zh: '（安可 {delta}）',
    'zh-Hant': '（安可 {delta}）',
    ja: '（アンコール {delta}）',
    en: '(encore {delta})',
  },
  'report.grade': {
    zh: '分级',
    'zh-Hant': '分級',
    ja: '等級',
    en: 'Grade',
  },
  'report.mainEncore': {
    zh: '正片 / 安可',
    'zh-Hant': '正片 / 安可',
    ja: '本編 / アンコール',
    en: 'Main / encore',
  },
  'report.mergeStatus': {
    zh: '合并状态',
    'zh-Hant': '合併狀態',
    ja: '統合状態',
    en: 'Merge status',
  },
  'report.merged': {
    zh: '已合并',
    'zh-Hant': '已合併',
    ja: '統合済み',
    en: 'Merged',
  },
  'report.noPairs': {
    zh: '没有符合条件的组合',
    'zh-Hant': '沒有符合條件的組合',
    ja: '条件に合う組み合わせがありません',
    en: 'No pairs match',
  },
  'report.noPairsDesc': {
    zh: '换一个分级或合并状态看看。',
    'zh-Hant': '換一個分級或合併狀態看看。',
    ja: '等級か統合状態を変えてください。',
    en: 'Try another grade or merge status.',
  },
  'report.onlyA': {
    zh: '仅 A：',
    'zh-Hant': '僅 A：',
    ja: 'A のみ：',
    en: 'A only:',
  },
  'report.onlyB': {
    zh: '仅 B：',
    'zh-Hant': '僅 B：',
    ja: 'B のみ：',
    en: 'B only:',
  },
  'report.pairCount': {
    zh: '共 {shown} / {total} 对',
    'zh-Hant': '共 {shown} / {total} 對',
    ja: '{shown} / {total} 組',
    en: '{shown} / {total} pairs',
  },
  'report.pairDetail': {
    zh: '· 同一系列年度 {pairs} 对，其中 {merged} 对已合并',
    'zh-Hant': '· 同一系列年度 {pairs} 對，其中 {merged} 對已合併',
    ja: '· 同じシリーズ年度 {pairs} 組、うち {merged} 組が統合済み',
    en: '· {pairs} pairs in the same series year, {merged} merged',
  },
  'report.range': {
    zh: '范围',
    'zh-Hant': '範圍',
    ja: '範囲',
    en: 'Range',
  },
  'report.rangeAdjacent': {
    zh: '相邻系列年度',
    'zh-Hant': '相鄰系列年度',
    ja: '隣接するシリーズ年度',
    en: 'Adjacent series years',
  },
  'report.rangeEdition': {
    zh: '同一系列年度',
    'zh-Hant': '同一系列年度',
    ja: '同じシリーズ年度',
    en: 'Same series year',
  },
  'report.rowCount': {
    zh: '行数',
    'zh-Hant': '行數',
    ja: '行数',
    en: 'Rows',
  },
  'report.sharedOnly': {
    zh: '共有 / 仅左 / 仅右',
    'zh-Hant': '共有 / 僅左 / 僅右',
    ja: '共通 / 左のみ / 右のみ',
    en: 'Shared / left only / right only',
  },
  'report.title': {
    zh: '歌单差异核验',
    'zh-Hant': '歌單差異核驗',
    ja: 'セットリスト差異の検証',
    en: 'Setlist difference check',
  },
  'report.unmerged': {
    zh: '未合并',
    'zh-Hant': '未合併',
    ja: '未統合',
    en: 'Not merged',
  },
} as const satisfies Record<string, Record<Locale, string>>
