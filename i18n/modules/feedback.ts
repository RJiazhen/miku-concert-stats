import type { Locale } from '../../shared/i18n/locale.ts'

/**
 * UI messages for the `feedback` feature area.
 * All supported locales sit side by side; the i18n-split Nuxt module
 * projects each locale into `i18n/locales/<locale>/feedback.json`.
 */
export default {
  'feedback.button': {
    zh: '反馈',
    'zh-Hant': '回饋',
    ja: 'フィードバック',
    en: 'Feedback',
  },
  'feedback.cancel': {
    zh: '取消',
    'zh-Hant': '取消',
    ja: 'キャンセル',
    en: 'Cancel',
  },
  'feedback.close': {
    zh: '关闭',
    'zh-Hant': '關閉',
    ja: '閉じる',
    en: 'Close',
  },
  'feedback.errorDescription': {
    zh: '问题描述',
    'zh-Hant': '問題描述',
    ja: '問題の説明',
    en: 'What is wrong?',
  },
  'feedback.errorDescriptionPlaceholder': {
    zh: '哪个数据不对？期望是什么？',
    'zh-Hant': '哪個資料不對？期望是什麼？',
    ja: 'どのデータが違いますか？正しい内容は何ですか？',
    en: 'Which data is wrong, and what should it be?',
  },
  'feedback.errorInvalidSource': {
    zh: '数据来源链接必须是 http 或 https 地址',
    'zh-Hant': '資料來源連結必須是 http 或 https 網址',
    ja: '出典リンクは http または https の URL にしてください',
    en: 'The data source link must be an http or https URL',
  },
  'feedback.errorNeedDescription': {
    zh: '请先填写问题描述',
    'zh-Hant': '請先填寫問題描述',
    ja: '問題の説明を入力してください',
    en: 'Please describe the problem first',
  },
  'feedback.errorSource': {
    zh: '正确的数据来源（可选）',
    'zh-Hant': '正確的資料來源（可選）',
    ja: '正しいデータの出典（任意）',
    en: 'Correct data source (optional)',
  },
  'feedback.errorSourceHelp': {
    zh: '如果知道正确数据的出处，把网页地址贴在这里，例如 VocaDB 的链接。',
    'zh-Hant': '如果知道正確資料的出處，把網址貼在這裡，例如 VocaDB 的連結。',
    ja: '正しいデータの出典が分かる場合、VocaDB のリンクなど Web ページの URL を貼ってください。',
    en: 'If you know where the correct data comes from, paste the URL here, for example a VocaDB link.',
  },
  'feedback.failed': {
    zh: '提交失败，请稍后再试。已填写的内容仍保存在本地。',
    'zh-Hant': '提交失敗，請稍後再試。已填寫的內容仍儲存在本地。',
    ja: '送信に失敗しました。時間をおいて再度お試しください。入力内容はローカルに保存されています。',
    en: 'Could not send. Please try again later; what you typed is still saved locally.',
  },
  'feedback.featureDescription': {
    zh: '功能描述',
    'zh-Hant': '功能描述',
    ja: '機能の説明',
    en: 'What do you want?',
  },
  'feedback.featureDescriptionPlaceholder': {
    zh: '想要什么功能？希望它怎么工作？',
    'zh-Hant': '想要什麼功能？希望它怎麼運作？',
    ja: 'どんな機能が欲しいですか？どう動いてほしいですか？',
    en: 'Which feature would you like, and how should it work?',
  },
  'feedback.featureInvalidSource': {
    zh: '相关链接必须是 http 或 https 地址',
    'zh-Hant': '相關連結必須是 http 或 https 網址',
    ja: '関連リンクは http または https の URL にしてください',
    en: 'The related link must be an http or https URL',
  },
  'feedback.featureNeedDescription': {
    zh: '请先填写功能描述',
    'zh-Hant': '請先填寫功能描述',
    ja: '機能の説明を入力してください',
    en: 'Please describe the feature first',
  },
  'feedback.featureSource': {
    zh: '相关链接（可选）',
    'zh-Hant': '相關連結（可選）',
    ja: '関連リンク（任意）',
    en: 'Related links (optional)',
  },
  'feedback.featureSourceHelp': {
    zh: '如果有介绍这个功能的网站或文档，把网址贴在这里。',
    'zh-Hant': '如果有介紹這個功能的網站或文件，把網址貼在這裡。',
    ja: 'この機能を紹介しているサイトや資料があれば、その URL を貼ってください。',
    en: 'If a website or document describes this feature, paste the URL here.',
  },
  'feedback.kind': {
    zh: '反馈类型',
    'zh-Hant': '回饋類型',
    ja: '種類',
    en: 'Type',
  },
  'feedback.kindError': {
    zh: '页面有错误',
    'zh-Hant': '頁面有錯誤',
    ja: 'ページの誤り',
    en: 'Something is wrong',
  },
  'feedback.kindFeature': {
    zh: '请求新功能',
    'zh-Hant': '請求新功能',
    ja: '新機能のリクエスト',
    en: 'Feature request',
  },
  'feedback.pageTitle': {
    zh: '页面标题',
    'zh-Hant': '頁面標題',
    ja: 'ページタイトル',
    en: 'Page title',
  },
  'feedback.pageUrl': {
    zh: '页面链接',
    'zh-Hant': '頁面連結',
    ja: 'ページ URL',
    en: 'Page URL',
  },
  'feedback.submit': {
    zh: '提交',
    'zh-Hant': '提交',
    ja: '送信',
    en: 'Send',
  },
  'feedback.successDesc': {
    zh: '编号 {id}，稍后会自动关闭。',
    'zh-Hant': '編號 {id}，稍後會自動關閉。',
    ja: '番号 {id}。まもなく自動で閉じます。',
    en: 'Reference {id}; this will close automatically.',
  },
  'feedback.successTitle': {
    zh: '已收到，谢谢！',
    'zh-Hant': '已收到，謝謝！',
    ja: '受け付けました。ありがとうございます！',
    en: 'Received, thank you!',
  },
  'feedback.title': {
    zh: '反馈',
    'zh-Hant': '回饋',
    ja: 'フィードバック',
    en: 'Feedback',
  },
} as const satisfies Record<string, Record<Locale, string>>
