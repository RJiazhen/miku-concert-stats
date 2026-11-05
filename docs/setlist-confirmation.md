# 歌单数据核对清单

> 生成本文件：`uv run scripts/confirmation-report.py`（读 `public/data/catalog.sqlite` 与 `data/performance-setlists.json`）。
> 本轮已按你的要求先去查萌娘百科 / VocaDB Fandom / 官方存档页：能查到的直接采用，冲突的优先用百科，并在第 3 节列出。
> 需要你回的只剩第 2 节（百科也没写逐日时刻的部分）与第 6 节（上游没有歌单）。

## 0. 一句话现状

- 目录里 177 个演出已展开成 **353 个场次**、8680 条曲目。
- 来源记录 87 个演出：官方页 33 条、百科 61 条，全部已直接采用。
- 待核实归属 0 个、冲突 0 个、带不确定标记的场次 0 个。
- 还剩 **2 个跨天演出**：百科与官网都只写日期区间，没有逐日时刻，见第 2 节。

---

## 1. 数据来源记录（已采用，无需确认）

凡是从官方票务页、萌娘百科或 VocaDB Fandom 查到场次的演出，数据已经直接采用；
来源、访问日期与置信度都写进 catalog 的 `performance_setlist_sources`，也在 `/shows` 页脚显示。

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
| 初音ミク「マジカルミライ 2021」in OSAKA（3305） | 魔法未来 | 2021-10-22 | 5 × 25 | vocadb-note | high | [マジカルミライ 2021 OSAKA チケット](https://magicalmirai.com/2021/osaka_ticket.html)（2026-11-05） |
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
| MIKU EXPO 2015 Shanghai（1940） | MIKU EXPO | 2015-06-27 | 4 × 27 | vocadb-note | high | [SCLA 官方页（2019-07-22 存档）：初音未来2015上海演唱会<br>萌娘百科：HATSUNE MIKU EXPO 2015 in Shanghai](https://web.archive.org/web/20190722050158/http://www.scla.com.cn/hatsunemiku/)（2026-11-05） |
| MIKU EXPO 2016 Fukuoka（1399） | MIKU EXPO | 2016-03-23 | 2 × 26 | vocadb-shared | high | [HATSUNE MIKU EXPO 2016 Japan Tour LIVE（官方）<br>萌娘百科：MIKU EXPO 2016](https://mikuexpo.com/jp2016/live)（2026-11-05） |
| MIKU EXPO 2016 Osaka（1400） | MIKU EXPO | 2016-03-29 | 2 × 26 | vocadb-shared | high | [HATSUNE MIKU EXPO 2016 Japan Tour LIVE（官方）<br>萌娘百科：MIKU EXPO 2016](https://mikuexpo.com/jp2016/live)（2026-11-05） |
| MIKU EXPO 2016 Nagoya（1401） | MIKU EXPO | 2016-03-31 | 2 × 26 | vocadb-shared | high | [HATSUNE MIKU EXPO 2016 Japan Tour LIVE（官方）<br>萌娘百科：MIKU EXPO 2016](https://mikuexpo.com/jp2016/live)（2026-11-05） |
| MIKU EXPO 2016 Sapporo（1402） | MIKU EXPO | 2016-04-05 | 2 × 26 | vocadb-shared | high | [HATSUNE MIKU EXPO 2016 Japan Tour LIVE（官方）<br>萌娘百科：MIKU EXPO 2016](https://mikuexpo.com/jp2016/live)（2026-11-05） |
| MIKU EXPO 2016 Tokyo（1403） | MIKU EXPO | 2016-04-09 | 4 × 26 | vocadb-shared | high | [HATSUNE MIKU EXPO 2016 Japan Tour LIVE（官方）<br>萌娘百科：MIKU EXPO 2016](https://mikuexpo.com/jp2016/live)（2026-11-05） |
| MIKU EXPO 2016 Seattle（1859） | MIKU EXPO | 2016-04-23 | 1 × 26 | vocadb-shared | medium | [萌娘百科：MIKU EXPO 2016](https://zh.moegirl.org.cn/MIKU_EXPO_2016)（2026-11-05） |
| MIKU EXPO 2016 San Francisco（1930） | MIKU EXPO | 2016-04-30 | 2 × 26 | vocadb-shared | medium | [萌娘百科：MIKU EXPO 2016](https://zh.moegirl.org.cn/MIKU_EXPO_2016)（2026-11-05） |
| MIKU EXPO 2016 Los Angeles（1931） | MIKU EXPO | 2016-05-06 | 1 × 26 | vocadb-shared | medium | [萌娘百科：MIKU EXPO 2016](https://zh.moegirl.org.cn/MIKU_EXPO_2016)（2026-11-05） |
| MIKU EXPO 2016 Dallas（1932） | MIKU EXPO | 2016-05-14 | 1 × 26 | vocadb-shared | medium | [萌娘百科：MIKU EXPO 2016](https://zh.moegirl.org.cn/MIKU_EXPO_2016)（2026-11-05） |
| MIKU EXPO 2016 Houston（1933） | MIKU EXPO | 2016-05-17 | 1 × 26 | vocadb-shared | medium | [萌娘百科：MIKU EXPO 2016](https://zh.moegirl.org.cn/MIKU_EXPO_2016)（2026-11-05） |
| MIKU EXPO 2016 Toronto（1934） | MIKU EXPO | 2016-05-20 | 1 × 26 | vocadb-shared | medium | [萌娘百科：MIKU EXPO 2016](https://zh.moegirl.org.cn/MIKU_EXPO_2016)（2026-11-05） |
| MIKU EXPO 2016 Chicago（1935） | MIKU EXPO | 2016-05-25 | 1 × 26 | vocadb-shared | medium | [萌娘百科：MIKU EXPO 2016](https://zh.moegirl.org.cn/MIKU_EXPO_2016)（2026-11-05） |
| MIKU EXPO 2016 New York（1936） | MIKU EXPO | 2016-05-28 | 2 × 26 | vocadb-shared | medium | [萌娘百科：MIKU EXPO 2016](https://zh.moegirl.org.cn/MIKU_EXPO_2016)（2026-11-05） |
| MIKU EXPO 2016 Monterrey（1860） | MIKU EXPO | 2016-06-01 | 1 × 26 | vocadb-shared | medium | [萌娘百科：MIKU EXPO 2016](https://zh.moegirl.org.cn/MIKU_EXPO_2016)（2026-11-05） |
| MIKU EXPO 2016 Mexico City（1924） | MIKU EXPO | 2016-06-04 | 3 × 26 | vocadb-shared | medium | [萌娘百科：MIKU EXPO 2016](https://zh.moegirl.org.cn/MIKU_EXPO_2016)（2026-11-05） |
| MIKU EXPO 2016 New Taipei City（1941） | MIKU EXPO | 2016-06-25 | 3 × 26 | vocadb-shared | high | [HATSUNE MIKU EXPO 2016 IN TAIWAN（官方）<br>萌娘百科：MIKU EXPO 2016](https://mikuexpo.com/tw2016/)（2026-11-05） |
| MIKU EXPO 2016 Shanghai（1943） | MIKU EXPO | 2016-12-03 | 4 × 26 | vocadb-shared | medium | [萌娘百科：MIKU EXPO 2016](https://zh.moegirl.org.cn/MIKU_EXPO_2016)（2026-11-05） |
| MIKU EXPO 2016 Beijing（1942） | MIKU EXPO | 2016-12-10 | 4 × 26 | vocadb-shared | medium | [萌娘百科：MIKU EXPO 2016](https://zh.moegirl.org.cn/MIKU_EXPO_2016)（2026-11-05） |
| MIKU EXPO 2024 Vancouver（6516） | MIKU EXPO | 2024-04-04 | 1 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 Portland（6517） | MIKU EXPO | 2024-04-06 | 1 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 San Jose（6518） | MIKU EXPO | 2024-04-08 | 2 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 Phoenix（6519） | MIKU EXPO | 2024-04-14 | 2 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 Los Angeles（7186） | MIKU EXPO | 2024-04-17 | 1 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 Denver（6520） | MIKU EXPO | 2024-04-21 | 2 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 Dallas（6521） | MIKU EXPO | 2024-04-24 | 2 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 Austin（6522） | MIKU EXPO | 2024-04-27 | 1 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 Atlanta（6523） | MIKU EXPO | 2024-04-30 | 1 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 Orlando（6524） | MIKU EXPO | 2024-05-02 | 1 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 Washington（6525） | MIKU EXPO | 2024-05-05 | 1 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 Newark（6526） | MIKU EXPO | 2024-05-07 | 1 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 Boston（6527） | MIKU EXPO | 2024-05-09 | 1 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 Detroit（6528） | MIKU EXPO | 2024-05-12 | 1 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 Chicago（6529） | MIKU EXPO | 2024-05-14 | 1 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 Toronto（6530） | MIKU EXPO | 2024-05-16 | 1 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2024 Mexico City（6531） | MIKU EXPO | 2024-05-21 | 1 × 23 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2024](https://zh.moegirl.org.cn/MIKU_EXPO_2024)（2026-11-05） |
| MIKU EXPO 2025 Seoul（9353） | MIKU EXPO | 2025-11-29 | 2 × 24 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2025](https://zh.moegirl.org.cn/MIKU_EXPO_2025)（2026-11-05） |
| MIKU EXPO 2026 Chicago（9811） | MIKU EXPO | 2026-04-12 | 2 × 26 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2026](https://zh.moegirl.org.cn/MIKU_EXPO_2026)（2026-11-05） |
| MIKU EXPO 2026 San Jose（9815） | MIKU EXPO | 2026-04-22 | 2 × 26 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2026](https://zh.moegirl.org.cn/MIKU_EXPO_2026)（2026-11-05） |
| MIKU EXPO 2026 Los Angeles（9816） | MIKU EXPO | 2026-04-25 | 2 × 26 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2026](https://zh.moegirl.org.cn/MIKU_EXPO_2026)（2026-11-05） |
| MIKU EXPO 2026 Boston（9823） | MIKU EXPO | 2026-05-10 | 2 × 26 | vocadb-note | medium | [萌娘百科：MIKU EXPO 2026](https://zh.moegirl.org.cn/MIKU_EXPO_2026)（2026-11-05） |
| MIKU WITH YOU 2018 in Beijing（2085） | 未来有你 | 2018-10-13 | 2 × 25 | vocadb-note | medium | [萌娘百科：未来有你·初音未来2018中国巡回演唱会](https://zh.moegirl.org.cn/未来有你·初音未来2018中国巡回演唱会)（2026-11-05） |
| MIKU WITH YOU 2018 in Chengdu（2086） | 未来有你 | 2018-10-20 | 2 × 25 | vocadb-note | medium | [萌娘百科：未来有你·初音未来2018中国巡回演唱会](https://zh.moegirl.org.cn/未来有你·初音未来2018中国巡回演唱会)（2026-11-05） |
| MIKU WITH YOU 2018 in Shanghai（2087） | 未来有你 | 2018-10-27 | 4 × 25 | external | medium | [萌娘百科：未来有你·初音未来2018中国巡回演唱会](https://zh.moegirl.org.cn/未来有你·初音未来2018中国巡回演唱会)（2026-11-05） |
| MIKU WITH YOU 2019 in Shanghai（3752） | 未来有你 | 2019-11-02 | 4 × 25 | external | medium | [萌娘百科：未来有你·初音未来2019中国巡回演唱会](https://zh.moegirl.org.cn/未来有你·初音未来2019中国巡回演唱会)（2026-11-05） |
| MIKU WITH YOU 2019 in Chengdu（3753） | 未来有你 | 2019-11-09 | 1 × 25 | external | medium | [萌娘百科：未来有你·初音未来2019中国巡回演唱会](https://zh.moegirl.org.cn/未来有你·初音未来2019中国巡回演唱会)（2026-11-05） |
| MIKU WITH YOU 2019 in Beijing（3754） | 未来有你 | 2019-11-16 | 2 × 25 | external | medium | [萌娘百科：未来有你·初音未来2019中国巡回演唱会](https://zh.moegirl.org.cn/未来有你·初音未来2019中国巡回演唱会)（2026-11-05） |
| MIKU WITH YOU 2019 in Guangzhou（3755） | 未来有你 | 2019-11-23 | 3 × 25 | external | medium | [萌娘百科：未来有你·初音未来2019中国巡回演唱会](https://zh.moegirl.org.cn/未来有你·初音未来2019中国巡回演唱会)（2026-11-05） |
| MIKU WITH YOU 2024 in Shanghai（7673） | 未来有你 | 2024-07-13 | 4 × 23 | vocadb-note | medium | [萌娘百科：初音未来·未来有你2024演唱会](https://zh.moegirl.org.cn/初音未来·未来有你2024演唱会)（2026-11-05） |
| MIKU WITH YOU 2024 in Beijing（7675） | 未来有你 | 2024-07-20 | 4 × 23 | vocadb-note | medium | [萌娘百科：初音未来·未来有你2024演唱会](https://zh.moegirl.org.cn/初音未来·未来有你2024演唱会)（2026-11-05） |
| MIKU WITH YOU 2024 in Guangzhou（7674） | 未来有你 | 2024-07-27 | 4 × 23 | vocadb-note | medium | [萌娘百科：初音未来·未来有你2024演唱会](https://zh.moegirl.org.cn/初音未来·未来有你2024演唱会)（2026-11-05） |
| SNOW MIKU LIVE! 2015 presents MIKU EXPO Live Set（3792） | SNOW MIKU | 2015-02-07 | 2 × 27 | vocadb-note | medium | [VocaDB Fandom: SNOW MIKU LIVE! 2015 Presents MIKU EXPO Live Set](https://vocaloid.fandom.com/wiki/SNOW_MIKU_LIVE!_2015_Presents_MIKU_EXPO_Live_Set)（2026-11-05） |
| SNOW MIKU LIVE! 2018（1618） | SNOW MIKU | 2018-02-09 | 4 × 26 | vocadb-note | medium | [VocaDB Fandom: SNOW MIKU LIVE! 2018](https://vocaloid.fandom.com/wiki/SNOW_MIKU_LIVE!_2018)（2026-11-05） |
| SNOW MIKU LIVE! 2019（2422） | SNOW MIKU | 2019-02-09 | 4 × 26 | vocadb-note | medium | [萌娘百科：SNOW MIKU LIVE! 2019](https://zh.moegirl.org.cn/SNOW_MIKU_LIVE!_2019)（2026-11-05） |
| 初音ミクライブパーティー 2011 Sapporo（2526） | Live Party | 2011-08-16 | 2 × 26 | vocadb-shared | high | [5pb. 官方页（2012-05-12 存档）：ミクパ♪ 札幌](https://web.archive.org/web/20120512094239/http://5pb.jp/mikupa/index_sapporo.html)（2026-11-05） |
| 初音ミクライブパーティー 2013 Sapporo（2510） | Live Party | 2013-02-09 | 4 × 26 | vocadb-shared | medium | [VocaDB Fandom: Hatsune Miku Live Party 2013 (MikuPa)/Sapporo](https://vocaloid.fandom.com/wiki/Hatsune_Miku_Live_Party_2013_(MikuPa)/Sapporo)（2026-11-05） |
| 初音ミク×鼓童スペシャルライブ（2947） | 鼓童 | 2017-03-04 | 2 × 19 | vocadb-shared | medium | [萌娘百科：初音未来×鼓童特别演唱会](https://zh.moegirl.org.cn/初音未来×鼓童特别演唱会)（2026-11-05） |
| 初音ミク×鼓童スペシャルライブ２０１８（2948） | 鼓童 | 2018-06-02 | 3 × 21 | vocadb-shared | medium | [VocaDB Fandom: Hatsune Miku × Kodo Taiko Special Live 2018](https://vocaloid.fandom.com/wiki/Hatsune_Miku_%C3%97_Kodo_Taiko_Special_Live_2018)（2026-11-05） |
| 初音ミク×鼓童スペシャルライブ２０２３ ～結～（5910） | 鼓童 | 2023-06-03 | 2 × 20 | vocadb-shared | medium | [VocaDB Fandom: Hatsune Miku × Kodo Taiko Special Live 2023](https://vocaloid.fandom.com/wiki/Hatsune_Miku_%C3%97_Kodo_Taiko_Special_Live_2023)（2026-11-05） |

共 87 个演出、94 条来源记录。

---

## 2. 百科与官网都没写逐日时刻（2 个演出）

这些演出跨多天，但我查过的来源都只给日期区间：既没写每天几场，也没写开演时间。
当前按「每个日历天 = 一个场次」计算。**如果你知道其中哪一站有昼夜两场，告诉我站名即可**，我按同样格式补进去。

### SNOW MIKU

**2.1 · SNOW MIKU LIVE! 2015 presents MIKU EXPO Live Set**（演出 3792，2015-02-07 – 2015-02-08，当前 2 场 × 27 首）

- 已查：VocaDB Fandom「SNOW MIKU LIVE! 2015 Presents MIKU EXPO Live Set」，只写日期区间，没有逐日时刻
  - https://vocaloid.fandom.com/wiki/SNOW_MIKU_LIVE!_2015_Presents_MIKU_EXPO_Live_Set

- [ ] 每天只有一场，保持现状即可
- [ ] 有昼夜两场（写在补充说明：站名 + 来源）

> 补充：

### 鼓童

**2.2 · 初音ミク×鼓童スペシャルライブ２０２３ ～結～**（演出 5910，2023-06-03 – 2023-06-04，当前 2 场 × 20 首）

- 已查：VocaDB Fandom「Hatsune Miku × Kodo Taiko Special Live 2023」，只写日期区间，没有逐日时刻
  - https://vocaloid.fandom.com/wiki/Hatsune_Miku_×_Kodo_Taiko_Special_Live_2023

- [ ] 每天只有一场，保持现状即可
- [ ] 有昼夜两场（写在补充说明：站名 + 来源）

> 补充：

---

## 3. 本轮按百科修正的冲突（请核对）

你已裁决的两条日期冲突，加上我按百科改掉的 4 处备注问题，都列在这里。
处理原则：**冲突时优先采用百科 / 官方页**，改的是我们自己的派生层，不动 VocaDB。

### 3.1 · MIKU EXPO 2015 in Shanghai（演出 1940）（已按你的裁决处理）

- 冲突：Fandom 记 6/26–6/27，VocaDB 记 6/27–6/28
- 处理：官网海报（SCLA，2019-07-22 存档）与萌娘百科都写 6/27–6/28，两天各有昼场 13:00 + 夜场 19:00，共四场。Fandom 的 6/26–6/27 不采用，最终按 6/27–6/28 展开 4 场。
- 来源：https://web.archive.org/web/20190722050158/http://www.scla.com.cn/hatsunemiku/
- 来源：https://zh.moegirl.org.cn/HATSUNE_MIKU_EXPO_2015_in_Shanghai

### 3.2 · 初音ミクライブパーティー 2011 Sapporo（演出 2526）（已按你的裁决处理）

- 冲突：Fandom 只写 8/17，VocaDB 记 8/16–8/17
- 处理：5pb. 官方页（2012-05-12 存档）写 8/16–8/17，两天各一场；与 VocaDB 一致，Fandom 不采用。
- 来源：https://web.archive.org/web/20120512094239/http://5pb.jp/mikupa/index_sapporo.html

### 3.3 · 初音ミク「マジカルミライ 2021」in OSAKA（演出 3305）

- 原问题：VocaDB 把《スノーマン》标成「Day 1 / Day 3」，导致大阪 Day 3 变成 26 首
- 处理：VocaDB Fandom 的逐日歌单：大阪 Day 1–3 各 25 首，《スノーマン》只在 Day 1。已把该行改成只在 Day 1，Day 3 回到 25 首。
- 来源：https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2021

### 3.4 · 初音ミク「マジカルミライ 2024」in OSAKA（演出 7217）

- 原问题：VocaDB 只写「Osaka Day 1」，大阪 Day 3 因此只有 18 首
- 处理：Fandom 把大阪分成「Day 1 & 3」与「Day 2」两套歌单，Day 1 与 Day 3 相同。已给对应行补上 Osaka Day 3，六个场次都回到 24 首。
- 来源：https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2024

### 3.5 · MIKU EXPO 2024 San Jose（演出 6518）

- 原问题：VocaDB 把第三套歌单归给 San Jose Day 2，导致 Day 2 累加成 26 首、Day 1 只剩 20 首
- 处理：Fandom 的三套歌单写明第三套是 San Jose Day 1。已把相关行从 Day 2 改到 Day 1，两天都回到 23 首。
- 来源：https://vocaloid.fandom.com/wiki/HATSUNE_MIKU_EXPO_2024_North_America

### 3.6 · 初音ミクライブパーティー 2012 Hong Kong（演出 2524）

- 原问题：香港 24 首、台湾 25 首，被长度检查标成不一致
- 处理：Fandom：23 首固定 + 香港 1 首安可、台湾 2 首安可。24 / 25 是有意为之，已记为已解释，不再报警告。
- 来源：https://vocaloid.fandom.com/wiki/Hatsune_Miku_Live_Party_2012_(Mikupa)/Hong_Kong_and_Taiwan

### 3.7 · MIKU EXPO 2016 日本 5 城（演出 1399 / 1400 / 1401 / 1402 / 1403）

- 原问题：VocaDB 只有日期区间，按每天一场算成 7 场
- 处理：官方 jp2016/live 与萌娘百科一致：福冈 3/23、3/24 均仅夜场；大阪 3/29、名古屋 3/31、札幌 4/5 各有昼 + 夜；东京 4/9、4/10 各有昼 + 夜。合计 12 场。
- 来源：https://mikuexpo.com/jp2016/live

### 3.8 · MIKU EXPO 2016 北美（演出 1924 / 1930 / 1936 等 10 城）

- 原问题：VocaDB 只有日期区间，10 城按日历天算成 11 场
- 处理：萌娘百科的逐城表：旧金山 4/30 与纽约 5/28 各有昼 + 夜；墨西哥城 6/4 一场、6/5 两场；其余 7 城各一场。合计 14 场。
- 来源：https://zh.moegirl.org.cn/MIKU_EXPO_2016

### 3.9 · MIKU EXPO 2016 中国内地（演出 1942 / 1943）与台湾（演出 1941）

- 原问题：中国内地按每天一场算成 4 场；台湾按每天一场算成 2 场
- 处理：萌娘百科：上海、北京每日各昼夜两场（昼 13:00 / 夜 18:00），合计 8 场；官方 tw2016：新北 6/25 仅夜场、6/26 昼 + 夜，合计 3 场。
- 来源：https://mikuexpo.com/tw2016/

### 3.10 · MIKU EXPO 2024 / 2025 / 2026 与未来有你 2024

- 原问题：VocaDB 只有日期区间，多日城市按每天一场算
- 处理：萌娘百科给出总场次：2024 北美 17 城 21 场、2025 亚洲 8 城 9 场、2026 北美 15 城 19 场，且说明各场开演时间相同，因此每个日期只有一场；未来有你 2024 三地共 12 场 = 3 城 × 2 天 × 昼夜两场，每场 23 首。
- 来源：https://zh.moegirl.org.cn/MIKU_EXPO_2024

### 3.11 · SNOW MIKU LIVE! 2019（演出 2422）与初音ミク×鼓童 2017（演出 2947）

- 原问题：按每天一场算成 2 场
- 处理：萌娘百科：SNOW MIKU 2019 的 2/9、2/10 各有昼 + 夜两场（共 4 场）；鼓童 2017 的 3/4 仅夜场 19:00、3/5 仅昼场 13:00（共 2 场，但分属昼夜）。
- 来源：https://zh.moegirl.org.cn/SNOW_MIKU_LIVE!_2019

### 3.12 · 初音ミク×鼓童スペシャルライブ２０１８（演出 2948）

- 原问题：VocaDB 只有日期区间，按每天一场算成 2 场
- 处理：Fandom 转载的官方公演情报：6/2 有 13:00 与 19:00 两场，6/3 只有 13:00 一场。已改成 3 场。
- 来源：https://vocaloid.fandom.com/wiki/Hatsune_Miku_×_Kodo_Taiko_Special_Live_2018

### 3.13 · 逐行备注更正汇总

| 源歌单 | 更正的行 | 说明 | 来源 |
| --- | --- | --- | --- |
| [9909](https://vocadb.net/L/9909) | 15 | 改写备注 1 行（萌娘百科 / VocaDB Fandom 的逐日歌单：大阪与东京 Day 1–3 各 25 首） | https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2021 |
| [17933](https://vocadb.net/L/17933) | 4, 6, 21, 23, 25, 27 | 改写备注 6 行（Fandom：大阪分「Day 1 & 3」与「Day 2」两套；VocaDB 少了 Day 3；福冈 / 东京 / 大阪各自的场次共用一套；大阪 Day 1 & 3 相同） | https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2024 |
| [16544](https://vocadb.net/L/16544) | 13, 17, 20 | 改写备注 3 行（Fandom 的三套歌单把第三套归给 San Jose Day 1；VocaDB 写成 Day 2） | https://vocaloid.fandom.com/wiki/HATSUNE_MIKU_EXPO_2024_North_America |
| [31](https://vocadb.net/L/31) | — | 已解释长度差 1 处（Fandom：23 首固定 + 香港 1 首安可、台湾 2 首安可） | https://vocaloid.fandom.com/wiki/Hatsune_Miku_Live_Party_2012_(Mikupa)/Hong_Kong_and_Taiwan |

---

## 4. 备注只写到城市的场次（6 份歌单，已由百科定案）

这些歌单的备注只写城市（如 `Osaka`、`Shanghai, Beijing`）。百科给出的是城市级歌单，
说明「只写城市」本来就等于「这座城市的所有场次都演」，所以已按城市套用到该城全部场次，不再标不确定。

| 源歌单 | 定案依据 | 来源 |
| --- | --- | --- |
| [17933](https://vocadb.net/L/17933) | Fandom：大阪分「Day 1 & 3」与「Day 2」两套；VocaDB 少了 Day 3；福冈 / 东京 / 大阪各自的场次共用一套；大阪 Day 1 & 3 相同 | [来源](https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2024) |
| [7852](https://vocadb.net/L/7852) | 大阪与东京各一套 27 首歌单，各城市所有场次相同 | [来源](https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2018) |
| [7986](https://vocadb.net/L/7986) | 北京 / 成都 / 上海各一套歌单，同城各场相同 | [来源](https://vocaloid.fandom.com/wiki/MIKU_WITH_YOU_2018) |
| [9359](https://vocadb.net/L/9359) | A 版（上海、北京）与 B 版（成都、广州），同城各场相同 | [来源](https://vocaloid.fandom.com/wiki/MIKU_WITH_YOU_2019) |
| [20912](https://vocadb.net/L/20912) | 仙台 / 大阪 / 东京各自的场次共用一套 | [来源](https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2025) |
| [27886](https://vocadb.net/L/27886) | 滨松 / 大阪 / 东京各自的场次共用一套 | [来源](https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2026) |

---

## 5. 整份歌单没有任何备注（整份沿用）

这些源歌单一行备注都没有，每个演出都拿整套曲目。抽样确认即可，不必逐条回。

| 源歌单 | 名称 | 类型 | 演出数 | 场次数 | 行数 |
| --- | --- | --- | --- | --- | --- |
| [6571](https://vocadb.net/L/6571) | Miku Expo 2016 North America | vocadb | 10 | 14 | 26 |
| [6570](https://vocadb.net/L/6570) | Miku Expo 2016 Japan | vocadb | 5 | 12 | 26 |
| [1000052449](https://vocadb.net/L/1000052449) | 初音ミクシンフォニー ~Miku Symphony 2025~ オーケストラ… | album | 5 | 5 | 31 |
| [1000028945](https://vocadb.net/L/1000028945) | 初音ミクシンフォニー ~Miku Symphony 2020~ オーケストラ… | album | 3 | 3 | 17 |
| [1000037020](https://vocadb.net/L/1000037020) | 初音ミクシンフォニー ~Miku Symphony 2022~ オーケストラ… | album | 3 | 3 | 14 |
| [1000045255](https://vocadb.net/L/1000045255) | 初音ミクシンフォニー ~Miku Symphony 2024~ オーケストラ… | album | 3 | 3 | 22 |
| [214](https://vocadb.net/L/214) | Hatsune Miku "Magical Mirai" 2014 | vocadb | 2 | 2 | 25 |
| [221](https://vocadb.net/L/221) | Miku Expo 2014 USA | vocadb | 2 | 4 | 27 |
| [6950](https://vocadb.net/L/6950) | Miku Expo 2016 China | vocadb | 2 | 8 | 26 |
| [8631](https://vocadb.net/L/8631) | Miku Expo 2020 London/Berlin | vocadb | 2 | 2 | 25 |
| [1000026491](https://vocadb.net/L/1000026491) | 初音ミクシンフォニー ~Miku Symphony 2018-2019~ オ… | album | 2 | 2 | 16 |
| [1000027432](https://vocadb.net/L/1000027432) | 初音ミクシンフォニー ~Miku Symphony 2019~ オーケストラ… | album | 2 | 2 | 21 |
| [1000030905](https://vocadb.net/L/1000030905) | 初音ミクシンフォニー ~Miku Symphony 2021~ オーケストラ… | album | 2 | 2 | 17 |
| [1000030961](https://vocadb.net/L/1000030961) | 初音ミクシンフォニー ~Miku Symphony 2017~ オーケストラ… | album | 2 | 2 | 15 |
| [1000040398](https://vocadb.net/L/1000040398) | 初音ミクシンフォニー ~Miku Symphony 2023~ オーケストラ… | album | 2 | 2 | 25 |
| [12](https://vocadb.net/L/12) | Hatsune Miku Live Party 2011 Mikupa♪ S… | vocadb | 1 | 2 | 26 |
| [31](https://vocadb.net/L/31) | Hatsune Miku Live Party 2012 Mikupa♪ H… | vocadb | 1 | 1 | 25 |
| [82](https://vocadb.net/L/82) | Hatsune Miku Live Party 2013 Mikupa♪ S… | vocadb | 1 | 4 | 26 |
| [213](https://vocadb.net/L/213) | Miku Expo 2014 Indonesia | vocadb | 1 | 3 | 27 |
| [217](https://vocadb.net/L/217) | Hatsune Miku Live Party 2012 Mikupa♪ T… | vocadb | 1 | 1 | 33 |
| [3952](https://vocadb.net/L/3952) | ミクの日感謝祭 39's Giving Day Project DIVA p… | vocadb | 1 | 1 | 40 |
| [3953](https://vocadb.net/L/3953) | Hatsune Miku Live Party 2011 Mikupa♪ T… | vocadb | 1 | 1 | 39 |
| [3954](https://vocadb.net/L/3954) | Hatsune Miku Live Party 2013 Mikupa♪ K… | vocadb | 1 | 1 | 39 |
| [6572](https://vocadb.net/L/6572) | Miku Expo 2016 Taiwan | vocadb | 1 | 3 | 26 |
| [7024](https://vocadb.net/L/7024) | Hatsune Miku × Kodō Special Live | vocadb | 1 | 2 | 19 |
| [7979](https://vocadb.net/L/7979) | Miku Expo 2018 Paris | vocadb | 1 | 1 | 26 |
| [7985](https://vocadb.net/L/7985) | Miku Expo 2018 Cologne | vocadb | 1 | 1 | 26 |
| [7988](https://vocadb.net/L/7988) | Miku Expo 2018 London | vocadb | 1 | 1 | 26 |
| [8103](https://vocadb.net/L/8103) | Miku Expo 2019 New Taipei City | vocadb | 1 | 1 | 25 |
| [8104](https://vocadb.net/L/8104) | Miku Expo 2019 Hong Kong | vocadb | 1 | 1 | 25 |
| [8641](https://vocadb.net/L/8641) | Miku Expo 2020 Paris | vocadb | 1 | 1 | 25 |
| [8654](https://vocadb.net/L/8654) | Miku Expo 2020 Amsterdam | vocadb | 1 | 1 | 25 |
| [8961](https://vocadb.net/L/8961) | Hatsune Miku × Kodō Special Live 2018 | vocadb | 1 | 3 | 21 |
| [9192](https://vocadb.net/L/9192) | MIKU WITH YOU 2020 | vocadb | 1 | 1 | 18 |
| [10011](https://vocadb.net/L/10011) | MIKU WITH YOU 2021 | vocadb | 1 | 1 | 17 |
| [13030](https://vocadb.net/L/13030) | Hatsune Miku × Kodō Special Live 2023 … | vocadb | 1 | 2 | 20 |
| [14426](https://vocadb.net/L/14426) | HATSUNE MIKU EXPO 2023 VR Setlist | vocadb | 1 | 1 | 14 |
| [1000019737](https://vocadb.net/L/1000019737) | 初音ミクシンフォニー ~Miku Symphony 2016~ オーケストラ… | album | 1 | 1 | 18 |
| [1000039621](https://vocadb.net/L/1000039621) | 初音ミクシンフォニー ~Miku Symphony 2023~ Live a… | album | 1 | 1 | 24 |

- [ ] 这些歌单确实只有一套曲目，整份沿用正确
- [ ] 其中有分站替换曲（写在补充说明：源歌单 id + 城市 + 曲目）

**补充说明**

> 

---

## 6. 上游没有歌单的演出（30 个）

多数是已取消或尚未举行。等实体发行或官方歌单出现再补。

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
