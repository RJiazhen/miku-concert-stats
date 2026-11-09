# 貢献ガイド

[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md) | [繁體中文](CONTRIBUTING.zh-Hant.md) | **日本語**

初音ミクコンサートセットリスト統計への貢献ありがとうございます。

## 前提

- Node.js **≥ 22.12**
- [pnpm](https://pnpm.io/) 12（`package.json` の `packageManager` 参照）
- `better-sqlite3` 用のネイティブビルド環境（macOS は Xcode CLT など）

日常の UI・統計・テスト・カタログ作業に **Cloudflare アカウントは不要**です。

## クイックスタート

```bash
pnpm install
pnpm test
vp dev            # または pnpm dev：カタログ再構築後に nuxt dev
```

表示されたローカル URL を開きます（既定 3000、`--port` 可）。

## Cloudflare なしでできること

| 領域 | ローカル |
| --- | --- |
| ランキング、タイムライン、シリーズ/公演/楽曲、検索 | 可（`vp dev`） |
| 共有統計 / セットリスト / 初演ロジック | 可（`pnpm test`） |
| `catalog.sqlite` と静的 `/api/v1` の再構築 | 可 |
| 収集 / 派生スクリプト | 可（VocaDB にはネットワークが必要。サイト起動に collect は不要） |
| フィードバック / 管理画面 / Access / Analytics Engine | 不可 — [docs/cloudflare.ja.md](docs/cloudflare.ja.md) |

コミット済みの `data/increments/*.sql` だけでカタログをビルドできます。`pnpm collect` はメンテナーが上流を更新するとき用です。

## ドキュメント

| 文書 | 用途 |
| --- | --- |
| [docs/local-development.ja.md](docs/local-development.ja.md) | ローカルコマンド、想定ギャップ、任意のデータスクリプト |
| [docs/architecture.ja.md](docs/architecture.ja.md) | モジュールとデータフロー |
| [docs/cloudflare.ja.md](docs/cloudflare.ja.md) | デプロイ、KV、Access、分析（メンテナー） |
| [docs/data-pipeline.zh-CN.md](docs/data-pipeline.zh-CN.md) | 詳細な採録ルール（簡体字中国語） |

## テスト

```bash
pnpm test
pnpm lint
pnpm typecheck
```

集計口径・外部仕様のあるパーサ・少数の実 SQL アサーションに絞ってテストを書いてください。`.cursor/rules/testing.mdc` 参照。

## Pull request

- 小さく焦点を絞った変更を推奨。
- 秘密情報、`.dev.vars`、本番 Cloudflare リソース ID をコミットしない。
- リポジトリ内の `wrangler.toml` の ID は空のままにし、各自の Cloudflare プロジェクトで設定する。
