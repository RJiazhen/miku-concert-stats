---
name: continue
description: 推进 miku-concert-stats 的一个开发任务一个阶段：首次调用新建 worktree 开发（有对得上的 issue 才记录，没有就直接做、不追问用户）、提交到任务分支，然后起本地开发服务器交给用户检查；用户确认后再次调用才把整条分支 squash 合入 main（有 issue 时提交信息带 `Closes #N`）、push、等 Workers Builds，成功后核对 issue 已关闭并清理 worktree 与分支；没有合并权限时改为推送分支并开 PR。Use when the user asks to 开始这个任务, 接着做, 继续改, 交付给我看看, 检查完上线, 合并部署, or ship current changes.
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
- issue 是**可选**的，不是开工前提：用户点了号、或关键词搜到唯一一条对得上的，才记录；没有对得上的就不关联，**不要因此询问用户**。GitHub 只在 `Closes` / `Fixes` / `Resolves #N` 这类关键词**落到 `main`** 时自动关闭 issue；提交信息里的普通 `(#N)` 只是引用，不关闭任何东西。关联了 issue 时，号必须由本 skill 记录、写进 squash 提交信息或 PR 正文，并在上线后核对它真的变成 `CLOSED`。
- 合并权限决定走向：`gh api "repos/RJiazhen/miku-concert-stats" --jq .permissions.push` 为 `true`（或自己就是仓库 owner）才走 squash 合并上线；否则只推送分支并开 PR，不碰 `main`。
- 相关规则：`.cursor/rules/git-worktree.mdc`、`.cursor/rules/testing.mdc`、`.cursor/rules/ui-style-review.mdc`；涉及 `data/` 时还要遵守 `.cursor/rules/data-sources.mdc`。

## 并发保护

同一台机器上可能同时有好几个会话开着这个仓库，各自占一个任务 worktree。一个任务只认自己新建的那个 worktree 和分支：

- **不复用、不接管**别人的 worktree 或分支：不因为「目录里已经有任务 worktree」就把它当成本任务，也不在里面改文件、切分支、rebase、合并、删除。
- 当前检出（`$ROOT`）是别人的任务 worktree 时，不要在那里开工：说明情况，改在 `$MAIN` 上按 Start 新建自己的 worktree。
- 动手写文件前先看 `git -C "$WORKTREE" status` 和 `git -C "$WORKTREE" branch --show-current`：出现 `rebase in progress`、`MERGE_HEAD`、或分支不是本任务的 → 立刻停下汇报，不要 `--abort` / `--continue` / `reset` / `checkout`。
- Ship 清理前先把要删的分支和你刚合并的内容核对一遍（`git -C "$MAIN" rev-parse "$BRANCH"`）：对不上说明别的会话动过它，停下汇报，不要 `-D`。
- 只动本任务自己的分支、worktree 与其开发服务器。

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

1. 本任务本轮新建的 worktree，或本对话上一轮汇报过的那个 worktree → 就是它。
2. `$ROOT` 是别人的任务 worktree（不在本对话的汇报里）→ 不要用它，在 `$MAIN` 上另建。
3. 一个本任务的 worktree 都没有：
   - 用户本轮只是确认（`1` / 确认 / 可以 / 通过 / 上线）→ 没有可上线的任务，说明并停止。
   - 否则按 **Start** 新建。
4. 有多份可能属于本任务的 worktree、又分不清时 → 用 `AskQuestion` 让用户选，不要猜。

**用户确认的信号**：消息只有 `1`，或明确说「确认 / 可以 / 通过 / 没问题 / 检查完了 / 上线 / 合并 / 部署」。带新需求的消息一律算 **Develop**，不要自作主张 merge。

| 条件 | Phase |
| ---- | ----- |
| 没有本任务的 worktree，用户给出需求 | **Start**（永远新建，不借用已有的） |
| 有本任务的 worktree，用户还没确认（或带新需求） | **Develop** |
| 有本任务的 worktree，用户本轮明确确认 | **Ship** |

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
- **即使目录里已经有别的任务 worktree，也照建新的**：不借用、不接管别人的 worktree 与分支，也不复用已经存在但被别的任务占着的分支名（撞名就换一个更具体的名字）。
- 不要在 `$MAIN` 里 `git checkout -b`，也不要为了新任务切走别人的检出。

然后把目录登记进 workspace 文件（`.../miku-concert-stats.worktrees/miku-concert-stats.code-workspace`）：向 `folders` 追加 `{ "name": "<branch>", "path": "<branch>" }`，保留已有项。

**登记任务的 issue（可选）**（建完 worktree 之后、动手实现之前）：

- 用户本轮点了 issue 号 → 就是它。
- 没点号 → 用关键词搜：`gh issue list --state open --search "<关键词>"`；唯一对上就采用。
- 对不上或有多条都不确定 → 本任务不关联 issue，**直接继续实现，不要用 `AskQuestion` 问用户**。
- 关联上了就把号写进 worktree 的临时文件，Ship 阶段据此关闭，不靠对话记忆：`printf '%s\n' "<N>" > "$WORKTREE/tmp/task-issue"`（`tmp/` 不进仓库）。
- 未关联就写空文件，并在汇报里写明「本任务未关联 issue」；Ship 时跳过所有 issue 步骤。

### 3. 实现

- 所有读写都用任务 worktree 的绝对路径，不要改 `$MAIN` 里的文件。
- 先给一段简短计划（改哪些文件、怎么验证）再动手。
- 测试按 `.cursor/rules/testing.mdc`：只有命中统计口径、解析规则或已提交数据断言时才写 / 跑 `pnpm test`；只改文案、样式、文档时不跑。
- 样式按 `.cursor/rules/ui-style-review.mdc`：不截图自查，改完把文件、元素、具体参数和可微调项写进回复，由用户肉眼验收。
- 涉及 `data/` 时按 `.cursor/rules/data-sources.mdc`，不要因为 VocaDB 缺条目就删已采集数据。

### 4. 提交到任务分支

实现完成、验证通过后直接提交到任务分支，不用先问用户（见 `docs/data-pipeline.md`「Finish means commit」）。**只提交到任务分支，不合入 `main`。**

```bash
git -C "$WORKTREE" add <本次任务涉及的具体路径>
git -C "$WORKTREE" commit -m "<一句话说明这次改了什么>"
```

- 不要 `git add -A`，提交信息写实际变更（简短祈使句英文），不加任何 co-author trailer。
- 分支提交信息可以带 `(#N)` 便于追溯，但那个写法**不会**关闭 issue；关闭只靠 Ship 阶段写进 squash 提交的 `Closes #N`。
- 提交后 `git -C "$WORKTREE" status --short` 确认干净。
- 有 `permissions.push` 时顺手 `git -C "$WORKTREE" push -u origin "$BRANCH"`；没有就只留在本地，等 Ship 走 fork + PR。
- 提交到任务分支不等于上线：用户确认前不要 merge、不要 push `main`、不要开 PR。

### 5. 交付前起开发服务器

凡是改动用户可见行为（页面、组件、样式、筛选、UI 展示的数据）的任务，必须留一个开发服务器在跑，只跑通 `test` / `build` 不算完成。

**存活期（硬性）**：本任务的开发服务器从首次交付起一直跑到 **Ship 清理成功**，或用户**明确说关掉 / 停掉开发服务器**。在此之前：

- 不要在回合结束、汇报后、或 Start → Develop 之间把它杀掉。
- 不要为了「确认显示」反复起停（见 `ui-style-review`）；热更新会吃到后续改动。
- 每轮汇报前先解析本 worktree 的实际端口并 `curl`；死了再按下面步骤拉起，不要把已死的地址交给用户。

**启动（必须常驻，禁止随 agent shell 一起死）**：

不要预扫、不要传 `--port`。直接起服务：`nuxt.config.ts` 默认从 `3939` 起，被占用时 Nuxt 自动换下一个。不要用「一次性 Shell 里的 `nohup … &` 然后该 Shell 立刻退出」——Cursor 会收掉那个进程组。用下面两种之一：

1. **优先**：Shell 工具以 `block_until_ms: 0` 在任务 worktree 里起**常驻后台任务**（工作目录 = `$WORKTREE`）：

```bash
env NUXT_IGNORE_LOCK=1 vp run dev
```

（`vp dev` 也可以；**禁止** `vp run dev -- --port …`。）

2. **备选**（没有常驻 Shell 时）：`screen` 会话，名称带上分支：

```bash
screen -dmS "miku-$BRANCH" zsh -lc \
  "cd \"$WORKTREE\" && env NUXT_IGNORE_LOCK=1 vp run dev >> tmp/dev-server.log 2>&1"
```

**读出实际端口（不写登记文件）**：启动后从常驻 Shell 终端输出或 `$WORKTREE/tmp/dev-server.log` 解析 `➜ Local: http://127.0.0.1:<port>/`（或 `Ready … → http://127.0.0.1:<port>/`）。之后各轮若日志不在手边，用进程表按 worktree 的 cwd 找 LISTEN 端口并用 `curl` 探到返回 200/302/304 的那个即可。不要维护 `$MAIN/tmp/dev-ports.md`，也不要把端口策略写进会提交的 `docs/`。

用一小段有界轮询确认该端口有响应（`curl`，期望 200/302/304，最多约 60 秒）。起不来就读终端输出或日志，不要反复乱杀重来。

### 6. 汇报并停止

给出：worktree 路径、分支名（及是否已 push）、关联的 issue（`#N`，没有就写「未关联」）、改了什么、跑了哪些验证（或为什么没跑）、开发地址 `http://127.0.0.1:<port>/`、样式参数（如有）。说明「检查后回复 `1` 或再次执行 `/continue` 才合并上线；要改就直接说改哪里」。**本轮不合并、不开 PR、不关闭 issue**；**也不要停开发服务器**。

## Phase：Develop（继续开发）

1. 按用户本轮的新要求改代码；只在**本任务的** worktree 里改动，不碰别的任务 worktree 与分支。
2. 需要时跑 `pnpm test`（口径见 testing rule）。
3. 改完按 Start 第 4 步提交到任务分支（有 `permissions.push` 就 push，否则只本地提交）。
4. 先按 Start 第 5 步的方式解析本 worktree 端口并确认仍在响应；没在跑才重新拉起。不要顺手重启已在跑的服务器。
5. 汇报同样的信息并停止，等用户验收。本轮不合并、不开 PR、不停开发服务器。

一个 worktree 只做一个任务：本轮需求与已有改动无关时，说明情况并按 Start 新建 worktree，不要在同一分支上混做；也不要接着别人的 worktree 继续改。

## Phase：Ship（用户已确认，合并上线）

只在用户本轮明确确认后进入。

### 1. 合并前检查

```bash
WORKTREE="<本任务的 worktree>"
BRANCH=$(git -C "$WORKTREE" branch --show-current)
ISSUE=$(cat "$WORKTREE/tmp/task-issue" 2>/dev/null | tr -dc '0-9')
git -C "$WORKTREE" status --short
git -C "$WORKTREE" log --oneline origin/main..HEAD
```

- `$WORKTREE` 必须就是本任务的 worktree（本对话上一轮汇报过的那个）；指向别人的 worktree 时停下，用 `AskQuestion` 确认，不要合并别人的分支。
- `$ISSUE` 读不到（没登记过）→ 留空即可，**不要追问用户**；后续 issue 步骤全部跳过。
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
MSG="<一句话说明这次改了什么>"
if [ -n "$ISSUE" ]; then
  MSG="$MSG

Closes #$ISSUE"
fi
git -C "$MAIN" commit -m "$MSG"
git -C "$MAIN" push origin main
```

- `--squash` 只把净改动放进暂存区，必须紧接着显式 `commit`；分支上已有多条提交时，`main` 上只留这一个。
- 提交信息写实际变更，不要写 `update` 之类空泛措辞，也不要加任何 co-author trailer。
- 有 issue 时**必须**在提交信息正文里单独一行写 `Closes #N`（`Refs #N`、`(#N)` 都不关闭 issue）。squash 提交是本任务唯一落到 `main` 的提交，也是唯一能触发自动关闭的地方。
- 输出 `Already up to date` 或 `status --short` 为空 → 没有可合并内容，说明并停止，不要提交空 commit。
- 冲突时停下，把冲突文件列给用户，不要替用户取舍；要 `reset --hard` 前必须先征得同意。
- `$MAIN` 不干净时不要 stash 别人的改动。

### 2b. 没有合并权限：推送分支并开 PR

- 只推任务分支，**不改 `main`、不 merge、不删除 worktree**。
- `git -C "$WORKTREE" push -u origin "$BRANCH"`；origin 不允许写时推到自己的 fork，再用 `gh pr create --base main --head "<fork-owner>:$BRANCH"`。
- PR 正文写：改了什么、怎么验证的、开发地址（如仍可访问）；有 issue 时末尾单独一行写 `Closes #N`，让维护者合并 PR 时一并关闭。用 `gh pr create` 建 **ready** PR，不加 `--draft`；若自动带上 `Made with Cursor`，立刻 `gh pr edit` 删掉。
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

先核对 issue（`$ISSUE` 为空时整段跳过）：

```bash
gh issue view "$ISSUE" --repo RJiazhen/miku-concert-stats --json state,closedAt --jq '"\(.state) \(.closedAt)"'
```

- `CLOSED` → 自动关闭生效，继续清理。
- 仍是 `OPEN` → `Closes #N` 没被识别（号写错、写进了分支提交、或 push 前改掉了提交信息）。不要静默放过，手工补关并留痕：

```bash
gh issue close "$ISSUE" --repo RJiazhen/miku-concert-stats \
  --comment "已在 $(git -C "$MAIN" rev-parse HEAD) 合入 main（$BRANCH）。"
```

  然后在汇报里注明这一步是手工补的，并说明 `Closes` 为什么没生效。

```bash
# Only now may this task's dev server stop — not earlier in Start/Develop.
# Kill LISTEN processes whose cwd is this worktree (covers Nuxt / Vite / workerd).
for p in $(lsof -nP -iTCP -sTCP:LISTEN -t 2>/dev/null | sort -u); do
  cwd=$(lsof -a -p "$p" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')
  if [ "$cwd" = "$WORKTREE" ]; then kill "$p"; fi
done
screen -S "miku-$BRANCH" -X quit 2>/dev/null || true
git -C "$WORKTREE" status --short          # 必须为空
git -C "$MAIN" worktree remove "$WORKTREE"
git -C "$MAIN" branch -D "$BRANCH"         # squash 合并必须用 -D
git -C "$MAIN" push origin --delete "$BRANCH"   # 没 push 过的分支报错就跳过
git -C "$MAIN" worktree list
```

- 这个任务没起开发服务器时，上面的 `for` 循环会空跑，无妨；`screen` 行报错可忽略。
- 清空 workspace 文件 `folders` 里 `name` 与 `path` 都等于 `$BRANCH` 的那一项（该文件不在仓库里，直接编辑）。
- `$WORKTREE` 不干净或 `worktree remove` 报 “contains modified or untracked files” 时停止，把文件列给用户，不要 `--force`，也不要先删再问。
- 删分支前先核对 `git -C "$MAIN" rev-parse "$BRANCH"` 与刚刚合并的那次 commit 一致；不一致说明别的会话又往这条分支写了东西，停下汇报，不要 `-D`。
- 部署失败时一律不清理、不停本任务开发服务器，留在原 worktree 继续修。
- 只清理本次任务自己的分支、worktree 与 `miku-$BRANCH` screen，不顺手动别人的。

### 5. 汇报

一句话说明：合入的 sha（或 PR URL）、手动查到的 check 结论、生产地址、issue 的最终状态（`#N CLOSED`／手工补关／未关联），以及已清理的 worktree / 分支 / workspace 条目。失败时说明卡在哪一步和下一步建议。不要写「应该已部署」「大概率成功」，没查到状态就先查。
