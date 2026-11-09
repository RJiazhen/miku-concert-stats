# Cloudflare 部署与维护

**English** | **简体中文** | [繁體中文](cloudflare.zh-Hant.md) | [日本語](cloudflare.ja.md)

生产环境跑在 Cloudflare Workers 上。**Fork 与本地改 UI 不必配置 Access / 分析变量。** 账号相关设置优先放在 Cloudflare 控制台，避免写进 git。

## 放哪里

| 绑定 / 变量 | 用途 | 是否写入仓库 `wrangler.toml` |
| --- | --- | --- |
| `FEEDBACK` KV `id` | 反馈存储 | **是** — `wrangler deploy` 需要资源 id（不是密钥；fork 请换成自己的命名空间） |
| `PAGEVIEWS` Analytics Engine | 第一方浏览量 | **是** — 仅 dataset 名 |
| `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` | `/admin` 与管理 API 的 Access | **否** — 只放控制台 Variables |
| `NUXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` | Web Analytics beacon | **否** — 控制台 Variables |
| `CF_ACCOUNT_TAG` / `CF_ANALYTICS_HOST` | GraphQL 分析范围 | **否** — 控制台 Variables |
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

## 部署

```bash
pnpm build
pnpm exec wrangler --cwd .output deploy
```

Workers Builds 在 `main` 上通常执行 `pnpm build` 再 `npx wrangler deploy`，并设 `NODE_VERSION=22`。使用 `PAGEVIEWS` 前请在控制台启用 Analytics Engine（未启用时上传可能报 `code 10089`）。

## 本地预期

`nuxt dev` 不挂 FEEDBACK KV。开发模式下后台外壳不跳转 Access。见 [local-development.zh-CN.md](local-development.zh-CN.md)。
