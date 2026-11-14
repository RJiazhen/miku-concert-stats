# Cloudflare デプロイと運用

[English](cloudflare.md) | [简体中文](cloudflare.zh-CN.md) | [繁體中文](cloudflare.zh-Hant.md) | **日本語**

本番は Cloudflare Workers 上です。**Fork やローカル UI に Access / 分析変数は不要**です。アカウント固有の値はダッシュボードに置き、git に入れません。

## 何をどこに置くか

| バインド / 変数 | 用途 | git の `wrangler.toml` に書く？ |
| --- | --- | --- |
| `FEEDBACK` KV `id` | フィードバック保存 | **はい** — `wrangler deploy` にリソース ID が必要（秘密ではない。fork は自前の namespace に置換） |
| `PAGEVIEWS` Analytics Engine | ファーストパーティ PV | **はい** — dataset 名のみ |
| `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` | `/admin` と管理 API の Access | **いいえ** — ダッシュボード Variables |
| `CF_ACCOUNT_TAG` / `CF_ANALYTICS_HOST` | ファーストパーティ Analytics Engine の範囲 | **いいえ** |
| Secret `CF_ANALYTICS_API_TOKEN` | Account Analytics Read | **いいえ** — Secrets |

空文字でコミットしないこと。`wrangler deploy` がダッシュボードの値を `""` で上書きします。ファイルから省略してください。

Access なし → 管理 API は **401**。KV なし → 公開フィードバックは **503**。

## Access destinations

- `/admin`, `/admin/*`
- `/api/admin/*`
- `/api/feedback/*`

`/api/feedback*` は使わない。

## デプロイ（本番）

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

Workers Builds：`pnpm build` → `npx wrangler deploy`、`NODE_VERSION=22`。Preview を有効にするとき本番ブランチや本番 Deploy command は変えない。

## ブランチ Preview（Worker Previews）

非 `main` は **Worker Previews**（`npx wrangler preview`）。`npx wrangler versions upload` は使わない。`wrangler.toml` に空でもよい `[previews]` テーブルが必要（`[[...]]` 配列の直後にインライン `previews = { }` を書かない）。Preview は本番バインドを継承しない。このリポジトリは空のままにし、preview の `FEEDBACK` / `PAGEVIEWS` を本番に向けない。

メンテナー手動 Preview（現状の対応経路・PR レビュー用）：`pnpm build` のあと `pnpm exec wrangler preview`。ダッシュボードの **Set up Worker Previews** / **Enable Preview Builds** は**不要**。Workers Builds の自動 PR Preview コメントだけがそれらのスイッチを要し、一度きりで不可逆（承認なしではオンにしない）。詳細は [cloudflare.md](cloudflare.md)。

## ローカル

[local-development.ja.md](local-development.ja.md) 参照。
