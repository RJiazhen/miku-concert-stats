# 貢献ガイド

[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md) | [繁體中文](CONTRIBUTING.zh-Hant.md) | **日本語**

初音ミクコンサートセットリスト統計への貢献ありがとうございます。

## 前提

- Node.js **≥ 22.12**
- [pnpm](https://pnpm.io/) 12（`package.json` の `packageManager` 参照）— Vite+ が内部で利用
- `better-sqlite3` 用のネイティブビルド環境（macOS は Xcode CLT など）

**日常開発では [Vite+](https://viteplus.dev/)（`vp`）を推奨**します（install / dev / test / lint / build）。リポジトリの `devDependencies` に `vite-plus` があります。初回インストール後は `node_modules` の `vp` を使ってください。Vite+ が包まないスクリプトだけ `pnpm` を直接呼びます（例: `vp run collect` / `pnpm collect`）。

日常の UI・統計・テスト・カタログ作業に **Cloudflare アカウントは不要**です。

## クイックスタート

```bash
vp install
vp test
vp dev            # カタログ再構築後に nuxt dev
```

表示されたローカル URL を開きます（既定 3000、`--port` 可）。

## Cloudflare なしでできること

| 領域 | ローカル |
| --- | --- |
| ランキング、タイムライン、シリーズ/公演/楽曲、検索 | 可（`vp dev`） |
| 共有統計 / セットリスト / 初演ロジック | 可（`vp test`） |
| `catalog.sqlite` と静的 `/api/v1` の再構築 | 可（`vp run build:catalog`） |
| 収集 / 派生スクリプト | 可（`vp run collect…`。VocaDB にはネットワークが必要。サイト起動に collect は不要） |
| フィードバック / 管理画面 / Access / Analytics Engine | 不可 — [cloudflare.ja.md](cloudflare.ja.md) |

コミット済みの `data/increments/*.sql` だけでカタログをビルドできます。`vp run collect` はメンテナーが上流を更新するとき用です。

## ドキュメント

| 文書 | 用途 |
| --- | --- |
| [local-development.ja.md](local-development.ja.md) | ローカルコマンド、想定ギャップ、任意のデータスクリプト |
| [architecture.ja.md](architecture.ja.md) | モジュールとデータフロー |
| [cloudflare.ja.md](cloudflare.ja.md) | デプロイ、KV、Access、分析（メンテナー） |
| [data-pipeline.zh-CN.md](data-pipeline.zh-CN.md) | 詳細な採録ルール（簡体字中国語） |

## テスト

```bash
vp test
vp lint
vp run typecheck   # または pnpm typecheck
```

集計口径・外部仕様のあるパーサ・少数の実 SQL アサーションに絞ってテストを書いてください。`.cursor/rules/testing.mdc` 参照。

## Pull request

- 小さく焦点を絞った変更を推奨。
- 秘密情報、`.dev.vars`、本番 Cloudflare リソース ID をコミットしない。
- Access / 分析などアカウント固有の変数は git に入れない（ダッシュボードへ）。fork は `FEEDBACK` KV の namespace id を自前のものに置き換える。
