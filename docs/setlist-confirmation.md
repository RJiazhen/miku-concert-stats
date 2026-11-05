# 歌单数据待确认清单

> 生成本文件：`uv run scripts/confirmation-report.py`（读 `public/data/catalog.sqlite`）。
> 怎么回：勾选后把结论写进该条的「补充说明」，或者直接告诉我编号，例如「2.3 每天只有一场」「4.1 应排除 X」。
> 勾选框各自独立一行；编号可以跨会话引用。
> 详细逐条版本见 [docs/reports/setlist-review.md](reports/setlist-review.md)。

## 0. 一句话现状

- 目录里 177 个演出已展开成 **329 个场次**、8084 条曲目。
- 已用官方票务页核实 25 条来源，用粉丝 wiki 核实 18 条；这些都已直接采用，见第 1 节。
- 还有 **25 个跨天演出**只有「每天一场」的默认处理，没有逐日时刻证据，见第 2 节。

**已核实、不需要你再确认的部分**：魔法未来 2015–2026 全部场次的逐日 / 日夜场；
未来有你 2018、2019 四站；MIKU EXPO 2014 印尼、洛杉矶、纽约；SNOW MIKU 2018；
Live Party 2013 札幌。这 5 个企划展日已从场次里剔除：
2015 东京 9/06、2016 东京 9/09、2018 东京 8/31、2019 大阪 8/09、2020 大阪 11/27。

---

## 1. 数据来源记录（已采用，无需确认）

这一节只留档，不用回复：凡是从官方票务页、萌娘百科或 VocaDB Fandom 查到场次的演出，
数据已经直接采用，来源、访问日期与置信度都记录在下面，也写进了 catalog 的
`performance_setlist_sources`。

| 演出 | 系列 | 日期 | 场次 × 曲目 | 归属 | 置信度 | 来源 |
| --- | --- | --- | --- | --- | --- | --- |
| 初音ミク「マジカルミライ 2015」in TOKYO（2514） | 魔法未来 | 2015-09-04 | 3 × 27 | vocadb-note | high | [マジカルミライ 2015 チケット](https://magicalmirai.com/2015/ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2016」in TOKYO（1398） | 魔法未来 | 2016-09-09 | 4 × 26 | vocadb-note | high | [マジカルミライ 2016 チケット](https://magicalmirai.com/2016/ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2017」in TOKYO（1397） | 魔法未来 | 2017-09-01 | 5 × 28 | vocadb-note | high | [マジカルミライ 2017 チケット](https://magicalmirai.com/2017/ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2018」in OSAKA（1561） | 魔法未来 | 2018-08-25 | 4 × 27 | external | high | [マジカルミライ 2018 OSAKA チケット](https://magicalmirai.com/2018/osaka_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2018」in TOKYO（1745） | 魔法未来 | 2018-08-31 | 4 × 27 | external | high | [マジカルミライ 2018 TOKYO チケット](https://magicalmirai.com/2018/tokyo_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2019」in OSAKA（2515） | 魔法未来 | 2019-08-09 | 4 × 26 | vocadb-note | high | [マジカルミライ 2019 OSAKA チケット](https://magicalmirai.com/2019/osaka_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2019」in TOKYO（2516） | 魔法未来 | 2019-08-30 | 5 × 26 | vocadb-note | high | [マジカルミライ 2019 TOKYO チケット](https://magicalmirai.com/2019/tokyo_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2020」in OSAKA（2758） | 魔法未来 | 2020-11-27 | 4 × 18 | vocadb-note | high | [マジカルミライ 2020 OSAKA チケット](https://magicalmirai.com/2020/osaka/ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2020」in TOKYO（2759） | 魔法未来 | 2020-12-18 | 5 × 18 | vocadb-note | high | [マジカルミライ 2020 TOKYO チケット](https://magicalmirai.com/2020/tokyo/ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2021」in OSAKA（3305） | 魔法未来 | 2021-10-22 | 5 × 26 | vocadb-note | high | [マジカルミライ 2021 OSAKA チケット](https://magicalmirai.com/2021/osaka_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2021」in TOKYO（3306） | 魔法未来 | 2021-11-05 | 6 × 25 | vocadb-note | high | [マジカルミライ 2021 TOKYO チケット](https://magicalmirai.com/2021/tokyo_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ」10th Anniversary in OSAKA（4233） | 魔法未来 | 2022-08-12 | 5 × 25 | vocadb-note | high | [マジカルミライ 10th Anniversary OSAKA チケット](https://magicalmirai.com/10th/osaka_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ」10th Anniversary in TOKYO（4234） | 魔法未来 | 2022-09-02 | 6 × 25 | vocadb-note | high | [マジカルミライ 10th Anniversary TOKYO チケット](https://magicalmirai.com/10th/tokyo_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ」10th Anniversary in SAPPORO（4235） | 魔法未来 | 2023-02-04 | 4 × 20 | vocadb-note | high | [マジカルミライ 10th Anniversary SAPPORO チケット](https://magicalmirai.com/10th/sapporo_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2023」in OSAKA（6045） | 魔法未来 | 2023-08-11 | 6 × 24 | vocadb-note | high | [マジカルミライ 2023 OSAKA チケット](https://magicalmirai.com/2023/osaka_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2023」in TOKYO（6046） | 魔法未来 | 2023-09-01 | 6 × 24 | vocadb-note | high | [マジカルミライ 2023 TOKYO チケット](https://magicalmirai.com/2023/tokyo_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2024」in FUKUOKA（7214） | 魔法未来 | 2024-08-17 | 4 × 24 | vocadb-note | high | [マジカルミライ 2024 FUKUOKA チケット](https://magicalmirai.com/2024/fukuoka_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2024」in TOKYO（7215） | 魔法未来 | 2024-08-30 | 6 × 24 | vocadb-note | high | [マジカルミライ 2024 TOKYO チケット](https://magicalmirai.com/2024/tokyo_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2024」in OSAKA（7217） | 魔法未来 | 2024-10-12 | 6 × 24 | vocadb-note | high | [マジカルミライ 2024 OSAKA チケット](https://magicalmirai.com/2024/osaka_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2025」in SENDAI（8768） | 魔法未来 | 2025-08-01 | 5 × 25 | vocadb-note | high | [マジカルミライ 2025 SENDAI チケット](https://magicalmirai.com/2025/sendai_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2025」in OSAKA（8769） | 魔法未来 | 2025-08-09 | 6 × 25 | vocadb-note | high | [マジカルミライ 2025 OSAKA チケット](https://magicalmirai.com/2025/osaka_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2025」in TOKYO（8770） | 魔法未来 | 2025-08-29 | 6 × 25 | vocadb-note | high | [マジカルミライ 2025 TOKYO チケット](https://magicalmirai.com/2025/tokyo_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2026」in HAMAMATSU（12249） | 魔法未来 | 2026-07-24 | 6 × 26 | vocadb-note | high | [マジカルミライ 2026 HAMAMATSU チケット](https://magicalmirai.com/2026/hamamatsu_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2026」in OSAKA（12250） | 魔法未来 | 2026-08-14 | 6 × 26 | vocadb-note | high | [マジカルミライ 2026 OSAKA チケット](https://magicalmirai.com/2026/osaka_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2026」in TOKYO（12251） | 魔法未来 | 2026-08-28 | 6 × 26 | vocadb-note | high | [マジカルミライ 2026 TOKYO チケット](https://magicalmirai.com/2026/tokyo_ticket.html)（2026-11-05） |
| MIKU EXPO 2014 Jakarta（1939） | MIKU EXPO | 2014-05-28 | 3 × 27 | vocadb-shared | medium | [VocaDB Fandom: HATSUNE MIKU EXPO 2014 in INDONESIA](https://vocaloid.fandom.com/wiki/HATSUNE_MIKU_EXPO_2014_in_INDONESIA)（2026-11-05） |
| MIKU EXPO 2014 Los Angeles（1937） | MIKU EXPO | 2014-10-11 | 2 × 27 | vocadb-shared | medium | [VocaDB Fandom: HATSUNE MIKU EXPO 2014 in LOS ANGELES and NEW YORK](https://vocaloid.fandom.com/wiki/HATSUNE_MIKU_EXPO_2014_in_LOS_ANGELES_and_NEW_YORK)（2026-11-05） |
| MIKU EXPO 2014 New York（1938） | MIKU EXPO | 2014-10-17 | 2 × 27 | vocadb-shared | medium | [VocaDB Fandom: HATSUNE MIKU EXPO 2014 in LOS ANGELES and NEW YORK](https://vocaloid.fandom.com/wiki/HATSUNE_MIKU_EXPO_2014_in_LOS_ANGELES_and_NEW_YORK)（2026-11-05） |
| MIKU EXPO 2015 Shanghai（1940） | MIKU EXPO | 2015-06-27 | 2 × 27 | vocadb-note | medium | [VocaDB Fandom: HATSUNE MIKU EXPO 2015 in SHANGHAI](https://vocaloid.fandom.com/wiki/HATSUNE_MIKU_EXPO_2015_in_SHANGHAI)（2026-11-05） |
| MIKU WITH YOU 2018 in Beijing（2085） | 未来有你 | 2018-10-13 | 2 × 25 | vocadb-note | medium | [萌娘百科：未来有你·初音未来2018中国巡回演唱会](https://zh.moegirl.org.cn/未来有你·初音未来2018中国巡回演唱会)（2026-11-05） |
| MIKU WITH YOU 2018 in Chengdu（2086） | 未来有你 | 2018-10-20 | 2 × 25 | vocadb-note | medium | [萌娘百科：未来有你·初音未来2018中国巡回演唱会](https://zh.moegirl.org.cn/未来有你·初音未来2018中国巡回演唱会)（2026-11-05） |
| MIKU WITH YOU 2018 in Shanghai（2087） | 未来有你 | 2018-10-27 | 4 × 25 | external | medium | [萌娘百科：未来有你·初音未来2018中国巡回演唱会](https://zh.moegirl.org.cn/未来有你·初音未来2018中国巡回演唱会)（2026-11-05） |
| MIKU WITH YOU 2019 in Shanghai（3752） | 未来有你 | 2019-11-02 | 4 × 25 | external | medium | [萌娘百科：未来有你·初音未来2019中国巡回演唱会](https://zh.moegirl.org.cn/未来有你·初音未来2019中国巡回演唱会)（2026-11-05） |
| MIKU WITH YOU 2019 in Chengdu（3753） | 未来有你 | 2019-11-09 | 1 × 25 | external | medium | [萌娘百科：未来有你·初音未来2019中国巡回演唱会](https://zh.moegirl.org.cn/未来有你·初音未来2019中国巡回演唱会)（2026-11-05） |
| MIKU WITH YOU 2019 in Beijing（3754） | 未来有你 | 2019-11-16 | 2 × 25 | external | medium | [萌娘百科：未来有你·初音未来2019中国巡回演唱会](https://zh.moegirl.org.cn/未来有你·初音未来2019中国巡回演唱会)（2026-11-05） |
| MIKU WITH YOU 2019 in Guangzhou（3755） | 未来有你 | 2019-11-23 | 3 × 25 | external | medium | [萌娘百科：未来有你·初音未来2019中国巡回演唱会](https://zh.moegirl.org.cn/未来有你·初音未来2019中国巡回演唱会)（2026-11-05） |
| SNOW MIKU LIVE! 2015 presents MIKU EXPO Live Set（3792） | SNOW MIKU | 2015-02-07 | 2 × 27 | vocadb-note | medium | [VocaDB Fandom: SNOW MIKU LIVE! 2015 Presents MIKU EXPO Live Set](https://vocaloid.fandom.com/wiki/SNOW_MIKU_LIVE!_2015_Presents_MIKU_EXPO_Live_Set)（2026-11-05） |
| SNOW MIKU LIVE! 2018（1618） | SNOW MIKU | 2018-02-09 | 4 × 26 | vocadb-note | medium | [VocaDB Fandom: SNOW MIKU LIVE! 2018](https://vocaloid.fandom.com/wiki/SNOW_MIKU_LIVE!_2018)（2026-11-05） |
| SNOW MIKU LIVE! 2019（2422） | SNOW MIKU | 2019-02-09 | 2 × 26 | vocadb-note | medium | [VocaDB Fandom: SNOW MIKU LIVE! 2019](https://vocaloid.fandom.com/wiki/SNOW_MIKU_LIVE!_2019)（2026-11-05） |
| 初音ミクライブパーティー 2011 Sapporo（2526） | Live Party | 2011-08-16 | 2 × 26 | vocadb-shared | medium | [VocaDB Fandom: Hatsune Miku Live Party 2011 (Mikupa)/Sapporo](https://vocaloid.fandom.com/wiki/Hatsune_Miku_Live_Party_2011_(Mikupa)/Sapporo)（2026-11-05） |
| 初音ミクライブパーティー 2013 Sapporo（2510） | Live Party | 2013-02-09 | 4 × 26 | vocadb-shared | medium | [VocaDB Fandom: Hatsune Miku Live Party 2013 (MikuPa)/Sapporo](https://vocaloid.fandom.com/wiki/Hatsune_Miku_Live_Party_2013_(MikuPa)/Sapporo)（2026-11-05） |
| 初音ミク×鼓童スペシャルライブ２０１８（2948） | 鼓童 | 2018-06-02 | 2 × 21 | vocadb-shared | medium | [VocaDB Fandom: Hatsune Miku × Kodo Taiko Special Live 2018](https://vocaloid.fandom.com/wiki/Hatsune_Miku_%C3%97_Kodo_Taiko_Special_Live_2018)（2026-11-05） |
| 初音ミク×鼓童スペシャルライブ２０２３ ～結～（5910） | 鼓童 | 2023-06-03 | 2 × 20 | vocadb-shared | medium | [VocaDB Fandom: Hatsune Miku × Kodo Taiko Special Live 2023](https://vocaloid.fandom.com/wiki/Hatsune_Miku_%C3%97_Kodo_Taiko_Special_Live_2023)（2026-11-05） |

共 43 个演出、43 条来源记录。

如果你觉得某一条来源不可靠，直接说编号或演出 id，我会改回未核实状态。

---

## 2. 跨多天但还没有日夜场证据（25 个演出）

这些演出跨多天，但没查到逐日时刻：官方页与 wiki 要么只给日期区间，要么完全没收录。
当前按「每个日历天 = 一个场次」计算。如果确实每天一场，勾第一项；如果有昼夜两场，请把来源给我。

### MIKU EXPO

**2.1 · MIKU EXPO 2015 Shanghai**（演出 1940，2015-06-27 – 2015-06-28，当前 2 场 × 27 首）

- 已查：VocaDB Fandom: HATSUNE MIKU EXPO 2015 in SHANGHAI，但只给出日期区间，没有逐日时刻
- 当前处理：Fandom 记为 6/26–6/27，VocaDB 记为 6/27–6/28，日期区间不一致，标冲突等裁决

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.2 · MIKU EXPO 2016 Fukuoka**（演出 1399，2016-03-23 – 2016-03-24，当前 2 场 × 26 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.3 · MIKU EXPO 2016 Tokyo**（演出 1403，2016-04-09 – 2016-04-10，当前 2 场 × 26 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.4 · MIKU EXPO 2016 Mexico City**（演出 1924，2016-06-04 – 2016-06-05，当前 2 场 × 26 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.5 · MIKU EXPO 2016 New Taipei City**（演出 1941，2016-06-25 – 2016-06-26，当前 2 场 × 26 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.6 · MIKU EXPO 2016 Shanghai**（演出 1943，2016-12-03 – 2016-12-04，当前 2 场 × 26 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.7 · MIKU EXPO 2016 Beijing**（演出 1942，2016-12-10 – 2016-12-11，当前 2 场 × 26 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.8 · MIKU EXPO 2024 San Jose**（演出 6518，2024-04-08 – 2024-04-09，当前 2 场 × 26 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.9 · MIKU EXPO 2024 Phoenix**（演出 6519，2024-04-14 – 2024-04-15，当前 2 场 × 26 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.10 · MIKU EXPO 2024 Denver**（演出 6520，2024-04-21 – 2024-04-22，当前 2 场 × 26 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.11 · MIKU EXPO 2024 Dallas**（演出 6521，2024-04-24 – 2024-04-25，当前 2 场 × 23 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.12 · MIKU EXPO 2025 Seoul**（演出 9353，2025-11-29 – 2025-11-30，当前 2 场 × 24 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.13 · MIKU EXPO 2026 Chicago**（演出 9811，2026-04-12 – 2026-04-13，当前 2 场 × 26 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.14 · MIKU EXPO 2026 San Jose**（演出 9815，2026-04-22 – 2026-04-23，当前 2 场 × 30 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.15 · MIKU EXPO 2026 Los Angeles**（演出 9816，2026-04-25 – 2026-04-26，当前 2 场 × 30 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.16 · MIKU EXPO 2026 Boston**（演出 9823，2026-05-10 – 2026-05-11，当前 2 场 × 26 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

### 未来有你

**2.17 · MIKU WITH YOU 2024 in Shanghai**（演出 7673，2024-07-13 – 2024-07-14，当前 2 场 × 23 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.18 · MIKU WITH YOU 2024 in Beijing**（演出 7675，2024-07-20 – 2024-07-21，当前 2 场 × 23 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.19 · MIKU WITH YOU 2024 in Guangzhou**（演出 7674，2024-07-27 – 2024-07-28，当前 2 场 × 23 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.20 · MIKU WITH YOU 2025**（演出 9644，2025-12-20 – 2025-12-21，当前 4 场 × 23 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

### SNOW MIKU

**2.21 · SNOW MIKU LIVE! 2015 presents MIKU EXPO Live Set**（演出 3792，2015-02-07 – 2015-02-08，当前 2 场 × 27 首）

- 已查：VocaDB Fandom: SNOW MIKU LIVE! 2015 Presents MIKU EXPO Live Set，但只给出日期区间，没有逐日时刻
- 当前处理：Fandom 只有日期区间 2/7–2/8，没有逐日时刻；按每天一场处理

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.22 · SNOW MIKU LIVE! 2019**（演出 2422，2019-02-09 – 2019-02-10，当前 2 场 × 26 首）

- 已查：VocaDB Fandom: SNOW MIKU LIVE! 2019，但只给出日期区间，没有逐日时刻
- 当前处理：Fandom 只有日期区间 2/9–2/10，没有逐日时刻；按每天一场处理

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

### 鼓童

**2.23 · 初音ミク×鼓童スペシャルライブ**（演出 2947，2017-03-04 – 2017-03-05，当前 2 场 × 19 首）

- 已查：官网与 wiki 都没找到这场的时间表

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.24 · 初音ミク×鼓童スペシャルライブ２０１８**（演出 2948，2018-06-02 – 2018-06-03，当前 2 场 × 21 首）

- 已查：VocaDB Fandom: Hatsune Miku × Kodo Taiko Special Live 2018，但只给出日期区间，没有逐日时刻
- 当前处理：Fandom 只有日期区间 6/2–6/3，没有逐日时刻；按每天一场处理

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

**2.25 · 初音ミク×鼓童スペシャルライブ２０２３ ～結～**（演出 5910，2023-06-03 – 2023-06-04，当前 2 场 × 20 首）

- 已查：VocaDB Fandom: Hatsune Miku × Kodo Taiko Special Live 2023，但只给出日期区间，没有逐日时刻
- 当前处理：Fandom 只有日期区间 6/3–6/4，没有逐日时刻；按每天一场处理

- [ ] 每天只有一场，当前正确
- [ ] 有昼夜两场，已补来源（写在补充说明）
- [ ] 有展览日要剔除（写在补充说明）
- [ ] 无法确认，保持现状

> 补充：

---

## 3. 与既有结论冲突（需要裁决）

这些演出的外部来源与 VocaDB 的日期区间或 `docs/data-issues.md` 的既有结论不一致。
数据按 VocaDB 的日期保留，同时标了 `conflict`，等你裁决后我再改。

### 3.1 · MIKU EXPO 2015 Shanghai（演出 1940）

- VocaDB 区间：2015-06-27 – 2015-06-28
- 冲突说明：Fandom 记为 6/26–6/27，VocaDB 记为 6/27–6/28，日期区间不一致，标冲突等裁决
- 来源：VocaDB Fandom: HATSUNE MIKU EXPO 2015 in SHANGHAI https://vocaloid.fandom.com/wiki/HATSUNE_MIKU_EXPO_2015_in_SHANGHAI

- [ ] 以 VocaDB 为准，保持现状并撤掉冲突标记
- [ ] 以来源为准，改日期区间（写在补充说明）
- [ ] 两者都对，区间包含非演出日（写在补充说明）
- [ ] 无法判断，继续标冲突

**补充说明**

> 

### 3.2 · 初音ミクライブパーティー 2011 Sapporo（演出 2526）

- VocaDB 区间：2011-08-16 – 2011-08-17
- 冲突说明：Fandom 只写 8/17 一天；VocaDB 记为 8/16–8/17。日期区间存疑，标冲突等裁决
- 来源：VocaDB Fandom: Hatsune Miku Live Party 2011 (Mikupa)/Sapporo https://vocaloid.fandom.com/wiki/Hatsune_Miku_Live_Party_2011_(Mikupa)/Sapporo

- [ ] 以 VocaDB 为准，保持现状并撤掉冲突标记
- [ ] 以来源为准，改日期区间（写在补充说明）
- [ ] 两者都对，区间包含非演出日（写在补充说明）
- [ ] 无法判断，继续标冲突

**补充说明**

> 

---

## 4. 单场曲目数与同歌单不一致（需判断是多唱还是漏记）

### 4.1 · 初音ミク「マジカルミライ 2021」in OSAKA · 3305:2021-10-24:day

- 本场 26 首，同歌单其他场次多为 25 首，省略 0 行
- 原因：setlist length mismatch: 26 vs expected 25

- [ ] 确认本场就是这个曲目数
- [ ] 应排除多余曲目（写在补充说明）
- [ ] 应补充缺失曲目（写在补充说明）
- [ ] 无法确认，保留警告

**补充说明**

> 

### 4.2 · 初音ミク「マジカルミライ 2021」in OSAKA · 3305:2021-10-24:night

- 本场 26 首，同歌单其他场次多为 25 首，省略 0 行
- 原因：setlist length mismatch: 26 vs expected 25

- [ ] 确认本场就是这个曲目数
- [ ] 应排除多余曲目（写在补充说明）
- [ ] 应补充缺失曲目（写在补充说明）
- [ ] 无法确认，保留警告

**补充说明**

> 

### 4.3 · 初音ミク「マジカルミライ 2024」in OSAKA · 7217:2024-10-14:day

- 本场 18 首，同歌单其他场次多为 24 首，省略 2 行
- 原因：city-only when city has several shows: 3；setlist length mismatch: 18 vs expected 24

- [ ] 确认本场就是这个曲目数
- [ ] 应排除多余曲目（写在补充说明）
- [ ] 应补充缺失曲目（写在补充说明）
- [ ] 无法确认，保留警告

**补充说明**

> 

### 4.4 · 初音ミク「マジカルミライ 2024」in OSAKA · 7217:2024-10-14:night

- 本场 18 首，同歌单其他场次多为 24 首，省略 2 行
- 原因：city-only when city has several shows: 3；setlist length mismatch: 18 vs expected 24

- [ ] 确认本场就是这个曲目数
- [ ] 应排除多余曲目（写在补充说明）
- [ ] 应补充缺失曲目（写在补充说明）
- [ ] 无法确认，保留警告

**补充说明**

> 

### 4.5 · MIKU EXPO 2024 San Jose · 6518:2024-04-09

- 本场 26 首，同歌单其他场次多为 23 首，省略 4 行
- 原因：setlist length mismatch: 26 vs expected 23

- [ ] 确认本场就是这个曲目数
- [ ] 应排除多余曲目（写在补充说明）
- [ ] 应补充缺失曲目（写在补充说明）
- [ ] 无法确认，保留警告

**补充说明**

> 

### 4.6 · MIKU EXPO 2024 Phoenix · 6519:2024-04-15

- 本场 26 首，同歌单其他场次多为 23 首，省略 4 行
- 原因：setlist length mismatch: 26 vs expected 23

- [ ] 确认本场就是这个曲目数
- [ ] 应排除多余曲目（写在补充说明）
- [ ] 应补充缺失曲目（写在补充说明）
- [ ] 无法确认，保留警告

**补充说明**

> 

### 4.7 · MIKU EXPO 2024 Denver · 6520:2024-04-22

- 本场 26 首，同歌单其他场次多为 23 首，省略 4 行
- 原因：setlist length mismatch: 26 vs expected 23

- [ ] 确认本场就是这个曲目数
- [ ] 应排除多余曲目（写在补充说明）
- [ ] 应补充缺失曲目（写在补充说明）
- [ ] 无法确认，保留警告

**补充说明**

> 

### 4.8 · MIKU EXPO 2026 San Jose · 9815:2026-04-22

- 本场 30 首，同歌单其他场次多为 26 首，省略 4 行
- 原因：setlist length mismatch: 30 vs expected 26

- [ ] 确认本场就是这个曲目数
- [ ] 应排除多余曲目（写在补充说明）
- [ ] 应补充缺失曲目（写在补充说明）
- [ ] 无法确认，保留警告

**补充说明**

> 

### 4.9 · MIKU EXPO 2026 Los Angeles · 9816:2026-04-26

- 本场 30 首，同歌单其他场次多为 26 首，省略 4 行
- 原因：setlist length mismatch: 30 vs expected 26

- [ ] 确认本场就是这个曲目数
- [ ] 应排除多余曲目（写在补充说明）
- [ ] 应补充缺失曲目（写在补充说明）
- [ ] 无法确认，保留警告

**补充说明**

> 

### 4.10 · 初音ミクライブパーティー 2012 Hong Kong · 2524:2012-10-02

- 本场 24 首，同歌单其他场次多为 25 首，省略 1 行
- 原因：setlist length mismatch: 24 vs expected 25

- [ ] 确认本场就是这个曲目数
- [ ] 应排除多余曲目（写在补充说明）
- [ ] 应补充缺失曲目（写在补充说明）
- [ ] 无法确认，保留警告

**补充说明**

> 

---

## 5. 备注只写到城市的场次（按演出汇总）

这些演出的歌单备注只写城市（如 `Shanghai, Beijing`），没有写到具体日期或昼夜。
派生层按「该城市的所有场次都演」处理，因此每一场都拿到了同一份曲目。
需要你确认的方向：这种「城市级共用」是否就是这么读的，还是其实有分场差异。

### 魔法未来

**5.1 · 初音ミク「マジカルミライ 2018」in OSAKA**（演出 1561，4 个场次 × 27 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

**5.2 · 初音ミク「マジカルミライ 2018」in TOKYO**（演出 1745，4 个场次 × 27 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

**5.3 · 初音ミク「マジカルミライ 2024」in FUKUOKA**（演出 7214，4 个场次 × 24 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

**5.4 · 初音ミク「マジカルミライ 2024」in TOKYO**（演出 7215，6 个场次 × 24 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

**5.5 · 初音ミク「マジカルミライ 2024」in OSAKA**（演出 7217，4 个场次 × 24 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

**5.6 · 初音ミク「マジカルミライ 2025」in SENDAI**（演出 8768，5 个场次 × 25 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

**5.7 · 初音ミク「マジカルミライ 2025」in OSAKA**（演出 8769，6 个场次 × 25 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

**5.8 · 初音ミク「マジカルミライ 2025」in TOKYO**（演出 8770，6 个场次 × 25 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

**5.9 · 初音ミク「マジカルミライ 2026」in HAMAMATSU**（演出 12249，6 个场次 × 26 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

**5.10 · 初音ミク「マジカルミライ 2026」in OSAKA**（演出 12250，6 个场次 × 26 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

**5.11 · 初音ミク「マジカルミライ 2026」in TOKYO**（演出 12251，6 个场次 × 26 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

### 未来有你

**5.12 · MIKU WITH YOU 2018 in Chengdu**（演出 2086，2 个场次 × 25 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

**5.13 · MIKU WITH YOU 2018 in Shanghai**（演出 2087，4 个场次 × 25 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

**5.14 · MIKU WITH YOU 2019 in Shanghai**（演出 3752，4 个场次 × 25 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

**5.15 · MIKU WITH YOU 2019 in Chengdu**（演出 3753，1 个场次 × 25 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

**5.16 · MIKU WITH YOU 2019 in Beijing**（演出 3754，2 个场次 × 25 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

**5.17 · MIKU WITH YOU 2019 in Guangzhou**（演出 3755，3 个场次 × 25 首）

- [ ] 就是城市级共用，各场同一份曲目
- [ ] 其实有分场差异（写在补充说明）
- [ ] 无法确认，保留警告

> 补充：

---

## 6. 整份歌单没有任何备注（整份沿用）

这些源歌单一行备注都没有，所以每个演出都拿整套曲目。抽样确认即可，不必逐条回。

| 源歌单 | 名称 | 类型 | 演出数 | 场次数 | 行数 |
| --- | --- | --- | --- | --- | --- |
| [6571](https://vocadb.net/L/6571) | Miku Expo 2016 North America | vocadb | 10 | 11 | 26 |
| [6570](https://vocadb.net/L/6570) | Miku Expo 2016 Japan | vocadb | 5 | 7 | 26 |
| [1000052449](https://vocadb.net/L/1000052449) | 初音ミクシンフォニー ~Miku Symphony 2025~ オーケストラライ… | album | 5 | 5 | 31 |
| [1000028945](https://vocadb.net/L/1000028945) | 初音ミクシンフォニー ~Miku Symphony 2020~ オーケストラライ… | album | 3 | 3 | 17 |
| [1000037020](https://vocadb.net/L/1000037020) | 初音ミクシンフォニー ~Miku Symphony 2022~ オーケストラライ… | album | 3 | 3 | 14 |
| [1000045255](https://vocadb.net/L/1000045255) | 初音ミクシンフォニー ~Miku Symphony 2024~ オーケストラライ… | album | 3 | 3 | 22 |
| [214](https://vocadb.net/L/214) | Hatsune Miku "Magical Mirai" 2014 | vocadb | 2 | 2 | 25 |
| [6950](https://vocadb.net/L/6950) | Miku Expo 2016 China | vocadb | 2 | 4 | 26 |
| [8631](https://vocadb.net/L/8631) | Miku Expo 2020 London/Berlin | vocadb | 2 | 2 | 25 |
| [1000026491](https://vocadb.net/L/1000026491) | 初音ミクシンフォニー ~Miku Symphony 2018-2019~ オーケ… | album | 2 | 2 | 16 |
| [1000027432](https://vocadb.net/L/1000027432) | 初音ミクシンフォニー ~Miku Symphony 2019~ オーケストラライ… | album | 2 | 2 | 21 |
| [1000030905](https://vocadb.net/L/1000030905) | 初音ミクシンフォニー ~Miku Symphony 2021~ オーケストラライ… | album | 2 | 2 | 17 |
| [1000030961](https://vocadb.net/L/1000030961) | 初音ミクシンフォニー ~Miku Symphony 2017~ オーケストラライ… | album | 2 | 2 | 15 |
| [1000040398](https://vocadb.net/L/1000040398) | 初音ミクシンフォニー ~Miku Symphony 2023~ オーケストラライ… | album | 2 | 2 | 25 |
| [31](https://vocadb.net/L/31) | Hatsune Miku Live Party 2012 Mikupa♪ Hon… | vocadb | 1 | 1 | 25 |
| [217](https://vocadb.net/L/217) | Hatsune Miku Live Party 2012 Mikupa♪ Tokyo | vocadb | 1 | 1 | 33 |
| [3952](https://vocadb.net/L/3952) | ミクの日感謝祭 39's Giving Day Project DIVA pre… | vocadb | 1 | 1 | 40 |
| [3953](https://vocadb.net/L/3953) | Hatsune Miku Live Party 2011 Mikupa♪ Tokyo | vocadb | 1 | 1 | 39 |
| [3954](https://vocadb.net/L/3954) | Hatsune Miku Live Party 2013 Mikupa♪ Kan… | vocadb | 1 | 1 | 39 |
| [6572](https://vocadb.net/L/6572) | Miku Expo 2016 Taiwan | vocadb | 1 | 2 | 26 |
| [7024](https://vocadb.net/L/7024) | Hatsune Miku × Kodō Special Live | vocadb | 1 | 2 | 19 |
| [7979](https://vocadb.net/L/7979) | Miku Expo 2018 Paris | vocadb | 1 | 1 | 26 |
| [7985](https://vocadb.net/L/7985) | Miku Expo 2018 Cologne | vocadb | 1 | 1 | 26 |
| [7988](https://vocadb.net/L/7988) | Miku Expo 2018 London | vocadb | 1 | 1 | 26 |
| [8103](https://vocadb.net/L/8103) | Miku Expo 2019 New Taipei City | vocadb | 1 | 1 | 25 |
| [8104](https://vocadb.net/L/8104) | Miku Expo 2019 Hong Kong | vocadb | 1 | 1 | 25 |
| [8641](https://vocadb.net/L/8641) | Miku Expo 2020 Paris | vocadb | 1 | 1 | 25 |
| [8654](https://vocadb.net/L/8654) | Miku Expo 2020 Amsterdam | vocadb | 1 | 1 | 25 |
| [9192](https://vocadb.net/L/9192) | MIKU WITH YOU 2020 | vocadb | 1 | 1 | 18 |
| [10011](https://vocadb.net/L/10011) | MIKU WITH YOU 2021 | vocadb | 1 | 1 | 17 |
| [14426](https://vocadb.net/L/14426) | HATSUNE MIKU EXPO 2023 VR Setlist | vocadb | 1 | 1 | 14 |
| [1000019737](https://vocadb.net/L/1000019737) | 初音ミクシンフォニー ~Miku Symphony 2016~ オーケストラライ… | album | 1 | 1 | 18 |
| [1000039621](https://vocadb.net/L/1000039621) | 初音ミクシンフォニー ~Miku Symphony 2023~ Live at … | album | 1 | 1 | 24 |

- [ ] 这些歌单确实只有一套曲目，整份沿用正确
- [ ] 其中有分站替换曲（写在补充说明：源歌单 id + 城市 + 曲目）
- [ ] 无法确认，保持现状

**补充说明**

> 
> 

---

## 7. 上游没有歌单的演出（本轮不处理，仅列出）

共 30 个，多数是已取消或尚未举行：

| 演出 | 系列 | 日期 | VocaDB 状态 |
| --- | --- | --- | --- |
| [2853](https://vocadb.net/E/2853) MIKU EXPO 2020 Vancouver | MIKU EXPO | 无 | Finished |
| [2854](https://vocadb.net/E/2854) MIKU EXPO 2020 San Jose | MIKU EXPO | 无 | Finished |
| [2855](https://vocadb.net/E/2855) MIKU EXPO 2020 Dallas | MIKU EXPO | 无 | Finished |
| [2856](https://vocadb.net/E/2856) MIKU EXPO 2020 Atlanta | MIKU EXPO | 无 | Finished |
| [2857](https://vocadb.net/E/2857) MIKU EXPO 2020 Washington D.C. | MIKU EXPO | 无 | Finished |
| [2858](https://vocadb.net/E/2858) MIKU EXPO 2020 Asbury Park (New Jersey) | MIKU EXPO | 无 | Finished |
| [2859](https://vocadb.net/E/2859) MIKU EXPO 2020 Boston | MIKU EXPO | 无 | Finished |
| [2860](https://vocadb.net/E/2860) MIKU EXPO 2020 Chicago | MIKU EXPO | 无 | Finished |
| [2861](https://vocadb.net/E/2861) MIKU EXPO 2020 Toronto | MIKU EXPO | 无 | Finished |
| [2878](https://vocadb.net/E/2878) MIKU EXPO 2020 Los Angeles | MIKU EXPO | 无 | Finished |
| [2879](https://vocadb.net/E/2879) MIKU EXPO 2020 Orlando | MIKU EXPO | 无 | Finished |
| [2880](https://vocadb.net/E/2880) MIKU EXPO 2020 Montreal | MIKU EXPO | 无 | Finished |
| [2790](https://vocadb.net/E/2790) MIKU EXPO 2020 Barcelona | MIKU EXPO | 2020-01-28 | Finished |
| [12222](https://vocadb.net/E/12222) MIKU EXPO 2026 London | MIKU EXPO | 2026-11-12 | Draft |
| [12223](https://vocadb.net/E/12223) MIKU EXPO 2026 Brussels | MIKU EXPO | 2026-11-14 | Draft |
| [12224](https://vocadb.net/E/12224) MIKU EXPO 2026 Amsterdam | MIKU EXPO | 2026-11-15 | Draft |
| [12225](https://vocadb.net/E/12225) MIKU EXPO 2026 Berlin | MIKU EXPO | 2026-11-17 | Draft |
| [12226](https://vocadb.net/E/12226) MIKU EXPO 2026 Düsseldorf | MIKU EXPO | 2026-11-20 | Draft |
| [12227](https://vocadb.net/E/12227) MIKU EXPO 2026 Paris | MIKU EXPO | 2026-11-22 | Draft |
| [12228](https://vocadb.net/E/12228) MIKU EXPO 2026 Madrid | MIKU EXPO | 2026-11-24 | Draft |
| [12449](https://vocadb.net/E/12449) MIKU EXPO 2026 Lisbon | MIKU EXPO | 2026-11-27 | Draft |
| [13120](https://vocadb.net/E/13120) MIKU WITH YOU 2026 | 未来有你 | 2026-10-31 | Draft |
| [2886](https://vocadb.net/E/2886) 初音ミク×鼓童スペシャルライブ２０２０～結～ | 鼓童 | 无 | Finished |
| [12940](https://vocadb.net/E/12940) 初音ミク×鼓童スペシャルライブ～響演～ | 鼓童 | 2026-11-20 | Finished |
| [13210](https://vocadb.net/E/13210) 初音ミクシンフォニー 2027 東京 | 交响乐 | 无 | Draft |
| [12713](https://vocadb.net/E/12713) 初音ミクシンフォニー 2026 札幌 | 交响乐 | 2026-06-20 | Finished |
| [12714](https://vocadb.net/E/12714) 初音ミクシンフォニー 2026 東京 | 交响乐 | 2026-07-05 | Finished |
| [12739](https://vocadb.net/E/12739) 初音ミクシンフォニー 2026-2027 〜Melodies on the Keys〜 横浜 | 交响乐 | 2026-10-10 | Finished |
| [12740](https://vocadb.net/E/12740) 初音ミクシンフォニー 2026-2027 〜Melodies on the Keys〜 大阪 | 交响乐 | 2027-01-10 | Finished |
| [13209](https://vocadb.net/E/13209) 初音ミクシンフォニー 2027 横浜 | 交响乐 | 2027-03-13 | Draft |

- [ ] 都先留空，等实体发行或官方歌单
- [ ] 其中有已举行的场次需要补录（写在补充说明）

**补充说明**

> 

---
