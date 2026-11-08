---
name: continue
description: 推进 miku-concert-stats 的一个开发任务一个阶段：首次调用新建 worktree 开发、提交到任务分支，然后起本地开发服务器交给用户检查；用户确认后再次调用才把整条分支 squash 合入 main、push、等 Workers Builds，成功后清理 worktree 与分支；没有合并权限时改为推送分支并开 PR。Use when the user asks to 开始这个任务, 接着做, 继续改, 交付给我看看, 检查完上线, 合并部署, or ship current changes.
disable-model-invocation: true
---

# /continue — 开发 → 用户验收 → 合并上线

> 本文件是 **miku-concert-stats 仓库专用**的 `/continue`。用户级的通用 `/continue` 管其他仓库，两者不要混用；本仓库里只按本文件执行。

每次调用**只推进一个阶段**，执行完立即停止。

## 前提事实

- 仓库 `RJiazhen/miku-concert-stats`，远端 `origin`。
- 主检出固定为 `~/projects/full-stack/miku-concert-stats.worktrees/main`，分支 `main`；任务 worktree 在 `.../miku-concert-stats.worktrees/<branch>`，目录名等于分支名。
- 任务目录要登记进旁边的 `miku-concert-stats.code-workspace` 的 `folders`。
- 生产地址 <https://miku-concert-stats.rjiazhen.top>。push 到 `main` 后 Workers Builds 自动跑 `pnpm build` 并 `npx wrangler deploy`，在 GitHub 上表现为名为 `Workers Builds: miku-concert-stats` 的 check run。
- 任务分支以 **squash** 合入 `main`：一个任务在 `main` 上只留一个提交，历史保持线性。
- 合并权限决定走向：`gh api "repos/RJiazhen/miku-concert-stats" --jq .permissions.push` 为 `true`（或自己就是仓库 owner）才走 squash 合并上线；否则只推送分支并开 PR，不碰 `main`。
- 相关规则：`.cursor/rules/git-worktree.mdc`、`.cursor/rules/testing.mdc`、`.cursor/rules/ui-style-review.mdc`；涉及 `data/` 时还要遵守 `.cursor/rules/data-sources.mdc`。

## 阶段判定

先采集状态：

```bash
MAIN="$HOME/projects/full-stack/miku-concert-stats.worktrees/main"
ROOT=$(git rev-parse --show-toplevel)
BRANCH=$(git -C "$ROOT" branch --show-current)
git -C "$ROOT" status --short
git -C "$ROOT" log --oneline origin/main..HEAD
git -C "$MAIN" fetch origin main --prune
git worktree list --porcelain
```

**确定这次操作的是哪个任务 worktree**：

1. `$ROOT` 不是 `$MAIN`（当前就在某个任务 worktree 里）→ 就是它。
2. `$ROOT` 是 `$MAIN`，且 `git worktree list` 里除 `main` 外只有一个任务 worktree → 用它。
3. 有多个任务 worktree → 用 `AskQuestion` 让用户选，不要猜。
4. 一个任务 worktree 都没有：
   - 用户本轮只是确认（`1` / 确认 / 可以 / 通过 / 上线）→ 没有可上线的任务，说明并停止。
   - 否则按 **Start** 新建。

**用户确认的信号**：消息只有 `1`，或明确说「确认 / 可以 / 通过 / 没问题 / 检查完了 / 上线 / 合并 / 部署」。带新需求的消息一律算 **Develop**，不要自作主张 merge。

| 条件 | Phase |
| ---- | ----- |
| 没有任务 worktree，用户给出需求 | **Start** |
| 有任务 worktree，用户还没确认（或带新需求） | **Develop** |
| 有任务 worktree，用户本轮明确确认 | **Ship** |

## Phase：Start（新建任务）

### 1. 纯文档 / 规则 / skill 文字

改动只涉及 `docs/`、`.cursor/rules/`、`.cursor/skills/`、`README` 这类文字时，不算开发任务：直接在 `$MAIN` 里改，`git add <具体路径>` 后提交、`git -C "$MAIN" push origin main`，再按 Ship 的第 3 步确认 Workers Builds。不建 worktree、不起开发服务器、不跑测试。

### 2. 其余任务建 worktree

```bash
BRANCH="<type>-<short-kebab>"   # 例：feat-timeline-chart-anchor、fix-show-coverage-note
git -C "$MAIN" fetch origin main --prune
git -C "$MAIN" worktree add \
  "$HOME/projects/full-stack/miku-concert-stats.worktrees/$BRANCH" \
  -b "$BRANCH" origin/main
```

- 分支名用 kebab-case（历史分支都是 `feat-…` / `fix-…`，不用斜杠）。
- 从 `origin/main` 拉出，不复用已合并过的旧分支。
- 不要在 `$MAIN` 里 `git checkout -b`，也不要为了新任务切走别人的检出。

然后把目录登记进 workspace 文件（`.../miku-concert-stats.worktrees/miku-concert-stats.code-workspace`）：向 `folders` 追加 `{ "name": "<branch>", "path": "<branch>" }`，保留已有项。

### 3. 实现

- 所有读写都用任务 worktree 的绝对路径，不要改 `$MAIN` 里的文件。
- 先给一段简短计划（改哪些文件、怎么验证）再动手。
- 测试按 `.cursor/rules/testing.mdc`：只有命中统计口径、解析规则或已提交数据断言时才写 / 跑 `pnpm test`；只改文案、样式、文档时不跑。
- 样式按 `.cursor/rules/ui-style-review.mdc`：不截图自查，改完把文件、元素、具体参数和可微调项写进回复，由用户肉眼验收。
- 涉及 `data/` 时按 `.cursor/rules/data-sources.mdc`，不要因为 VocaDB 缺条目就删已采集数据。

### 4. 提交到任务分支

按 `docs/architecture.md` 的「收尾即提交」：实现完成、验证通过后直接提交到任务分支，不用先问用户。**只提交到任务分支，不合入 `main`。**

```bash
git -C "$WORKTREE" add <本次任务涉及的具体路径>
git -C "$WORKTREE" commit -m "<一句话说明这次改了什么>"
```

- 不要 `git add -A`，提交信息写实际变更（简短祈使句英文），不加任何 co-author trailer。
- 提交后 `git -C "$WORKTREE" status --short` 确认干净。
- 有 `permissions.push` 时顺手 `git -C "$WORKTREE" push -u origin "$BRANCH"`；没有就只留在本地，等 Ship 走 fork + PR。
- 提交到任务分支不等于上线：用户确认前不要 merge、不要 push `main`、不要开 PR。

### 5. 交付前起开发服务器

凡是改动用户可见行为（页面、组件、样式、筛选、UI 展示的数据）的任务，必须留一个开发服务器在跑，只跑通 `test` / `build` 不算完成。

**分配端口**：先看 `docs/architecture.md` 的端口清单里这个分支有没有记录，有就沿用；否则从 `3165` 起按奇数递增，挑第一个没有被监听、也没登记过的端口：

```bash
for p in $(seq 3165 2 3299); do
  lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1 || { echo "$p"; break; }
done
```

把 `<branch> 用 <port>` 追加到 `docs/architecture.md` 的端口清单，并随任务分支一起提交：

```bash
git -C "$WORKTREE" add docs/architecture.md
git -C "$WORKTREE" commit -m "Record the dev server port for <branch>"
```

**启动**（在任务 worktree 里，后台常驻）：

```bash
cd "$WORKTREE"
mkdir -p tmp
nohup env NUXT_IGNORE_LOCK=1 vp dev --port "$PORT" > tmp/dev-server.log 2>&1 &
```

用一小段有界轮询确认端口有响应（`curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/"`，最多约 60 秒）；起不来就读 `tmp/dev-server.log`，不要反复重启。服务器是热更新的，之后改代码不用重启。

### 6. 汇报并停止

给出：worktree 路径、分支名（及是否已 push）、改了什么、跑了哪些验证（或为什么没跑）、开发地址 `http://127.0.0.1:<port>/`、样式参数（如有）。说明「检查后回复 `1` 或再次执行 `/continue` 才合并上线；要改就直接说改哪里」。**本轮不合并、不开 PR**。

## Phase：Develop（继续开发）

1. 按用户本轮的新要求改代码；仍然只在任务 worktree 里改动。
2. 需要时跑 `pnpm test`（口径见 testing rule）。
3. 改完按 Start 第 4 步提交到任务分支（有 `permissions.push` 就 push，否则只本地提交）。
4. 开发服务器没在跑就用 `docs/architecture.md` 里这个分支的端口重新拉起（Start 第 5 步）。
5. 汇报同样的信息并停止，等用户验收。本轮不合并、不开 PR。

一个 worktree 只做一个任务：如果本轮需求与已有改动无关，说明情况并新建 worktree，不要混做。

## Phase：Ship（用户已确认，合并上线）

只在用户本轮明确确认后进入。

### 1. 合并前检查

```bash
WORKTREE="<任务 worktree>"
BRANCH=$(git -C "$WORKTREE" branch --show-current)
PORT=$(rg -o "$BRANCH 用 ([0-9]+)" -r '$1' "$WORKTREE/docs/architecture.md" 2>/dev/null | head -n1)
git -C "$WORKTREE" status --short
git -C "$WORKTREE" log --oneline origin/main..HEAD
```

- 还有未提交改动 → 先按 Start 第 4 步提交到任务分支，再继续。
- 工作区干净、`origin/main..HEAD` 也为空 → 没有可上线的内容，说明并停止。
- 改动涉及 `shared/`、`server/`、`app/`、`scripts/`、`data/`、`tests/` 的逻辑或数据 → 跑 `pnpm test`。
- 有 `.ts` / `.vue` 改动 → 跑 `pnpm typecheck`。
- 只改文案 / 样式 / 文档 → 不跑。
- 红灯先修，不要带着红灯合并。

### 2. 判断权限

```bash
PUSH=$(gh api "repos/RJiazhen/miku-concert-stats" --jq '.permissions.push' 2>/dev/null || echo false)
```

`true` → 走 **2a 合并上线**；否则走 **2b PR**。

### 2a. squash 合入 main 并 push

从主检出合并并 push：

```bash
git -C "$MAIN" status --short            # 必须为空，否则让用户先处理
git -C "$MAIN" fetch origin main
git -C "$MAIN" merge --ff-only origin/main
git -C "$MAIN" merge --squash "$BRANCH"
git -C "$MAIN" status --short            # 确认有内容可提交
git -C "$MAIN" commit -m "<一句话说明这次改了什么>"
git -C "$MAIN" push origin main
```

- `--squash` 只把净改动放进暂存区，必须紧接着显式 `commit`；分支上已有多条提交时，`main` 上只留这一个。
- 提交信息写实际变更，不要写 `update` 之类空泛措辞，也不要加任何 co-author trailer。
- 输出 `Already up to date` 或 `status --short` 为空 → 没有可合并内容，说明并停止，不要提交空 commit。
- 冲突时停下，把冲突文件列给用户，不要替用户取舍；要 `reset --hard` 前必须先征得同意。
- 例外：冲突只在 `docs/architecture.md` 的端口清单这一段（多个分支都往同一段追加端口）时，保留双方条目后继续，不要回滚别人的端口。
- `$MAIN` 不干净时不要 stash 别人的改动。

### 2b. 没有合并权限：推送分支并开 PR

- 只推任务分支，**不改 `main`、不 merge、不删除 worktree**。
- `git -C "$WORKTREE" push -u origin "$BRANCH"`；origin 不允许写时推到自己的 fork，再用 `gh pr create --base main --head "<fork-owner>:$BRANCH"`。
- PR 正文写：改了什么、怎么验证的、开发地址（如仍可访问）。用 `gh pr create` 建 **ready** PR，不加 `--draft`；若自动带上 `Made with Cursor`，立刻 `gh pr edit` 删掉。
- 汇报 PR URL 与 `gh pr checks <n>`。后续调用只推送更新、汇报状态，永远不 merge，等维护者合并。

### 3. 等 Workers Builds（仅 2a）

记下 push 后的 sha，用**单次短查询**看状态：

```bash
SHA="$(git -C "$MAIN" rev-parse HEAD)"
gh api "repos/RJiazhen/miku-concert-stats/commits/$SHA/check-runs" \
  --jq '.check_runs[] | "\(.name) | \(.status) \(.conclusion)"'
```

- 刚 push 完可能还没创建 check run，过一会儿再看。
- 还没完成就继续等，但每次只跑约 2–3 分钟的有界轮询（如 `for i in $(seq 1 12); do ...; sleep 15; done`），每段都能拿到一次状态。
- **状态必须来自实际读到的一次查询。** 轮询被中断（`Aborted`、超时、无状态行）不等于「还在构建」，立刻重跑单次查询再汇报。
- `completed success` → 进入清理。
- `completed failure` → 用 `gh run list --workflow ci.yml` 或 Workers 日志找原因，修好重新提交；不要为了绕过失败直接本地 `wrangler deploy`，除非用户明确要求。
- 未完成累计约 10 分钟 → 带最后一次真实状态和等待时长让用户决定。

### 4. 清理（仅 2a 且 `completed success` 后）

```bash
lsof -ti "tcp:$PORT" | while read -r pid; do kill "$pid"; done
git -C "$WORKTREE" status --short          # 必须为空
git -C "$MAIN" worktree remove "$WORKTREE"
git -C "$MAIN" branch -D "$BRANCH"         # squash 合并必须用 -D
git -C "$MAIN" push origin --delete "$BRANCH"   # 没 push 过的分支报错就跳过
git -C "$MAIN" worktree list
```

- `$PORT` 查不到（这个任务没起开发服务器）时跳过第一行。
- 清空 workspace 文件 `folders` 里 `name` 与 `path` 都等于 `$BRANCH` 的那一项（该文件不在仓库里，直接编辑）。
- `$WORKTREE` 不干净或 `worktree remove` 报 “contains modified or untracked files” 时停止，把文件列给用户，不要 `--force`，也不要先删再问。
- 部署失败时一律不清理，留在原 worktree 继续修。
- 只清理本次任务自己的分支与 worktree，不顺手动别人的。

### 5. 汇报

一句话说明：合入的 sha（或 PR URL）、手动查到的 check 结论、生产地址，以及已清理的 worktree / 分支 / workspace 条目。失败时说明卡在哪一步和下一步建议。不要写「应该已部署」「大概率成功」，没查到状态就先查。
