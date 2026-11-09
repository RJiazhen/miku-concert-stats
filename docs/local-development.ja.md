# ローカル開発

[English](local-development.md) | [简体中文](local-development.zh-CN.md) | [繁體中文](local-development.zh-Hant.md) | **日本語**

## ツール: Vite+ を推奨

日常作業は **[Vite+](https://viteplus.dev/)（`vp`）** を使ってください: `vp install` / `vp dev` / `vp test` / `vp lint`、および `vp build` / `vp run <script>`。パッケージマネージャは引き続き pnpm（`package.json` の `packageManager`）で、Vite+ がそれを駆動します。`vp` を通さないときだけ素の `pnpm <script>` を使います。

## インストールと起動

```bash
vp install
vp test
vp dev                 # カタログ再構築後に nuxt dev
vp dev --port 3165     # 任意のポート
```

`vp` は `vite-plus` の開発依存です。まっさらな環境では一度 `pnpm install` してから `pnpm exec vp` / `node_modules/.bin/vp` を使えます。

並列 worktree で Nuxt lock が衝突する場合は `NUXT_IGNORE_LOCK=1 vp dev` で構いません。

## カタログビルド

```bash
vp run build:catalog   # schema + increments から public/data/catalog.sqlite（+ .gz）
vp run build:api       # 静的 /api/v1
```

サイト閲覧に `vp run collect` は不要です。git 上の increments で足ります。

## 任意のデータスクリプト

```bash
vp run collect                 # VocaDB から更新（レート制限; data/cache/）
vp run collect:albums
vp run collect:vocalists
vp run collect:producers
vp run derive:setlists -- --check
vp run locations
vp run report:setlist
vp run report:producers
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
vp run build           # または pnpm build — カタログ prebuild + nuxt build
pnpm exec wrangler --cwd .output deploy
```

詳細は [cloudflare.ja.md](cloudflare.ja.md)。
