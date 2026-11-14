---
name: continue
description: 推进 miku-concert-stats 的一个开发任务一个阶段：首次调用新建 worktree 开发（有对得上的 issue 才记录，没有就直接做、不追问用户）、提交到任务分支，然后起本地开发服务器交给用户检查；用户确认后再次调用才把整条分支 squash 合入 main（有 issue 时提交信息带 `Closes #N`）、push、等 Workers Builds，成功后核对 issue 已关闭并清理 worktree 与分支；没有合并权限时改为推送分支并开 PR。Use when the user asks to 开始这个任务, 接着做, 继续改, 交付给我看看, 检查完上线, 合并部署, or ship current changes.
disable-model-invocation: true
---

# /continue — 开发 → 用户验收 → 合并上线

> 本仓库专用。固定环境操作用 `vp run task`（`scripts/task.ts`），agent **读命令输出**，不要手抄 shell 配方。每次调用只推进一个阶段。

## Agent 只判断这些

- **阶段**：Start（无本任务 worktree + 有需求）/ Develop（有 worktree + 未确认或带新需求）/ Ship（有 worktree + 用户明确确认：`1` / 确认 / 可以 / 通过 / 上线 / 合并 / 部署）。带新需求一律 Develop，不要自作主张 merge。
- **本任务 worktree**：只认本对话新建或上一轮汇报过的那个；别人的 worktree 不接管；分不清时 AskQuestion。
- **实现内容**：改什么、测什么、提交说明写什么（产品判断）。测试 / 样式 / 数据口径仍遵守 `.cursor/rules/testing.mdc`、`ui-style-review.mdc`、`data-sources.mdc`。
- **纯文档**（仅 `docs/`、`.cursor/rules/`、`.cursor/skills/`、`README`）：直接在 `$MAIN` 改、提交并 `git push origin main`，再用 `vp run task --` 之外的方式等 Workers Builds（或在 main 上 `gh api …/check-runs`）；不建 worktree。

## 固定命令（读 stdout 的 `key=value`）

```bash
MAIN="$HOME/projects/full-stack/miku-concert-stats.worktrees/main"
# 快照：main / worktrees / 焦点任务 / dirty / ahead / issue / can_push / dev_url
vp run task -- status
vp run task -- status --worktree <branch>

# Start：从 origin/main 建 worktree、登记 workspace、写 tmp/task-issue
vp run task -- start <type-short-kebab> [--issue N]

# 开发服务器：常驻 Shell（block_until_ms: 0）在 worktree 里起，不要传 --port
cd "$WORKTREE" && env NUXT_IGNORE_LOCK=1 vp run dev
# 读 Local: URL，或：
vp run task -- dev-url <branch> [--wait]
vp run task -- dev-stop <branch>   # 仅 Ship 成功后或用户明确要求停

# Ship（用户已确认）：squash → push → 等 Workers Builds → 关 issue → 清理
vp run task -- ship <branch> --message "<一句话说明这次改了什么>"
```

生产地址与 Workers Builds 名称由 `task status` / `task ship` 输出；仓库 `RJiazhen/miku-concert-stats`。

## Phase：Start

1. `vp run task -- start <branch> [--issue N]`（用户点了号或 `gh issue list --search` 唯一命中才带 `--issue`；否则不带、不追问）。
2. 在**该** worktree 实现；读写用其绝对路径，不改 `$MAIN` 业务文件。
3. 提交到任务分支（`git add` 具体路径，勿 `git add -A`；简短祈使句英文，无 co-author）。`can_push=true` 时 `git push -u origin <branch>`。
4. 用户可见改动：起常驻 `vp run dev`，用 `vp run task -- dev-url <branch> --wait` 取地址；不要在回合结束时杀掉。
5. 汇报 worktree / 分支 / issue（或未关联）/ 改动 / 验证 / `dev_url`，停。不 merge、不开 PR。

## Phase：Develop

在本任务 worktree 改 → 提交（可 push）→ `dev-url` 确认仍在（死了再起）→ 汇报 → 停。无关新需求另 `task start`，不混分支。

## Phase：Ship

1. `vp run task -- status --worktree <branch>`：dirty 先提交；确认是本任务 worktree。
2. `vp run task -- ship <branch> --message "..."`（issue 时脚本自动加 `Closes #N`）。
3. 读输出：`ok=true` + `deploy_conclusion=success` 才算完；`can_push=false` 时按输出 hint 推分支开 PR，不碰 main。
4. 失败（检查红灯、冲突、deploy 失败）停下修；不要 `--force` 清 worktree，不要绕过 Workers Builds 本地 `wrangler deploy`（除非用户明确要求）。

## 不要做

- 不要手写 worktree / workspace / 端口登记 / squash / 轮询 / 清理的长 shell；交给 `vp run task`。
- 不要停别人的开发服务器或删别人的 worktree。
- 不要在用户确认前 merge / push `main`。
