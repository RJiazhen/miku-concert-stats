# Cloudflare 部署与维护

**English** | **简体中文** | [繁體中文](cloudflare.zh-Hant.md) | [日本語](cloudflare.ja.md)

生产环境跑在 Cloudflare Workers 上。**Fork 与本地改 UI 不必配置 Access / 分析变量。** 账号相关设置优先放在 Cloudflare 控制台，避免写进 git。

## 放哪里

| 绑定 / 变量 | 用途 | 是否写入仓库 `wrangler.toml` |
| --- | --- | --- |
| `FEEDBACK` KV `id` | 反馈存储 | **是** — `wrangler deploy` 需要资源 id（不是密钥；fork 请换成自己的命名空间） |
| `PAGEVIEWS` Analytics Engine | 第一方浏览量 | **是** — 仅 dataset 名 |
| `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` | `/admin` 与管理 API 的 Access | **否** — 只放控制台 Variables |
| `CF_ACCOUNT_TAG` / `CF_ANALYTICS_HOST` | 第一方 Analytics Engine 查询范围 | **否** — 控制台 Variables |
| Secret `CF_ANALYTICS_API_TOKEN` | Account Analytics Read | **否** — Secrets / `wrangler secret put` |

不要把这些变量提交成空字符串：`wrangler deploy` 会用 `""` 覆盖控制台里的值，从而锁死后台 / 分析。应直接从文件中省略。

Worker 上缺少 Access → 管理接口全部 **401**。缺少 KV 绑定 → 公开反馈 **503**。

## Access destination

Self-hosted 应用至少包含：

- `/admin`、`/admin/*`
- `/api/admin/*`
- `/api/feedback/*`（管理用 list/status/detail）

不要写成 `/api/feedback*`，否则会挡住公开的 `POST /api/feedback`。

## 后台

- `/admin` 在配置 Access 后会转到 `/admin/feedback`
- `/admin/feedback`、`/admin/data`、`/admin/system`、`/admin/analytics`
- 公开页眉不链到后台；Access 登录后直接输入 URL

## 部署（生产）

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

Workers Builds 在 `main` 上通常执行 `pnpm build` 再 `npx wrangler deploy`，并设 `NODE_VERSION=22`。使用 `PAGEVIEWS` 前请在控制台启用 Analytics Engine（未启用时上传可能报 `code 10089`）。开启 Preview 时**不要**改生产分支或生产 Deploy command。

## 分支 Preview（Worker Previews）

非 `main` 分支用 **Worker Previews**，不再用 `npx wrangler versions upload`。项目内 wrangler 需 `>= 4.135.0`（本仓库 `^4.149.0`）。

### 仓库配置

`wrangler.toml` 必须有 `previews` 块，可以为空：`previews = { }`。Preview **不会继承**生产绑定与变量。

本仓库故意保持空块：除非维护者明确同意共享，否则不要把 preview 的 `FEEDBACK` KV / `PAGEVIEWS` 指到生产资源。没有 preview 安全绑定时，公开页仍可 SSR；反馈为 **503**，后台 / 分析不可用。以后若要隔离资源，写在 `previews` 下（如 `[[previews.kv_namespaces]]`），生产 id 只留在顶层。见 [Configuration](https://developers.cloudflare.com/workers/previews/configuration/)。

### 本地 / CLI

```bash
pnpm build
pnpm exec wrangler preview
```

`nuxt build` 会写 `.wrangler/deploy/config.json`，根目录 wrangler 会解析到 `.output`（与 Workers Builds 相同）。有该重定向时不要对 Builds / `wrangler preview` 再加 `--cwd .output`。成功时会打印稳定的 **Preview URL** 与当次的 **Unique Deployment URL**。

### Workers Builds（控制台）

保留 GitHub 应用 **cloudflare-workers-and-pages** / 检查名 **Workers Builds: miku-concert-stats**；除非证明该集成彻底坏掉，不要另开一套 CI 部署。

| 项 | 值 |
| --- | --- |
| 生产分支 | `main` |
| Build command | `pnpm build` |
| Deploy command（生产） | `npx wrangler deploy` |
| Preview command | `npx wrangler preview` |
| `NODE_VERSION` | `22`（生产与 preview 各一份） |

**开启 Preview Builds：** Worker → **Settings → Build → Branch control** → 勾选 **Enable Preview Builds**。

**在 Worker Previews 之前就接好 Builds 的旧 Worker** 仍走旧的 `versions upload`，直到完成**一次性、不可逆**控制台切换：

1. Worker → **Settings → Builds**
2. **Set up Worker Previews** 横幅点 **Set up**
3. 按需配置 Preview 变量 / 绑定（可与空 `previews` 一致，先不配）
4. 确认 Preview command 为 `npx wrangler preview`
5. 点 **Switch to Worker Previews**

切换前，PR check 可能仍走旧路径，或立刻失败且无日志。切换后，非 `main` 推送会创建 / 更新 Preview；URL 在 Worker 的 **Previews** 区，以及 GitHub check / PR 评论（若提供方会发）。

总览：[Worker Previews](https://developers.cloudflare.com/workers/previews/)。分支控制：[Build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)。

## 本地预期

`nuxt dev` 不挂 FEEDBACK KV。开发模式下后台外壳不跳转 Access。见 [local-development.zh-CN.md](local-development.zh-CN.md)。
