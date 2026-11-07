# 歌单数据核对清单

> 生成本文件：`uv run .cursor/skills/update-concert-data/scripts/confirmation-report.py`（读 `public/data/catalog.sqlite` 与 `data/performance-setlists.json`）。
> 本轮已按你的要求先去查萌娘百科 / VocaDB Fandom / 官方存档页：能查到的直接采用，冲突的优先用百科，并在第 3 节列出。
> 需要你回的只剩第 2 节（百科也没写逐日时刻的部分）与第 6 节（上游没有歌单）。

## 0. 一句话现状

- 目录里 191 个演出已展开成 **410 个场次**、9894 条曲目。
- 来源记录 191 个演出：官方页 19 条、百科 186 条，全部已直接采用。
- 待核实归属 0 个、冲突 0 个、带不确定标记的场次 0 个。
- 另有 16 首不是 VOCALOID 歌曲的曲目（古典改编、鼓童器乐曲、民谣）已按普通曲目登记，没有歌手、来源写百科，演出页会标「非 VocaDB」。
- 还剩 **2 个跨天演出**：百科与官网都只写日期区间，没有逐日时刻，见第 2 节。

---

## 1. 数据来源记录（已采用，无需确认）

凡是从官方票务页、萌娘百科或 VocaDB Fandom 查到场次的演出，数据已经直接采用；
来源、访问日期与置信度都写进 catalog 的 `performance_setlist_sources`，也在 `/shows` 页脚显示。

| 演出 | 系列 | 日期 | 场次 × 曲目 | 归属 | 置信度 | 来源 |
| --- | --- | --- | --- | --- | --- | --- |
| 初音ミク「マジカルミライ 2013」in YOKOHAMA（2519） | 魔法未来 | 2013-08-30 | 2 × 24 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2013」in YOKOHAMA（横浜）](https://w.atwiki.jp/hmiku/pages/67111.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2014」in OSAKA（2517） | 魔法未来 | 2014-08-30 | 1 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2014」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67113.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2014」in TOKYO（2518） | 魔法未来 | 2014-09-20 | 1 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2014」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67113.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2015」in TOKYO（2514） | 魔法未来 | 2015-09-04 | 3 × 27 | vocadb-note | high | [マジカルミライ 2015 チケット](https://magicalmirai.com/2015/ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2016」in TOKYO（1398） | 魔法未来 | 2016-09-09 | 4 × 26 | vocadb-note | high | [マジカルミライ 2016 チケット](https://magicalmirai.com/2016/ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2017」in TOKYO（1397） | 魔法未来 | 2017-09-01 | 5 × 28 | vocadb-note | high | [マジカルミライ 2017 チケット](https://magicalmirai.com/2017/ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2018」in OSAKA（1561） | 魔法未来 | 2018-08-25 | 4 × 26 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2018」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67122.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2018」in TOKYO（1745） | 魔法未来 | 2018-08-31 | 4 × 26 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2018」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67122.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2019」in OSAKA（2515） | 魔法未来 | 2019-08-09 | 4 × 26 | vocadb-note | high | [マジカルミライ 2019 OSAKA チケット](https://magicalmirai.com/2019/osaka_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2019」in TOKYO（2516） | 魔法未来 | 2019-08-30 | 5 × 26 | vocadb-note | high | [マジカルミライ 2019 TOKYO チケット](https://magicalmirai.com/2019/tokyo_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2020」in OSAKA（2758） | 魔法未来 | 2020-11-27 | 4 × 18 | vocadb-note | high | [マジカルミライ 2020 OSAKA チケット](https://magicalmirai.com/2020/osaka/ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2020」in TOKYO（2759） | 魔法未来 | 2020-12-18 | 5 × 18 | vocadb-note | high | [マジカルミライ 2020 TOKYO チケット](https://magicalmirai.com/2020/tokyo/ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2021」in OSAKA（3305） | 魔法未来 | 2021-10-22 | 5 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2021」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67125.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2021」in TOKYO（3306） | 魔法未来 | 2021-11-05 | 6 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2021」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67125.html)（2026-11-06） |
| 初音ミク「マジカルミライ」10th Anniversary in OSAKA（4233） | 魔法未来 | 2022-08-12 | 5 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ」10th Anniversary in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/66656.html)（2026-11-06） |
| 初音ミク「マジカルミライ」10th Anniversary in TOKYO（4234） | 魔法未来 | 2022-09-02 | 6 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ」10th Anniversary in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/66656.html)（2026-11-06） |
| 初音ミク「マジカルミライ」10th Anniversary in SAPPORO（4235） | 魔法未来 | 2023-02-04 | 4 × 20 | vocadb-note | high | [マジカルミライ 10th Anniversary SAPPORO チケット](https://magicalmirai.com/10th/sapporo_ticket.html)（2026-11-05） |
| 初音ミク「マジカルミライ 2023」in OSAKA（6045） | 魔法未来 | 2023-08-11 | 6 × 24 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2023」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67126.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2023」in TOKYO（6046） | 魔法未来 | 2023-09-01 | 6 × 24 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2023」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67126.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2024」in FUKUOKA（7214） | 魔法未来 | 2024-08-17 | 4 × 24 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2024」in FUKUOKA（福冈）](https://w.atwiki.jp/hmiku/pages/66797.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2024」in TOKYO（7215） | 魔法未来 | 2024-08-30 | 6 × 24 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2024」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/66797.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2024」in OSAKA（7217） | 魔法未来 | 2024-10-12 | 6 × 24 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2024」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/66797.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2025」in SENDAI（8768） | 魔法未来 | 2025-08-01 | 5 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2025」in SENDAI（仙台）](https://w.atwiki.jp/hmiku/pages/67127.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2025」in OSAKA（8769） | 魔法未来 | 2025-08-09 | 6 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2025」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67127.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2025」in TOKYO（8770） | 魔法未来 | 2025-08-29 | 6 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2025」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67127.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2026」in HAMAMATSU（12249） | 魔法未来 | 2026-07-24 | 6 × 26 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2026」in HAMAMATSU（浜松）](https://w.atwiki.jp/hmiku/pages/71541.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2026」in OSAKA（12250） | 魔法未来 | 2026-08-14 | 6 × 26 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2026」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/71541.html)（2026-11-06） |
| 初音ミク「マジカルミライ 2026」in TOKYO（12251） | 魔法未来 | 2026-08-28 | 6 × 26 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2026」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/71541.html)（2026-11-06） |
| MIKU EXPO 2014 Jakarta（1939） | MIKU EXPO | 2014-05-28 | 3 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2014 Jakarta（雅加达）](https://w.atwiki.jp/hmiku/pages/67130.html)（2026-11-06） |
| MIKU EXPO 2014 Los Angeles（1937） | MIKU EXPO | 2014-10-11 | 2 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2014 Los Angeles（洛杉矶 / 纽约）](https://w.atwiki.jp/hmiku/pages/67131.html)（2026-11-06） |
| MIKU EXPO 2014 New York（1938） | MIKU EXPO | 2014-10-17 | 2 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2014 New York（洛杉矶 / 纽约）](https://w.atwiki.jp/hmiku/pages/67131.html)（2026-11-06） |
| MIKU EXPO 2015 Shanghai（1940） | MIKU EXPO | 2015-06-27 | 4 × 27 | vocadb-note | high | [SCLA 官方页（2019-07-22 存档）：初音未来2015上海演唱会<br>萌娘百科：HATSUNE MIKU EXPO 2015 in Shanghai](https://web.archive.org/web/20190722050158/http://www.scla.com.cn/hatsunemiku/)（2026-11-05） |
| MIKU EXPO 2016 Fukuoka（1399） | MIKU EXPO | 2016-03-23 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Fukuoka（福冈）](https://w.atwiki.jp/hmiku/pages/67048.html)（2026-11-06） |
| MIKU EXPO 2016 Osaka（1400） | MIKU EXPO | 2016-03-29 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Osaka（大阪）](https://w.atwiki.jp/hmiku/pages/67048.html)（2026-11-06） |
| MIKU EXPO 2016 Nagoya（1401） | MIKU EXPO | 2016-03-31 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Nagoya（名古屋）](https://w.atwiki.jp/hmiku/pages/67048.html)（2026-11-06） |
| MIKU EXPO 2016 Sapporo（1402） | MIKU EXPO | 2016-04-05 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Sapporo（札幌）](https://w.atwiki.jp/hmiku/pages/67048.html)（2026-11-06） |
| MIKU EXPO 2016 Tokyo（1403） | MIKU EXPO | 2016-04-09 | 4 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Tokyo（东京）](https://w.atwiki.jp/hmiku/pages/67048.html)（2026-11-06） |
| MIKU EXPO 2016 Seattle（1859） | MIKU EXPO | 2016-04-23 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Seattle（西雅图）](https://w.atwiki.jp/hmiku/pages/67134.html)（2026-11-06） |
| MIKU EXPO 2016 San Francisco（1930） | MIKU EXPO | 2016-04-30 | 2 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 San Francisco（旧金山）](https://w.atwiki.jp/hmiku/pages/67134.html)（2026-11-06） |
| MIKU EXPO 2016 Los Angeles（1931） | MIKU EXPO | 2016-05-06 | 1 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/67134.html)（2026-11-06） |
| MIKU EXPO 2016 Dallas（1932） | MIKU EXPO | 2016-05-14 | 1 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Dallas（达拉斯）](https://w.atwiki.jp/hmiku/pages/67134.html)（2026-11-06） |
| MIKU EXPO 2016 Houston（1933） | MIKU EXPO | 2016-05-17 | 1 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Houston（休斯敦）](https://w.atwiki.jp/hmiku/pages/67134.html)（2026-11-06） |
| MIKU EXPO 2016 Toronto（1934） | MIKU EXPO | 2016-05-20 | 1 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Toronto（多伦多）](https://w.atwiki.jp/hmiku/pages/67134.html)（2026-11-06） |
| MIKU EXPO 2016 Chicago（1935） | MIKU EXPO | 2016-05-25 | 1 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Chicago（芝加哥）](https://w.atwiki.jp/hmiku/pages/67134.html)（2026-11-06） |
| MIKU EXPO 2016 New York（1936） | MIKU EXPO | 2016-05-28 | 2 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 New York（纽约）](https://w.atwiki.jp/hmiku/pages/67134.html)（2026-11-06） |
| MIKU EXPO 2016 Monterrey（1860） | MIKU EXPO | 2016-06-01 | 1 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Monterrey（蒙特雷）](https://w.atwiki.jp/hmiku/pages/67134.html)（2026-11-06） |
| MIKU EXPO 2016 Mexico City（1924） | MIKU EXPO | 2016-06-04 | 3 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Mexico City（墨西哥城）](https://w.atwiki.jp/hmiku/pages/67134.html)（2026-11-06） |
| MIKU EXPO 2016 New Taipei City（1941） | MIKU EXPO | 2016-06-25 | 3 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 New Taipei City（台北）](https://w.atwiki.jp/hmiku/pages/67135.html)（2026-11-06） |
| MIKU EXPO 2016 Shanghai（1943） | MIKU EXPO | 2016-12-03 | 4 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67136.html)（2026-11-06） |
| MIKU EXPO 2016 Beijing（1942） | MIKU EXPO | 2016-12-10 | 4 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67136.html)（2026-11-06） |
| MIKU EXPO 2017 Kuala Lumpur（1584） | MIKU EXPO | 2017-12-16 | 1 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2017 Kuala Lumpur（吉隆坡）](https://w.atwiki.jp/hmiku/pages/67137.html)（2026-11-06） |
| MIKU EXPO 2018 Los Angeles（1673） | MIKU EXPO | 2018-06-29 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/67060.html)（2026-11-06） |
| MIKU EXPO 2018 San Jose（1674） | MIKU EXPO | 2018-07-01 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 San Jose（圣何塞）](https://w.atwiki.jp/hmiku/pages/67060.html)（2026-11-06） |
| MIKU EXPO 2018 Dallas（1675） | MIKU EXPO | 2018-07-06 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 Dallas（达拉斯）](https://w.atwiki.jp/hmiku/pages/67060.html)（2026-11-06） |
| MIKU EXPO 2018 Austin（1676） | MIKU EXPO | 2018-07-08 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 Austin（奥斯汀）](https://w.atwiki.jp/hmiku/pages/67060.html)（2026-11-06） |
| MIKU EXPO 2018 Washington, D.C.（1677） | MIKU EXPO | 2018-07-12 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 Washington, D.C.（华盛顿）](https://w.atwiki.jp/hmiku/pages/67060.html)（2026-11-06） |
| MIKU EXPO 2018 New York（1678） | MIKU EXPO | 2018-07-14 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 New York（纽约）](https://w.atwiki.jp/hmiku/pages/67060.html)（2026-11-06） |
| MIKU EXPO 2018 Mexico City（1925） | MIKU EXPO | 2018-07-19 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 Mexico City（墨西哥城）](https://w.atwiki.jp/hmiku/pages/67060.html)（2026-11-06） |
| MIKU EXPO 2018 Paris（1854） | MIKU EXPO | 2018-12-01 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 Paris（巴黎）](https://w.atwiki.jp/hmiku/pages/67138.html)（2026-11-06） |
| MIKU EXPO 2018 Cologne（1855） | MIKU EXPO | 2018-12-04 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 Cologne（科隆）](https://w.atwiki.jp/hmiku/pages/67138.html)（2026-11-06） |
| MIKU EXPO 2018 London（1856） | MIKU EXPO | 2018-12-08 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 London（伦敦）](https://w.atwiki.jp/hmiku/pages/67138.html)（2026-11-06） |
| MIKU EXPO 2019 New Taipei City（2489） | MIKU EXPO | 2019-05-11 | 1 × 25 | external | medium | [初音ミク Wiki：MIKU EXPO 2019 New Taipei City（台北）](https://w.atwiki.jp/hmiku/pages/67139.html)（2026-11-06） |
| MIKU EXPO 2019 Hong Kong（2490） | MIKU EXPO | 2019-07-27 | 1 × 25 | external | medium | [初音ミク Wiki：MIKU EXPO 2019 Hong Kong（香港）](https://w.atwiki.jp/hmiku/pages/67139.html)（2026-11-06） |
| MIKU EXPO 2020 London（2786） | MIKU EXPO | 2020-01-11 | 1 × 25 | external | medium | [初音ミク Wiki：MIKU EXPO 2020 London（伦敦）](https://w.atwiki.jp/hmiku/pages/67140.html)（2026-11-06） |
| MIKU EXPO 2020 Paris（2787） | MIKU EXPO | 2020-01-16 | 1 × 25 | external | medium | [初音ミク Wiki：MIKU EXPO 2020 Paris（巴黎）](https://w.atwiki.jp/hmiku/pages/67140.html)（2026-11-06） |
| MIKU EXPO 2020 Berlin（2788） | MIKU EXPO | 2020-01-20 | 1 × 25 | external | medium | [初音ミク Wiki：MIKU EXPO 2020 Berlin（柏林）](https://w.atwiki.jp/hmiku/pages/67140.html)（2026-11-06） |
| MIKU EXPO 2020 Amsterdam（2789） | MIKU EXPO | 2020-01-24 | 1 × 25 | external | medium | [初音ミク Wiki：MIKU EXPO 2020 Amsterdam（阿姆斯特丹）](https://w.atwiki.jp/hmiku/pages/67140.html)（2026-11-06） |
| MIKU EXPO 2021 Online（3224） | MIKU EXPO | 2021-06-06 | 1 × 16 | external | medium | [初音ミク Wiki：MIKU EXPO 2021 Online（线上）](https://w.atwiki.jp/hmiku/pages/67074.html)（2026-11-06） |
| MIKU EXPO 2022 Rewind（4114） | MIKU EXPO | 2022-06-05 | 1 × 18 | external | medium | [初音ミク Wiki：MIKU EXPO 2022 Rewind（线上）](https://w.atwiki.jp/hmiku/pages/67141.html)（2026-11-06） |
| MIKU EXPO 2022 Rewind+（4490） | MIKU EXPO | 2022-11-06 | 1 × 28 | external | medium | [初音ミク Wiki：MIKU EXPO 2022 Rewind+（线上）](https://w.atwiki.jp/hmiku/pages/67142.html)（2026-11-06） |
| MIKU EXPO 2023 VR（5751） | MIKU EXPO | 2023-11-12 | 1 × 14 | external | medium | [初音ミク Wiki：MIKU EXPO 2023 VR（线上）](https://w.atwiki.jp/hmiku/pages/67143.html)（2026-11-06） |
| MIKU EXPO 2024 Vancouver（6516） | MIKU EXPO | 2024-04-04 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Vancouver（温哥华）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 Portland（6517） | MIKU EXPO | 2024-04-06 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Portland（波特兰）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 San Jose（6518） | MIKU EXPO | 2024-04-08 | 2 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 San Jose（圣何塞）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 Phoenix（6519） | MIKU EXPO | 2024-04-14 | 2 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Phoenix（凤凰城）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 Los Angeles（7186） | MIKU EXPO | 2024-04-17 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 Denver（6520） | MIKU EXPO | 2024-04-21 | 2 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Denver（丹佛）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 Dallas（6521） | MIKU EXPO | 2024-04-24 | 2 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Dallas（达拉斯）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 Austin（6522） | MIKU EXPO | 2024-04-27 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Austin（奥斯汀）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 Atlanta（6523） | MIKU EXPO | 2024-04-30 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Atlanta（亚特兰大）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 Orlando（6524） | MIKU EXPO | 2024-05-02 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Orlando（奥兰多）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 Washington（6525） | MIKU EXPO | 2024-05-05 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Washington（华盛顿）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 Newark（6526） | MIKU EXPO | 2024-05-07 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Newark（纽瓦克）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 Boston（6527） | MIKU EXPO | 2024-05-09 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Boston（波士顿）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 Detroit（6528） | MIKU EXPO | 2024-05-12 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Detroit（底特律）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 Chicago（6529） | MIKU EXPO | 2024-05-14 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Chicago（芝加哥）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 Toronto（6530） | MIKU EXPO | 2024-05-16 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Toronto（多伦多）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 Mexico City（6531） | MIKU EXPO | 2024-05-21 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Mexico City（墨西哥城）](https://w.atwiki.jp/hmiku/pages/67090.html)（2026-11-06） |
| MIKU EXPO 2024 London（7266） | MIKU EXPO | 2024-10-26 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 London（伦敦）](https://w.atwiki.jp/hmiku/pages/67145.html)（2026-11-06） |
| MIKU EXPO 2024 Brussels（7267） | MIKU EXPO | 2024-10-28 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Brussels（布鲁塞尔）](https://w.atwiki.jp/hmiku/pages/67145.html)（2026-11-06） |
| MIKU EXPO 2024 Paris（7268） | MIKU EXPO | 2024-10-29 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Paris（巴黎）](https://w.atwiki.jp/hmiku/pages/67145.html)（2026-11-06） |
| MIKU EXPO 2024 Amsterdam（7269） | MIKU EXPO | 2024-10-30 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Amsterdam（阿姆斯特丹）](https://w.atwiki.jp/hmiku/pages/67145.html)（2026-11-06） |
| MIKU EXPO 2024 Düsseldorf（7270） | MIKU EXPO | 2024-11-01 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Düsseldorf（杜塞尔多夫）](https://w.atwiki.jp/hmiku/pages/67145.html)（2026-11-06） |
| MIKU EXPO 2024 Berlin（7271） | MIKU EXPO | 2024-11-02 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Berlin（柏林）](https://w.atwiki.jp/hmiku/pages/67145.html)（2026-11-06） |
| MIKU EXPO 2024 Auckland（7765） | MIKU EXPO | 2024-11-15 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Auckland（奥克兰）](https://w.atwiki.jp/hmiku/pages/67146.html)（2026-11-06） |
| MIKU EXPO 2024 Brisbane（7766） | MIKU EXPO | 2024-11-18 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Brisbane（布里斯班）](https://w.atwiki.jp/hmiku/pages/67146.html)（2026-11-06） |
| MIKU EXPO 2024 Sydney（7767） | MIKU EXPO | 2024-11-20 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Sydney（悉尼）](https://w.atwiki.jp/hmiku/pages/67146.html)（2026-11-06） |
| MIKU EXPO 2024 Melbourne（7768） | MIKU EXPO | 2024-11-22 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Melbourne（墨尔本）](https://w.atwiki.jp/hmiku/pages/67146.html)（2026-11-06） |
| MIKU EXPO 2024 Perth（7769） | MIKU EXPO | 2024-11-26 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Perth（珀斯）](https://w.atwiki.jp/hmiku/pages/67146.html)（2026-11-06） |
| MIKU EXPO 2025 Bangkok（9341） | MIKU EXPO | 2025-11-05 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Bangkok（曼谷）](https://w.atwiki.jp/hmiku/pages/67470.html)（2026-11-06） |
| MIKU EXPO 2025 Hong Kong（9348） | MIKU EXPO | 2025-11-08 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Hong Kong（香港）](https://w.atwiki.jp/hmiku/pages/67470.html)（2026-11-06） |
| MIKU EXPO 2025 Jakarta（9349） | MIKU EXPO | 2025-11-12 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Jakarta（雅加达）](https://w.atwiki.jp/hmiku/pages/67470.html)（2026-11-06） |
| MIKU EXPO 2025 Manila（9350） | MIKU EXPO | 2025-11-16 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Manila（马尼拉）](https://w.atwiki.jp/hmiku/pages/67470.html)（2026-11-06） |
| MIKU EXPO 2025 Singapore（9351） | MIKU EXPO | 2025-11-19 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Singapore（新加坡）](https://w.atwiki.jp/hmiku/pages/67470.html)（2026-11-06） |
| MIKU EXPO 2025 Kuala Lumpur（9352） | MIKU EXPO | 2025-11-22 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Kuala Lumpur（吉隆坡）](https://w.atwiki.jp/hmiku/pages/67470.html)（2026-11-06） |
| MIKU EXPO 2025 Taipei（9555） | MIKU EXPO | 2025-11-26 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Taipei（台北）](https://w.atwiki.jp/hmiku/pages/67470.html)（2026-11-06） |
| MIKU EXPO 2025 Seoul（9353） | MIKU EXPO | 2025-11-29 | 2 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Seoul（首尔）](https://w.atwiki.jp/hmiku/pages/67470.html)（2026-11-06） |
| MIKU EXPO 2026 Chicago（9811） | MIKU EXPO | 2026-04-12 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Chicago（芝加哥）](https://w.atwiki.jp/hmiku/pages/68848.html)（2026-11-06） |
| MIKU EXPO 2026 Denver（9812） | MIKU EXPO | 2026-04-15 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Denver（丹佛）](https://w.atwiki.jp/hmiku/pages/68848.html)（2026-11-06） |
| MIKU EXPO 2026 Vancouver（9813） | MIKU EXPO | 2026-04-18 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Vancouver（温哥华）](https://w.atwiki.jp/hmiku/pages/68848.html)（2026-11-06） |
| MIKU EXPO 2026 Seattle（9814） | MIKU EXPO | 2026-04-20 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Seattle（西雅图）](https://w.atwiki.jp/hmiku/pages/68848.html)（2026-11-06） |
| MIKU EXPO 2026 San Jose（9815） | MIKU EXPO | 2026-04-22 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 San Jose（圣何塞）](https://w.atwiki.jp/hmiku/pages/68848.html)（2026-11-06） |
| MIKU EXPO 2026 Los Angeles（9816） | MIKU EXPO | 2026-04-25 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/68848.html)（2026-11-06） |
| MIKU EXPO 2026 Glendale（9817） | MIKU EXPO | 2026-04-28 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Glendale（格伦代尔）](https://w.atwiki.jp/hmiku/pages/68848.html)（2026-11-06） |
| MIKU EXPO 2026 Grand Prairie（9818） | MIKU EXPO | 2026-04-30 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Grand Prairie（大草原城）](https://w.atwiki.jp/hmiku/pages/68848.html)（2026-11-06） |
| MIKU EXPO 2026 Cedar Park（9819） | MIKU EXPO | 2026-05-01 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Cedar Park（锡达帕克）](https://w.atwiki.jp/hmiku/pages/68848.html)（2026-11-06） |
| MIKU EXPO 2026 Duluth（9820） | MIKU EXPO | 2026-05-03 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Duluth（杜鲁斯）](https://w.atwiki.jp/hmiku/pages/68848.html)（2026-11-06） |
| MIKU EXPO 2026 Washington（9821） | MIKU EXPO | 2026-05-05 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Washington（华盛顿）](https://w.atwiki.jp/hmiku/pages/68848.html)（2026-11-06） |
| MIKU EXPO 2026 Newark（9822） | MIKU EXPO | 2026-05-07 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Newark（纽瓦克）](https://w.atwiki.jp/hmiku/pages/68848.html)（2026-11-06） |
| MIKU EXPO 2026 Boston（9823） | MIKU EXPO | 2026-05-10 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Boston（波士顿）](https://w.atwiki.jp/hmiku/pages/68848.html)（2026-11-06） |
| MIKU EXPO 2026 Hamilton（9824） | MIKU EXPO | 2026-05-13 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Hamilton（哈密尔顿）](https://w.atwiki.jp/hmiku/pages/68848.html)（2026-11-06） |
| MIKU EXPO 2026 Mexico City（9825） | MIKU EXPO | 2026-05-19 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Mexico City（墨西哥城）](https://w.atwiki.jp/hmiku/pages/68848.html)（2026-11-06） |
| HATSUNE MIKU with YOU 2017 CHINA FESTIVAL（1619） | 未来有你 | 2017-11-25 | 2 × 26 | external | medium | [初音ミク Wiki：HATSUNE MIKU with YOU 2017 CHINA FESTIVAL（北京）](https://w.atwiki.jp/hmiku/pages/67160.html)（2026-11-06） |
| MIKU WITH YOU 2018 in Beijing（2085） | 未来有你 | 2018-10-13 | 2 × 25 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2018 in Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67175.html)（2026-11-06） |
| MIKU WITH YOU 2018 in Chengdu（2086） | 未来有你 | 2018-10-20 | 2 × 25 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2018 in Chengdu（成都）](https://w.atwiki.jp/hmiku/pages/67175.html)（2026-11-06） |
| MIKU WITH YOU 2018 in Shanghai（2087） | 未来有你 | 2018-10-27 | 4 × 25 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2018 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67175.html)（2026-11-06） |
| MIKU WITH YOU 2019 in Shanghai（3752） | 未来有你 | 2019-11-02 | 4 × 25 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2019 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67177.html)（2026-11-06） |
| MIKU WITH YOU 2019 in Chengdu（3753） | 未来有你 | 2019-11-09 | 1 × 25 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2019 in Chengdu（成都）](https://w.atwiki.jp/hmiku/pages/67177.html)（2026-11-06） |
| MIKU WITH YOU 2019 in Beijing（3754） | 未来有你 | 2019-11-16 | 2 × 25 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2019 in Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67177.html)（2026-11-06） |
| MIKU WITH YOU 2019 in Guangzhou（3755） | 未来有你 | 2019-11-23 | 3 × 25 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2019 in Guangzhou（广州）](https://w.atwiki.jp/hmiku/pages/67177.html)（2026-11-06） |
| MIKU WITH YOU 2020（3250） | 未来有你 | 2020-12-25 | 1 × 18 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2020（线上）](https://w.atwiki.jp/hmiku/pages/67178.html)（2026-11-06） |
| MIKU WITH YOU 2021（4058） | 未来有你 | 2021-12-25 | 1 × 17 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2021（线上）](https://w.atwiki.jp/hmiku/pages/67180.html)（2026-11-06） |
| MIKU WITH YOU 2024 in Shanghai（7673） | 未来有你 | 2024-07-13 | 4 × 23 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2024 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67183.html)（2026-11-06） |
| MIKU WITH YOU 2024 in Beijing（7675） | 未来有你 | 2024-07-20 | 4 × 23 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2024 in Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67183.html)（2026-11-06） |
| MIKU WITH YOU 2024 in Guangzhou（7674） | 未来有你 | 2024-07-27 | 4 × 23 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2024 in Guangzhou（广州）](https://w.atwiki.jp/hmiku/pages/67183.html)（2026-11-06） |
| MIKU WITH YOU 2025（9644） | 未来有你 | 2025-12-20 | 4 × 23 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2025（上海）](https://w.atwiki.jp/hmiku/pages/68149.html)（2026-11-06） |
| MIKU WITH YOU 2026 in Shanghai（13120） | 未来有你 | 2026-10-31 | 4 × 24 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2026 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/79886.html)（2026-11-06） |
| SNOW MIKU LIVE! 2015 presents MIKU EXPO Live Set（3792） | SNOW MIKU | 2015-02-07 | 4 × 27 | vocadb-note | high | [SNOW MIKU LIVE! 2015 公式チケット页](https://snowmiku.com/2015/live_ticket.html)（2026-11-05） |
| SNOW MIKU LIVE! 2018（1618） | SNOW MIKU | 2018-02-09 | 4 × 26 | vocadb-note | medium | [VocaDB Fandom: SNOW MIKU LIVE! 2018](https://vocaloid.fandom.com/wiki/SNOW_MIKU_LIVE!_2018)（2026-11-05） |
| SNOW MIKU LIVE! 2019（2422） | SNOW MIKU | 2019-02-09 | 4 × 26 | vocadb-note | medium | [萌娘百科：SNOW MIKU LIVE! 2019](https://zh.moegirl.org.cn/SNOW_MIKU_LIVE!_2019)（2026-11-05） |
| ミクの日感謝祭39's Giving Day（2520） | Live Party | 2010-03-09 | 1 × 40 | external | medium | [初音ミク Wiki：ミクの日感謝祭39's Giving Day（东京）](https://w.atwiki.jp/hmiku/pages/67147.html)（2026-11-06） |
| 初音ミクライブパーティー 2011 Tokyo（2523） | Live Party | 2011-03-09 | 1 × 39 | external | medium | [初音ミク Wiki：初音ミクライブパーティー 2011 Tokyo（东京）](https://w.atwiki.jp/hmiku/pages/67149.html)（2026-11-06） |
| 初音ミクライブパーティー 2011 Sapporo（2526） | Live Party | 2011-08-16 | 2 × 26 | external | medium | [初音ミク Wiki：初音ミクライブパーティー 2011 Sapporo（札幌）](https://w.atwiki.jp/hmiku/pages/67150.html)（2026-11-06） |
| 初音ミクライブパーティー 2011 Singapore（2527） | Live Party | 2011-11-11 | 1 × 27 | external | medium | [初音ミク Wiki：初音ミクライブパーティー 2011 Singapore（新加坡）](https://w.atwiki.jp/hmiku/pages/67151.html)（2026-11-06） |
| 初音ミクライブパーティー 2012 Tokyo（4056） | Live Party | 2012-03-08 | 1 × 33 | external | medium | [初音ミク Wiki：初音ミクライブパーティー 2012 Tokyo（东京）](https://w.atwiki.jp/hmiku/pages/67152.html)（2026-11-06） |
| 初音ミクライブパーティー 2012 Hong Kong（2524） | Live Party | 2012-10-02 | 1 × 25 | external | medium | [初音ミク Wiki：初音ミクライブパーティー 2012 Hong Kong（香港）](https://w.atwiki.jp/hmiku/pages/67153.html)（2026-11-06） |
| 初音ミクライブパーティー 2012 Taiwan（2525） | Live Party | 2012-10-06 | 1 × 25 | external | medium | [初音ミク Wiki：初音ミクライブパーティー 2012 Taiwan（台北）](https://w.atwiki.jp/hmiku/pages/67153.html)（2026-11-06） |
| 初音ミクライブパーティー 2013 Sapporo（2510） | Live Party | 2013-02-09 | 4 × 26 | external | medium | [初音ミク Wiki：初音ミクライブパーティー 2013 Sapporo（札幌）](https://w.atwiki.jp/hmiku/pages/67154.html)（2026-11-06） |
| 初音ミクライブパーティー 2013 Kansai（2511） | Live Party | 2013-03-09 | 1 × 39 | external | medium | [初音ミク Wiki：初音ミクライブパーティー 2013 Kansai（关西）](https://w.atwiki.jp/hmiku/pages/66967.html)（2026-11-06） |
| 初音ミク×鼓童スペシャルライブ（2947） | 鼓童 | 2017-03-04 | 2 × 22 | external | medium | [初音ミク Wiki：初音ミク×鼓童スペシャルライブ（NHK 大厅）](https://w.atwiki.jp/hmiku/pages/67219.html)（2026-11-06） |
| 初音ミク×鼓童スペシャルライブ２０１８（2948） | 鼓童 | 2018-06-02 | 3 × 26 | external | medium | [初音ミク Wiki：初音ミク×鼓童スペシャルライブ２０１８（NHK 大厅）](https://w.atwiki.jp/hmiku/pages/67230.html)（2026-11-06） |
| 初音ミク×鼓童スペシャルライブ２０２３ ～結～（5910） | 鼓童 | 2023-06-03 | 3 × 24 | external | medium | [初音ミク Wiki：初音ミク×鼓童スペシャルライブ２０２３ ～結～（NHK 大厅）](https://w.atwiki.jp/hmiku/pages/67232.html)（2026-11-06） |
| 初音ミクシンフォニー 2016 東京都（2957） | 交响乐 | 2016-08-26 | 1 × 29 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2016 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80167.html)（2026-11-06） |
| 初音ミクシンフォニー 2017 大阪市（2958） | 交响乐 | 2017-11-17 | 1 × 28 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2017 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80237.html)（2026-11-06） |
| 初音ミクシンフォニー 2017 東京都（2959） | 交响乐 | 2017-11-29 | 1 × 29 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2017 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80237.html)（2026-11-06） |
| 初音ミクシンフォニー 2018-2019 東京都（2504） | 交响乐 | 2018-11-24 | 1 × 25 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2018-2019 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80287.html)（2026-11-06） |
| 初音ミクシンフォニー 2018-2019 大阪市（2960） | 交响乐 | 2019-01-25 | 1 × 26 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2018-2019 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80287.html)（2026-11-06） |
| 初音ミクシンフォニー 2019 横浜市（2870） | 交响乐 | 2019-10-14 | 1 × 28 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2019 横浜市（横浜公演）](https://w.atwiki.jp/hmiku/pages/80354.html)（2026-11-06） |
| 初音ミクシンフォニー 2019 大阪市（2871） | 交响乐 | 2019-12-23 | 1 × 28 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2019 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80354.html)（2026-11-06） |
| 初音ミクシンフォニー 2020 〜5th Anniversary〜 東京都（2954） | 交响乐 | 2020-09-21 | 1 × 23 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2020 〜5th Anniversary〜 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80404.html)（2026-11-06） |
| 初音ミクシンフォニー 2020 〜5th Anniversary〜 横浜市（2955） | 交响乐 | 2020-10-17 | 1 × 19 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2020 〜5th Anniversary〜 横浜市（横浜公演）](https://w.atwiki.jp/hmiku/pages/80404.html)（2026-11-06） |
| 初音ミクシンフォニー 2020 〜5th Anniversary〜 大阪市（2956） | 交响乐 | 2020-11-17 | 1 × 18 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2020 〜5th Anniversary〜 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80404.html)（2026-11-06） |
| 初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 横浜市（3710） | 交响乐 | 2021-09-20 | 1 × 20 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 横浜市（横浜公演）](https://w.atwiki.jp/hmiku/pages/80422.html)（2026-11-06） |
| 初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 神戸市（3869） | 交响乐 | 2021-11-20 | 1 × 20 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 神戸市（神戸公演）](https://w.atwiki.jp/hmiku/pages/80422.html)（2026-11-06） |
| 初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 東京（4322） | 交响乐 | 2022-07-02 | 1 × 25 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80506.html)（2026-11-06） |
| 初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 横浜（4808） | 交响乐 | 2022-09-25 | 1 × 22 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80506.html)（2026-11-06） |
| 初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 大阪（4814） | 交响乐 | 2022-11-23 | 1 × 23 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 大阪（大阪公演）](https://w.atwiki.jp/hmiku/pages/80506.html)（2026-11-06） |
| 初音ミクシンフォニー 2023 東京（4877） | 交响乐 | 2023-08-29 | 1 × 22 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2023 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80537.html)（2026-11-06） |
| 初音ミクシンフォニー 2023 横浜（4878） | 交响乐 | 2023-10-14 | 1 × 25 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2023 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80537.html)（2026-11-06） |
| 初音ミクシンフォニー 2023 神戸（4879） | 交响乐 | 2023-12-13 | 1 × 26 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2023 神戸（神戸公演）](https://w.atwiki.jp/hmiku/pages/80537.html)（2026-11-06） |
| 初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 東京（12709） | 交响乐 | 2024-04-27 | 1 × 21 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80641.html)（2026-11-06） |
| 初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 横浜（8033） | 交响乐 | 2024-10-05 | 1 × 22 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80641.html)（2026-11-06） |
| 初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 神戸（8035） | 交响乐 | 2024-12-29 | 1 × 22 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 神戸（神戸公演）](https://w.atwiki.jp/hmiku/pages/80641.html)（2026-11-06） |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 札幌（8037） | 交响乐 | 2025-02-11 | 1 × 27 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 札幌（札幌公演）](https://w.atwiki.jp/hmiku/pages/80551.html)（2026-11-06） |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 大阪（8710） | 交响乐 | 2025-04-12 | 1 × 16 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 大阪（大阪公演）](https://w.atwiki.jp/hmiku/pages/80551.html)（2026-11-06） |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 東京（8711） | 交响乐 | 2025-07-06 | 1 × 17 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80551.html)（2026-11-06） |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 横浜（9267） | 交响乐 | 2025-10-04 | 1 × 30 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80551.html)（2026-11-06） |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 神戸（9276） | 交响乐 | 2025-12-27 | 1 × 30 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 神戸（神戸公演）](https://w.atwiki.jp/hmiku/pages/80551.html)（2026-11-06） |
| 初音ミクシンフォニー 2026 札幌（12713） | 交响乐 | 2026-06-20 | 1 × 19 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2026 札幌（札幌公演）](https://w.atwiki.jp/hmiku/pages/80458.html)（2026-11-06） |
| 初音ミクシンフォニー 2026 東京（12714） | 交响乐 | 2026-07-05 | 1 × 19 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2026 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80458.html)（2026-11-06） |
| 初音ミクシンフォニー 2026-2027 〜Melodies on the Keys〜 横浜（12739） | 交响乐 | 2026-10-10 | 1 × 16 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2026-2027 〜Melodies on the Keys〜 横浜（横浜）](https://w.atwiki.jp/hmiku/pages/80296.html)（2026-11-06） |
| デコミク LIVE starring 初音ミク『Hello』（9401） | 900000000 | 2026-02-14 | 2 × 27 | external | medium | [初音ミク Wiki：デコミク LIVE starring 初音ミク『Hello』（代代木）](https://w.atwiki.jp/hmiku/pages/72956.html)（2026-11-06） |
| ミクFES '09（夏）（3000000002） | 900000001 | 2009-08-31 | 1 × 28 | external | high | [初音ミク公式ブログ：ミクFES '09（夏）アフターリポート<br>初音ミク Wiki：ミクFES '09（夏）（东京）](https://blog.piapro.net/2009/09/fes09.html)（2026-11-06） |
| MIKU FES '24（春）（3000000003） | 900000001 | 2024-03-31 | 1 × 23 | external | high | [MIKU FES '24（春）公式サイト<br>初音ミク Wiki：MIKU FES '24（春）（东京）](https://mikufes24spring.jp/)（2026-11-06） |
| 夏の終わりの39祭り（3000000004） | 900000002 | 2012-08-29 | 1 × 4 | external | medium | [電撃オンライン：夏の終わりの39祭り レポート<br>初音ミク Wiki：夏の終わりの39祭り（横滨）](https://dengekionline.com/elem/000/000/528/528109/index-2.html)（2026-11-06） |
| 「夏祭初音鑑」大阪公演（3000000005） | 900000003 | 2013-08-03 | 10 × 11 | external | high | [夏祭初音鑑 公式特設ページ<br>初音ミク公式ブログ：夏祭初音鑑 大阪公演 開催決定<br>Sanka Blog：「夏祭初音鑑」大阪公演（大阪）](http://kc-i.jp/hatsuap/)（2026-11-06） |
| 「夏祭初音鑑」東京公演（3000000010） | 900000003 | 2013-08-21 | 18 × 20 | external | high | [夏祭初音鑑 公式特設ページ<br>初音ミクみく：「夏祭初音鑑」東京公演（东京）<br>ASCII.jp：夏祭初音鑑 東京公演<br>電撃オンライン：夏祭初音鑑 東京公演 スケジュール<br>KADOKAWA：夏祭初音鑑 東京公演 開催告知](http://kc-i.jp/hatsuap/)（2026-11-06） |
| 初音ミク GALAXY LIVE 2020（3000000006） | 900000004 | 2020-09-26 | 2 × 8 | external | high | [初音ミク GALAXY LIVE 公式サイト<br>初音ミク Wiki：初音ミク GALAXY LIVE 2020（线上）](https://galaxy-live.net/)（2026-11-06） |
| 初音ミク GALAXY LIVE 2021（3000000007） | 900000004 | 2021-12-18 | 2 × 12 | external | high | [初音ミク GALAXY LIVE 公式サイト<br>初音ミク Wiki：初音ミク GALAXY LIVE 2021（线上）](https://galaxy-live.net/)（2026-11-06） |
| 初音ミク LAWSON 50th Anniversary Special LIVE（3000000008） | 900000005 | 2026-01-17 | 3 × 24 | external | high | [ローソン 50th Anniversary Special LIVE 特設サイト<br>初音ミク Wiki：初音ミク LAWSON 50th Anniversary Special LIVE（横滨）](https://l-tike.com/lawson50thmiku/)（2026-11-06） |
| ポケモン feat. 初音ミク VOLTAGE Live！（3000000009） | 900000006 | 2026-03-20 | 6 × 27 | external | high | [ポケモン feat. 初音ミク VOLTAGE Live！ 公式サイト<br>VOLTAGE Live！官方：ポケモン feat. 初音ミク VOLTAGE Live！（千叶）](https://www.project-voltage.jp/live2026/)（2026-11-06） |

共 191 个演出、205 条来源记录。

---

## 2. 百科与官网都没写逐日时刻（2 个演出）

这些演出跨多天，但我查过的来源都只给日期区间：既没写每天几场，也没写开演时间。
当前按「每个日历天 = 一个场次」计算。**如果你知道其中哪一站有昼夜两场，告诉我站名即可**。

### 900000004

**2.1 · 初音ミク GALAXY LIVE 2020**（演出 3000000006，2020-09-26 – 2020-09-27，当前 2 场 × 8 首）

- 已查：初音ミク GALAXY LIVE 公式サイト / 初音ミク Wiki：初音ミク GALAXY LIVE 2020（线上），只写日期区间或未写每日场次数，没有逐日时刻
  - https://galaxy-live.net/

- [ ] 每天只有一场，保持现状即可
- [ ] 有昼夜两场（写在补充说明：站名 + 来源）

> 补充：

**2.2 · 初音ミク GALAXY LIVE 2021**（演出 3000000007，2021-12-18 – 2021-12-19，当前 2 场 × 12 首）

- 已查：初音ミク GALAXY LIVE 公式サイト / 初音ミク Wiki：初音ミク GALAXY LIVE 2021（线上），只写日期区间或未写每日场次数，没有逐日时刻
  - https://galaxy-live.net/

- [ ] 每天只有一场，保持现状即可
- [ ] 有昼夜两场（写在补充说明：站名 + 来源）

> 补充：

---

## 3. 本轮按百科修正的冲突（请核对）

你已裁决的两条日期冲突、我按官网与萌娘百科补齐的整段场次表、以及按百科改掉的逐行备注问题，都列在这里。
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
| [1000040398](https://vocadb.net/L/1000040398) | — | 已解释长度差 2 处（百科逐曲表：横浜 25 行；神戸多一首神戸限定的ダブルアンコール） | https://w.atwiki.jp/hmiku/pages/80537.html |

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

## 4b. 曲目逐条来自百科逐曲表的演出（179 个）

这些演出改用「初音ミク Wiki」的逐曲表：VocaDB 的 songList 要么是几个城市共用的整份表、
要么根本没有（交响乐全部是专辑 tracklist）。逐曲表按公演替 / 昼夜 / 场次把差别分开，
每行都带来源与メドレー 段落标注，可以逐条核对。

| 演出 | 系列 | 场次 × 曲目 | 说明 | 来源 |
| --- | --- | --- | --- | --- |
| 初音ミク「マジカルミライ 2013」in YOKOHAMA（2519） | 魔法未来 | 2 × 45 | 歌单来自初音ミク Wiki 的逐曲表（横浜），按场次分 2 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2013」in YOKOHAMA（横浜）](https://w.atwiki.jp/hmiku/pages/67111.html) |
| 初音ミク「マジカルミライ 2014」in OSAKA（2517） | 魔法未来 | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（大阪），25 行 | [初音ミク Wiki：初音ミク「マジカルミライ 2014」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67113.html) |
| 初音ミク「マジカルミライ 2014」in TOKYO（2518） | 魔法未来 | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（东京），25 行 | [初音ミク Wiki：初音ミク「マジカルミライ 2014」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67113.html) |
| 初音ミク「マジカルミライ 2018」in OSAKA（1561） | 魔法未来 | 4 × 104 | 歌单来自初音ミク Wiki 的逐曲表（大阪），26 行 | [初音ミク Wiki：初音ミク「マジカルミライ 2018」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67122.html) |
| 初音ミク「マジカルミライ 2018」in TOKYO（1745） | 魔法未来 | 4 × 104 | 歌单来自初音ミク Wiki 的逐曲表（东京），26 行 | [初音ミク Wiki：初音ミク「マジカルミライ 2018」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67122.html) |
| 初音ミク「マジカルミライ 2021」in OSAKA（3305） | 魔法未来 | 5 × 125 | 歌单来自初音ミク Wiki 的逐曲表（大阪），按场次分 5 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2021」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67125.html) |
| 初音ミク「マジカルミライ 2021」in TOKYO（3306） | 魔法未来 | 6 × 150 | 歌单来自初音ミク Wiki 的逐曲表（东京），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2021」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67125.html) |
| 初音ミク「マジカルミライ」10th Anniversary in OSAKA（4233） | 魔法未来 | 5 × 125 | 歌单来自初音ミク Wiki 的逐曲表（大阪），按场次分 5 份 | [初音ミク Wiki：初音ミク「マジカルミライ」10th Anniversary in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/66656.html) |
| 初音ミク「マジカルミライ」10th Anniversary in TOKYO（4234） | 魔法未来 | 6 × 150 | 歌单来自初音ミク Wiki 的逐曲表（东京），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ」10th Anniversary in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/66656.html) |
| 初音ミク「マジカルミライ 2023」in OSAKA（6045） | 魔法未来 | 6 × 144 | 歌单来自初音ミク Wiki 的逐曲表（大阪），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2023」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67126.html) |
| 初音ミク「マジカルミライ 2023」in TOKYO（6046） | 魔法未来 | 6 × 144 | 歌单来自初音ミク Wiki 的逐曲表（东京），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2023」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67126.html) |
| 初音ミク「マジカルミライ 2024」in FUKUOKA（7214） | 魔法未来 | 4 × 96 | 歌单来自初音ミク Wiki 的逐曲表（福冈），按场次分 4 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2024」in FUKUOKA（福冈）](https://w.atwiki.jp/hmiku/pages/66797.html) |
| 初音ミク「マジカルミライ 2024」in TOKYO（7215） | 魔法未来 | 6 × 144 | 歌单来自初音ミク Wiki 的逐曲表（东京），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2024」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/66797.html) |
| 初音ミク「マジカルミライ 2024」in OSAKA（7217） | 魔法未来 | 6 × 144 | 歌单来自初音ミク Wiki 的逐曲表（大阪），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2024」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/66797.html) |
| 初音ミク「マジカルミライ 2025」in SENDAI（8768） | 魔法未来 | 5 × 125 | 歌单来自初音ミク Wiki 的逐曲表（仙台），按场次分 5 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2025」in SENDAI（仙台）](https://w.atwiki.jp/hmiku/pages/67127.html) |
| 初音ミク「マジカルミライ 2025」in OSAKA（8769） | 魔法未来 | 6 × 150 | 歌单来自初音ミク Wiki 的逐曲表（大阪），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2025」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67127.html) |
| 初音ミク「マジカルミライ 2025」in TOKYO（8770） | 魔法未来 | 6 × 150 | 歌单来自初音ミク Wiki 的逐曲表（东京），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2025」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67127.html) |
| 初音ミク「マジカルミライ 2026」in HAMAMATSU（12249） | 魔法未来 | 6 × 156 | 歌单来自初音ミク Wiki 的逐曲表（浜松），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2026」in HAMAMATSU（浜松）](https://w.atwiki.jp/hmiku/pages/71541.html) |
| 初音ミク「マジカルミライ 2026」in OSAKA（12250） | 魔法未来 | 6 × 156 | 歌单来自初音ミク Wiki 的逐曲表（大阪），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2026」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/71541.html) |
| 初音ミク「マジカルミライ 2026」in TOKYO（12251） | 魔法未来 | 6 × 156 | 歌单来自初音ミク Wiki 的逐曲表（东京），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2026」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/71541.html) |
| MIKU EXPO 2014 Jakarta（1939） | MIKU EXPO | 3 × 81 | 歌单来自初音ミク Wiki 的逐曲表（雅加达），27 行 | [初音ミク Wiki：MIKU EXPO 2014 Jakarta（雅加达）](https://w.atwiki.jp/hmiku/pages/67130.html) |
| MIKU EXPO 2014 Los Angeles（1937） | MIKU EXPO | 2 × 54 | 歌单来自初音ミク Wiki 的逐曲表（洛杉矶 / 纽约），27 行 | [初音ミク Wiki：MIKU EXPO 2014 Los Angeles（洛杉矶 / 纽约）](https://w.atwiki.jp/hmiku/pages/67131.html) |
| MIKU EXPO 2014 New York（1938） | MIKU EXPO | 2 × 54 | 歌单来自初音ミク Wiki 的逐曲表（洛杉矶 / 纽约），27 行 | [初音ミク Wiki：MIKU EXPO 2014 New York（洛杉矶 / 纽约）](https://w.atwiki.jp/hmiku/pages/67131.html) |
| MIKU EXPO 2016 Fukuoka（1399） | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（福冈），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Fukuoka（福冈）](https://w.atwiki.jp/hmiku/pages/67048.html) |
| MIKU EXPO 2016 Osaka（1400） | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（大阪），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Osaka（大阪）](https://w.atwiki.jp/hmiku/pages/67048.html) |
| MIKU EXPO 2016 Nagoya（1401） | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（名古屋），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Nagoya（名古屋）](https://w.atwiki.jp/hmiku/pages/67048.html) |
| MIKU EXPO 2016 Sapporo（1402） | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（札幌），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Sapporo（札幌）](https://w.atwiki.jp/hmiku/pages/67048.html) |
| MIKU EXPO 2016 Tokyo（1403） | MIKU EXPO | 4 × 104 | 歌单来自初音ミク Wiki 的逐曲表（东京），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Tokyo（东京）](https://w.atwiki.jp/hmiku/pages/67048.html) |
| MIKU EXPO 2016 Seattle（1859） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（西雅图），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Seattle（西雅图）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 San Francisco（1930） | MIKU EXPO | 2 × 54 | 歌单来自初音ミク Wiki 的逐曲表（旧金山），27 行 | [初音ミク Wiki：MIKU EXPO 2016 San Francisco（旧金山）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 Los Angeles（1931） | MIKU EXPO | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（洛杉矶），27 行 | [初音ミク Wiki：MIKU EXPO 2016 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 Dallas（1932） | MIKU EXPO | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（达拉斯），27 行 | [初音ミク Wiki：MIKU EXPO 2016 Dallas（达拉斯）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 Houston（1933） | MIKU EXPO | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（休斯敦），27 行 | [初音ミク Wiki：MIKU EXPO 2016 Houston（休斯敦）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 Toronto（1934） | MIKU EXPO | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（多伦多），27 行 | [初音ミク Wiki：MIKU EXPO 2016 Toronto（多伦多）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 Chicago（1935） | MIKU EXPO | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（芝加哥），27 行 | [初音ミク Wiki：MIKU EXPO 2016 Chicago（芝加哥）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 New York（1936） | MIKU EXPO | 2 × 54 | 歌单来自初音ミク Wiki 的逐曲表（纽约），27 行 | [初音ミク Wiki：MIKU EXPO 2016 New York（纽约）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 Monterrey（1860） | MIKU EXPO | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（蒙特雷），27 行 | [初音ミク Wiki：MIKU EXPO 2016 Monterrey（蒙特雷）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 Mexico City（1924） | MIKU EXPO | 3 × 81 | 歌单来自初音ミク Wiki 的逐曲表（墨西哥城），27 行 | [初音ミク Wiki：MIKU EXPO 2016 Mexico City（墨西哥城）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 New Taipei City（1941） | MIKU EXPO | 3 × 78 | 歌单来自初音ミク Wiki 的逐曲表（台北），按场次分 3 份 | [初音ミク Wiki：MIKU EXPO 2016 New Taipei City（台北）](https://w.atwiki.jp/hmiku/pages/67135.html) |
| MIKU EXPO 2016 Shanghai（1943） | MIKU EXPO | 4 × 104 | 歌单来自初音ミク Wiki 的逐曲表（上海），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67136.html) |
| MIKU EXPO 2016 Beijing（1942） | MIKU EXPO | 4 × 104 | 歌单来自初音ミク Wiki 的逐曲表（北京），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67136.html) |
| MIKU EXPO 2017 Kuala Lumpur（1584） | MIKU EXPO | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（吉隆坡），27 行 | [初音ミク Wiki：MIKU EXPO 2017 Kuala Lumpur（吉隆坡）](https://w.atwiki.jp/hmiku/pages/67137.html) |
| MIKU EXPO 2018 Los Angeles（1673） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（洛杉矶），26 行；百科对这 2 首只标了 ※、没写属于哪些城市，无法归位：「Miku」、「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2018 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/67060.html) |
| MIKU EXPO 2018 San Jose（1674） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（圣何塞），26 行；百科对这 2 首只标了 ※、没写属于哪些城市，无法归位：「Miku」、「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2018 San Jose（圣何塞）](https://w.atwiki.jp/hmiku/pages/67060.html) |
| MIKU EXPO 2018 Dallas（1675） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（达拉斯），26 行；百科对这 2 首只标了 ※、没写属于哪些城市，无法归位：「Miku」、「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2018 Dallas（达拉斯）](https://w.atwiki.jp/hmiku/pages/67060.html) |
| MIKU EXPO 2018 Austin（1676） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（奥斯汀），26 行；百科对这 2 首只标了 ※、没写属于哪些城市，无法归位：「Miku」、「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2018 Austin（奥斯汀）](https://w.atwiki.jp/hmiku/pages/67060.html) |
| MIKU EXPO 2018 Washington, D.C.（1677） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（华盛顿），26 行；百科对这 2 首只标了 ※、没写属于哪些城市，无法归位：「Miku」、「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2018 Washington, D.C.（华盛顿）](https://w.atwiki.jp/hmiku/pages/67060.html) |
| MIKU EXPO 2018 New York（1678） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（纽约），26 行；百科对这 2 首只标了 ※、没写属于哪些城市，无法归位：「Miku」、「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2018 New York（纽约）](https://w.atwiki.jp/hmiku/pages/67060.html) |
| MIKU EXPO 2018 Mexico City（1925） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（墨西哥城），26 行；百科对这 2 首只标了 ※、没写属于哪些城市，无法归位：「Miku」、「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2018 Mexico City（墨西哥城）](https://w.atwiki.jp/hmiku/pages/67060.html) |
| MIKU EXPO 2018 Paris（1854） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（巴黎），26 行 | [初音ミク Wiki：MIKU EXPO 2018 Paris（巴黎）](https://w.atwiki.jp/hmiku/pages/67138.html) |
| MIKU EXPO 2018 Cologne（1855） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（科隆），26 行 | [初音ミク Wiki：MIKU EXPO 2018 Cologne（科隆）](https://w.atwiki.jp/hmiku/pages/67138.html) |
| MIKU EXPO 2018 London（1856） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（伦敦），26 行 | [初音ミク Wiki：MIKU EXPO 2018 London（伦敦）](https://w.atwiki.jp/hmiku/pages/67138.html) |
| MIKU EXPO 2019 New Taipei City（2489） | MIKU EXPO | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（台北），25 行 | [初音ミク Wiki：MIKU EXPO 2019 New Taipei City（台北）](https://w.atwiki.jp/hmiku/pages/67139.html) |
| MIKU EXPO 2019 Hong Kong（2490） | MIKU EXPO | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（香港），25 行 | [初音ミク Wiki：MIKU EXPO 2019 Hong Kong（香港）](https://w.atwiki.jp/hmiku/pages/67139.html) |
| MIKU EXPO 2020 London（2786） | MIKU EXPO | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（伦敦），25 行 | [初音ミク Wiki：MIKU EXPO 2020 London（伦敦）](https://w.atwiki.jp/hmiku/pages/67140.html) |
| MIKU EXPO 2020 Paris（2787） | MIKU EXPO | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（巴黎），25 行 | [初音ミク Wiki：MIKU EXPO 2020 Paris（巴黎）](https://w.atwiki.jp/hmiku/pages/67140.html) |
| MIKU EXPO 2020 Berlin（2788） | MIKU EXPO | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（柏林），25 行 | [初音ミク Wiki：MIKU EXPO 2020 Berlin（柏林）](https://w.atwiki.jp/hmiku/pages/67140.html) |
| MIKU EXPO 2020 Amsterdam（2789） | MIKU EXPO | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（阿姆斯特丹），25 行 | [初音ミク Wiki：MIKU EXPO 2020 Amsterdam（阿姆斯特丹）](https://w.atwiki.jp/hmiku/pages/67140.html) |
| MIKU EXPO 2021 Online（3224） | MIKU EXPO | 1 × 16 | 歌单来自初音ミク Wiki 的逐曲表（线上），16 行 | [初音ミク Wiki：MIKU EXPO 2021 Online（线上）](https://w.atwiki.jp/hmiku/pages/67074.html) |
| MIKU EXPO 2022 Rewind（4114） | MIKU EXPO | 1 × 18 | 歌单来自初音ミク Wiki 的逐曲表（线上），18 行 | [初音ミク Wiki：MIKU EXPO 2022 Rewind（线上）](https://w.atwiki.jp/hmiku/pages/67141.html) |
| MIKU EXPO 2022 Rewind+（4490） | MIKU EXPO | 1 × 28 | 歌单来自初音ミク Wiki 的逐曲表（线上），28 行 | [初音ミク Wiki：MIKU EXPO 2022 Rewind+（线上）](https://w.atwiki.jp/hmiku/pages/67142.html) |
| MIKU EXPO 2023 VR（5751） | MIKU EXPO | 1 × 14 | 歌单来自初音ミク Wiki 的逐曲表（线上），14 行 | [初音ミク Wiki：MIKU EXPO 2023 VR（线上）](https://w.atwiki.jp/hmiku/pages/67143.html) |
| MIKU EXPO 2024 Vancouver（6516） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（温哥华），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Vancouver（温哥华）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Portland（6517） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（波特兰），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Portland（波特兰）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 San Jose（6518） | MIKU EXPO | 2 × 48 | 歌单来自初音ミク Wiki 的逐曲表（圣何塞），按场次分 2 份；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 San Jose（圣何塞）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Phoenix（6519） | MIKU EXPO | 2 × 48 | 歌单来自初音ミク Wiki 的逐曲表（凤凰城），按场次分 2 份；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Phoenix（凤凰城）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Los Angeles（7186） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（洛杉矶），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Denver（6520） | MIKU EXPO | 2 × 48 | 歌单来自初音ミク Wiki 的逐曲表（丹佛），按场次分 2 份；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Denver（丹佛）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Dallas（6521） | MIKU EXPO | 2 × 48 | 歌单来自初音ミク Wiki 的逐曲表（达拉斯），按场次分 2 份；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Dallas（达拉斯）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Austin（6522） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（奥斯汀），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Austin（奥斯汀）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Atlanta（6523） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（亚特兰大），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Atlanta（亚特兰大）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Orlando（6524） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（奥兰多），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Orlando（奥兰多）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Washington（6525） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（华盛顿），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Washington（华盛顿）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Newark（6526） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（纽瓦克），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Newark（纽瓦克）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Boston（6527） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（波士顿），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Boston（波士顿）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Detroit（6528） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（底特律），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Detroit（底特律）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Chicago（6529） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（芝加哥），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Chicago（芝加哥）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Toronto（6530） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（多伦多），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Toronto（多伦多）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Mexico City（6531） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（墨西哥城），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Mexico City（墨西哥城）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 London（7266） | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（伦敦），23 行 | [初音ミク Wiki：MIKU EXPO 2024 London（伦敦）](https://w.atwiki.jp/hmiku/pages/67145.html) |
| MIKU EXPO 2024 Brussels（7267） | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（布鲁塞尔），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Brussels（布鲁塞尔）](https://w.atwiki.jp/hmiku/pages/67145.html) |
| MIKU EXPO 2024 Paris（7268） | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（巴黎），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Paris（巴黎）](https://w.atwiki.jp/hmiku/pages/67145.html) |
| MIKU EXPO 2024 Amsterdam（7269） | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（阿姆斯特丹），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Amsterdam（阿姆斯特丹）](https://w.atwiki.jp/hmiku/pages/67145.html) |
| MIKU EXPO 2024 Düsseldorf（7270） | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（杜塞尔多夫），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Düsseldorf（杜塞尔多夫）](https://w.atwiki.jp/hmiku/pages/67145.html) |
| MIKU EXPO 2024 Berlin（7271） | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（柏林），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Berlin（柏林）](https://w.atwiki.jp/hmiku/pages/67145.html) |
| MIKU EXPO 2024 Auckland（7765） | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（奥克兰），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Auckland（奥克兰）](https://w.atwiki.jp/hmiku/pages/67146.html) |
| MIKU EXPO 2024 Brisbane（7766） | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（布里斯班），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Brisbane（布里斯班）](https://w.atwiki.jp/hmiku/pages/67146.html) |
| MIKU EXPO 2024 Sydney（7767） | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（悉尼），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Sydney（悉尼）](https://w.atwiki.jp/hmiku/pages/67146.html) |
| MIKU EXPO 2024 Melbourne（7768） | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（墨尔本），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Melbourne（墨尔本）](https://w.atwiki.jp/hmiku/pages/67146.html) |
| MIKU EXPO 2024 Perth（7769） | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（珀斯），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Perth（珀斯）](https://w.atwiki.jp/hmiku/pages/67146.html) |
| MIKU EXPO 2025 Bangkok（9341） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（曼谷），24 行 | [初音ミク Wiki：MIKU EXPO 2025 Bangkok（曼谷）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2025 Hong Kong（9348） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（香港），24 行 | [初音ミク Wiki：MIKU EXPO 2025 Hong Kong（香港）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2025 Jakarta（9349） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（雅加达），24 行 | [初音ミク Wiki：MIKU EXPO 2025 Jakarta（雅加达）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2025 Manila（9350） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（马尼拉），24 行 | [初音ミク Wiki：MIKU EXPO 2025 Manila（马尼拉）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2025 Singapore（9351） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（新加坡），24 行 | [初音ミク Wiki：MIKU EXPO 2025 Singapore（新加坡）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2025 Kuala Lumpur（9352） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（吉隆坡），24 行 | [初音ミク Wiki：MIKU EXPO 2025 Kuala Lumpur（吉隆坡）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2025 Taipei（9555） | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（台北），24 行 | [初音ミク Wiki：MIKU EXPO 2025 Taipei（台北）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2025 Seoul（9353） | MIKU EXPO | 2 × 48 | 歌单来自初音ミク Wiki 的逐曲表（首尔），按场次分 2 份 | [初音ミク Wiki：MIKU EXPO 2025 Seoul（首尔）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2026 Chicago（9811） | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（芝加哥），按场次分 2 份 | [初音ミク Wiki：MIKU EXPO 2026 Chicago（芝加哥）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Denver（9812） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（丹佛），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Denver（丹佛）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Vancouver（9813） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（温哥华），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Vancouver（温哥华）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Seattle（9814） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（西雅图），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Seattle（西雅图）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 San Jose（9815） | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（圣何塞），按场次分 2 份 | [初音ミク Wiki：MIKU EXPO 2026 San Jose（圣何塞）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Los Angeles（9816） | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（洛杉矶），按场次分 2 份 | [初音ミク Wiki：MIKU EXPO 2026 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Glendale（9817） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（格伦代尔），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Glendale（格伦代尔）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Grand Prairie（9818） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（大草原城），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Grand Prairie（大草原城）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Cedar Park（9819） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（锡达帕克），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Cedar Park（锡达帕克）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Duluth（9820） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（杜鲁斯），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Duluth（杜鲁斯）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Washington（9821） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（华盛顿），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Washington（华盛顿）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Newark（9822） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（纽瓦克），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Newark（纽瓦克）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Boston（9823） | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（波士顿），按场次分 2 份 | [初音ミク Wiki：MIKU EXPO 2026 Boston（波士顿）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Hamilton（9824） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（哈密尔顿），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Hamilton（哈密尔顿）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Mexico City（9825） | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（墨西哥城），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Mexico City（墨西哥城）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| HATSUNE MIKU with YOU 2017 CHINA FESTIVAL（1619） | 未来有你 | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（北京），按场次分 2 份 | [初音ミク Wiki：HATSUNE MIKU with YOU 2017 CHINA FESTIVAL（北京）](https://w.atwiki.jp/hmiku/pages/67160.html) |
| MIKU WITH YOU 2018 in Beijing（2085） | 未来有你 | 2 × 50 | 歌单来自初音ミク Wiki 的逐曲表（北京），25 行 | [初音ミク Wiki：MIKU WITH YOU 2018 in Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67175.html) |
| MIKU WITH YOU 2018 in Chengdu（2086） | 未来有你 | 2 × 50 | 歌单来自初音ミク Wiki 的逐曲表（成都），25 行 | [初音ミク Wiki：MIKU WITH YOU 2018 in Chengdu（成都）](https://w.atwiki.jp/hmiku/pages/67175.html) |
| MIKU WITH YOU 2018 in Shanghai（2087） | 未来有你 | 4 × 100 | 歌单来自初音ミク Wiki 的逐曲表（上海），25 行 | [初音ミク Wiki：MIKU WITH YOU 2018 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67175.html) |
| MIKU WITH YOU 2019 in Shanghai（3752） | 未来有你 | 4 × 100 | 歌单来自初音ミク Wiki 的逐曲表（上海），25 行 | [初音ミク Wiki：MIKU WITH YOU 2019 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67177.html) |
| MIKU WITH YOU 2019 in Chengdu（3753） | 未来有你 | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（成都），25 行 | [初音ミク Wiki：MIKU WITH YOU 2019 in Chengdu（成都）](https://w.atwiki.jp/hmiku/pages/67177.html) |
| MIKU WITH YOU 2019 in Beijing（3754） | 未来有你 | 2 × 50 | 歌单来自初音ミク Wiki 的逐曲表（北京），25 行 | [初音ミク Wiki：MIKU WITH YOU 2019 in Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67177.html) |
| MIKU WITH YOU 2019 in Guangzhou（3755） | 未来有你 | 3 × 75 | 歌单来自初音ミク Wiki 的逐曲表（广州），25 行 | [初音ミク Wiki：MIKU WITH YOU 2019 in Guangzhou（广州）](https://w.atwiki.jp/hmiku/pages/67177.html) |
| MIKU WITH YOU 2020（3250） | 未来有你 | 1 × 18 | 歌单来自初音ミク Wiki 的逐曲表（线上），18 行 | [初音ミク Wiki：MIKU WITH YOU 2020（线上）](https://w.atwiki.jp/hmiku/pages/67178.html) |
| MIKU WITH YOU 2021（4058） | 未来有你 | 1 × 17 | 歌单来自初音ミク Wiki 的逐曲表（线上），17 行 | [初音ミク Wiki：MIKU WITH YOU 2021（线上）](https://w.atwiki.jp/hmiku/pages/67180.html) |
| MIKU WITH YOU 2024 in Shanghai（7673） | 未来有你 | 4 × 92 | 歌单来自初音ミク Wiki 的逐曲表（上海），按场次分 4 份 | [初音ミク Wiki：MIKU WITH YOU 2024 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67183.html) |
| MIKU WITH YOU 2024 in Beijing（7675） | 未来有你 | 4 × 92 | 歌单来自初音ミク Wiki 的逐曲表（北京），按场次分 4 份 | [初音ミク Wiki：MIKU WITH YOU 2024 in Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67183.html) |
| MIKU WITH YOU 2024 in Guangzhou（7674） | 未来有你 | 4 × 92 | 歌单来自初音ミク Wiki 的逐曲表（广州），按场次分 4 份 | [初音ミク Wiki：MIKU WITH YOU 2024 in Guangzhou（广州）](https://w.atwiki.jp/hmiku/pages/67183.html) |
| MIKU WITH YOU 2025（9644） | 未来有你 | 4 × 92 | 歌单来自初音ミク Wiki 的逐曲表（上海），按场次分 4 份 | [初音ミク Wiki：MIKU WITH YOU 2025（上海）](https://w.atwiki.jp/hmiku/pages/68149.html) |
| MIKU WITH YOU 2026 in Shanghai（13120） | 未来有你 | 4 × 96 | 歌单来自初音ミク Wiki 的逐曲表（上海），按场次分 4 份 | [初音ミク Wiki：MIKU WITH YOU 2026 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/79886.html) |
| ミクの日感謝祭39's Giving Day（2520） | Live Party | 1 × 40 | 歌单来自初音ミク Wiki 的逐曲表（东京），40 行 | [初音ミク Wiki：ミクの日感謝祭39's Giving Day（东京）](https://w.atwiki.jp/hmiku/pages/67147.html) |
| 初音ミクライブパーティー 2011 Tokyo（2523） | Live Party | 1 × 39 | 歌单来自初音ミク Wiki 的逐曲表（东京），39 行 | [初音ミク Wiki：初音ミクライブパーティー 2011 Tokyo（东京）](https://w.atwiki.jp/hmiku/pages/67149.html) |
| 初音ミクライブパーティー 2011 Sapporo（2526） | Live Party | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（札幌），26 行 | [初音ミク Wiki：初音ミクライブパーティー 2011 Sapporo（札幌）](https://w.atwiki.jp/hmiku/pages/67150.html) |
| 初音ミクライブパーティー 2011 Singapore（2527） | Live Party | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（新加坡），27 行 | [初音ミク Wiki：初音ミクライブパーティー 2011 Singapore（新加坡）](https://w.atwiki.jp/hmiku/pages/67151.html) |
| 初音ミクライブパーティー 2012 Tokyo（4056） | Live Party | 1 × 33 | 歌单来自初音ミク Wiki 的逐曲表（东京），33 行 | [初音ミク Wiki：初音ミクライブパーティー 2012 Tokyo（东京）](https://w.atwiki.jp/hmiku/pages/67152.html) |
| 初音ミクライブパーティー 2012 Hong Kong（2524） | Live Party | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（香港），25 行 | [初音ミク Wiki：初音ミクライブパーティー 2012 Hong Kong（香港）](https://w.atwiki.jp/hmiku/pages/67153.html) |
| 初音ミクライブパーティー 2012 Taiwan（2525） | Live Party | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（台北），25 行 | [初音ミク Wiki：初音ミクライブパーティー 2012 Taiwan（台北）](https://w.atwiki.jp/hmiku/pages/67153.html) |
| 初音ミクライブパーティー 2013 Sapporo（2510） | Live Party | 4 × 104 | 歌单来自初音ミク Wiki 的逐曲表（札幌），26 行 | [初音ミク Wiki：初音ミクライブパーティー 2013 Sapporo（札幌）](https://w.atwiki.jp/hmiku/pages/67154.html) |
| 初音ミクライブパーティー 2013 Kansai（2511） | Live Party | 1 × 39 | 歌单来自初音ミク Wiki 的逐曲表（关西），39 行 | [初音ミク Wiki：初音ミクライブパーティー 2013 Kansai（关西）](https://w.atwiki.jp/hmiku/pages/66967.html) |
| 初音ミク×鼓童スペシャルライブ（2947） | 鼓童 | 2 × 44 | 歌单来自初音ミク Wiki 的逐曲表（NHK 大厅），22 行；其中 3 首不是 VOCALOID 歌曲（器乐曲、民谣・传统曲），按普通曲目登记、没有对应歌手 | [初音ミク Wiki：初音ミク×鼓童スペシャルライブ（NHK 大厅）](https://w.atwiki.jp/hmiku/pages/67219.html) |
| 初音ミク×鼓童スペシャルライブ２０１８（2948） | 鼓童 | 3 × 78 | 歌单来自初音ミク Wiki 的逐曲表（NHK 大厅），26 行；其中 5 首不是 VOCALOID 歌曲（器乐曲），按普通曲目登记、没有对应歌手 | [初音ミク Wiki：初音ミク×鼓童スペシャルライブ２０１８（NHK 大厅）](https://w.atwiki.jp/hmiku/pages/67230.html) |
| 初音ミク×鼓童スペシャルライブ２０２３ ～結～（5910） | 鼓童 | 3 × 72 | 歌单来自初音ミク Wiki 的逐曲表（NHK 大厅），按场次分 3 份；其中 5 首不是 VOCALOID 歌曲（器乐曲），按普通曲目登记、没有对应歌手 | [初音ミク Wiki：初音ミク×鼓童スペシャルライブ２０２３ ～結～（NHK 大厅）](https://w.atwiki.jp/hmiku/pages/67232.html) |
| 初音ミクシンフォニー 2016 東京都（2957） | 交响乐 | 1 × 29 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），29 行 | [初音ミク Wiki：初音ミクシンフォニー 2016 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80167.html) |
| 初音ミクシンフォニー 2017 大阪市（2958） | 交响乐 | 1 × 28 | 歌单来自初音ミク Wiki 的逐曲表（大阪公演），28 行 | [初音ミク Wiki：初音ミクシンフォニー 2017 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80237.html) |
| 初音ミクシンフォニー 2017 東京都（2959） | 交响乐 | 1 × 29 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），29 行 | [初音ミク Wiki：初音ミクシンフォニー 2017 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80237.html) |
| 初音ミクシンフォニー 2018-2019 東京都（2504） | 交响乐 | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），25 行 | [初音ミク Wiki：初音ミクシンフォニー 2018-2019 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80287.html) |
| 初音ミクシンフォニー 2018-2019 大阪市（2960） | 交响乐 | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（大阪公演），26 行 | [初音ミク Wiki：初音ミクシンフォニー 2018-2019 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80287.html) |
| 初音ミクシンフォニー 2019 横浜市（2870） | 交响乐 | 1 × 28 | 歌单来自初音ミク Wiki 的逐曲表（横浜公演），28 行 | [初音ミク Wiki：初音ミクシンフォニー 2019 横浜市（横浜公演）](https://w.atwiki.jp/hmiku/pages/80354.html) |
| 初音ミクシンフォニー 2019 大阪市（2871） | 交响乐 | 1 × 28 | 歌单来自初音ミク Wiki 的逐曲表（大阪公演），28 行；其中 3 首不是 VOCALOID 歌曲（古典・管弦乐曲、民谣・传统曲），按普通曲目登记、没有对应歌手 | [初音ミク Wiki：初音ミクシンフォニー 2019 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80354.html) |
| 初音ミクシンフォニー 2020 〜5th Anniversary〜 東京都（2954） | 交响乐 | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），23 行 | [初音ミク Wiki：初音ミクシンフォニー 2020 〜5th Anniversary〜 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80404.html) |
| 初音ミクシンフォニー 2020 〜5th Anniversary〜 横浜市（2955） | 交响乐 | 1 × 19 | 歌单来自初音ミク Wiki 的逐曲表（横浜公演），19 行 | [初音ミク Wiki：初音ミクシンフォニー 2020 〜5th Anniversary〜 横浜市（横浜公演）](https://w.atwiki.jp/hmiku/pages/80404.html) |
| 初音ミクシンフォニー 2020 〜5th Anniversary〜 大阪市（2956） | 交响乐 | 1 × 18 | 歌单来自初音ミク Wiki 的逐曲表（大阪公演），18 行 | [初音ミク Wiki：初音ミクシンフォニー 2020 〜5th Anniversary〜 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80404.html) |
| 初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 横浜市（3710） | 交响乐 | 1 × 20 | 歌单来自初音ミク Wiki 的逐曲表（横浜公演），20 行 | [初音ミク Wiki：初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 横浜市（横浜公演）](https://w.atwiki.jp/hmiku/pages/80422.html) |
| 初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 神戸市（3869） | 交响乐 | 1 × 20 | 歌单来自初音ミク Wiki 的逐曲表（神戸公演），20 行 | [初音ミク Wiki：初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 神戸市（神戸公演）](https://w.atwiki.jp/hmiku/pages/80422.html) |
| 初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 東京（4322） | 交响乐 | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），25 行 | [初音ミク Wiki：初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80506.html) |
| 初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 横浜（4808） | 交响乐 | 1 × 22 | 歌单来自初音ミク Wiki 的逐曲表（横浜公演），22 行 | [初音ミク Wiki：初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80506.html) |
| 初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 大阪（4814） | 交响乐 | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（大阪公演），23 行 | [初音ミク Wiki：初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 大阪（大阪公演）](https://w.atwiki.jp/hmiku/pages/80506.html) |
| 初音ミクシンフォニー 2023 東京（4877） | 交响乐 | 1 × 22 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），22 行 | [初音ミク Wiki：初音ミクシンフォニー 2023 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80537.html) |
| 初音ミクシンフォニー 2023 横浜（4878） | 交响乐 | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（横浜公演），25 行 | [初音ミク Wiki：初音ミクシンフォニー 2023 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80537.html) |
| 初音ミクシンフォニー 2023 神戸（4879） | 交响乐 | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（神戸公演），26 行 | [初音ミク Wiki：初音ミクシンフォニー 2023 神戸（神戸公演）](https://w.atwiki.jp/hmiku/pages/80537.html) |
| 初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 東京（12709） | 交响乐 | 1 × 21 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），21 行 | [初音ミク Wiki：初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80641.html) |
| 初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 横浜（8033） | 交响乐 | 1 × 22 | 歌单来自初音ミク Wiki 的逐曲表（横浜公演），22 行 | [初音ミク Wiki：初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80641.html) |
| 初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 神戸（8035） | 交响乐 | 1 × 22 | 歌单来自初音ミク Wiki 的逐曲表（神戸公演），22 行 | [初音ミク Wiki：初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 神戸（神戸公演）](https://w.atwiki.jp/hmiku/pages/80641.html) |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 札幌（8037） | 交响乐 | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（札幌公演），27 行 | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 札幌（札幌公演）](https://w.atwiki.jp/hmiku/pages/80551.html) |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 大阪（8710） | 交响乐 | 1 × 16 | 歌单来自初音ミク Wiki 的逐曲表（大阪公演），16 行 | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 大阪（大阪公演）](https://w.atwiki.jp/hmiku/pages/80551.html) |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 東京（8711） | 交响乐 | 1 × 17 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），17 行 | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80551.html) |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 横浜（9267） | 交响乐 | 1 × 30 | 歌单来自初音ミク Wiki 的逐曲表（横浜公演），30 行；另有 1 首未登记（同曲再演或检索未命中），未计入：「ぽっぴっぽー（Grand Finale）」 | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80551.html) |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 神戸（9276） | 交响乐 | 1 × 30 | 歌单来自初音ミク Wiki 的逐曲表（神戸公演），30 行；其中 1 首不是 VOCALOID 歌曲（古典・管弦乐曲），按普通曲目登记、没有对应歌手；另有 1 首未登记（同曲再演或检索未命中），未计入：「ぽっぴっぽー（Grand Finale）」 | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 神戸（神戸公演）](https://w.atwiki.jp/hmiku/pages/80551.html) |
| 初音ミクシンフォニー 2026 札幌（12713） | 交响乐 | 1 × 19 | 歌单来自初音ミク Wiki 的逐曲表（札幌公演），19 行；其中 1 首不是 VOCALOID 歌曲（古典・管弦乐曲），按普通曲目登记、没有对应歌手 | [初音ミク Wiki：初音ミクシンフォニー 2026 札幌（札幌公演）](https://w.atwiki.jp/hmiku/pages/80458.html) |
| 初音ミクシンフォニー 2026 東京（12714） | 交响乐 | 1 × 19 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），19 行；其中 1 首不是 VOCALOID 歌曲（古典・管弦乐曲），按普通曲目登记、没有对应歌手 | [初音ミク Wiki：初音ミクシンフォニー 2026 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80458.html) |
| 初音ミクシンフォニー 2026-2027 〜Melodies on the Keys〜 横浜（12739） | 交响乐 | 1 × 16 | 歌单来自初音ミク Wiki 的逐曲表（横浜），16 行；其中 1 首不是 VOCALOID 歌曲（古典・管弦乐曲），按普通曲目登记、没有对应歌手 | [初音ミク Wiki：初音ミクシンフォニー 2026-2027 〜Melodies on the Keys〜 横浜（横浜）](https://w.atwiki.jp/hmiku/pages/80296.html) |
| デコミク LIVE starring 初音ミク『Hello』（9401） | 900000000 | 2 × 54 | 歌单来自初音ミク Wiki 的逐曲表（代代木），按场次分 2 份；日程来源：2026-02-14 国立代々木競技場第一体育館 昼・夜 2 场，每场 27 首；VocaDB 歌单 24530 只录了前 10 行，但同样把《ストリーミングハート》标成 Daytime、《キメラ》标成 Nighttime，昼夜结构一致 | [初音ミク Wiki：デコミク LIVE starring 初音ミク『Hello』（代代木）](https://w.atwiki.jp/hmiku/pages/72956.html) |
| ミクFES '09（夏）（3000000002） | 900000001 | 1 × 28 | 歌单来自初音ミク Wiki 的逐曲表（东京），28 行；日程来源：2009-08-31 新木場STUDIO COAST 单场，28 首，约 2 小时 30 分 | [初音ミク公式ブログ：ミクFES '09（夏）アフターリポート,初音ミク Wiki：ミクFES '09（夏）（东京）](https://blog.piapro.net/2009/09/fes09.html) |
| MIKU FES '24（春）（3000000003） | 900000001 | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（东京），23 行；日程来源：2024-03-31 日本武道館 单场，23 首，另有 4 段 DJ 表演 | [MIKU FES '24（春）公式サイト,初音ミク Wiki：MIKU FES '24（春）（东京）](https://mikufes24spring.jp/) |
| 夏の終わりの39祭り（3000000004） | 900000002 | 1 × 4 | 歌单来自初音ミク Wiki 的逐曲表（横滨），4 行；日程来源：2012-08-29 19:00 横滨赤レンガ倉庫水幕舞台，单场 4 首 | [電撃オンライン：夏の終わりの39祭り レポート,初音ミク Wiki：夏の終わりの39祭り（横滨）](https://dengekionline.com/elem/000/000/528/528109/index-2.html) |
| 「夏祭初音鑑」大阪公演（3000000005） | 900000003 | 10 × 110 | 歌单来自Sanka Blog 的逐曲表（大阪），11 行；日程来源：2013-08-03–07 大阪先行公演，5 天共 27 场（每天场次不完全相同）；大阪版更接近先行版本，与东京正式公演曲目差异较大；本目录只有日场/夜场两层，27 场在站内折算为 10 个场次；报道只留下这一套 11 首，可能有日替曲目，暂未找到完整可信资料 | [夏祭初音鑑 公式特設ページ,初音ミク公式ブログ：夏祭初音鑑 大阪公演 開催決定,Sanka Blog：「夏祭初音鑑」大阪公演（大阪）](http://kc-i.jp/hatsuap/) |
| 「夏祭初音鑑」東京公演（3000000010） | 900000003 | 18 × 360 | 歌单来自初音ミクみく 的逐曲表（东京），20 行；日程来源：2013-08-21–29 东京正式公演，工作日 4 场、周末 5 场，9 天共 38 场，每场约 90 分钟；本目录只有日场/夜场两层，38 场在站内折算为 18 个场次；20 首来自东京会场的演出报告，可能有日替曲目，暂未找到逐日完整资料 | [夏祭初音鑑 公式特設ページ,初音ミクみく：「夏祭初音鑑」東京公演（东京）,ASCII.jp：夏祭初音鑑 東京公演,電撃オンライン：夏祭初音鑑 東京公演 スケジュール,KADOKAWA：夏祭初音鑑 東京公演 開催告知](http://kc-i.jp/hatsuap/) |
| 初音ミク GALAXY LIVE 2020（3000000006） | 900000004 | 2 × 16 | 歌单来自初音ミク Wiki 的逐曲表（线上），8 行；日程来源：2020-09-26–27 在线演唱会，两天同一套 8 首 | [初音ミク GALAXY LIVE 公式サイト,初音ミク Wiki：初音ミク GALAXY LIVE 2020（线上）](https://galaxy-live.net/) |
| 初音ミク GALAXY LIVE 2021（3000000007） | 900000004 | 2 × 24 | 歌单来自初音ミク Wiki 的逐曲表（线上），12 行；日程来源：2021-12-18–19 在线演唱会，两天同一套 12 首 | [初音ミク GALAXY LIVE 公式サイト,初音ミク Wiki：初音ミク GALAXY LIVE 2021（线上）](https://galaxy-live.net/) |
| 初音ミク LAWSON 50th Anniversary Special LIVE（3000000008） | 900000005 | 3 × 72 | 歌单来自初音ミク Wiki 的逐曲表（横滨），按场次分 3 份；日程来源：2026-01-17 昼+夜、01-18 仅昼，共 3 场；每场 24 首，第 8 首按场次替换 | [ローソン 50th Anniversary Special LIVE 特設サイト,初音ミク Wiki：初音ミク LAWSON 50th Anniversary Special LIVE（横滨）](https://l-tike.com/lawson50thmiku/) |
| ポケモン feat. 初音ミク VOLTAGE Live！（3000000009） | 900000006 | 6 × 162 | 歌单来自VOLTAGE Live！官方的逐曲表（千叶），27 行；日程来源：2026-03-20–22 每天昼 12:00 + 夜 18:00，共 6 场；每场 27 首 | [ポケモン feat. 初音ミク VOLTAGE Live！ 公式サイト,VOLTAGE Live！官方：ポケモン feat. 初音ミク VOLTAGE Live！（千叶）](https://www.project-voltage.jp/live2026/) |

---

---

## 6. 仍无歌单的演出（27 个）

上游没有 songList、百科也还没有逐曲表的演出。取消的场次单独记在 `performance_status`，
演出页会显示「这场演出已取消」并给出公告链接；尚未举行的先留空。

| 演出 | 系列 | 日期 | 状态 | VocaDB | 来源 |
| --- | --- | --- | --- | --- | --- |
| [2853](https://vocadb.net/E/2853) MIKU EXPO 2020 Vancouver | MIKU EXPO | 无 | **已取消** | Finished | [公告](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2854](https://vocadb.net/E/2854) MIKU EXPO 2020 San Jose | MIKU EXPO | 无 | **已取消** | Finished | [公告](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2855](https://vocadb.net/E/2855) MIKU EXPO 2020 Dallas | MIKU EXPO | 无 | **已取消** | Finished | [公告](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2856](https://vocadb.net/E/2856) MIKU EXPO 2020 Atlanta | MIKU EXPO | 无 | **已取消** | Finished | [公告](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2857](https://vocadb.net/E/2857) MIKU EXPO 2020 Washington D.C. | MIKU EXPO | 无 | **已取消** | Finished | [公告](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2858](https://vocadb.net/E/2858) MIKU EXPO 2020 Asbury Park (New Jersey) | MIKU EXPO | 无 | **已取消** | Finished | [公告](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2859](https://vocadb.net/E/2859) MIKU EXPO 2020 Boston | MIKU EXPO | 无 | **已取消** | Finished | [公告](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2860](https://vocadb.net/E/2860) MIKU EXPO 2020 Chicago | MIKU EXPO | 无 | **已取消** | Finished | [公告](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2861](https://vocadb.net/E/2861) MIKU EXPO 2020 Toronto | MIKU EXPO | 无 | **已取消** | Finished | [公告](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2878](https://vocadb.net/E/2878) MIKU EXPO 2020 Los Angeles | MIKU EXPO | 无 | **已取消** | Finished | [公告](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2879](https://vocadb.net/E/2879) MIKU EXPO 2020 Orlando | MIKU EXPO | 无 | **已取消** | Finished | [公告](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2880](https://vocadb.net/E/2880) MIKU EXPO 2020 Montreal | MIKU EXPO | 无 | **已取消** | Finished | [公告](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2790](https://vocadb.net/E/2790) MIKU EXPO 2020 Barcelona | MIKU EXPO | 2020-01-28 | 未标注 | Finished | — |
| [12222](https://vocadb.net/E/12222) MIKU EXPO 2026 London | MIKU EXPO | 2026-11-12 | 未标注 | Draft | — |
| [12223](https://vocadb.net/E/12223) MIKU EXPO 2026 Brussels | MIKU EXPO | 2026-11-14 | 未标注 | Draft | — |
| [12224](https://vocadb.net/E/12224) MIKU EXPO 2026 Amsterdam | MIKU EXPO | 2026-11-15 | 未标注 | Draft | — |
| [12225](https://vocadb.net/E/12225) MIKU EXPO 2026 Berlin | MIKU EXPO | 2026-11-17 | 未标注 | Draft | — |
| [12226](https://vocadb.net/E/12226) MIKU EXPO 2026 Düsseldorf | MIKU EXPO | 2026-11-20 | 未标注 | Draft | — |
| [12227](https://vocadb.net/E/12227) MIKU EXPO 2026 Paris | MIKU EXPO | 2026-11-22 | 未标注 | Draft | — |
| [12228](https://vocadb.net/E/12228) MIKU EXPO 2026 Madrid | MIKU EXPO | 2026-11-24 | 未标注 | Draft | — |
| [12449](https://vocadb.net/E/12449) MIKU EXPO 2026 Lisbon | MIKU EXPO | 2026-11-27 | 未标注 | Draft | — |
| [3000000001](https://zh.moegirl.org.cn/初音未来·未来有你2026演唱会) MIKU WITH YOU 2026 in Chengdu | 未来有你 | 2026-12-26 | 尚未举行 | — | [公告](https://zh.moegirl.org.cn/初音未来·未来有你2026演唱会) |
| [2886](https://vocadb.net/E/2886) 初音ミク×鼓童スペシャルライブ２０２０～結～ | 鼓童 | 无 | **已取消** | Finished | [公告](https://twitter.com/kodo_miku/status/1353583380097507333) |
| [12940](https://vocadb.net/E/12940) 初音ミク×鼓童スペシャルライブ～響演～ | 鼓童 | 2026-11-20 | 未标注 | Finished | — |
| [13210](https://vocadb.net/E/13210) 初音ミクシンフォニー 2027 東京 | 交响乐 | 无 | 未标注 | Draft | — |
| [12740](https://vocadb.net/E/12740) 初音ミクシンフォニー 2026-2027 〜Melodies on the Keys〜 大阪 | 交响乐 | 2027-01-10 | 未标注 | Finished | — |
| [13209](https://vocadb.net/E/13209) 初音ミクシンフォニー 2027 横浜 | 交响乐 | 2027-03-13 | 未标注 | Draft | — |

- [ ] 都先留空，等实体发行或官方歌单
- [ ] 其中有已举行的场次需要补录（写在补充说明）

**补充说明**

> 
