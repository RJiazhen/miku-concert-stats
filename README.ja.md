# 初音ミクコンサートセットリスト統計

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-Hant.md) | **日本語**

Crypton 主催の初音ミクコンサートのセットリストをブラウザ上で集計・比較します。日常の集計はサーバーでは行いません。Cloudflare Worker は SSR と一部 API（フィードバック、管理画面、動的 `/api/v1`）のみを担当し、ランキングと検索はブラウザにダウンロードしたカタログ上で完結します。

**公開サイト:** <https://miku-concert-stats.rjiazhen.top>

## 収録シリーズ

マジカルミライ、MIKU EXPO、MIKU WITH YOU、初音ミクシンフォニー、初音ミクライブパーティー、SNOW MIKU LIVE!、およびリポジトリ内で補完した関連公演。

## サイトマップ

| ルート | 内容 |
| --- | --- |
| `/` | 楽曲ランキング（公演数 / 公演単位）、シリーズ・年・キャラ・キーワード絞り込み |
| `/raw` | 生データ、横断セットリスト比較、品質レポート |
| `/report` | 同一シリーズ年度のセットリスト差分レビュー |
| `/songs/{id}` | 楽曲詳細：版、出演、PV リンク |
| `/shows/{id}` | 公演詳細：日程、セットリスト、ローテーション |
| `/series` | シリーズ一覧 |
| `/series/{id}` | シリーズ詳細 |
| `/timeline` | タイムライン |
| `/producers` | プロデューサーランキング |

ヘッダー検索はダウンロード済みローカルカタログ内のみを対象にします。

## データ出典

公式・百科（初音ミク Wiki など）を優先。[VocaDB](https://vocadb.net/) は曲名・曲 ID・日付の対等な参照源であり、唯一の権威ではありません。VocaDB 由来の内容を再配布する場合は VocaDB へリンクし、[VocaDB License](https://wiki.vocadb.net/docs/license) に従ってください。ジャケット・歌詞・公式ロゴは扱いません。

## AI skill

鍵不要の公開 Agent Skill：

```bash
npx skills add RJiazhen/miku-concert-stats@query-concert-stats
```

または <https://miku-concert-stats.rjiazhen.top/skill.md> / [`skills/query-concert-stats/SKILL.md`](skills/query-concert-stats/SKILL.md) を AI に渡してください。

## 開発 / 貢献

[`CONTRIBUTING.ja.md`](CONTRIBUTING.ja.md) と [`docs/local-development.ja.md`](docs/local-development.ja.md) を参照。UI・統計・テスト・カタログ構築の**ほとんどは Cloudflare アカウントなし**で進められます。デプロイと管理画面は [`docs/cloudflare.ja.md`](docs/cloudflare.ja.md)。アーキ概要は [`docs/architecture.ja.md`](docs/architecture.ja.md)。

## ライセンス

[MIT](LICENSE)
