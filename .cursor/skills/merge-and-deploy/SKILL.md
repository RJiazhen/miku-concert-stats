---
name: merge-and-deploy
description: Commit the current worktree, squash-merge the branch into main as a single commit, push to GitHub, confirm the Cloudflare Workers production build finished, then delete the task branch and its worktree. Use when the user asks to 部署上线, 合并到 main 并部署, ship current changes to production, or push to trigger a production deploy.
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
- 任务分支以 **squash 合并**进入 `main`：一个任务在 `main` 上只对应一个提交，`main` 历史保持线性。
- 成功标准只有一条：这次 push 触发的 Workers Builds check run 变成 `completed success`。不用 curl 线上页面，也不用 `wrangler deployments list` 核对内容。
- 部署成功后收尾：删掉这条任务分支（本地，必要时连远端）和它的 worktree，并从 `miku-concert-stats.code-workspace` 移除该目录。失败的部署不清理，留着继续修。

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

### 3. squash 合入 main 并 push

```bash
MAIN="$HOME/projects/full-stack/miku-concert-stats.worktrees/main"
BRANCH="$(git branch --show-current)"

# 已在 main 时跳过合并
if [ "$BRANCH" != "main" ]; then
  git -C "$MAIN" fetch origin main
  git -C "$MAIN" merge --ff-only origin/main   # 让本地 main 先跟上远端
  git -C "$MAIN" merge --squash "$BRANCH"      # 分支改动暂存到 main 工作区，不产生 merge commit
  git -C "$MAIN" status --short                # 确认确实有内容可提交
  git -C "$MAIN" commit -m "<一句话说明这次改了什么>"
fi

git -C "$MAIN" push origin main
```

- `--squash` 只把分支的净改动放进暂存区，不会自动提交，必须紧接着显式 `commit`。分支里有多个提交时，`main` 上只留下这一个提交。
- 提交信息写这次的实际变更，不要写 `update` 之类空泛措辞；不要加 `Co-authored-by: Cursor` 或任何 agent 尾注。
- `merge --squash` 输出 `Already up to date`，或之后 `status --short` 为空，说明没有新内容可合并：直接告诉用户并停止，不要提交空 commit。
- 合并冲突时停止，把冲突文件列给用户，不要自行猜测取舍。要放弃这次合并（`git -C "$MAIN" reset --hard` 等）前先征得用户同意，不要直接清掉主检出。
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

- 拿到 `completed success` → 部署成功，进入下一步清理。
- `completed failure` → 用 `gh run list --workflow ci.yml` 或 Workers 面板日志找原因，修好重新提交；不要为了绕过失败直接本地 `wrangler deploy`，除非用户明确要求。
- 未完成的查询连续超过约 10 分钟 → 带上最后一次真实读到的 `status` / `conclusion` 与等待时长，让用户决定，不要只说「还在跑」。

### 5. 清理 worktree 与分支

**只在 check run 变成 `completed success` 之后执行**，并且只在合并的是一条任务分支时执行：`BRANCH` 与 `main` 相同（本来就在主检出提交）、或者部署失败时，一律跳过清理。

除了第 1 步用 `-C "$WORKTREE"` 检查自身状态，其余命令都在 `$MAIN` 里跑，不在待删的 worktree 内部删除自己：

```bash
WORKTREE="$HOME/projects/full-stack/miku-concert-stats.worktrees/$BRANCH"

# 1. 先确认干净：squash 合并后这条分支不是 main 的祖先，脏文件不会被任何地方保住
git -C "$WORKTREE" status --short

# 2. 移除 worktree（第 1 步输出为空才继续）
git -C "$MAIN" worktree remove "$WORKTREE"

# 3. 删除本地分支（squash 合并必须用 -D，普通 -d 会拒绝）
git -C "$MAIN" branch -D "$BRANCH"

# 4. 分支推过远端时一并删除；只在本地建过、没 push 的分支会报错，跳过即可
git -C "$MAIN" push origin --delete "$BRANCH"

# 5. 确认目录已从 worktree 列表消失
git -C "$MAIN" worktree list
```

- 第 1 步输出非空（有未提交改动）时停止，把文件列给用户，不要 `--force`，也不要先删再问。
- `worktree remove` 报 “contains modified or untracked files” 时同样停止；需要 `--force` 的情况必须先征得用户同意。
- 只能删本次任务自己的分支与 worktree：`$BRANCH` 不等于当前要清理的任务分支时停手，不要顺手清理别人的。
- 第 6 步改的是旁边的 `miku-concert-stats.code-workspace`：删掉 `folders` 里 `name` 与 `path` 都等于 `$BRANCH` 的那一项。它不在任何仓库里，直接编辑即可，不需要提交。

### 6. 汇报

一句话说明：合入的提交 sha、check 结论、生产地址，以及已删除的 worktree 与分支。失败时说明卡在哪一步和下一步建议（失败的部署不清理，方便继续修）。

汇报里的 check 结论必须是这一步亲手查到的结果，不能写「应该已部署」或「大概率成功」。如果还没查到状态，就先查，再汇报。
