# Cloudflare デプロイと運用

[English](cloudflare.md) | [简体中文](cloudflare.zh-CN.md) | [繁體中文](cloudflare.zh-Hant.md) | **日本語**

本番は Cloudflare Workers 上です。**Fork やローカル UI 作業ではこれらのバインドを埋める必要はありません。** 実アカウント / KV / Access の値は git に入れず、ダッシュボード・Wrangler secret・無視対象の `.dev.vars` を使います。

## `wrangler.toml` のバインド（テンプレート）

| バインド / 変数 | 用途 | リポジトリ既定 |
| --- | --- | --- |
| `FEEDBACK` KV `id` | フィードバック保存 | 空文字 |
| `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` | `/admin` と管理 API の Access | 空 |
| `NUXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` | Web Analytics beacon | 空 |
| `CF_ACCOUNT_TAG` | GraphQL 分析用アカウント ID | 空 |
| `CF_ANALYTICS_HOST` | 分析 host フィルタ | 空 |
| `PAGEVIEWS` Analytics Engine | ファーストパーティ PV | dataset 名のみ |
| Secret `CF_ANALYTICS_API_TOKEN` | Account Analytics Read | `wrangler secret put` のみ |

Access が空 → 管理 API はすべて **401**。KV なし → 公開フィードバックは **503**。

## Access destinations

Self-hosted アプリに少なくとも次を含める：

- `/admin`, `/admin/*`
- `/api/admin/*`
- `/api/feedback/*`（管理の list/status/detail）

`/api/feedback*` は使わない（公開 `POST /api/feedback` まで塞ぐため）。

## 管理画面

- Access 設定後、`/admin` は `/admin/feedback` へ
- `/admin/feedback`, `/admin/data`, `/admin/system`, `/admin/analytics`
- 公開ヘッダーからはリンクしない。Access ログイン後に URL 直打ち

## デプロイ

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

Workers Builds は通常 `main` で `pnpm build` → `npx wrangler deploy`、`NODE_VERSION=22`。`PAGEVIEWS` 利用前にコンソールで Analytics Engine を有効化（無効だと `code 10089` になり得る）。

## ローカル

`nuxt dev` は FEEDBACK KV を付けません。開発時の管理シェルは Access へ飛ばしません。[local-development.ja.md](local-development.ja.md) 参照。
