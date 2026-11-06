# 演出歌单数据核查清单

> 对应 [issue #2](https://github.com/RJiazhen/miku-concert-stats/issues/2)「Validate all catalog data and distinguish setlist layers」。
> 数据快照：`main` @ `70347b4`，2026-11-05。目录含 **448 首歌 / 207 个演出 / 75 份歌单对象 / 1985 行曲目 / 306 个推导场次**。
> 本地检查：<http://127.0.0.1:3117/>。可直接打开 `/raw`（质量报告）、`/report`（差异核验）、`/shows/{id}`（单个演出）对照。
>
> **怎么用**：每节末尾都有「需要你确认」。直接在 `结论` 列写「同意 / 改成… / 不确定」即可；也可以只在有异议的行留言，未留言的行我按「同意」处理。确认后我再改数据或提交 PR，不会先动线上。

---

## 0. 先看整体：四层歌单模型现在的实际状态

| 层级 | 目录里的数量 | 说明 |
| --- | --- | --- |
| 系列 | 7 | 魔法未来、MIKU EXPO、未来有你、交响乐、Live Party、Snow Miku、鼓童 |
| 演出 | 207 | 一行 `performances`，对应一个 VocaDB release event / 一个城市站 |
| 场次 | 306 | 由起止日期推导；**0 个演出有结构化开演时间**（`showtime_local` 全空） |
| 歌单对象 | 75 | 64 份 VocaDB 歌单 + 11 张专辑曲目补位 |

核心张力：**VocaDB 的「歌单对象」不是「演出的歌单」**。75 份里，有 23 份被 2 个以上演出共用，最多一份被 17 个演出共用。站内目前用「备注轮换」把一行分到具体城市/日/场次，读法诚实，但「某首歌是否在这一站演过」仍然只能靠备注推断。issue 要求的「按地区/场馆拆成独立歌单」，就是要解决这一层。

需要你先定一个方向（第 3 节末尾有三个选项）：

- **A. 保持共用歌单 + 轮换备注**（现状，最保守）
- **B. 在数据层派生「演出歌单」对象**，每份派生歌单指向原 VocaDB 歌单并记录筛选依据（推荐）
- **C. 直接把 VocaDB 歌单复制成多份**（不推荐，会制造无法追溯的重复数据）

---

## 1. 缺失的歌单（30 个演出）

### 1.1 已确认取消（13 个）

| 演出 | 日期 | 外部链接 | 结论 |
| --- | --- | --- | --- |
| [2853](https://vocadb.net/E/2853) MIKU EXPO 2020 Vancouver | 无 | [官方页](https://mikuexpo.com/usaca2020/) · [取消公告](https://twitter.com/mikuexpo/status/1310762426975936512) | |
| [2854](https://vocadb.net/E/2854) San Jose | 无 | 同上 | |
| [2855](https://vocadb.net/E/2855) Dallas | 无 | 同上 | |
| [2856](https://vocadb.net/E/2856) Atlanta | 无 | 同上 | |
| [2857](https://vocadb.net/E/2857) Washington D.C. | 无 | 同上 | |
| [2858](https://vocadb.net/E/2858) Asbury Park | 无 | 同上 | |
| [2859](https://vocadb.net/E/2859) Boston | 无 | 同上 | |
| [2860](https://vocadb.net/E/2860) Chicago | 无 | 同上 | |
| [2861](https://vocadb.net/E/2861) Toronto | 无 | 同上 | |
| [2878](https://vocadb.net/E/2878) Los Angeles | 无 | 同上 | |
| [2879](https://vocadb.net/E/2879) Orlando | 无 | 同上 | |
| [2880](https://vocadb.net/E/2880) Montreal | 无 | 同上 | |
| [2886](https://vocadb.net/E/2886) 初音ミク×鼓童 2020 〜結〜 | 无 | [官方页](https://kodo-miku.com/) · [延期](https://twitter.com/kodo_miku/status/1254637364887949312) · [取消](https://twitter.com/kodo_miku/status/1353583380097507333) | |

**现状**：VocaDB 的 `vocadb_status` 只有 `Finished`，没有 `Cancelled`，所以这 13 个在索引里显示「日期未知」，和「未定档」无法区分（`docs/data-issues.md` §4.2）。

**需要你确认**：这 13 个是否都按「已取消」处理？若要建模，我建议在人工清单里加 `status: cancelled`，而不是改 VocaDB 的 `vocadb_status`。

### 1.2 尚未举行 / 上游还没歌单（12 个）

| 演出 | 日期 | 外部链接 | 结论 |
| --- | --- | --- | --- |
| [12222](https://vocadb.net/E/12222) MIKU EXPO 2026 London | 2026-11-12 | [官方页](https://mikuexpo.com/europe2026/) | |
| [12223](https://vocadb.net/E/12223) Brussels | 2026-11-14 | 同上 | |
| [12224](https://vocadb.net/E/12224) Amsterdam | 2026-11-15 | 同上 | |
| [12225](https://vocadb.net/E/12225) Berlin | 2026-11-17 | 同上 | |
| [12226](https://vocadb.net/E/12226) Düsseldorf | 2026-11-20 | 同上 | |
| [12227](https://vocadb.net/E/12227) Paris | 2026-11-22 | 同上 | |
| [12228](https://vocadb.net/E/12228) Madrid | 2026-11-24 ~ 11-25 | 同上 | |
| [12449](https://vocadb.net/E/12449) Lisbon | 2026-11-27 | 同上 | |
| [12940](https://vocadb.net/E/12940) 初音ミク×鼓童 〜響演〜 | 2026-11-20 ~ 11-21 | [官方页](https://kyouen-kodo-miku.com/) · [NHK](https://www.event.nhk.or.jp/e-portal/detail.html?id=4460) | |
| [12740](https://vocadb.net/E/12740) 交响乐 2026-2027 大阪 | 2027-01-10 | [公告](https://x.com/mikusymphony/status/2073754168125222956) | |
| [13209](https://vocadb.net/E/13209) 交响乐 2027 横滨 | 2027-03-13 | [公告](https://x.com/mikusymphony/status/2108885503928095114) | |
| [13210](https://vocadb.net/E/13210) 交响乐 2027 东京（Draft） | 无 | 同上 | |

**需要你确认**：这些先保持空歌单即可，还是有已经流出的歌单/官方曲目单需要我补？

### 1.3 已举行但上游没有歌单（5 个）

| 演出 | 日期 | 外部链接 | 结论 |
| --- | --- | --- | --- |
| [2790](https://vocadb.net/E/2790) MIKU EXPO 2020 Barcelona | 2020-01-28 | [活动页](https://www.facebook.com/events/680395649133980/) · [场馆](https://www.santjordiclub.cat/en/) | |
| [13120](https://vocadb.net/E/13120) 未来有你 2026 | 2026-10-31 ~ 11-01 | [微博](https://weibo.com/5582567326/5342263770352282) | |
| [12713](https://vocadb.net/E/12713) 交响乐 2026 札幌 | 2026-06-20 | [公告](https://x.com/mikusymphony/status/2005190481228300509) | |
| [12714](https://vocadb.net/E/12714) 交响乐 2026 东京 | 2026-07-05 | 同上 | |
| [12739](https://vocadb.net/E/12739) 交响乐 2026-2027 横滨 | 2026-10-10 | [公告](https://x.com/mikusymphony/status/2073754168125222956) | |

**重点**：`2790` 的演出是否真的举办过？如果举办过，需要一份现场歌单来源；如果没有，应并入 1.1 的取消清单。`13120` 刚落幕 4 天，若微博/官方有曲目单，请给我链接。

---

## 2. 专辑曲目补位（26 个演出 / 11 张专辑）

交响乐 256 在 VocaDB 没有任何 `songList`，其中 26 个演出用官方 CD/Blu-ray 的曲目列表补位（`song_lists.source = 'album'`）。页面已标注「歌单来自专辑曲目，不是 VocaDB 上该场演出的歌单」，并链回专辑。

| 系列年度 | 演出 | 专辑 | 曲目数 | 现有说明 | 结论 |
| --- | --- | --- | --- | --- | --- |
| 2016 | [2957](https://vocadb.net/E/2957) 东京 08-26 | [Al/19737](https://vocadb.net/Al/19737) CD | 18 | 同年版没有蓝光条目，用官方 CD 两张碟 | |
| 2017 | [2958](https://vocadb.net/E/2958) 大阪 11-17 · [2959](https://vocadb.net/E/2959) 东京 11-29 | [Al/30961](https://vocadb.net/Al/30961) Blu-ray | 15 | 蓝光是东京场；大阪按同年版同一套曲目对照 | |
| 2018-2019 | [2504](https://vocadb.net/E/2504) 东京 11-24 · [2960](https://vocadb.net/E/2960) 大阪 2019-01-25 | [Al/26491](https://vocadb.net/Al/26491) CD | 16 | 蓝光无曲目，用同年版 CD | |
| 2019 | [2870](https://vocadb.net/E/2870) 横滨 10-14 · [2871](https://vocadb.net/E/2871) 大阪 12-23 | [Al/27432](https://vocadb.net/Al/27432) CD | 21 | 同年版只有一套官方曲目 | |
| 2020 | [2954](https://vocadb.net/E/2954) 东京 09-21 · [2955](https://vocadb.net/E/2955) 横滨 10-17 · [2956](https://vocadb.net/E/2956) 大阪 11-17 | [Al/28945](https://vocadb.net/Al/28945) CD | 17 | 5th Anniversary；蓝光无曲目 | |
| 2021 | [3710](https://vocadb.net/E/3710) 横滨 09-20 · [3869](https://vocadb.net/E/3869) 神户 11-20 | [Al/30905](https://vocadb.net/Al/30905) CD | 17 | KAITO 15th；蓝光无曲目 | |
| 2022 | [4322](https://vocadb.net/E/4322) 东京 07-02 · [4808](https://vocadb.net/E/4808) 横滨 09-25 · [4814](https://vocadb.net/E/4814) 大阪 11-23 | [Al/37020](https://vocadb.net/Al/37020) CD | 14 | 15th Anniversary；同一套官方曲目 | |
| 2023 | [4877](https://vocadb.net/E/4877) 东京 08-29 | [Al/39621](https://vocadb.net/Al/39621) CD | 24 | CD 标题写明 Live at Suntory Hall | |
| 2023 | [4878](https://vocadb.net/E/4878) 横滨 10-14 · [4879](https://vocadb.net/E/4879) 神户 12-13 | [Al/40398](https://vocadb.net/Al/40398) CD | 25 | 2023 巡演版 CD | |
| 2024 | [12709](https://vocadb.net/E/12709) 东京 04-27 · [8033](https://vocadb.net/E/8033) 横滨 10-05 · [8035](https://vocadb.net/E/8035) 神户 12-29 | [Al/45255](https://vocadb.net/Al/45255) CD | 22 | Luka 15th；蓝光无曲目 | |
| 2025 | [8037](https://vocadb.net/E/8037) 札幌 02-11 · [8710](https://vocadb.net/E/8710) 大阪 04-12 · [8711](https://vocadb.net/E/8711) 东京 07-06 · [9267](https://vocadb.net/E/9267) 横滨 10-04 · [9276](https://vocadb.net/E/9276) 神户 12-27 | [Al/52449](https://vocadb.net/Al/52449) CD | 31 | 10th Anniversary；同一套官方曲目 | |

**已知局限**（`docs/data-issues.md` §3.1）：

- 2018 年之后的蓝光条目在 VocaDB 没有曲目，所以除 2017 外全部用 CD。
- 同一年份多个城市共用一张专辑，无法证明城市间曲目差异。

**需要你确认**：

1. 上面每一年的「多城市是否同一套曲目」是否成立？尤其 **2023 东京（三得利）与横滨/神户（巡演版）** 是否确实是两套不同节目。
2. 2017 大阪是否真的与东京同曲目（现有 Blu-ray 是东京场）？
3. `2957`（2016 东京）用的 CD 是否就是 8/26 这一场？如果有更精确的场次来源，请给我。
4. 2026 札幌/东京/横滨与 2027 大阪/横滨目前没有专辑，是否确认暂时留空？

---

## 3. 多城市共用歌单（issue 的核心）

### 3.1 全部共用歌单（VocaDB 上游 23 份）

「备注证据」表示歌单里有 `Day N` / 城市 / 日场夜场等可选信息；「无」表示一份歌单只能读成整个 run。

| 歌单 | 名称 | 演出数 | 涉及演出 | 备注证据 | 建议 |
| --- | --- | --- | --- | --- | --- |
| [16544](https://vocadb.net/L/16544) | MIKU EXPO 2024 北美 | 17 | 2024-04-04 ~ 05-21 | 有（城市 / Day / 场次） | 拆分候选 |
| [26423](https://vocadb.net/L/26423) | MIKU EXPO 2026 北美 | 15 | 2026-04-12 ~ 05-19 | 有 | 拆分候选 |
| [6571](https://vocadb.net/L/6571) | MIKU EXPO 2016 北美 | 10 | 2016-04-23 ~ 06-04 | 无 | 保持共用 |
| [22929](https://vocadb.net/L/22929) | MIKU EXPO 2025 亚洲 | 8 | 2025-11-05 ~ 11-29 | 有 | 拆分候选 |
| [7758](https://vocadb.net/L/7758) | MIKU EXPO 2018 北美 | 7 | 2018-06-29 ~ 07-19 | 有（城市） | 拆分候选 |
| [18446](https://vocadb.net/L/18446) | MIKU EXPO 2024 欧洲 | 6 | 2024-10-26 ~ 11-02 | 有 | 拆分候选 |
| [6570](https://vocadb.net/L/6570) | MIKU EXPO 2016 日本 | 5 | 2016-03-23 ~ 04-09 | 无 | 保持共用 |
| [18583](https://vocadb.net/L/18583) | MIKU EXPO 2024 新西兰/澳洲 | 5 | 2024-11-15 ~ 11-26 | 有 | 拆分候选 |
| [9359](https://vocadb.net/L/9359) | 未来有你 2019 | 4 | 3752–3755（上海/成都/北京/广州） | 有（城市分组） | **issue 例子，优先拆** |
| [7986](https://vocadb.net/L/7986) | 未来有你 2018 | 3 | 2085–2087（北京/成都/上海） | 有 | 优先拆 |
| [17933](https://vocadb.net/L/17933) | 魔法未来 2024 | 3 | 7214 / 7215 / 7217 | 有（城市+Day） | 拆分候选 |
| [17590](https://vocadb.net/L/17590) | 未来有你 2024 | 3 | 7673–7675 | 有（城市+Day） | 拆分候选 |
| [20912](https://vocadb.net/L/20912) | 魔法未来 2025 | 3 | 8768–8770 | 有（日/夜） | 拆分候选 |
| [27886](https://vocadb.net/L/27886) | 魔法未来 2026 | 3 | 12249–12251 | 有（日/夜） | 拆分候选 |
| [7852](https://vocadb.net/L/7852) | 魔法未来 2018 | 2 | 1561 大阪 / 1745 东京 | 有（城市+Encore） | 拆分候选 |
| [221](https://vocadb.net/L/221) | MIKU EXPO 2014 美国 | 2 | 1937 洛杉矶 / 1938 纽约 | 无（只有旁白说明） | 保持共用 |
| [6950](https://vocadb.net/L/6950) | MIKU EXPO 2016 中国 | 2 | 1942 北京 / 1943 上海 | 无 | 保持共用 |
| [214](https://vocadb.net/L/214) | 魔法未来 2014 | 2 | 2517 大阪 / 2518 东京 | 有 Encore | 可保持 |
| [31](https://vocadb.net/L/31) | Live Party 2012 香港/台湾 | 2 | 2524 / 2525 | `Taiwan only` 一行 | 拆分候选 |
| [8631](https://vocadb.net/L/8631) | MIKU EXPO 2020 伦敦/柏林 | 2 | 2786 / 2788 | 无 | 保持共用 |
| [9909](https://vocadb.net/L/9909) | 魔法未来 2021 | 2 | 3305 大阪 / 3306 东京 | 有（Day） | 拆分候选 |
| [10556](https://vocadb.net/L/10556) | 魔法未来 10th（大阪/东京） | 2 | 4233 / 4234 | 有（Day） | 拆分候选 |
| [13440](https://vocadb.net/L/13440) | 魔法未来 2023 | 2 | 6045 大阪 / 6046 东京 | 有（Day + 1st/2nd） | 拆分候选 |

<details>
<summary>展开：16544 / 26423 / 22929 的完整演出清单</summary>

- **16544（17 场）**：6516 Vancouver、6517 Portland、6518 San Jose、6519 Phoenix、6520 Denver、6521 Dallas、6522 Austin、6523 Atlanta、6524 Orlando、6525 Washington、6526 Newark、6527 Boston、6528 Detroit、6529 Chicago、6530 Toronto、6531 Mexico City、7186 Los Angeles
- **26423（15 场）**：9811 Chicago、9812 Denver、9813 Vancouver、9814 Seattle、9815 San Jose、9816 Los Angeles、9817 Glendale、9818 Grand Prairie、9819 Cedar Park、9820 Duluth、9821 Washington、9822 Newark、9823 Boston、9824 Hamilton、9825 Mexico City
- **22929（8 场）**：9341 Bangkok、9348 Hong Kong、9349 Jakarta、9350 Manila、9351 Singapore、9352 Kuala Lumpur、9353 Seoul、9555 Taipei

</details>

### 3.2 issue 的例子：未来有你 2019（歌单 9359）

一份歌单覆盖上海、成都、北京、广州四个演出。备注把其中 8 行分成两组：

| 曲目 | 备注 | 实际属于 |
| --- | --- | --- |
| ローリンガール | `Shanghai, Beijing` | 上海 + 北京 |
| アンハッピーリフレイン | `Chengdu, Guangzhou` | 成都 + 广州 |
| 深海少女 | `Shanghai, Beijing` | 上海 + 北京 |
| ツギハギスタッカート | `Chengdu, Guangzhou` | 成都 + 广州 |
| ダブルラリアット | `Shanghai, Beijing` | 上海 + 北京 |
| Just Be Friends | `Chengdu, Guangzhou` | 成都 + 广州 |
| Tell Your World | `Shanghai, Beijing` | 上海 + 北京 |
| メルト | `Chengdu, Guangzhou` | 成都 + 广州 |

其余 21 行四个城市都演。也就是说，**当前只有「替换曲目」能区分地区，无法直接回答「上海场到底有没有演 X」**。

未来有你 2018（歌单 [7986](https://vocadb.net/L/7986)）更细：北京独有 3 行、成都独有 3 行、上海独有 3 行，另有一行 `Chengdu, Shanghai` 共用。

### 3.3 需要你决定

| 选项 | 做法 | 优点 | 代价 |
| --- | --- | --- | --- |
| A | 保持现状：一份 VocaDB 歌单 + 轮换备注 | 不动上游数据，可追溯 | 地区差异仍靠备注；issue 的验收项无法完成 |
| **B（推荐）** | 新增 `data/setlist-splits.json`：每份派生歌单记录 `sourceListId` + 城市/日期/场次筛选 + 派生行；页面按派生歌单展示 | 每个地区歌单独立成层，仍可回溯到 VocaDB | 需要新增 schema / 加载器 / 报告 |
| C | 直接复制成多份 VocaDB 歌单 | 页面简单 | 破坏来源，无法证明复制依据 |

**需要你确认**：

1. 选 A / B / C 哪一个？
2. 若选 B，**优先拆哪些**？我建议先做 `9359`（未来有你 2019）、`7986`（2018）、`17590`（2024），因为这三份的备注已经能唯一确定城市。
3. `16544` / `26423` / `22929` 的备注来自粉丝整理，是否作为「可拆分依据」？还是只作为「不确定提示」？

---

## 4. 歌单合并组

### 4.1 已写入 `data/setlist-merges.json` 的 9 组（22 份歌单）

这些是「同一系列年度、确认是同一套节目」的合并，页面会并排显示。请确认没有误合并：

| 组 | 歌单 | 说明 |
| --- | --- | --- |
| `81-2019` | [8101](https://vocadb.net/L/8101) 东京 · [8102](https://vocadb.net/L/8102) 大阪 | 魔法未来 2019 |
| `81-2020` | [9173](https://vocadb.net/L/9173) 东京 · [9131](https://vocadb.net/L/9131) 大阪 | 魔法未来 2020 |
| `82-2014` | [221](https://vocadb.net/L/221) 美国 · [213](https://vocadb.net/L/213) 印尼 | MIKU EXPO 2014 |
| `82-2016` | [6570](https://vocadb.net/L/6570) 日本 · [6571](https://vocadb.net/L/6571) 北美 · [6572](https://vocadb.net/L/6572) 台湾 | MIKU EXPO 2016 |
| `82-2018-eu` | [7979](https://vocadb.net/L/7979) 巴黎 · [7985](https://vocadb.net/L/7985) 科隆 · [7988](https://vocadb.net/L/7988) 伦敦 | MIKU EXPO 2018 欧洲 |
| `82-2019` | [8103](https://vocadb.net/L/8103) 台北 · [8104](https://vocadb.net/L/8104) 香港 | MIKU EXPO 2019 |
| `82-2020` | [8631](https://vocadb.net/L/8631) 伦敦/柏林 · [8654](https://vocadb.net/L/8654) 阿姆斯特丹 · [8641](https://vocadb.net/L/8641) 巴黎 | MIKU EXPO 2020 欧洲 |
| `82-2022` | [10913](https://vocadb.net/L/10913) Rewind+ · [10387](https://vocadb.net/L/10387) Rewind | MIKU EXPO 2022 |
| `82-2024` | [16544](https://vocadb.net/L/16544) 北美 · [18446](https://vocadb.net/L/18446) 欧洲 · [18583](https://vocadb.net/L/18583) 新西兰/澳洲 | MIKU EXPO 2024 |

### 4.2 同系列年度但**未合并**的 13 对

来自 `pnpm report:setlist`。这些目前分开显示，需要你判断「是不是同一套节目」：

| 系列年度 | 左 → 右 | 差异摘要 | 结论 |
| --- | --- | --- | --- |
| 交响乐 2023 | [39621](https://vocadb.net/Al/39621)（三得利）→ [40398](https://vocadb.net/Al/40398)（巡演） | 24 → 25 行；共有 14；LCS 0.52 | |
| MIKU EXPO 2016 | [6571](https://vocadb.net/L/6571) 北美 → [6950](https://vocadb.net/L/6950) 中国 | 26 → 26；共有 19；LCS 0.50 | |
| 魔法未来 2023 | [12354](https://vocadb.net/L/12354) 札幌 → [13440](https://vocadb.net/L/13440) 大阪/东京 | 22 → 39；共有 7；LCS 0.13 | |
| MIKU EXPO 2016 | [6570](https://vocadb.net/L/6570) 日本 → [6950](https://vocadb.net/L/6950) 中国 | 26 → 26；共有 17；LCS 0.38 | |
| MIKU EXPO 2016 | [6572](https://vocadb.net/L/6572) 台湾 → [6950](https://vocadb.net/L/6950) 中国 | 26 → 26；共有 18；LCS 0.42 | |
| MIKU EXPO 2018 | [7758](https://vocadb.net/L/7758) 北美 → [7979](https://vocadb.net/L/7979) 巴黎 | 32 → 26；共有 12；LCS 0.25 | |
| MIKU EXPO 2018 | [7758](https://vocadb.net/L/7758) → [7985](https://vocadb.net/L/7985) 科隆 | 32 → 26；共有 10；LCS 0.22 | |
| MIKU EXPO 2018 | [7758](https://vocadb.net/L/7758) → [7988](https://vocadb.net/L/7988) 伦敦 | 32 → 26；共有 11；LCS 0.25 | |
| Live Party 2011 | [1](https://vocadb.net/L/1) 新加坡 → [12](https://vocadb.net/L/12) 札幌 | 27 → 26；共有 20；LCS 0.48 | |
| Live Party 2011 | [1](https://vocadb.net/L/1) → [3953](https://vocadb.net/L/3953) 东京 | 27 → 39；共有 21；LCS 0.26 | |
| Live Party 2011 | [12](https://vocadb.net/L/12) → [3953](https://vocadb.net/L/3953) | 26 → 39；共有 23；LCS 0.36 | |
| Live Party 2012 | [31](https://vocadb.net/L/31) 香港/台湾 → [217](https://vocadb.net/L/217) 东京 | 25 → 33；共有 20；LCS 0.33 | |
| Live Party 2013 | [82](https://vocadb.net/L/82) 札幌 → [3954](https://vocadb.net/L/3954) 关西 | 26 → 39；共有 26；LCS 0.38 | |

**我的判断（供你参考）**：2016 中国场、2018 欧洲、2011–2013 各城市站很可能本来就是不同节目，不建议合并；交响乐 2023 两套发行确认为不同场次，不建议合并；魔法未来 2023 札幌是 10th 的追加场，曲目与 2023 本巡演不同，不建议合并。

**需要你确认**：以上 13 对是否全部维持「不合并」？如果有应当合并的，请指出。

---

## 5. 备注无法落到具体场次（105 行）

`shared/rotation.ts` 已把备注解析到城市/日/场次，但下面 105 行只能落到「当天」或「该演出的多场」，UI 会标黄提示。

| 原因 | 行数 | 涉及歌单 | 涉及演出 | 需要你判定 |
| --- | --- | --- | --- | --- |
| 备注写了日场/夜场或当天有多场，解析器只定位到当天 | 41 | 7384、12354、13440、20912、23552、27886 | 见下 | 当天到底几场？每场曲目是否不同？ |
| 只写城市，且该城市在这份歌单里有 2 场 | 19 | 7852、7986、9359、17933 | 见下 | 城市内两场是否同一套？ |
| 只写城市，且该城市在这份歌单里有 3 场 | 14 | 7852、17933、20912、27886 | 见下 | 同上 |
| 本场 30 首，同歌单其他场次多为 26 首 | 12 | 26423 | MIKU EXPO 2026 北美 | 30 首的场次是否是完整歌单？ |
| 本场 26 首，同歌单其他场次多为 23 首 | 10 | 16544 | MIKU EXPO 2024 北美 | 26 首的场次是否是完整歌单？ |
| 本场 28 首，同歌单其他场次多为 24 首 | 8 | 22929 | MIKU EXPO 2025 亚洲 | 28 首的场次是否是完整歌单？ |
| 本场 24 首，同歌单其他场次多为 25 首 | 1 | 31 | Live Party 2012 台湾 | `Taiwan only` 的 Starduster 是否只在台湾？ |

<details>
<summary>展开：41 行日夜场/多场备注的明细</summary>

- **7384**（with YOU 2017 CHINA FESTIVAL，单场）：Strangers / 恋愛裁判 / サイハテ（`Afternoon Concert`）；すろぉもぉしょん / からくりピエロ / えれくとりっく・えんじぇぅ（`Evening Concert`）。→ 这一天两场，各 3 行不同。
- **12354**（魔法未来 10th 札幌）：どりーみんチュチュ（`DAY 1 1st and 2nd Show / Audience Request`）；shake it！（`DAY 2 1st Show`）；Jump for Joy（`DAY 2 2nd Show`）。
- **13440**（魔法未来 2023 大阪/东京）：39みゅーじっく! / 初音天地開闢神話 / 愛されなくても君がいる（DAY 1 1st + DAY 2 2nd + DAY 3 1st）；ネクストネスト / ブレス・ユア・ブレス / グリーンライツ・セレナーデ（DAY 1 2nd + DAY 2 1st + DAY 3 2nd）。
- **20912**（魔法未来 2025 仙台/大阪/东京）：日场 6 行（初音天地開闢神話 / 抜錨 / ジェミニ / ドクター＝ファンクビート / 星空クロノグラフ / Starduster）；夜场 6 行（アンテナ39 / 星屑ユートピア / キミペディア / みかぼし / 夜舞うシルエット / Last Night, Good Night）。
- **23552**（未来有你 2025）：快晴（Day 1 Daytime） / 星のカケラ（piano ver.）（Day 1 Nighttime） / ウミユリ海底譚（Day 2 Daytime） / 僕が夢を捨てて大人になるまで（Day 2 Nighttime）。
- **27886**（魔法未来 2026 滨松/大阪/东京）：日场 5 行（気まぐれメルシィ / あったかいと / ヒビカセ / vivid / HERO）；夜场 5 行（アンハッピーリフレイン / FLASH / ヴァンパイア / 陽だまりのセツナ / ブレス・ユア・ブレス）。

</details>

**需要你确认**：这些行是否按现有警告保留即可？如果你能提供逐日/逐场的官方曲目单，我可以改成确定归属。

---

## 6. 歌单长度不一致（10 个演出）

这些演出的解析曲目数与该歌单的常见长度不同，`/raw` 会提示「不与同组合并」。需要确认是「真的少唱/多唱」还是「备注没覆盖到」：

| 演出 | 歌单 | 原因 | 结论 |
| --- | --- | --- | --- |
| [2524](https://vocadb.net/E/2524) Live Party 2012 香港 | [31](https://vocadb.net/L/31) | 本场 24 首，其他多为 25 首 | |
| [6518](https://vocadb.net/E/6518) MIKU EXPO 2024 San Jose | [16544](https://vocadb.net/L/16544) | 本场 26 首，其他多为 23 首 | |
| [6519](https://vocadb.net/E/6519) Phoenix | 同上 | 同上 | |
| [6520](https://vocadb.net/E/6520) Denver | 同上 | 同上 | |
| [6521](https://vocadb.net/E/6521) Dallas | 同上 | 同上 | |
| [9353](https://vocadb.net/E/9353) MIKU EXPO 2025 Seoul | [22929](https://vocadb.net/L/22929) | 本场 28 首，其他多为 24 首 | |
| [9811](https://vocadb.net/E/9811) MIKU EXPO 2026 Chicago | [26423](https://vocadb.net/L/26423) | 本场 30 首，其他多为 26 首 | |
| [9815](https://vocadb.net/E/9815) San Jose | 同上 | 同上 | |
| [9816](https://vocadb.net/E/9816) Los Angeles | 同上 | 同上 | |
| [9823](https://vocadb.net/E/9823) Boston | 同上 | 同上 | |

**需要你确认**：上表哪些是「这一站确实多唱了替换曲」，哪些是「备注漏了城市」？

---

## 7. 日夜场与展期

### 7.1 日夜场（`docs/data-issues.md` §2.3）

- VocaDB 结构化数据：`showtime_local` 非空 **0 / 207**，`time_evidence` 非空 **0**，`time_precision` 全部 `day`。
- 现有日夜证据全部来自备注：41 行（见第 5 节）。
- `docs/data-issues.md` 已记录 2026-11-04 核查的 40 行官方票务数据，可直接落成 `data/show-schedules.json`。规律：
  - 魔法未来自 2019 起几乎每天日场 + 夜场，首日往往仅夜场。
  - 未来有你 2018 起每次巡演昼 14:00 / 夜 19:30 两场。
- 2020 魔法未来是 **3 部制**（11:00 / 15:00 / 19:00），官方只写「1部/2部/3部」，现有模型归为「日场（11:00、15:00）+ 夜场（19:00）」是推断，置信度中。

**需要你确认**：

1. 是否按 `docs/data-issues.md` 的 40 行先落 `data/show-schedules.json`？
2. 2020 的 3 部制是否接受「日场/夜场」二分，还是需要新增「部」这一层？
3. 2024–2026 的日夜场是否要我继续查官方页补齐？这会新增外部核实工作。

### 7.2 展期被当成演出日

| 演出 | 区间 | 实际情况 | 结论 |
| --- | --- | --- | --- |
| [2515](https://vocadb.net/E/2515) 魔法未来 2019 大阪 | 2019-08-09 ~ 08-11 | 8/9 只有企划展，8/10–11 才是 live | |
| [2758](https://vocadb.net/E/2758) 魔法未来 2020 大阪 | 2020-11-27 ~ 11-29 | 11/27 只有企划展，11/28–29 才是 live | |

**影响**：按场次计数各多算 1 场。**需要你确认**：是否在 `data/show-schedules.json` 里把这两天的 live 标为 0 场？

---

## 8. 版本合并与疑似重复

### 8.1 已写入 `data/song-variants.json` 的 19 条

| 变体 | 并入 | 类型 | 说明 |
| --- | --- | --- | --- |
| [69073](https://vocadb.net/S/69073) Just be Friends | [1360](https://vocadb.net/S/1360) | cover | 同曲同演出者 |
| [1949](https://vocadb.net/S/1949) 右肩の蝶（レン） | [1952](https://vocadb.net/S/1952) | voicebank | レン版，原曲为リン版 |
| [328076](https://vocadb.net/S/328076) 星のカケラ（piano ver.） | [2241](https://vocadb.net/S/2241) | cover | piano 翻唱 |
| [22926](https://vocadb.net/S/22926) Last Night, Good Night (Re:Dialed) | [2443](https://vocadb.net/S/2443) | remaster | Re:Dialed |
| [275708](https://vocadb.net/S/275708) え？あぁ、そう。10th | [2716](https://vocadb.net/S/2716) | remaster | 10th Anniversary |
| [8215](https://vocadb.net/S/8215) 初音ミクの激唱（LONG） | [2927](https://vocadb.net/S/2927) | remix | LONG VERSION |
| [9034](https://vocadb.net/S/9034) ピアノ×フォルテ×スキャンダル | [9035](https://vocadb.net/S/9035) | remaster | MEIKO Append |
| [203234](https://vocadb.net/S/203234) 8HIT -V4X ver.- | [9210](https://vocadb.net/S/9210) | voicebank | V4X 重调 |
| [237976](https://vocadb.net/S/237976) 月西江 | [10882](https://vocadb.net/S/10882) | remaster | VocaDB 重复条目 |
| [244538](https://vocadb.net/S/244538) それがあなたの幸せとしても | [26010](https://vocadb.net/S/26010) | remaster | ルカ V4X |
| [66752](https://vocadb.net/S/66752) Sharing The World（英文） | [66126](https://vocadb.net/S/66126) | cover | 英文翻唱 |
| [182370](https://vocadb.net/S/182370) Sharing The World（西语） | [66126](https://vocadb.net/S/66126) | language | 西班牙语版 |
| [680530](https://vocadb.net/S/680530) Hand in Hand（现场） | [89726](https://vocadb.net/S/89726) | cover | 现场翻唱 |
| [269364](https://vocadb.net/S/269364) ロキ（レン加入） | [185363](https://vocadb.net/S/185363) | cover | 鏡音レン加入 |
| [247035](https://vocadb.net/S/247035) アルビノ -revive- | [1061](https://vocadb.net/S/1061) | remix | -revive- |
| [3383](https://vocadb.net/S/3383) Fire◎Flower 2011 | [6387](https://vocadb.net/S/6387) | remaster | 2011 版 |
| [16943](https://vocadb.net/S/16943) みんなみくみくにしてあげる♪ | [1355](https://vocadb.net/S/1355) | remaster | 2012 版 |
| [326239](https://vocadb.net/S/326239) 虽然歌声无形 | [277408](https://vocadb.net/S/277408) | language | 中文版 |
| [2925](https://vocadb.net/S/2925) 初音ミクの消失 -DEAD END-（287 秒） | ~~[295872](https://vocadb.net/S/295872)~~ | — | 已从目录删除（0014）：现场只演奏改编短版 |

**需要你确认**：以上 18 条是否有不该合并的？特别是 `Sharing The World` 的英文/西语版，以及 `Hand in Hand` 的现场翻唱。

### 8.2 版本链根节点异常（`docs/data-issues.md` §3.3）

专辑曲目沿 `originalVersionId` 解析到根歌曲后，出现两个可疑的根：

| 专辑曲目 | 解析结果 | 问题 | 结论 |
| --- | --- | --- | --- |
| ハジメテノオト（短版） | [389595](https://vocadb.net/S/389595) `ハジメテノオト(Shortバージョン)` | 没有并入常见的 [10951](https://vocadb.net/S/10951) | |
| 初音ミクの消失 | [295872](https://vocadb.net/S/295872) `初音ミクの消失`（2007 Original，110 秒） | ~~没有并入常见的 [2925](https://vocadb.net/S/2925) `-DEAD END-`~~ | 长版从目录删除（见下） |

**我的判断**：这两条不一定是错。交响乐用的是「Short 版」和「Original 版」，与常见版本可能是不同录音。需要你决定：**按「同一首歌」合并，还是保留为不同版本并在页面注明？**

**结论（2026-11-06，[#23](https://github.com/RJiazhen/miku-concert-stats/issues/23)）**：逐条核对了 11 个交响乐演出的 atwiki 逐曲表，并对照了现场录像，两处都只是 id 归属问题，与「短版/长版」无关：

- `389595`（ハジメテノオト Short 版，136 秒）从未在任何演出出现，**已从目录删除**，引用改到 `10951`（`data/increments/0013-drop-unperformed-short-version.sql`）。
- `2925`（-DEAD END- 287 秒长版）**已从目录删除**（`data/increments/0014-merge-dead-end-long-version.sql`），引用全部改到 `295872`。现场从未演奏长版：MIKU EXPO 2016 东京、マジカルミライ 2023、初音ミク×鼓童 2017 用的都是改编后的短版（约 2 分 40 秒），这条说明写到 `data/song-notes.json`，单曲页顶部会显示。

### 8.3 疑似重复但未合并（8 组）

`/raw` 的质量报告按「去掉括号与版本后缀后同名」生成：

| 归一化标题 | 候选 | 结论 |
| --- | --- | --- |
| 星のカケラ | [2241](https://vocadb.net/S/2241) Remaster（2007-08-23） · [730922](https://vocadb.net/S/730922) Original（2007-08-17） | |
| 歌に形はないけれど | [2322](https://vocadb.net/S/2322) Original（2008-01-20） · [277408](https://vocadb.net/S/277408) Remaster（2009-03-25） | |
| Packaged | [2432](https://vocadb.net/S/2432) Remix（2007-09-25） · [100671](https://vocadb.net/S/100671) Original（2007-09-22） | |
| Tell Your World | [8395](https://vocadb.net/S/8395) Remix（2012-01-18） · [399060](https://vocadb.net/S/399060) Original（2011-12-15） | |
| ハジメテノオト | [10951](https://vocadb.net/S/10951) Remix（2007-10-13） · ~~[389595](https://vocadb.net/S/389595) Short~~ | 已解决：Short 版从目录删除（见 8.2） |
| Birthday Song for ミク | [14339](https://vocadb.net/S/14339) Original（2012-07-20） · [522024](https://vocadb.net/S/522024) Remix（2012-08-01） | |
| on the rocks | [19913](https://vocadb.net/S/19913) Cover（2014-04-23） · [203921](https://vocadb.net/S/203921) Original（2012-03-08） | |
| Blessing | [50703](https://vocadb.net/S/50703) Original（2014-03-11） · [423456](https://vocadb.net/S/423456) Remaster（2022-07-20） | |

**需要你确认**：哪些应写入 `data/song-variants.json`？如果要合并，建议以 Original 为 canonical（`2322`、`100671`、`399060`、`203921`、`50703`、`730922`），但 `歌に形はないけれど` 目前已把 `277408` 当作 canonical，需要一并调整。

---

## 9. 其他会影响「歌单」读法的小问题

1. **4 首歌没有 PV 链接**：[3383](https://vocadb.net/S/3383) Fire◎Flower 2011、[164111](https://vocadb.net/S/164111) 快晴、[265552](https://vocadb.net/S/265552) 蛹になった君に、[1013343](https://vocadb.net/S/1013343) いのちもやしてたたけよ。是否需要补 PV？
2. **MIKU EXPO 没有中文译名**（`data/series-titles.zh-CN.json` 未收录），显示保留拉丁拼写。要不要补？
3. **39 感谢祭（2520）** 被人工归入 Live Party 2010；VocaDB 有独立系列 `218 ミクの日大感謝祭`（Draft、0 场）。是否要独立成系列？
4. **质量报告只给汇总**，不逐行列出「没有歌单或开始日期的演出」（当前 30 场）。是否要我加逐行清单？
5. **`announced_at` 全空**（64 份上游歌单；11 份专辑补位不计）：VocaDB 公开 API 没有该字段，页面不显示公布时间。确认保持空即可。

---

## 10. 确认后的数据落点

| 你的决定 | 我会改哪里 |
| --- | --- |
| 1.1 取消、1.3 已举行无歌单 | 新增 `data/show-schedules.json` 或 `data/performance-status.json` + `shared/*.ts` 校验器 |
| 第 2 节专辑对应关系 | `data/album-setlists.json`，必要时重跑 `pnpm collect:albums` |
| 第 3 节拆分方案 | 若选 B：新增 `data/setlist-splits.json` + `shared/setlist-splits.ts` + 报告/测试；若选 A：只补文档 |
| 第 4 节合并 | `data/setlist-merges.json`，再跑 `pnpm report:setlist` |
| 第 5 / 6 节备注与长度 | 先补来源，再改 `shared/rotation.ts` 或人工清单；不改上游备注 |
| 第 7 节日夜场/展期 | `data/show-schedules.json` + `shared/show-schedules.ts`，接到 `performanceSchedules` 的第三参数 |
| 第 8 节版本合并 | `data/song-variants.json`，再跑 `pnpm test` / `pnpm report:setlist` |
| 第 9 节小问题 | 按项分别改 `data/series-titles.zh-CN.json`、`docs/data-issues.md` 或 `/raw` |

所有人工数据仍放 `data/*.json`，配 `shared/*.ts` 校验器与 `tests/`；需要进 catalog 的补录用 `data/increments/NNNN-*.sql`，并写清来源与失效条件。

---

## 11. 已确认、这轮不用再看的

- **制作人数据**：你已确认 `tmp/producers-suspect.md` 的 8 项，规则已写进 `docs/architecture.md`；本轮不重复。
- **角色 / 应援色映射**：`data/characters.json` 当前 22 个角色，本轮没有发现解析失败。
- **中文歌名**：448 首里 172 首有中文名；缺的 276 首按现有规则回退原文，不影响歌单结构。
