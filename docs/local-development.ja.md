# ローカル開発

[English](local-development.md) | [简体中文](local-development.zh-CN.md) | [繁體中文](local-development.zh-Hant.md) | **日本語**

## インストールと起動

```bash
pnpm install
pnpm test
vp dev                 # カタログ再構築後に nuxt dev
vp dev --port 3165     # 任意のポート
```

`vp` は vite-plus。同等: `pnpm dev` → `scripts/dev.ts`。

並列 worktree で Nuxt lock が衝突する場合は `NUXT_IGNORE_LOCK=1 vp dev` で構いません。

## カタログビルド

```bash
pnpm build:catalog     # schema + increments から public/data/catalog.sqlite（+ .gz）
pnpm build:api         # 静的 /api/v1
```

サイト閲覧に `pnpm collect` は不要です。git 上の increments で足ります。

## 任意のデータスクリプト

```bash
pnpm collect                 # VocaDB から更新（レート制限; data/cache/）
pnpm collect:albums
pnpm collect:vocalists
pnpm collect:producers
pnpm derive:setlists --check
pnpm locations
pnpm report:setlist
pnpm report:producers
```

`.cursor/skills/` の Wiki 採録は `uv` / Python が必要な場合があり、通常の UI 作業には不要です。

## 想定されるローカルギャップ（Cloudflare なし）

| 機能 | ローカル挙動 |
| --- | --- |
| `POST /api/feedback` | **503**（`nuxt dev` に KV なし） |
| `POST /api/analytics/pageview` | **204** 何もしない |
| `/admin/*` | シェルのみ。`import.meta.dev` では Access へ飛ばない。実 KV なし |
| Web Analytics beacon | トークン空なら非注入 |

## 本番ビルド（各自の Cloudflare プロジェクトが必要）

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

詳細は [cloudflare.ja.md](cloudflare.ja.md)。
