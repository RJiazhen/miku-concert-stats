# 本地开发

[English](local-development.md) | **简体中文** | [繁體中文](local-development.zh-Hant.md) | [日本語](local-development.ja.md)

## 工具：优先 Vite+

日常开发请优先使用 **[Vite+](https://viteplus.dev/)（`vp`）**：`vp install`、`vp dev`、`vp test`、`vp lint`，以及 `vp build` / `vp run <script>`。包管理器仍是 pnpm（见 `package.json` 的 `packageManager`），由 Vite+ 驱动。只有不走 `vp` 时才直接写 `pnpm <script>`。

## 安装与运行

```bash
vp install
vp test
vp dev                 # 重建目录后启动 nuxt dev
vp dev --port 3165     # 可选端口
```

`vp` 来自 `vite-plus` 开发依赖。全新机器可先 `pnpm install` 一次，再用 `pnpm exec vp` 或 `node_modules/.bin/vp`。

并行 worktree 若碰到 Nuxt lock，可用 `NUXT_IGNORE_LOCK=1 vp dev`。

## 目录构建

```bash
vp run build:catalog   # 由 schema + increments 生成 public/data/catalog.sqlite（及 .gz）
vp run build:api       # 静态 /api/v1 资源
```

浏览站点不必先跑 `vp run collect`；仓库里已有的增量 SQL 足够。

## 可选数据脚本

```bash
vp run collect                 # 从 VocaDB 刷新（限速；缓存在 data/cache/）
vp run collect:albums
vp run collect:vocalists
vp run collect:producers
vp run derive:setlists -- --check
vp run locations
vp run report:setlist
vp run report:producers
```

`.cursor/skills/` 下的百科采编脚本可能需要 `uv` / Python，与日常改 UI 无关。

## 本地预期缺口（无 Cloudflare）

| 功能 | 本地表现 |
| --- | --- |
| `POST /api/feedback` | **503**（`nuxt dev` 无 KV） |
| `POST /api/analytics/pageview` | **204** 空操作 |
| `/admin/*` | 只渲染外壳；`import.meta.dev` 下不跳转 Access；无真实 KV 数据 |

## 生产构建（需要你自己的 Cloudflare 项目）

```bash
vp run build           # 或：pnpm build — 目录 prebuild + nuxt build
pnpm exec wrangler --cwd .output deploy
```

细节见 [cloudflare.zh-CN.md](cloudflare.zh-CN.md)。
