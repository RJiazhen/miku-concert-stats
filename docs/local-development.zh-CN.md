# 本地开发

[English](local-development.md) | **简体中文** | [繁體中文](local-development.zh-Hant.md) | [日本語](local-development.ja.md)

## 安装与运行

```bash
pnpm install
pnpm test
vp dev                 # 重建目录后启动 nuxt dev
vp dev --port 3165     # 可选端口
```

`vp` 为 vite-plus。等价命令：`pnpm dev` → `scripts/dev.ts`。

并行 worktree 若碰到 Nuxt lock，可用 `NUXT_IGNORE_LOCK=1 vp dev`。

## 目录构建

```bash
pnpm build:catalog     # 由 schema + increments 生成 public/data/catalog.sqlite（及 .gz）
pnpm build:api         # 静态 /api/v1 资源
```

浏览站点不必先跑 `pnpm collect`；仓库里已有的增量 SQL 足够。

## 可选数据脚本

```bash
pnpm collect                 # 从 VocaDB 刷新（限速；缓存在 data/cache/）
pnpm collect:albums
pnpm collect:vocalists
pnpm collect:producers
pnpm derive:setlists --check
pnpm locations
pnpm report:setlist
pnpm report:producers
```

`.cursor/skills/` 下的百科采编脚本可能需要 `uv` / Python，与日常改 UI 无关。

## 本地预期缺口（无 Cloudflare）

| 功能 | 本地表现 |
| --- | --- |
| `POST /api/feedback` | **503**（`nuxt dev` 无 KV） |
| `POST /api/analytics/pageview` | **204** 空操作 |
| `/admin/*` | 只渲染外壳；`import.meta.dev` 下不跳转 Access；无真实 KV 数据 |
| Web Analytics beacon | `NUXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` 为空时不注入 |

## 生产构建（需要你自己的 Cloudflare 项目）

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

细节见 [cloudflare.zh-CN.md](cloudflare.zh-CN.md)。
