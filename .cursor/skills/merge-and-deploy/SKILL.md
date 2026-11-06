---
name: merge-and-deploy
description: Commit the current worktree, merge it into main, push to GitHub, and confirm the Cloudflare Workers production build finished. Use when the user asks to 部署上线, 合并到 main 并部署, ship current changes to production, or push to trigger a production deploy.
disable-model-invocation: true
---

# 合并到 main 并触发生产部署

> 可安装给外部 agent 的公开 skill 在仓库根的 `skills/`；本文件是 Cursor 专用的内部流程，不发布。

## 前提事实

- 仓库 `RJiazhen/miku-concert-stats`，远端 `origin`。
- 主检出的固定路径：`~/projects/full-stack/miku-concert-stats.worktrees/main`，分支 `main`。其他任务在 `.../miku-concert-stats.worktrees/<branch>` 的 worktree 里。
- 生产地址 <https://miku-concert-stats.rjiazhen.top>。
- 生产部署由 Workers Builds（Git 集成）完成：push 到 `main` 后自动跑 `pnpm build` 并 `npx wrangler deploy`。它在 GitHub 上表现为名为 `Workers Builds: miku-concert-stats` 的 check run。
- 不要用 `git checkout` 切换主检出，也不要在 feat worktree 里改 `main`。
- 成功标准只有一条：这次 push 触发的 Workers Builds check run 变成 `completed success`。不用 curl 线上页面，也不用 `wrangler deployments list` 核对内容。

## 流程

### 1. 看清当前状态

```bash
git rev-parse --show-toplevel
git branch --show-current
git status --short
git log --oneline origin/main..HEAD
```

- 有未提交改动就先按下一步提交。
- 没有未提交改动且 `origin/main..HEAD` 为空时，说明没有东西可发，直接告诉用户并停止。

### 2. 提交当前 worktree 的改动

```bash
git add -A
git commit -m "<一句话说明这次改了什么>"
```

- 提交信息写实际变更，不要写 `update` 之类空泛措辞。
- 不要加 `Co-authored-by: Cursor` 或任何 agent 尾注。
- 改动涉及逻辑或测试时跑 `pnpm test`；失败先修，别带着红灯 push。

### 3. 合入 main 并 push

```bash
MAIN="$HOME/projects/full-stack/miku-concert-stats.worktrees/main"
BRANCH="$(git branch --show-current)"

# 已在 main 时跳过合并
if [ "$BRANCH" != "main" ]; then
  git -C "$MAIN" merge --ff-only "origin/main"   # 让本地 main 先跟上远端
  git -C "$MAIN" merge "$BRANCH"
fi

git -C "$MAIN" push origin main
```

- 合并冲突时停止，把冲突文件列给用户，不要自行猜测取舍。
- `git -C "$MAIN" merge` 前确认该 worktree 干净；不干净就先让用户处理，不要在别人正在用的检出里 stash。

### 4. 等 Workers Builds 完成

`push` 返回后先记下 sha，然后用**单次短查询**看一次状态，不要一上来就跑十分钟的长循环：

```bash
SHA="$(git -C "$MAIN" rev-parse HEAD)"
gh api "repos/RJiazhen/miku-concert-stats/commits/$SHA/check-runs" \
  --jq '.check_runs[] | "\(.name) | \(.status) \(.conclusion)"'
```

- 刚 push 完 check run 可能还没创建（输出里没有 `Workers Builds`），属于正常，过一会儿再看。
- 还没完成时继续等，但每次只跑**有界的一小段**（约 2–3 分钟，例如 `for i in $(seq 1 12); do ...; sleep 15; done`），每段结束都能拿到一次状态；不要用 `seq 1 40` 这种可能被工具超时打断的长循环。

**状态必须来自实际读到的一次查询。** 轮询命令被中断时（输出为 `Aborted`、`Command failed to spawn`、超时、退出码非 0 且没有打印任何状态行），这不是「还在构建」，而是没有状态：立刻在同一条回合里重跑上面那条单次查询，拿到真实结果再汇报。不要因为中断就挂起回合、说「还在等构建」，也不要凭上一次输出推断当前状态。

- 拿到 `completed success` → 部署成功，结束。
- `completed failure` → 用 `gh run list --workflow ci.yml` 或 Workers 面板日志找原因，修好重新提交；不要为了绕过失败直接本地 `wrangler deploy`，除非用户明确要求。
- 未完成的查询连续超过约 10 分钟 → 带上最后一次真实读到的 `status` / `conclusion` 与等待时长，让用户决定，不要只说「还在跑」。

### 5. 汇报

一句话说明：合入的提交 sha、check 结论、生产地址。失败时说明卡在哪一步和下一步建议。

汇报里的 check 结论必须是这一步亲手查到的结果，不能写「应该已部署」或「大概率成功」。如果还没查到状态，就先查，再汇报。
