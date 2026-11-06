# 已知数据问题清单

记录截至 **2026-11-06** 已确认的数据缺陷与模型张力，供后续单独开 agent 逐项修复。每条包含：现象、影响、证据（目录 id）、建议方向；已修复的条目标注「已解决」并给出复核方法。

数据侧的现状一句话：目录里 **208 个演出**，其中 **181 个有歌单**、展开成 **364 个场次 / 9041 条曲目**；这 181 个里 169 个的曲目逐条来自百科逐曲表、12 个仍用 VocaDB 歌单。182 条来源记录覆盖全部 181 个有歌单的演出，待核实 / 冲突 / 不确定场次均为 0。剩下 27 个没有歌单的演出里，13 个已标取消、1 个已标尚未举行（未来有你 2026 成都站）、3 个是尚未举行的交响乐、9 个是 MIKU EXPO 2026 欧洲站、1 个是鼓童 2026。

约定引用：

- 「演出」= 一行 `performances`（一个 VocaDB release event / 一个城市站），对应 `vocadb.net/E/<id>`。
- 「场次」= 一天；同日有日场、夜场时各算一场。由 `shared/event-schedule.ts` 推导。
- 「系列年度」= `series_id` + `series_number`，只用于索引与首演，不再代表一场演唱会。

---

## 一、缺失的数据（上游就没有）

### 1.1 初音ミクシンフォニー 3 场没有任何歌单

**现象**：系列 256 共 32 个演出，全部在 VocaDB 没有 `songList`。**29 个已改用「初音ミク Wiki」的逐曲表**（见 3.1、3.5），剩下 3 场仍是空的：

| performance id | 日期 | 城市 | 原因 |
| --- | --- | --- | --- |
| 12740 | 2027-01-10 | 大阪 | 2026-2027 巡演尚未演到大阪 |
| 13209 | 2027-03-13 | 横滨 | 2027 巡演未开演（VocaDB Draft） |
| 13210 | 无日期（Draft） | 东京 | 同上 |

**原因**：不是「缺数据」，而是**还没发生**。百科逐曲表要等演出结束后才会写。

**影响**：这 3 场在排行中不贡献任何曲目；演出页显示「仍无歌单」。

**建议**：演出结束后补 `data/wiki-raw/*.json` 与 `scripts/wiki_raw_spec.py`（见 `.cursor/skills/update-concert-data/SKILL.md`）。上游若补了 `songList`，需要先清 `data/cache/` 再跑 `pnpm collect`（见 4.1）。

### 1.2 播放量数据完全缺失

**现象**：目录里没有 YouTube 播放量快照，所有播放量相关列在 UI 自动隐藏。

**原因**：`pnpm snapshot:youtube` 需要 `YOUTUBE_API_KEY`，未配置。

**影响**：单曲页「相关投稿」不显示播放量列；排序/对比功能不可用。

**建议**：配置 API key 后跑一次快照，或明确长期不做。注意规划中的政策：只采 YouTube Data API，不抓 niconico 非官方接口与 B 站。

---

## 二、模型与语义张力

### 2.1 `series_number` 是系列年度标签，不是日历年

**现象**：跨年档期的多个演出共用同一个 `series_number`：

| 演出 | `series_number` | 实际日期 |
| --- | --- | --- |
| 2504 初音ミクシンフォニー 2018-2019 东京 | 2018 | 2018-11-24 |
| 2960 初音ミクシンフォニー 2018-2019 大阪 | **2018** | **2019-01-25** |
| 12739 2026-2027 〜Melodies on the Keys〜 横滨 | 2026 | 2026-10-10 |
| 12740 2026-2027 〜Melodies on the Keys〜 大阪 | **2026** | **2027-01-10** |
| 2954/2955/2956 2020 〜5th Anniversary〜 | 2020 | 2020-09-21 ~ 2020-11-17 |

**影响**：年份筛选按 `start_date`，系列年度标签（`series_number`）按上游，所以 2019-01-25 的大阪场在系列年度上属于 2018。站内已不再用年度做导航层级，页面只按 系列 → 演出 → 场次 展示，这个差异只影响年度首演与歌单差异对照的分组。

**建议**：在 UI 上明示「系列年度」与「演出日期年份」的区别（例如索引页标注跨年档期），或改为按演出日期年份分组并另存系列年度标签。**不要**擅自改 `series_number`，它来自 VocaDB。

### 2.2 区间内的展览日被当成演出日

**现象**：一个演出只有一对 `start_date`–`end_date`，没有逐日节目单。区间里只办企划展、没有 live 的日子也会被算成场次：

- 2019 大阪（2515）：8/9 只有企划展，8/10–8/11 才是 live。
- 2020 大阪（2758）：11/27 只有企划展，11/28–11/29 才是 live。

**已解决（2026-11-06）**：改用 `data/performance-setlists.json` 的 `performances.<id>.noShowDates` 逐条剔除。核实的展览日：2015 东京 9/06、2016 东京 9/09、2018 东京 8/31、2019 大阪 8/09、2020 大阪 11/27。

复核：

```sql
SELECT performance_id, GROUP_CONCAT(show_key, ' ') FROM performance_show_setlists
 WHERE performance_id IN (2515, 2758) GROUP BY 1;
-- 2515: 8/10 昼夜 + 8/11 昼夜（8/09 已不在）
-- 2758: 11/28 昼夜 + 11/29 昼夜（11/27 已不在）
```

### 2.3 日夜场数据在 VocaDB 完全不存在

**现象**：

- `performances.showtime_local` 非空 **0 / 207**（2026-11-06 起演出总数为 181，仍全部为空）；`time_evidence` 非空 **0**；`time_precision` 全部为 `day`。
- 系列 81（魔法未来）、173（未来有你）里**没有任何同一天的两条 event**，所以不能靠事件拆分识别日夜场。
- `shared/showtime.ts` 的解析规则只接受**恰好一个** `Showtime`/`開演` 时刻，出现两个就返回 `null`。即使将来解析出单个时刻，`scripts/vocadb/normalize.ts` 也把 `time_precision` 硬编码为 `'day'`，不会变成 `minute`。
- 目前唯一的日夜证据来自歌单备注（`Daytime Shows`、`Nighttime Shows`、`1st/2nd Show`、`昼夜`），只能证明「某首歌只在日场/夜场唱」，不能给出每天几场、几点开演。

**外部核实结果（未入库，可直接使用）**：以下为 2026-11-04 访问官方票务页核实，共 40 行、全部带来源与置信度。规律是魔法未来自 2019 起几乎每天日场+夜场，首日往往仅夜场；未来有你 2018 起每次巡演也是昼 14:00 / 夜 19:30 两场。

已确认的年份/城市：

| 系列 | 年份 | 一天两场的日期 | 只有一场的日期 |
| --- | --- | --- | --- |
| 魔法未来 | 2019 | 大阪 8/10–11；东京 8/31、9/1 | 东京 8/30（仅夜场） |
| 魔法未来 | 2020 | 大阪 11/28–29、东京 12/19–20（**3 部制**） | 东京 12/18（仅夜场） |
| 魔法未来 | 2021 | 大阪 10/23–24；东京 11/5–7 | 大阪 10/22（仅夜场） |
| 魔法未来 | 2022 | 大阪 8/13–14；东京 9/2–4 | 大阪 8/12（仅夜场） |
| 魔法未来 | 2023 | 大阪 8/11–13；东京 9/1–3；札幌 2/4–5 | — |
| 未来有你 | 2018 | 北京 10/13；上海 10/27–28；成都 10/20 | — |
| 未来有你 | 2019 | 上海 11/2–3；北京 11/16 | 成都 11/9、广州 11/23–24（均仅夜场） |

未能确认或需要注意：

1. **2020 魔法未来是 3 部制**（11:00 / 15:00 / 19:00），不是标准昼夜两场。官方只写「1部/2部/3部」，把它归为日场（11:00、15:00）+ 夜场（19:00）属于模型推断，不是官方标签 → 置信度「中」。
2. **2023 大阪 8/11 的 VocaDB 简介是过期的**：简介只有夜场（3 月版本），官网 2023-04-06 追加了昼场。凡外部核实必须记 `accessedAt`，不能采信简介。
3. 2019 上海 11/3 昼场是 9/11 追加的，逐日开演时间未找到官方页，置信「中」。
4. 未来有你 2020 / 2021 没有城市场次（纯线上 1 场），不存在昼夜数据。

**建议方向**：新建 `data/show-schedules.json`（人工维护）+ `shared/show-schedules.ts`（校验加载器），结构建议按 VocaDB performance id 存逐日数据：

**已实现（2026-11-05，B 方案）**：人工清单落在 `data/performance-setlists.json` 的 `performances.<id>`，支持 `dayNight`（昼 + 夜两场）、`noShowDates`（只有企划展）与 `halves`（只有昼场或只有夜场），校验器是 `shared/performance-setlists.ts`，场次推导通过 `performanceSchedules` 的第二到第四个参数接入，并物化到 `performance_setlists`。日夜场核实来源记在演出层（`performance_setlist_sources`），待核实项列在 `docs/reports/setlist-review.md` 的 A 节。

**当前状态（2026-11-06）**：`pending review = 0`、`conflict = 0`、`uncertain = 0`。原先悬置的两处冲突——MIKU EXPO 2015 上海（Fandom 记 6/26–6/27，VocaDB 记 6/27–6/28）与 Live Party 2011 札幌（Fandom 只写 8/17，VocaDB 记 8/16–8/17）——已按 SCLA 官方存档页与 5pb 官方存档页**改采 6/27–6/28 四场 / 8/16–8/17 两场**，不再是待裁决项。

已按官方票务页核实的范围：魔法未来 2015–2026 的东京 / 大阪 / 札幌 / 福冈 / 仙台 / 滨松全部场次；未来有你 2018、2019 四站（萌娘百科）；MIKU EXPO 2014 印尼 / 洛杉矶 / 纽约、SNOW MIKU 2018、Live Party 2013 札幌（VocaDB Fandom）。2019 大阪 8/09、2020 大阪 11/27、2018 东京 8/31、2015 东京 9/06、2016 东京 9/09 经核实为企划展日，已从场次中剔除。

```json
{
  "performances": {
    "6045": {
      "dayNight": ["2023-08-11", "2023-08-12", "2023-08-13"],
      "note": "官方票务页：8/11–8/13 每天昼 + 夜，共 6 场",
      "sources": [
        {
          "url": "https://magicalmirai.com/2023/osaka_ticket.html",
          "title": "マジカルミライ 2023 OSAKA チケット",
          "accessedAt": "2026-11-05",
          "confidence": "high"
        }
      ]
    }
  }
}
```

代码侧的接缝：`performanceSchedules(catalog, review, curatedDayNight, curatedNoShowDates, curatedHalves)` 接受三张映射——要按日夜拆分的日期、只有企划展的日期、只有昼/夜场的日期。页面与统计读 `performance_show_setlists`，因此不需要各自再解析。

### 2.4 多城市共用一份歌单，无法证明某首歌在哪一站演过

**现象**：一个 `song_list_id` 可能被大量演出共用：

| song_list | 共用演出数 | 说明 |
| --- | --- | --- |
| 16544 | **17** | MIKU EXPO 2024 北美（6516–6531、7186） |
| 26423 | 15 | 2026 北美（9811–9825） |
| 6571 | 10 | 2016 美国（1859/1860/1924/1930–1936） |
| 22929 | 8 | 2025 亚洲（9341、9348–9353、9555） |
| 7758 | 7 | — |
| 31 | 2 | 2012 香港 2524 / 台湾 2525 |

**影响**：除非备注里有 `Day N` / 城市 / `Taiwan only` 之类的选择器，否则一行只能计入该演出的**全部**场次。这是对「一份歌单对应整个 run」的诚实读法，但会夸大单场曲目（用 ≈ 标记提示）。

已知的具体例子：歌单 31 的第 25 行（Starduster）备注 `Taiwan only`，所以只在 2525 台湾场；其余 24 行同时属于香港与台湾。

**建议**：不要试图从共享歌单推断单站差异；需要精确到站的信息只能靠人工清单（与 2.3 同一个文件可承担）。

**已处理（2026-11-05，B 方案）**：目录新增场次层。`pnpm derive:setlists` 把每个源行展开到它覆盖的场次，写入 `performance_show_setlist_items`；`/shows/{id}` 现在按场次列出该场自己的曲目，不再靠备注提示。源歌单仍按原样保存，`/raw` 的跨演出对照与 `/report` 继续读源层。缺场次证据的部分列在 `docs/reports/setlist-review.md`，结果由人工确认后回填 `data/performance-setlists.json`。详见 `docs/architecture.md` 的「源歌单层与场次层」。

### 2.5 `series_suffix` 语义不一致

**现象**：有时是城市（`Tokyo`、`Osaka`），有时是媒介（`VR`、`Online`），有时为空。

**影响**：只能用于城市匹配，不能作为身份或分类依据。

**建议**：维持现状，但任何新代码都不要把 `series_suffix` 当唯一键。

### 2.6 无城市演出

**现象**：

- `3224`（2021 Online）没有城市。
- `1619`（2017 China Festival）没有城市，但有两个场次。

**影响**：城市排行里归入 `unknown`。

**建议**：可以给这几场补一个展示用的地点说明，但不要把线上场硬塞进某个城市。

---

## 三、补录数据本身的局限

### 3.1 专辑 tracklist 补位已停用（保留机制）

**现状（2026-11-06）**：交响乐的 26 个演出原先靠专辑曲目补位，现在**全部改用百科逐曲表**：`performance_setlists.source_kind = 'wiki'`，行级 `evidence = 'wiki'`。`/shows`、排行、覆盖统计都读场次层，因此页面上不再出现专辑曲目。

**仍存在的部分**：`song_lists` 里还有 11 张 `source = 'album'` 的歌单，26 个演出的 `performances.song_list_id` 仍指向它们。这只影响源歌单层（`/raw` 仍会展示），派生层已整体覆盖。机制（`data/album-setlists.json` + `pnpm collect:albums`）保留，供将来某个完全没有百科页的演出兜底。

**当初的局限（保留备查）**：

1. **2018 年之后的蓝光在 VocaDB 没有任何曲目**（45288、45291、45290、45289、52465），只有 2017 年那张（30961）有。
2. **同一个年份的不同城市共用一份专辑曲目**（如 2024 的东京/横滨/神户都用 45255），无法证明各城市曲目差异 —— 这正是改用逐曲表的原因：东京与横滨/神戸本来就是两套节目。
3. **2023 有两个发行**：`39621`（Live at Suntory Hall）与 `40398`（巡演版）。

### 3.2 占位曲规则

**现状**：VocaDB 的占位曲（`[Placeholder song]`、`[Unknown song]` 等）整行丢弃，规则在 `shared/placeholder-song.ts`。最初是鼓童的三份歌单里 `???`（id 15591）出现 14 次、代表太鼓独奏段落。

**风险**：这条规则是全局的，若某份歌单里出现「有意义的占位曲」（例如整段改编曲只登记了一个 `???`），该行会被静默丢弃。目前目录里没有这种情况，但未来出现需要复核。

### 3.3 版本链根节点异常

**现象**：`scripts/vocadb/album-setlists.ts` 会把专辑曲目沿 `originalVersionId` 链解析到根歌曲，个别链的根并不符合常识：

- `ハジメテノオト` 解析到 `389595`，名字是 `(Shortバージョン)`。
- `初音ミクの消失` 解析到 `295872`，而不是广为人知的 `2925`。

**影响**：这些曲目挂在冷门条目上，排行与「合并版本」的归属可能让读者困惑；质量报告会把它们列为疑似重复。

**建议**：在 `data/song-variants.json` 里人工合并到熟悉的条目，逐条核对。这是人工判定，不要写通用规则去猜。跟踪：<https://github.com/RJiazhen/miku-concert-stats/issues/23>。

### 3.4 过渡性增量 SQL

**现状**：`data/increments/0004-standalone-events.sql`（39 感谢祭 2520）与 `0005-kodo-series.sql`（鼓童 255）是为「不跑全量 collect」而做的桥接，全部 `INSERT OR IGNORE`。

**后续**：`pnpm collect` 把同样的行写进 `0001` 之后，这两个文件会变成空操作，届时可以删除。删之前先确认 `0001` 已包含 `255` 系列与 `2520`。

### 3.5 曲目不再以 VocaDB 为主数据源

**背景**：VocaDB 对同一份 `songList` 只存一份，多个城市共用（最多 17 个演出），地区差异只能写在行内备注里；交响乐则完全没有 `songList`。因此曲目改从「初音ミク Wiki」（atwiki）的**逐曲表**逐条登记。

**现状（2026-11-06）**：181 个演出中 **169 个**的曲目逐条来自百科，其余 12 个仍用 VocaDB 歌单并配官方票务页 / Fandom / 萌娘 的日程来源。每个演出都至少有一条 `performance_setlist_sources`（182 行、73 个去重 URL），逐条带 `title` / `accessed_at` / `confidence` / `note`。

**这个改动的代价（需要知道）**：

1. **只有 28 份表的原始单元格留档**（`data/wiki-raw/`）。其余被引用的 atwiki 页（交响乐各年、EXPO 2014–2020、Live Party 等）当时是手工抄进脚本的，URL 与逐行曲目都在，但**原始表格没存**。
2. **来源只到演出级**，没有逐行 URL。`performance_show_setlist_items` 只带 `evidence`（`wiki` / `shared` / `note`）与行内原备注。按行取来源时的注意事项见 3.6。
3. **百科可能写错**。`evidence` 只表示「按哪条规则归位」，不表示「已核实」；`confidence` 一律 `medium`（官方页才给 `high`）。

**如何复核**：`docs/setlist-confirmation.md`（按演出列出场次 × 曲目、说明、来源链接）与 `docs/reports/setlist-review.md`（逐条清单）。采编流程见 `.cursor/skills/update-concert-data/SKILL.md`。

### 3.6 非 VOCALOID 曲目的登记方式

**背景**：百科逐曲表里包含古典改编、鼓童原创器乐曲、民谣/圣诞曲，VocaDB 没有条目。之前这些行被排除在目录外，导致演出页曲目不全。

**现状**：`songs.category` 区分 `vocaloid`（默认）与 `classical` / `traditional` / `instrumental`。后者按普通歌曲登记：
- id 从 `2_000_000_000` 起（`shared/repertoire.ts` 的 `LOCAL_SONG_ID_BASE`），不与 VocaDB 冲突；
- `artist_string` 只写作曲者，**没有歌手**（`song_vocalists` 为空）；
- `source_url` 指向印有该曲名的那一页百科；
- 行上 `evidence = 'wiki'`，界面对这些行显示「非 VocaDB 曲目・类别」，曲目页说明「不是 VOCALOID 歌曲」。

当前 20 条（古典 5 / 器乐 8 / 民谣 3 / VocaDB 只查到翻唱的 VOCALOID 歌 4）。

**风险**：这些曲目进排行后，与 VOCALOID 歌曲同列比较。若要做「只统计 VOCALOID 歌曲」的口径，必须显式加 `AND songs.category = 'vocaloid'`。

### 3.7 按行取来源的两个坑

`performance_show_setlist_items.evidence` 是「归属方式」，**不是链接**，且没有 CHECK 约束（只有 `shared/catalog.ts` 在加载时校验）。按行生成来源按钮时：

- `evidence = 'wiki'` 的行 `source_position` **全部为 NULL**，必须走 `performance_setlist_sources`（演出级）。用 `LEFT JOIN setlist_items ON source_position` 一条 SQL 通吃，会让 7816 / 9041 行（86%）的 URL 静默变成 NULL。
- `note` / `shared` 行的 `source_position` 全部有值，走 `performance_setlists.source_list_id → song_lists.source_url`。
- `curated` 目前 **0 行**，但类型与 UI 标签都保留了它；它同时可能出现在「有 source_position」（人工 assign）和「无 source_position」（人工补行）两种形态。
- `performance_setlists.change = 'curated'` 是**另一个字段**（169 行），含义是「整份被替换过」，不要与行级 `evidence` 混淆。

## 四、采集流程的注意点

### 4.1 缓存会让上游更新失效

**现象**：`scripts/vocadb/client.ts` 优先读 `data/cache/<sha256(url)>.json`。上游补了歌单或改了日程，`pnpm collect` 仍会读到旧响应。

**影响**：交响乐若在 VocaDB 补了 `songList`，不先删缓存就永远拿不到。

**建议**：需要刷新某系列时，先删该系列与相关 event 的缓存文件，再跑 `pnpm collect`。

### 4.2 取消场次无法识别

**现象**：`performances.vocadb_status` 只有 `Finished / Approved / Draft`，没有 Cancelled。实际取消的场次被记为 `Finished` 且无日期：

- `2886` 鼓童 2020（外链先 `Twitter (Postponement)` 后 `Twitter (Cancellation)`）
- `2853`–`2861`、`2878`–`2880` MIKU EXPO 2020 美国/加拿大站（带 `Twitter (Cancellation)`）

**已解决（2026-11-06）**：新增 `performance_status` 表，逐条记录 `status`（`cancelled` / `postponed` / `upcoming`）、公告 `source_url` 与访问日期。当前 **13 条 `cancelled`**（12 个 MIKU EXPO 2020 站 + 鼓童 2020），演出页会显示「这场演出已取消」并给出公告链接，索引不再把它们与「未定档」混为一谈。

### 4.3 缺日期的 14 个演出

`2853`–`2861`、`2878`–`2880`、`2886`、`13210`。它们同时没有歌单，因此不进入排行，只在索引显示「日期未知」。暂无修复必要，但会影响「按场次」与「按演出」的计数差异（按场次不计，按演出仍计 1）。

### 4.4 39 感谢祭的人为归属

**现象**：`2520` 上游没有 `seriesId`、`seriesNumber` 为 0，由 `STANDALONE_EVENTS` 归入系列 219 / 年度 2010，所以页面标题读作「初音未来演唱会派对 2010」。

**后果**：差异报告多出一对 2010↔2011 的相邻年度对比。

**若要独立**：VocaDB 有系列 `218 ミクの日大感謝祭`（Draft、0 场），把它加进 `SERIES_IDS` 并在 `data/series-titles.zh-CN.json` 补中文名即可。

### 4.5 不在 VocaDB 的演出（人工补录）

VocaDB 的系列 173 只有 2026 上海站（13120）。成都站 2026-12-26 由主办方在上海站收官时公布，VocaDB 没有对应 event，因此目录里由 `data/increments/0011-manual-performances.sql` 直接补一行：

| id | 演出 | 日期 | 数据 |
| --- | --- | --- | --- |
| 3000000001 | MIKU WITH YOU 2026 in Chengdu | 2026-12-26 19:00 | 成都金融城演艺中心，单场，尚无歌单 |

约定：

- **id 从 3,000,000,000 起**（`shared/repertoire.ts` 的 `LOCAL_PERFORMANCE_ID_BASE`），与 VocaDB 的 releaseEvent id 不重叠；任何调用 `vocadb.net/api/releaseEvents/{id}` 的脚本都要跳过这个区间。
- 这类行的 `source_url` 不是 `vocadb.net/E/{id}`，而是日程／公告来源，`vocadb_status` 写 `NULL`。演出页的按钮因此显示「演出来源」而不是「VocaDB 演出」。
- 补录文件必须以 `INSERT OR IGNORE` 写在 `0001` 之后：`pnpm collect` 会先删掉整张 `performances` 再重写。
- 尚未举行的场次在 `data/performance-setlists.json` 的 `statuses.<id>` 写 `status: "upcoming"`，`pnpm derive:setlists` 会写进 `performance_status`，演出页显示「这场演出尚未举行」。
- 歌单仍等百科／官方，演出结束后按 `.cursor/skills/update-concert-data/SKILL.md` 补 `data/wiki-raw/` 与 `scripts/wiki_raw_spec.py`（`RAW_SPEC` 里 `mwy2026` 目前只指向 13120，新增成都表要另加一个 key 或把该 id 加进 `performances`）。

---

## 五、展示层的小问题

1. **MIKU EXPO 没有中文译名**（保留官方拉丁拼写），`data/series-titles.zh-CN.json` 里没有它。`MIKU WITH YOU` 已按官方中文名补为「未来有你」。若日后要译 `MIKU EXPO`，直接加条目即可；`tests/series-titles.test.ts` 只要求日文系列必须有译名，拉丁系列不作强制。
2. **质量报告只给汇总数字**，不逐行列出「没有歌单或开始日期的演出」（目前 31 场）。要定位具体场次只能查 `/raw` 的演出表。
3. **公开页面只保留 系列 → 演出 → 场次 三级**，`/series/{id}` 是系列主页，`/editions` 路由已删除；`series_number` 仍留在数据里，只用于首演与歌单差异对照。
4. **差异报告需要手动同步**：改动解析逻辑后必须跑 `pnpm report:setlist`，否则 CI 的 `pnpm report:setlist --check` 会失败。

---

## 六、修复优先级建议

| 优先级 | 项目 | 理由 |
| --- | --- | --- |
| 已完成 | 2.4 多城市共用歌单 → 场次层（`pnpm derive:setlists`） | 每个场次已有一整串曲目，`/shows` 不再靠备注 |
| 已完成 | 2.3 日夜场（`data/performance-setlists.json`） | `pending review = 0`、`conflict = 0`、`uncertain = 0` |
| 已完成 | 2.2 展览日排除 | 5 个已核实的展览日已从场次中剔除 |
| 已完成 | 4.2 取消场次标注 | `performance_status` 表，13 条 `cancelled` |
| 已完成 | 曲目改由百科逐曲表提供（3.5） | 169 / 181 个演出；地区差异不再靠备注 |
| 已完成 | 非 VOCALOID 曲目登记（3.6） | 20 条，演出页曲目不再缺行 |
| 中 | 3.3 版本链根节点人工合并（[#23](https://github.com/RJiazhen/miku-concert-stats/issues/23)） | 影响单曲归属与读者理解；已独立建 issue |
| 中 | 3.5 的原始表格回溯 | 52 个被引用的 atwiki 页没有留档，只留了 URL 与逐行曲目 |
| 低 | 1.1 交响乐剩余 3 场歌单 | 演出尚未发生，等百科更新 |
| 低 | 4.4 39 感谢祭独立成系列 | 需要新建系列并改标题，收益有限 |

---

## 七、修复时的通用要求

- 人工数据一律放 `data/*.json`，配 `shared/*.ts` 校验加载器与 `tests/`，不要直接写进 `catalog.sqlite` 或 `catalog.sqlite.gz`。
- 需要进 catalog 的补录写成 `data/increments/NNNN-*.sql`，全部 `INSERT OR IGNORE`，并在文件头注释说明来源与失效条件。
- 任何外部核实都必须记录 `source` 与 `accessedAt`，不能采信 VocaDB 的自由文本简介作为日程事实（见 2.3 的 2023 大阪反例）。
- 改完跑 `pnpm lint`、`pnpm test`、`pnpm typecheck`、`pnpm build`，以及 `pnpm report:setlist`（必要时）与 `pnpm report:setlist --check`。
- 新增或修改 `shared/` 函数时写 doc comment；数据层的判定要可测试，不要藏在模板里。
