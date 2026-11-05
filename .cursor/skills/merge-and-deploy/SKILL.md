---
name: merge-and-deploy
description: Merge the current worktree's commits into main, push to GitHub, and verify the Cloudflare Workers production deployment triggered by Workers Builds. Use when the user asks to 部署上线, 合并到 main 并部署, ship current changes to production, or push to trigger a production deploy.
disable-model-invocation: true
---

# 合并到 main 并触发生产部署

> 可安装给外部 agent 的公开 skill 在仓库根的 `skills/`；本文件是 Cursor 专用的内部流程，不发布。

## 前提事实

- 仓库 `RJiazhen/miku-concert-stats`，远端 `origin`。
- 主检出的固定路径：`~/projects/full-stack/miku-concert-stats.worktrees/main`，分支 `main`。其他任务在 `.../miku-concert-stats.worktrees/<branch>` 的 worktree 里。
- 生产地址 <https://miku-concert-stats.zc791.workers.dev>。
- 生产部署由 Workers Builds（Git 集成）完成：push 到 `main` 后自动跑 `pnpm build` 并 `npx wrangler deploy`。它在 GitHub 上表现为名为 `Workers Builds: miku-concert-stats` 的 check run。
- 不要用 `git checkout` 切换主检出，也不要在 feat worktree 里改 `main`。

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
- 提交前跑 `pnpm lint`（改动涉及逻辑或测试时再跑 `pnpm test`）；失败先修，别带着红灯 push。

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
- 合并后用 `git -C "$MAIN" status --short` 确认干净。

### 4. 等 Workers Builds 完成

```bash
SHA="$(git -C "$MAIN" rev-parse HEAD)"
for i in $(seq 1 40); do
  ROW="$(gh api "repos/RJiazhen/miku-concert-stats/commits/$SHA/check-runs" \
    --jq '.check_runs[] | select(.name | startswith("Workers Builds")) | "\(.status) \(.conclusion)"' | head -1)"
  echo "$ROW"
  case "$ROW" in
    completed*) break ;;
  esac
  sleep 15
done
```

- `completed success` → 进入验证。
- `completed failure` → 用 `gh run list --workflow ci.yml` 或 Workers 面板日志找原因，修好后重新提交；不要为了绕过失败直接本地 `wrangler deploy`，除非用户明确要求。
- 超过约 10 分钟仍未完成，报告当前状态让用户决定。

### 5. 验证线上

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://miku-concert-stats.zc791.workers.dev/
pnpm exec wrangler deployments list 2>&1 | head -20
```

- 首页返回 `200`，且 `wrangler deployments list` 最新一条的创建时间在本次 push 之后，才算上线成功。
- 这次改动若影响具体页面，再抓一次该页面确认内容，例如 `curl -s https://miku-concert-stats.zc791.workers.dev/songs/10 | rg '<关键词>'`。
- 改了 `data/` 下的数据时，`catalog.sqlite` 是构建产物，必须等这次 Workers Builds 完成后线上才更新；本地不用手动提交 sqlite。

### 6. 汇报

一句话说明：合入的分支、提交 sha、check 结论、线上状态码与生产地址。失败时说明卡在哪一步和下一步建议。
