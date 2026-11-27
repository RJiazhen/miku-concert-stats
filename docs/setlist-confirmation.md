# Setlist data confirmation checklist

> Generate this file: `uv run .agents/skills/update-concert-data/scripts/confirmation-report.py` (reads `public/data/catalog.sqlite` and `data/performance-setlists.json`).
> This round checked Moegirl / VocaDB Fandom / official archives where possible: adopt when found; on conflict prefer wiki, listed in section 3.
> Your input is only needed for section 2 (no per-day times on wiki) and section 6 (no upstream setlist).

## 0. Status at a glance

- The catalog expands **215** 演出 (performances) into **456** 场次 (shows) and **11001** setlist rows.
- **215** performances have source records: **42** official pages, **212** wiki entries—all adopted as-is.
- Pending attribution review: **0**; conflicts: **0**; shows marked uncertain: **0**.
- **17** non-VOCALOID tracks (classical arrangements, Kodo instrumentals, folk) are registered as ordinary songs with wiki sources and no vocalist; performance pages tag them as non-VocaDB.
- **2** multi-day 演出 still have only a date range on wiki and official pages (no per-day show times)—see section 2.

---

## 1. Source records (adopted, no confirmation needed)

Where we found show counts on official ticketing pages, Moegirl, or VocaDB Fandom, the data is already in the catalog; source, access date, and confidence live in `performance_setlist_sources` and appear in `/shows` footers.

| 演出 (performance) | Series | Date | Shows × tracks | Resolution | Confidence | Source |
| --- | --- | --- | --- | --- | --- | --- |
| 初音ミク「マジカルミライ 2013」in YOKOHAMA (2519) | Magical Mirai | 2013-08-30 | 2 × 24 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2013」in YOKOHAMA（横浜）](https://w.atwiki.jp/hmiku/pages/67111.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2014」in OSAKA (2517) | Magical Mirai | 2014-08-30 | 2 × 25 | external | high | [Magical Mirai 2014 Osaka official concert ticket page<br>初音ミク Wiki：初音ミク「マジカルミライ 2014」in OSAKA（大阪）](https://magicalmirai.com/2014/ticket_osaka.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2014」in TOKYO (2518) | Magical Mirai | 2014-09-20 | 2 × 25 | external | high | [Magical Mirai 2014 Tokyo official concert ticket page<br>初音ミク Wiki：初音ミク「マジカルミライ 2014」in TOKYO（东京）](https://magicalmirai.com/2014/ticket_tokyo.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2015」in TOKYO (2514) | Magical Mirai | 2015-09-04 | 3 × 27 | vocadb-note | high | [マジカルミライ 2015 チケット](https://magicalmirai.com/2015/ticket.html) (2026-11-05) |
| 初音ミク「マジカルミライ 2016」in TOKYO (1398) | Magical Mirai | 2016-09-09 | 4 × 26 | vocadb-note | high | [マジカルミライ 2016 チケット](https://magicalmirai.com/2016/ticket.html) (2026-11-05) |
| 初音ミク「マジカルミライ 2017」in TOKYO (1397) | Magical Mirai | 2017-09-01 | 5 × 28 | vocadb-note | high | [マジカルミライ 2017 チケット](https://magicalmirai.com/2017/ticket.html) (2026-11-05) |
| 初音ミク「マジカルミライ 2018」in OSAKA (1561) | Magical Mirai | 2018-08-25 | 4 × 26 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2018」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67122.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2018」in TOKYO (1745) | Magical Mirai | 2018-08-31 | 4 × 26 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2018」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67122.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2019」in OSAKA (2515) | Magical Mirai | 2019-08-09 | 4 × 26 | vocadb-note | high | [マジカルミライ 2019 OSAKA チケット](https://magicalmirai.com/2019/osaka_ticket.html) (2026-11-05) |
| 初音ミク「マジカルミライ 2019」in TOKYO (2516) | Magical Mirai | 2019-08-30 | 5 × 26 | vocadb-note | high | [マジカルミライ 2019 TOKYO チケット](https://magicalmirai.com/2019/tokyo_ticket.html) (2026-11-05) |
| 初音ミク「マジカルミライ 2020」in OSAKA (2758) | Magical Mirai | 2020-11-27 | 4 × 18 | vocadb-note | high | [マジカルミライ 2020 OSAKA チケット](https://magicalmirai.com/2020/osaka/ticket.html) (2026-11-05) |
| 初音ミク「マジカルミライ 2020」in TOKYO (2759) | Magical Mirai | 2020-12-18 | 5 × 18 | vocadb-note | high | [マジカルミライ 2020 TOKYO チケット](https://magicalmirai.com/2020/tokyo/ticket.html) (2026-11-05) |
| 初音ミク「マジカルミライ 2021」in OSAKA (3305) | Magical Mirai | 2021-10-22 | 5 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2021」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67125.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2021」in TOKYO (3306) | Magical Mirai | 2021-11-05 | 6 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2021」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67125.html) (2026-11-06) |
| 初音ミク「マジカルミライ」10th Anniversary in OSAKA (4233) | Magical Mirai | 2022-08-12 | 5 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ」10th Anniversary in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/66656.html) (2026-11-06) |
| 初音ミク「マジカルミライ」10th Anniversary in TOKYO (4234) | Magical Mirai | 2022-09-02 | 6 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ」10th Anniversary in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/66656.html) (2026-11-06) |
| 初音ミク「マジカルミライ」10th Anniversary in SAPPORO (4235) | Magical Mirai | 2023-02-04 | 4 × 20 | vocadb-note | high | [マジカルミライ 10th Anniversary SAPPORO チケット](https://magicalmirai.com/10th/sapporo_ticket.html) (2026-11-05) |
| 初音ミク「マジカルミライ 2023」in OSAKA (6045) | Magical Mirai | 2023-08-11 | 6 × 24 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2023」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67126.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2023」in TOKYO (6046) | Magical Mirai | 2023-09-01 | 6 × 24 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2023」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67126.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2024」in FUKUOKA (7214) | Magical Mirai | 2024-08-17 | 4 × 24 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2024」in FUKUOKA（福冈）](https://w.atwiki.jp/hmiku/pages/66797.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2024」in TOKYO (7215) | Magical Mirai | 2024-08-30 | 6 × 24 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2024」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/66797.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2024」in OSAKA (7217) | Magical Mirai | 2024-10-12 | 6 × 24 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2024」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/66797.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2025」in SENDAI (8768) | Magical Mirai | 2025-08-01 | 5 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2025」in SENDAI（仙台）](https://w.atwiki.jp/hmiku/pages/67127.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2025」in OSAKA (8769) | Magical Mirai | 2025-08-09 | 6 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2025」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67127.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2025」in TOKYO (8770) | Magical Mirai | 2025-08-29 | 6 × 25 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2025」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67127.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2026」in HAMAMATSU (12249) | Magical Mirai | 2026-07-24 | 6 × 26 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2026」in HAMAMATSU（浜松）](https://w.atwiki.jp/hmiku/pages/71541.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2026」in OSAKA (12250) | Magical Mirai | 2026-08-14 | 6 × 26 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2026」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/71541.html) (2026-11-06) |
| 初音ミク「マジカルミライ 2026」in TOKYO (12251) | Magical Mirai | 2026-08-28 | 6 × 26 | external | medium | [初音ミク Wiki：初音ミク「マジカルミライ 2026」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/71541.html) (2026-11-06) |
| MIKU EXPO 2014 Jakarta (1939) | MIKU EXPO | 2014-05-28 | 3 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2014 Jakarta（雅加达）](https://w.atwiki.jp/hmiku/pages/67130.html) (2026-11-06) |
| MIKU EXPO 2014 Los Angeles (1937) | MIKU EXPO | 2014-10-11 | 2 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2014 Los Angeles（洛杉矶 / 纽约）](https://w.atwiki.jp/hmiku/pages/67131.html) (2026-11-06) |
| MIKU EXPO 2014 New York (1938) | MIKU EXPO | 2014-10-17 | 2 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2014 New York（洛杉矶 / 纽约）](https://w.atwiki.jp/hmiku/pages/67131.html) (2026-11-06) |
| MIKU EXPO 2015 Shanghai (1940) | MIKU EXPO | 2015-06-27 | 4 × 27 | vocadb-note | high | [SCLA 官方页（2019-07-22 存档）：初音未来2015上海演唱会<br>萌娘百科：HATSUNE MIKU EXPO 2015 in Shanghai](https://web.archive.org/web/20190722050158/http://www.scla.com.cn/hatsunemiku/) (2026-11-05) |
| MIKU EXPO 2016 Fukuoka (1399) | MIKU EXPO | 2016-03-23 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Fukuoka（福冈）](https://w.atwiki.jp/hmiku/pages/67048.html) (2026-11-06) |
| MIKU EXPO 2016 Osaka (1400) | MIKU EXPO | 2016-03-29 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Osaka（大阪）](https://w.atwiki.jp/hmiku/pages/67048.html) (2026-11-06) |
| MIKU EXPO 2016 Nagoya (1401) | MIKU EXPO | 2016-03-31 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Nagoya（名古屋）](https://w.atwiki.jp/hmiku/pages/67048.html) (2026-11-06) |
| MIKU EXPO 2016 Sapporo (1402) | MIKU EXPO | 2016-04-05 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Sapporo（札幌）](https://w.atwiki.jp/hmiku/pages/67048.html) (2026-11-06) |
| MIKU EXPO 2016 Tokyo (1403) | MIKU EXPO | 2016-04-09 | 4 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Tokyo（东京）](https://w.atwiki.jp/hmiku/pages/67048.html) (2026-11-06) |
| MIKU EXPO 2016 Seattle (1859) | MIKU EXPO | 2016-04-23 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Seattle（西雅图）](https://w.atwiki.jp/hmiku/pages/67134.html) (2026-11-06) |
| MIKU EXPO 2016 San Francisco (1930) | MIKU EXPO | 2016-04-30 | 2 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 San Francisco（旧金山）](https://w.atwiki.jp/hmiku/pages/67134.html) (2026-11-06) |
| MIKU EXPO 2016 Los Angeles (1931) | MIKU EXPO | 2016-05-06 | 1 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/67134.html) (2026-11-06) |
| MIKU EXPO 2016 Dallas (1932) | MIKU EXPO | 2016-05-14 | 1 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Dallas（达拉斯）](https://w.atwiki.jp/hmiku/pages/67134.html) (2026-11-06) |
| MIKU EXPO 2016 Houston (1933) | MIKU EXPO | 2016-05-17 | 1 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Houston（休斯敦）](https://w.atwiki.jp/hmiku/pages/67134.html) (2026-11-06) |
| MIKU EXPO 2016 Toronto (1934) | MIKU EXPO | 2016-05-20 | 1 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Toronto（多伦多）](https://w.atwiki.jp/hmiku/pages/67134.html) (2026-11-06) |
| MIKU EXPO 2016 Chicago (1935) | MIKU EXPO | 2016-05-25 | 1 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Chicago（芝加哥）](https://w.atwiki.jp/hmiku/pages/67134.html) (2026-11-06) |
| MIKU EXPO 2016 New York (1936) | MIKU EXPO | 2016-05-28 | 2 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 New York（纽约）](https://w.atwiki.jp/hmiku/pages/67134.html) (2026-11-06) |
| MIKU EXPO 2016 Monterrey (1860) | MIKU EXPO | 2016-06-01 | 1 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Monterrey（蒙特雷）](https://w.atwiki.jp/hmiku/pages/67134.html) (2026-11-06) |
| MIKU EXPO 2016 Mexico City (1924) | MIKU EXPO | 2016-06-04 | 3 × 27 | external | high | [MIKU EXPO 2016 NORTH AMERICA — final official schedule<br>初音ミク Wiki：MIKU EXPO 2016 Mexico City（墨西哥城）](https://mikuexpo.com/na2016/) (2026-11-06) |
| MIKU EXPO 2016 New Taipei City (1941) | MIKU EXPO | 2016-06-25 | 3 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 New Taipei City（台北）](https://w.atwiki.jp/hmiku/pages/67135.html) (2026-11-06) |
| MIKU EXPO 2016 Shanghai (1943) | MIKU EXPO | 2016-12-03 | 4 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67136.html) (2026-11-06) |
| MIKU EXPO 2016 Beijing (1942) | MIKU EXPO | 2016-12-10 | 4 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2016 Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67136.html) (2026-11-06) |
| MIKU EXPO 2017 Kuala Lumpur (1584) | MIKU EXPO | 2017-12-16 | 1 × 27 | external | medium | [初音ミク Wiki：MIKU EXPO 2017 Kuala Lumpur（吉隆坡）](https://w.atwiki.jp/hmiku/pages/67137.html) (2026-11-06) |
| MIKU EXPO 2018 Los Angeles (1673) | MIKU EXPO | 2018-06-29 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/67060.html) (2026-11-06) |
| MIKU EXPO 2018 San Jose (1674) | MIKU EXPO | 2018-07-01 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 San Jose（圣何塞）](https://w.atwiki.jp/hmiku/pages/67060.html) (2026-11-06) |
| MIKU EXPO 2018 Dallas (1675) | MIKU EXPO | 2018-07-06 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 Dallas（达拉斯）](https://w.atwiki.jp/hmiku/pages/67060.html) (2026-11-06) |
| MIKU EXPO 2018 Austin (1676) | MIKU EXPO | 2018-07-08 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 Austin（奥斯汀）](https://w.atwiki.jp/hmiku/pages/67060.html) (2026-11-06) |
| MIKU EXPO 2018 Washington, D.C. (1677) | MIKU EXPO | 2018-07-12 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 Washington, D.C.（华盛顿）](https://w.atwiki.jp/hmiku/pages/67060.html) (2026-11-06) |
| MIKU EXPO 2018 New York (1678) | MIKU EXPO | 2018-07-14 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 New York（纽约）](https://w.atwiki.jp/hmiku/pages/67060.html) (2026-11-06) |
| MIKU EXPO 2018 Mexico City (1925) | MIKU EXPO | 2018-07-19 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 Mexico City（墨西哥城）](https://w.atwiki.jp/hmiku/pages/67060.html) (2026-11-06) |
| MIKU EXPO 2018 Paris (1854) | MIKU EXPO | 2018-12-01 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 Paris（巴黎）](https://w.atwiki.jp/hmiku/pages/67138.html) (2026-11-06) |
| MIKU EXPO 2018 Cologne (1855) | MIKU EXPO | 2018-12-04 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 Cologne（科隆）](https://w.atwiki.jp/hmiku/pages/67138.html) (2026-11-06) |
| MIKU EXPO 2018 London (1856) | MIKU EXPO | 2018-12-08 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2018 London（伦敦）](https://w.atwiki.jp/hmiku/pages/67138.html) (2026-11-06) |
| MIKU EXPO 2019 New Taipei City (2489) | MIKU EXPO | 2019-05-11 | 1 × 25 | external | medium | [初音ミク Wiki：MIKU EXPO 2019 New Taipei City（台北）](https://w.atwiki.jp/hmiku/pages/67139.html) (2026-11-06) |
| MIKU EXPO 2019 Hong Kong (2490) | MIKU EXPO | 2019-07-27 | 1 × 25 | external | medium | [初音ミク Wiki：MIKU EXPO 2019 Hong Kong（香港）](https://w.atwiki.jp/hmiku/pages/67139.html) (2026-11-06) |
| MIKU EXPO 2020 London (2786) | MIKU EXPO | 2020-01-11 | 1 × 25 | external | medium | [初音ミク Wiki：MIKU EXPO 2020 London（伦敦）](https://w.atwiki.jp/hmiku/pages/67140.html) (2026-11-06) |
| MIKU EXPO 2020 Paris (2787) | MIKU EXPO | 2020-01-16 | 1 × 25 | external | medium | [初音ミク Wiki：MIKU EXPO 2020 Paris（巴黎）](https://w.atwiki.jp/hmiku/pages/67140.html) (2026-11-06) |
| MIKU EXPO 2020 Berlin (2788) | MIKU EXPO | 2020-01-20 | 1 × 25 | external | medium | [初音ミク Wiki：MIKU EXPO 2020 Berlin（柏林）](https://w.atwiki.jp/hmiku/pages/67140.html) (2026-11-06) |
| MIKU EXPO 2020 Amsterdam (2789) | MIKU EXPO | 2020-01-24 | 1 × 25 | external | medium | [初音ミク Wiki：MIKU EXPO 2020 Amsterdam（阿姆斯特丹）](https://w.atwiki.jp/hmiku/pages/67140.html) (2026-11-06) |
| MIKU EXPO 2021 Online (3224) | MIKU EXPO | 2021-06-06 | 1 × 16 | external | medium | [初音ミク Wiki：MIKU EXPO 2021 Online（线上）](https://w.atwiki.jp/hmiku/pages/67074.html) (2026-11-06) |
| MIKU EXPO 2022 Rewind (4114) | MIKU EXPO | 2022-06-05 | 1 × 18 | external | medium | [初音ミク Wiki：MIKU EXPO 2022 Rewind（线上）](https://w.atwiki.jp/hmiku/pages/67141.html) (2026-11-06) |
| MIKU EXPO 2022 Rewind+ (4490) | MIKU EXPO | 2022-11-06 | 1 × 28 | external | medium | [初音ミク Wiki：MIKU EXPO 2022 Rewind+（线上）](https://w.atwiki.jp/hmiku/pages/67142.html) (2026-11-06) |
| MIKU EXPO 2023 VR (5751) | MIKU EXPO | 2023-11-12 | 1 × 14 | external | medium | [初音ミク Wiki：MIKU EXPO 2023 VR（线上）](https://w.atwiki.jp/hmiku/pages/67143.html) (2026-11-06) |
| MIKU EXPO 2024 Vancouver (6516) | MIKU EXPO | 2024-04-04 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Vancouver（温哥华）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 Portland (6517) | MIKU EXPO | 2024-04-06 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Portland（波特兰）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 San Jose (6518) | MIKU EXPO | 2024-04-08 | 2 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 San Jose（圣何塞）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 Phoenix (6519) | MIKU EXPO | 2024-04-14 | 2 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Phoenix（凤凰城）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 Los Angeles (7186) | MIKU EXPO | 2024-04-17 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 Denver (6520) | MIKU EXPO | 2024-04-21 | 2 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Denver（丹佛）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 Dallas (6521) | MIKU EXPO | 2024-04-24 | 2 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Dallas（达拉斯）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 Austin (6522) | MIKU EXPO | 2024-04-27 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Austin（奥斯汀）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 Atlanta (6523) | MIKU EXPO | 2024-04-30 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Atlanta（亚特兰大）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 Orlando (6524) | MIKU EXPO | 2024-05-02 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Orlando（奥兰多）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 Washington (6525) | MIKU EXPO | 2024-05-05 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Washington（华盛顿）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 Newark (6526) | MIKU EXPO | 2024-05-07 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Newark（纽瓦克）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 Boston (6527) | MIKU EXPO | 2024-05-09 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Boston（波士顿）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 Detroit (6528) | MIKU EXPO | 2024-05-12 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Detroit（底特律）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 Chicago (6529) | MIKU EXPO | 2024-05-14 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Chicago（芝加哥）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 Toronto (6530) | MIKU EXPO | 2024-05-16 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Toronto（多伦多）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 Mexico City (6531) | MIKU EXPO | 2024-05-21 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Mexico City（墨西哥城）](https://w.atwiki.jp/hmiku/pages/67090.html) (2026-11-06) |
| MIKU EXPO 2024 London (7266) | MIKU EXPO | 2024-10-26 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 London（伦敦）](https://w.atwiki.jp/hmiku/pages/67145.html) (2026-11-06) |
| MIKU EXPO 2024 Brussels (7267) | MIKU EXPO | 2024-10-28 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Brussels（布鲁塞尔）](https://w.atwiki.jp/hmiku/pages/67145.html) (2026-11-06) |
| MIKU EXPO 2024 Paris (7268) | MIKU EXPO | 2024-10-29 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Paris（巴黎）](https://w.atwiki.jp/hmiku/pages/67145.html) (2026-11-06) |
| MIKU EXPO 2024 Amsterdam (7269) | MIKU EXPO | 2024-10-30 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Amsterdam（阿姆斯特丹）](https://w.atwiki.jp/hmiku/pages/67145.html) (2026-11-06) |
| MIKU EXPO 2024 Düsseldorf (7270) | MIKU EXPO | 2024-11-01 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Düsseldorf（杜塞尔多夫）](https://w.atwiki.jp/hmiku/pages/67145.html) (2026-11-06) |
| MIKU EXPO 2024 Berlin (7271) | MIKU EXPO | 2024-11-02 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Berlin（柏林）](https://w.atwiki.jp/hmiku/pages/67145.html) (2026-11-06) |
| MIKU EXPO 2024 Auckland (7765) | MIKU EXPO | 2024-11-15 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Auckland（奥克兰）](https://w.atwiki.jp/hmiku/pages/67146.html) (2026-11-06) |
| MIKU EXPO 2024 Brisbane (7766) | MIKU EXPO | 2024-11-18 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Brisbane（布里斯班）](https://w.atwiki.jp/hmiku/pages/67146.html) (2026-11-06) |
| MIKU EXPO 2024 Sydney (7767) | MIKU EXPO | 2024-11-20 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Sydney（悉尼）](https://w.atwiki.jp/hmiku/pages/67146.html) (2026-11-06) |
| MIKU EXPO 2024 Melbourne (7768) | MIKU EXPO | 2024-11-22 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Melbourne（墨尔本）](https://w.atwiki.jp/hmiku/pages/67146.html) (2026-11-06) |
| MIKU EXPO 2024 Perth (7769) | MIKU EXPO | 2024-11-26 | 1 × 23 | external | medium | [初音ミク Wiki：MIKU EXPO 2024 Perth（珀斯）](https://w.atwiki.jp/hmiku/pages/67146.html) (2026-11-06) |
| MIKU EXPO 2025 Bangkok (9341) | MIKU EXPO | 2025-11-05 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Bangkok（曼谷）](https://w.atwiki.jp/hmiku/pages/67470.html) (2026-11-06) |
| MIKU EXPO 2025 Hong Kong (9348) | MIKU EXPO | 2025-11-08 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Hong Kong（香港）](https://w.atwiki.jp/hmiku/pages/67470.html) (2026-11-06) |
| MIKU EXPO 2025 Jakarta (9349) | MIKU EXPO | 2025-11-12 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Jakarta（雅加达）](https://w.atwiki.jp/hmiku/pages/67470.html) (2026-11-06) |
| MIKU EXPO 2025 Manila (9350) | MIKU EXPO | 2025-11-16 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Manila（马尼拉）](https://w.atwiki.jp/hmiku/pages/67470.html) (2026-11-06) |
| MIKU EXPO 2025 Singapore (9351) | MIKU EXPO | 2025-11-19 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Singapore（新加坡）](https://w.atwiki.jp/hmiku/pages/67470.html) (2026-11-06) |
| MIKU EXPO 2025 Kuala Lumpur (9352) | MIKU EXPO | 2025-11-22 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Kuala Lumpur（吉隆坡）](https://w.atwiki.jp/hmiku/pages/67470.html) (2026-11-06) |
| MIKU EXPO 2025 Taipei (9555) | MIKU EXPO | 2025-11-26 | 1 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Taipei（台北）](https://w.atwiki.jp/hmiku/pages/67470.html) (2026-11-06) |
| MIKU EXPO 2025 Seoul (9353) | MIKU EXPO | 2025-11-29 | 2 × 24 | external | medium | [初音ミク Wiki：MIKU EXPO 2025 Seoul（首尔）](https://w.atwiki.jp/hmiku/pages/67470.html) (2026-11-06) |
| MIKU EXPO 2026 Chicago (9811) | MIKU EXPO | 2026-04-12 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Chicago（芝加哥）](https://w.atwiki.jp/hmiku/pages/68848.html) (2026-11-06) |
| MIKU EXPO 2026 Denver (9812) | MIKU EXPO | 2026-04-15 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Denver（丹佛）](https://w.atwiki.jp/hmiku/pages/68848.html) (2026-11-06) |
| MIKU EXPO 2026 Vancouver (9813) | MIKU EXPO | 2026-04-18 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Vancouver（温哥华）](https://w.atwiki.jp/hmiku/pages/68848.html) (2026-11-06) |
| MIKU EXPO 2026 Seattle (9814) | MIKU EXPO | 2026-04-20 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Seattle（西雅图）](https://w.atwiki.jp/hmiku/pages/68848.html) (2026-11-06) |
| MIKU EXPO 2026 San Jose (9815) | MIKU EXPO | 2026-04-22 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 San Jose（圣何塞）](https://w.atwiki.jp/hmiku/pages/68848.html) (2026-11-06) |
| MIKU EXPO 2026 Los Angeles (9816) | MIKU EXPO | 2026-04-25 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/68848.html) (2026-11-06) |
| MIKU EXPO 2026 Glendale (9817) | MIKU EXPO | 2026-04-28 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Glendale（格伦代尔）](https://w.atwiki.jp/hmiku/pages/68848.html) (2026-11-06) |
| MIKU EXPO 2026 Grand Prairie (9818) | MIKU EXPO | 2026-04-30 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Grand Prairie（大草原城）](https://w.atwiki.jp/hmiku/pages/68848.html) (2026-11-06) |
| MIKU EXPO 2026 Cedar Park (9819) | MIKU EXPO | 2026-05-01 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Cedar Park（锡达帕克）](https://w.atwiki.jp/hmiku/pages/68848.html) (2026-11-06) |
| MIKU EXPO 2026 Duluth (9820) | MIKU EXPO | 2026-05-03 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Duluth（杜鲁斯）](https://w.atwiki.jp/hmiku/pages/68848.html) (2026-11-06) |
| MIKU EXPO 2026 Washington (9821) | MIKU EXPO | 2026-05-05 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Washington（华盛顿）](https://w.atwiki.jp/hmiku/pages/68848.html) (2026-11-06) |
| MIKU EXPO 2026 Newark (9822) | MIKU EXPO | 2026-05-07 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Newark（纽瓦克）](https://w.atwiki.jp/hmiku/pages/68848.html) (2026-11-06) |
| MIKU EXPO 2026 Boston (9823) | MIKU EXPO | 2026-05-10 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Boston（波士顿）](https://w.atwiki.jp/hmiku/pages/68848.html) (2026-11-06) |
| MIKU EXPO 2026 Hamilton (9824) | MIKU EXPO | 2026-05-13 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Hamilton（哈密尔顿）](https://w.atwiki.jp/hmiku/pages/68848.html) (2026-11-06) |
| MIKU EXPO 2026 Mexico City (9825) | MIKU EXPO | 2026-05-19 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Mexico City（墨西哥城）](https://w.atwiki.jp/hmiku/pages/68848.html) (2026-11-06) |
| MIKU EXPO 2026 London (12222) | MIKU EXPO | 2026-11-12 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 London（伦敦）](https://w.atwiki.jp/hmiku/pages/71517.html) (2026-11-06) |
| MIKU EXPO 2026 Brussels (12223) | MIKU EXPO | 2026-11-14 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Brussels（布鲁塞尔）](https://w.atwiki.jp/hmiku/pages/71517.html) (2026-11-06) |
| MIKU EXPO 2026 Amsterdam (12224) | MIKU EXPO | 2026-11-15 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Amsterdam（阿姆斯特丹）](https://w.atwiki.jp/hmiku/pages/71517.html) (2026-11-06) |
| MIKU EXPO 2026 Berlin (12225) | MIKU EXPO | 2026-11-17 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Berlin（柏林）](https://w.atwiki.jp/hmiku/pages/71517.html) (2026-11-06) |
| MIKU EXPO 2026 Düsseldorf (12226) | MIKU EXPO | 2026-11-20 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Düsseldorf（杜塞尔多夫）](https://w.atwiki.jp/hmiku/pages/71517.html) (2026-11-06) |
| MIKU EXPO 2026 Paris (12227) | MIKU EXPO | 2026-11-22 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Paris（巴黎）](https://w.atwiki.jp/hmiku/pages/71517.html) (2026-11-06) |
| MIKU EXPO 2026 Madrid (12228) | MIKU EXPO | 2026-11-24 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Madrid（马德里）](https://w.atwiki.jp/hmiku/pages/71517.html) (2026-11-06) |
| MIKU EXPO 2026 Lisbon (12449) | MIKU EXPO | 2026-11-27 | 1 × 26 | external | medium | [初音ミク Wiki：MIKU EXPO 2026 Lisbon（里斯本）](https://w.atwiki.jp/hmiku/pages/71517.html) (2026-11-06) |
| MIKU WITH YOU 2017 in Shanghai (1619) | MIKU WITH YOU | 2017-11-25 | 2 × 26 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2017 in Shanghai（北京）](https://w.atwiki.jp/hmiku/pages/67160.html) (2026-11-06) |
| MIKU WITH YOU 2018 in Beijing (2085) | MIKU WITH YOU | 2018-10-13 | 2 × 25 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2018 in Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67175.html) (2026-11-06) |
| MIKU WITH YOU 2018 in Chengdu (2086) | MIKU WITH YOU | 2018-10-20 | 2 × 25 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2018 in Chengdu（成都）](https://w.atwiki.jp/hmiku/pages/67175.html) (2026-11-06) |
| MIKU WITH YOU 2018 in Shanghai (2087) | MIKU WITH YOU | 2018-10-27 | 4 × 25 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2018 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67175.html) (2026-11-06) |
| MIKU WITH YOU 2019 in Shanghai (3752) | MIKU WITH YOU | 2019-11-02 | 4 × 25 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2019 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67177.html) (2026-11-06) |
| MIKU WITH YOU 2019 in Chengdu (3753) | MIKU WITH YOU | 2019-11-09 | 1 × 25 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2019 in Chengdu（成都）](https://w.atwiki.jp/hmiku/pages/67177.html) (2026-11-06) |
| MIKU WITH YOU 2019 in Beijing (3754) | MIKU WITH YOU | 2019-11-16 | 2 × 25 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2019 in Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67177.html) (2026-11-06) |
| MIKU WITH YOU 2019 in Guangzhou (3755) | MIKU WITH YOU | 2019-11-23 | 3 × 25 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2019 in Guangzhou（广州）](https://w.atwiki.jp/hmiku/pages/67177.html) (2026-11-06) |
| MIKU WITH YOU 2020 (3250) | MIKU WITH YOU | 2020-12-25 | 1 × 18 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2020（线上）](https://w.atwiki.jp/hmiku/pages/67178.html) (2026-11-06) |
| MIKU WITH YOU 2021 (4058) | MIKU WITH YOU | 2021-12-25 | 1 × 17 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2021（线上）](https://w.atwiki.jp/hmiku/pages/67180.html) (2026-11-06) |
| MIKU WITH YOU 2024 in Shanghai (7673) | MIKU WITH YOU | 2024-07-13 | 4 × 23 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2024 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67183.html) (2026-11-06) |
| MIKU WITH YOU 2024 in Beijing (7675) | MIKU WITH YOU | 2024-07-20 | 4 × 23 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2024 in Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67183.html) (2026-11-06) |
| MIKU WITH YOU 2024 in Guangzhou (7674) | MIKU WITH YOU | 2024-07-27 | 4 × 23 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2024 in Guangzhou（广州）](https://w.atwiki.jp/hmiku/pages/67183.html) (2026-11-06) |
| MIKU WITH YOU 2025 (9644) | MIKU WITH YOU | 2025-12-20 | 4 × 23 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2025（上海）](https://w.atwiki.jp/hmiku/pages/68149.html) (2026-11-06) |
| MIKU WITH YOU 2026 in Shanghai (13120) | MIKU WITH YOU | 2026-10-31 | 4 × 24 | external | medium | [初音ミク Wiki：MIKU WITH YOU 2026 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/79886.html) (2026-11-06) |
| SNOW MIKU LIVE! 2015 presents MIKU EXPO Live Set (3792) | SNOW MIKU | 2015-02-07 | 4 × 27 | vocadb-note | high | [SNOW MIKU LIVE! 2015 公式チケット页](https://snowmiku.com/2015/live_ticket.html) (2026-11-05) |
| SNOW MIKU LIVE! 2018 (1618) | SNOW MIKU | 2018-02-09 | 4 × 26 | vocadb-note | medium | [VocaDB Fandom: SNOW MIKU LIVE! 2018](https://vocaloid.fandom.com/wiki/SNOW_MIKU_LIVE!_2018) (2026-11-05) |
| SNOW MIKU LIVE! 2019 (2422) | SNOW MIKU | 2019-02-09 | 4 × 26 | vocadb-note | medium | [萌娘百科：SNOW MIKU LIVE! 2019](https://zh.moegirl.org.cn/SNOW_MIKU_LIVE!_2019) (2026-11-05) |
| ミクの日感謝祭39's Giving Day (2520) | Live Party | 2010-03-09 | 2 × 40 | external | medium | [初音ミク Wiki：ミクの日感謝祭39's Giving Day（东京）](https://w.atwiki.jp/hmiku/pages/67147.html) (2026-11-06) |
| 初音ミクライブパーティー 2011 Tokyo (2523) | Live Party | 2011-03-09 | 1 × 39 | external | medium | [初音ミク Wiki：初音ミクライブパーティー 2011 Tokyo（东京）](https://w.atwiki.jp/hmiku/pages/67149.html) (2026-11-06) |
| MIKUNOPOLIS in LOS ANGELES “はじめまして、初音ミクです” (2521) | Live Party | 2011-07-02 | 1 × 24 | external | high | [MIKUNOPOLIS in Los Angeles 公式サイト<br>初音ミク Wiki：MIKUNOPOLIS in LOS ANGELES “はじめまして、初音ミクです”（洛杉矶）](http://miku.sega.jp/39/mikula_20111014.html) (2026-11-06) |
| 初音ミクライブパーティー 2011 Sapporo (2526) | Live Party | 2011-08-16 | 2 × 26 | external | medium | [初音ミク Wiki：初音ミクライブパーティー 2011 Sapporo（札幌）](https://w.atwiki.jp/hmiku/pages/67150.html) (2026-11-06) |
| 初音ミクライブパーティー 2011 Singapore (2527) | Live Party | 2011-11-11 | 1 × 27 | external | medium | [VocaDB：Hatsune Miku Live Party 2011 Mikupa♪ Singapore<br>初音ミク Wiki：初音ミクライブパーティー 2011 Singapore（新加坡）](https://vocadb.net/L/1) (2026-11-06) |
| 初音ミクライブパーティー 2012 Tokyo (4056) | Live Party | 2012-03-08 | 2 × 33 | external | high | [SEGA: Miku Day Thanksgiving 2012 official performance announcement<br>初音ミク Wiki：初音ミクライブパーティー 2012 Tokyo（东京）](https://info.miku.sega.jp/489) (2026-11-06) |
| 初音ミクコンサート 最後のミクの日感謝祭 (3000000011) | Live Party | 2012-03-09 | 2 × 29 | external | high | [ミクの日大感謝祭 公式サイト<br>初音ミク Wiki：初音ミクコンサート 最後のミクの日感謝祭（东京）](https://miku.sega.jp/39/) (2026-11-06) |
| 初音ミクライブパーティー 2012 Hong Kong (2524) | Live Party | 2012-10-02 | 2 × 25 | external | high | [Hatsune Miku Official Blog: Hong Kong MikuPa 2012 retrospective<br>初音ミク Wiki：初音ミクライブパーティー 2012 Hong Kong（香港）](https://blog.piapro.net/2012/10/post-576.html) (2026-11-06) |
| 初音ミクライブパーティー 2012 Taiwan (2525) | Live Party | 2012-10-06 | 2 × 25 | external | high | [Sony Music Taiwan: MikuPa 2012 Taiwan announcement<br>初音ミク Wiki：初音ミクライブパーティー 2012 Taiwan（台北）](https://sonymusic.com.tw/news/%e5%ae%87%e5%ae%99%e6%9c%80%e5%bc%b7%e8%99%9b%e6%93%ac%e5%81%b6%e5%83%8f%e5%88%9d%e9%9f%b3%e6%9c%aa%e4%be%8610%e6%9c%886%e6%97%a5%e4%be%86%e5%8f%b0%e9%96%8b%e5%94%b1/) (2026-11-06) |
| 初音ミクライブパーティー 2013 Sapporo (2510) | Live Party | 2013-02-09 | 4 × 26 | external | medium | [初音ミク Wiki：初音ミクライブパーティー 2013 Sapporo（札幌）](https://w.atwiki.jp/hmiku/pages/67154.html) (2026-11-06) |
| 初音ミクライブパーティー 2013 Kansai (2511) | Live Party | 2013-03-09 | 1 × 39 | external | medium | [初音ミク Wiki：初音ミクライブパーティー 2013 Kansai（关西）](https://w.atwiki.jp/hmiku/pages/66967.html) (2026-11-06) |
| 初音ミク×鼓童スペシャルライブ (2947) | Kodo | 2017-03-04 | 3 × 22 | external | high | [初音ミク Wiki：初音ミク×鼓童スペシャルライブ（NHK 大厅）<br>Kodo: additional Hatsune Miku × Kodo performance announced](https://w.atwiki.jp/hmiku/pages/67219.html) (2026-11-06) |
| 初音ミク×鼓童スペシャルライブ２０１８ (2948) | Kodo | 2018-06-02 | 3 × 26 | external | medium | [初音ミク Wiki：初音ミク×鼓童スペシャルライブ２０１８（NHK 大厅）](https://w.atwiki.jp/hmiku/pages/67230.html) (2026-11-06) |
| 初音ミク×鼓童スペシャルライブ２０２３ ～結～ (5910) | Kodo | 2023-06-03 | 3 × 24 | external | medium | [初音ミク Wiki：初音ミク×鼓童スペシャルライブ２０２３ ～結～（NHK 大厅）](https://w.atwiki.jp/hmiku/pages/67232.html) (2026-11-06) |
| 初音ミク×鼓童スペシャルライブ～響演～ (12940) | Kodo | 2026-11-20 | 2 × 18 | external | high | [鼓童×初音ミク 響演 公式サイト<br>初音ミク Wiki：初音ミク×鼓童スペシャルライブ～響演～（NHK 大厅）](https://kyouen-kodo-miku.com/) (2026-11-06) |
| 初音ミクシンフォニー 2016 東京都 (2957) | Symphony | 2016-08-26 | 1 × 29 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2016 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80167.html) (2026-11-06) |
| 初音ミクシンフォニー 2017 大阪市 (2958) | Symphony | 2017-11-17 | 1 × 28 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2017 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80237.html) (2026-11-06) |
| 初音ミクシンフォニー 2017 東京都 (2959) | Symphony | 2017-11-29 | 1 × 29 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2017 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80237.html) (2026-11-06) |
| 初音ミクシンフォニー 2018-2019 東京都 (2504) | Symphony | 2018-11-24 | 1 × 25 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2018-2019 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80287.html) (2026-11-06) |
| 初音ミクシンフォニー 2018-2019 大阪市 (2960) | Symphony | 2019-01-25 | 1 × 26 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2018-2019 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80287.html) (2026-11-06) |
| 初音ミクシンフォニー 2019 横浜市 (2870) | Symphony | 2019-10-14 | 1 × 28 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2019 横浜市（横浜公演）](https://w.atwiki.jp/hmiku/pages/80354.html) (2026-11-06) |
| 初音ミクシンフォニー 2019 大阪市 (2871) | Symphony | 2019-12-23 | 1 × 28 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2019 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80354.html) (2026-11-06) |
| 初音ミクシンフォニー 2020 〜5th Anniversary〜 東京都 (2954) | Symphony | 2020-09-21 | 1 × 23 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2020 〜5th Anniversary〜 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80404.html) (2026-11-06) |
| 初音ミクシンフォニー 2020 〜5th Anniversary〜 横浜市 (2955) | Symphony | 2020-10-17 | 1 × 19 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2020 〜5th Anniversary〜 横浜市（横浜公演）](https://w.atwiki.jp/hmiku/pages/80404.html) (2026-11-06) |
| 初音ミクシンフォニー 2020 〜5th Anniversary〜 大阪市 (2956) | Symphony | 2020-11-17 | 1 × 18 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2020 〜5th Anniversary〜 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80404.html) (2026-11-06) |
| 初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 横浜市 (3710) | Symphony | 2021-09-20 | 1 × 20 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 横浜市（横浜公演）](https://w.atwiki.jp/hmiku/pages/80422.html) (2026-11-06) |
| 初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 神戸市 (3869) | Symphony | 2021-11-20 | 1 × 20 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 神戸市（神戸公演）](https://w.atwiki.jp/hmiku/pages/80422.html) (2026-11-06) |
| 初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 東京 (4322) | Symphony | 2022-07-02 | 1 × 25 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80506.html) (2026-11-06) |
| 初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 横浜 (4808) | Symphony | 2022-09-25 | 1 × 22 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80506.html) (2026-11-06) |
| 初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 大阪 (4814) | Symphony | 2022-11-23 | 1 × 23 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 大阪（大阪公演）](https://w.atwiki.jp/hmiku/pages/80506.html) (2026-11-06) |
| 初音ミクシンフォニー 2023 東京 (4877) | Symphony | 2023-08-29 | 1 × 22 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2023 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80537.html) (2026-11-06) |
| 初音ミクシンフォニー 2023 横浜 (4878) | Symphony | 2023-10-14 | 1 × 25 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2023 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80537.html) (2026-11-06) |
| 初音ミクシンフォニー 2023 神戸 (4879) | Symphony | 2023-12-13 | 1 × 26 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2023 神戸（神戸公演）](https://w.atwiki.jp/hmiku/pages/80537.html) (2026-11-06) |
| 初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 東京 (12709) | Symphony | 2024-04-27 | 1 × 21 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80641.html) (2026-11-06) |
| 初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 横浜 (8033) | Symphony | 2024-10-05 | 1 × 22 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80641.html) (2026-11-06) |
| 初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 神戸 (8035) | Symphony | 2024-12-29 | 1 × 22 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 神戸（神戸公演）](https://w.atwiki.jp/hmiku/pages/80641.html) (2026-11-06) |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 札幌 (8037) | Symphony | 2025-02-11 | 1 × 27 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 札幌（札幌公演）](https://w.atwiki.jp/hmiku/pages/80551.html) (2026-11-06) |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 大阪 (8710) | Symphony | 2025-04-12 | 1 × 16 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 大阪（大阪公演）](https://w.atwiki.jp/hmiku/pages/80551.html) (2026-11-06) |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 東京 (8711) | Symphony | 2025-07-06 | 1 × 17 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80551.html) (2026-11-06) |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 横浜 (9267) | Symphony | 2025-10-04 | 1 × 30 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80551.html) (2026-11-06) |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 神戸 (9276) | Symphony | 2025-12-27 | 1 × 30 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 神戸（神戸公演）](https://w.atwiki.jp/hmiku/pages/80551.html) (2026-11-06) |
| 初音ミクシンフォニー 2026 札幌 (12713) | Symphony | 2026-06-20 | 1 × 19 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2026 札幌（札幌公演）](https://w.atwiki.jp/hmiku/pages/80458.html) (2026-11-06) |
| 初音ミクシンフォニー 2026 東京 (12714) | Symphony | 2026-07-05 | 1 × 19 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2026 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80458.html) (2026-11-06) |
| 初音ミクシンフォニー 2026-2027 〜Melodies on the Keys〜 横浜 (12739) | Symphony | 2026-10-10 | 1 × 16 | external | medium | [初音ミク Wiki：初音ミクシンフォニー 2026-2027 〜Melodies on the Keys〜 横浜（横浜）](https://w.atwiki.jp/hmiku/pages/80296.html) (2026-11-06) |
| 初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 名古屋 (4765) | 408 | 2023-02-23 | 2 × 23 | external | high | [初音ミク JAPAN LIVE TOUR 2023 〜THUNDERBOLT〜 公式サイト<br>初音ミク Wiki：初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 名古屋（名古屋）](https://piapro.net/japantour2023/) (2026-11-06) |
| 初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 大阪 (4766) | 408 | 2023-03-04 | 2 × 23 | external | high | [初音ミク JAPAN LIVE TOUR 2023 〜THUNDERBOLT〜 公式サイト<br>初音ミク Wiki：初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 大阪（大阪）](https://piapro.net/japantour2023/) (2026-11-06) |
| 初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 福岡市 (4767) | 408 | 2023-03-11 | 1 × 23 | external | high | [初音ミク JAPAN LIVE TOUR 2023 〜THUNDERBOLT〜 公式サイト<br>初音ミク Wiki：初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 福岡市（福冈）](https://piapro.net/japantour2023/) (2026-11-06) |
| 初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 東京 (4768) | 408 | 2023-03-18 | 4 × 23 | external | high | [初音ミク JAPAN LIVE TOUR 2023 〜THUNDERBOLT〜 公式サイト<br>初音ミク Wiki：初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 東京（东京）](https://piapro.net/japantour2023/) (2026-11-06) |
| 初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 札幌 (4769) | 408 | 2023-03-25 | 1 × 23 | external | high | [初音ミク JAPAN LIVE TOUR 2023 〜THUNDERBOLT〜 公式サイト<br>初音ミク Wiki：初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 札幌（札幌）](https://piapro.net/japantour2023/) (2026-11-06) |
| 初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 大阪 (8380) | 799 | 2025-04-19 | 2 × 23 | external | high | [初音ミク JAPAN LIVE TOUR 2025 〜BLOOMING〜 公式サイト<br>初音ミク Wiki：初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 大阪（大阪）](https://piapro.net/japantour2025/) (2026-11-06) |
| 初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 愛知 (8381) | 799 | 2025-04-26 | 2 × 23 | external | high | [初音ミク JAPAN LIVE TOUR 2025 〜BLOOMING〜 公式サイト<br>初音ミク Wiki：初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 愛知（爱知）](https://piapro.net/japantour2025/) (2026-11-06) |
| 初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 福岡 (8382) | 799 | 2025-04-29 | 2 × 23 | external | high | [初音ミク JAPAN LIVE TOUR 2025 〜BLOOMING〜 公式サイト<br>初音ミク Wiki：初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 福岡（福冈）](https://piapro.net/japantour2025/) (2026-11-06) |
| 初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 東京 (8383) | 799 | 2025-05-02 | 4 × 23 | external | high | [初音ミク JAPAN LIVE TOUR 2025 〜BLOOMING〜 公式サイト<br>初音ミク Wiki：初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 東京（东京）](https://piapro.net/japantour2025/) (2026-11-06) |
| 初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 香川 (8384) | 799 | 2025-05-06 | 1 × 23 | external | high | [初音ミク JAPAN LIVE TOUR 2025 〜BLOOMING〜 公式サイト<br>初音ミク Wiki：初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 香川（香川）](https://piapro.net/japantour2025/) (2026-11-06) |
| 初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 北海道 (8385) | 799 | 2025-05-17 | 1 × 23 | external | high | [初音ミク JAPAN LIVE TOUR 2025 〜BLOOMING〜 公式サイト<br>初音ミク Wiki：初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 北海道（北海道）](https://piapro.net/japantour2025/) (2026-11-06) |
| 初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 沖縄 (8386) | 799 | 2025-05-31 | 2 × 23 | external | high | [初音ミク JAPAN LIVE TOUR 2025 〜BLOOMING〜 公式サイト<br>初音ミク Wiki：初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 沖縄（冲绳）](https://piapro.net/japantour2025/) (2026-11-06) |
| デコミク LIVE starring 初音ミク『Hello』 (9401) | 900000000 | 2026-02-14 | 2 × 27 | external | medium | [初音ミク Wiki：デコミク LIVE starring 初音ミク『Hello』（代代木）](https://w.atwiki.jp/hmiku/pages/72956.html) (2026-11-06) |
| ミクFES '09（夏） (3000000002) | 900000001 | 2009-08-31 | 1 × 28 | external | high | [初音ミク公式ブログ：ミクFES '09（夏）アフターリポート<br>初音ミク Wiki：ミクFES '09（夏）（东京）](https://blog.piapro.net/2009/09/fes09.html) (2026-11-06) |
| MIKU FES '24（春） (3000000003) | 900000001 | 2024-03-31 | 1 × 23 | external | high | [MIKU FES '24（春）公式サイト<br>初音ミク Wiki：MIKU FES '24（春）（东京）](https://mikufes24spring.jp/) (2026-11-06) |
| 夏の終わりの39祭り (3000000004) | 900000002 | 2012-08-29 | 1 × 4 | external | medium | [電撃オンライン：夏の終わりの39祭り レポート<br>初音ミク Wiki：夏の終わりの39祭り（横滨）](https://dengekionline.com/elem/000/000/528/528109/index-2.html) (2026-11-06) |
| 「夏祭初音鑑」大阪公演 (3000000005) | 900000003 | 2013-08-03 | 10 × 11 | external | high | [夏祭初音鑑 公式特設ページ<br>初音ミク公式ブログ：夏祭初音鑑 大阪公演 開催決定<br>Sanka Blog：「夏祭初音鑑」大阪公演（大阪）](http://kc-i.jp/hatsuap/) (2026-11-06) |
| 「夏祭初音鑑」東京公演 (3000000010) | 900000003 | 2013-08-21 | 18 × 20 | external | high | [夏祭初音鑑 公式特設ページ<br>初音ミクみく：「夏祭初音鑑」東京公演（东京）<br>ASCII.jp：夏祭初音鑑 東京公演<br>電撃オンライン：夏祭初音鑑 東京公演 スケジュール<br>KADOKAWA：夏祭初音鑑 東京公演 開催告知](http://kc-i.jp/hatsuap/) (2026-11-06) |
| 初音ミク GALAXY LIVE 2020 (3000000006) | 900000004 | 2020-09-26 | 2 × 8 | external | high | [初音ミク GALAXY LIVE 公式サイト<br>初音ミク Wiki：初音ミク GALAXY LIVE 2020（线上）](https://galaxy-live.net/) (2026-11-06) |
| 初音ミク GALAXY LIVE 2021 (3000000007) | 900000004 | 2021-12-18 | 2 × 12 | external | high | [初音ミク GALAXY LIVE 公式サイト<br>初音ミク Wiki：初音ミク GALAXY LIVE 2021（线上）](https://galaxy-live.net/) (2026-11-06) |
| 初音ミク LAWSON 50th Anniversary Special LIVE (3000000008) | 900000005 | 2026-01-17 | 3 × 24 | external | high | [ローソン 50th Anniversary Special LIVE 特設サイト<br>初音ミク Wiki：初音ミク LAWSON 50th Anniversary Special LIVE（横滨）](https://l-tike.com/lawson50thmiku/) (2026-11-06) |
| ポケモン feat. 初音ミク VOLTAGE Live！ (3000000009) | 900000006 | 2026-03-20 | 6 × 27 | external | high | [ポケモン feat. 初音ミク VOLTAGE Live！ 公式サイト<br>VOLTAGE Live！官方：ポケモン feat. 初音ミク VOLTAGE Live！（千叶）](https://www.project-voltage.jp/live2026/) (2026-11-06) |
| 初音ミク×TOUCH！WOWOW2014 スペシャルライブ (3000000012) | 900000007 | 2014-11-01 | 1 × 8 | external | high | [初音ミク公式ブログ：初音ミク×TOUCH！WOWOW2014 スペシャルライブ レポ<br>mikudoc：行ってきた 初音ミク WOWOW スペシャルライブ<br>日替わり NAT’s Champloo：初音ミク×TOUCH！WOWOW2014 スペシャルライブ](https://blog.piapro.net/2014/11/z1411081-1.html) (2026-11-22) |

Total: 215 performances, 254 source rows.

---

## 2. No per-day times on wiki or official pages (2 performances)

These 演出 span multiple days, but sources checked only give a date range—no daily show count and no start times. We currently count **one 场次 per calendar day**. **If you know a stop has separate matinee and evening shows, tell us the stop name.**

### 900000004

**2.1 · 初音ミク GALAXY LIVE 2020** (演出 3000000006, 2020-09-26 – 2020-09-27, currently 2 场次 × 8 tracks)

- Checked: 初音ミク GALAXY LIVE 公式サイト / 初音ミク Wiki：初音ミク GALAXY LIVE 2020（线上）—date range only or no daily show count, no per-day times
  - https://galaxy-live.net/

- [ ] One show per day—keep as-is
- [ ] Matinee + evening (note in comments: stop name + source)

> Notes:

**2.2 · 初音ミク GALAXY LIVE 2021** (演出 3000000007, 2021-12-18 – 2021-12-19, currently 2 场次 × 12 tracks)

- Checked: 初音ミク GALAXY LIVE 公式サイト / 初音ミク Wiki：初音ミク GALAXY LIVE 2021（线上）—date range only or no daily show count, no per-day times
  - https://galaxy-live.net/

- [ ] One show per day—keep as-is
- [ ] Matinee + evening (note in comments: stop name + source)

> Notes:

---

## 3. Conflicts resolved from wiki this round (please verify)

Date conflicts you already ruled on, full show tables filled from official pages and Moegirl, and row-note fixes from wiki are listed here. **On conflict, prefer wiki / official pages**; we change our derived layer only, not VocaDB.

### 3.1 · MIKU EXPO 2015 in Shanghai (演出 1940) (processed per your ruling)

- Conflict: Fandom lists 6/26–6/27; VocaDB lists 6/27–6/28
- Resolution: Official poster (SCLA, archived 2019-07-22) and Moegirl both say 6/27–6/28, with matinee 13:00 + evening 19:00 on each day (4 shows). Fandom’s 6/26–6/27 is not used; we expand to 4 shows on 6/27–6/28.
- Source: https://web.archive.org/web/20190722050158/http://www.scla.com.cn/hatsunemiku/
- Source: https://zh.moegirl.org.cn/HATSUNE_MIKU_EXPO_2015_in_Shanghai

### 3.2 · 初音ミクライブパーティー 2011 Sapporo (演出 2526) (processed per your ruling)

- Conflict: Fandom only lists 8/17; VocaDB has 8/16–8/17
- Resolution: 5pb. official page (archived 2012-05-12) says 8/16–8/17, one show per day; matches VocaDB; Fandom not used.
- Source: https://web.archive.org/web/20120512094239/http://5pb.jp/mikupa/index_sapporo.html

### 3.3 · 初音ミク「マジカルミライ 2021」in OSAKA (演出 3305)

- Issue: VocaDB tagged スノーマン as “Day 1 / Day 3”, making Osaka Day 3 count 26 tracks
- Resolution: VocaDB Fandom per-day lists: Osaka Days 1–3 each have 25 tracks; スノーマン only on Day 1. Row limited to Day 1; Day 3 back to 25.
- Source: https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2021

### 3.4 · 初音ミク「マジカルミライ 2024」in OSAKA (演出 7217)

- Issue: VocaDB only had “Osaka Day 1”, so Osaka Day 3 had only 18 tracks
- Resolution: Fandom splits Osaka into “Day 1 & 3” and “Day 2”; Days 1 and 3 share the same list. Added Osaka Day 3 on matching rows; all six shows back to 24 tracks.
- Source: https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2024

### 3.5 · MIKU EXPO 2024 San Jose (演出 6518)

- Issue: VocaDB attributed the third setlist to San Jose Day 2, yielding 26 on Day 2 and 20 on Day 1
- Resolution: Fandom’s three lists state the third is San Jose Day 1. Moved rows from Day 2 to Day 1; both days back to 23 tracks.
- Source: https://vocaloid.fandom.com/wiki/HATSUNE_MIKU_EXPO_2024_North_America

### 3.6 · 初音ミクライブパーティー 2012 Hong Kong (演出 2524)

- Issue: Hong Kong 24 vs Taiwan 25 tracks flagged as inconsistent by length check
- Resolution: Fandom: 23 fixed + 1 encore in HK, 2 encores in TW. 24/25 is intentional; marked explained, no longer warned.
- Source: https://vocaloid.fandom.com/wiki/Hatsune_Miku_Live_Party_2012_(Mikupa)/Hong_Kong_and_Taiwan

### 3.7 · MIKU EXPO 2016 Japan 5 cities (演出 1399 / 1400 / 1401 / 1402 / 1403)

- Issue: VocaDB had date ranges only; one show per day → 7 场次
- Resolution: Official jp2016/live and Moegirl: Fukuoka 3/23–3/24 evening only; Osaka 3/29, Nagoya 3/31, Sapporo 4/5 matinee + evening; Tokyo 4/9–4/10 matinee + evening. Total 12 shows.
- Source: https://mikuexpo.com/jp2016/live

### 3.8 · MIKU EXPO 2016 North America (演出 1924 / 1930 / 1936 … 10 cities)

- Issue: VocaDB date ranges only; 10 cities → 11 场次 by calendar day
- Resolution: Moegirl per-city table: San Francisco 4/30 and New York 5/28 matinee + evening; Mexico City 6/4 one show, 6/5 two; other 7 cities one each. Total 14 shows.
- Source: https://zh.moegirl.org.cn/MIKU_EXPO_2016

### 3.9 · MIKU EXPO 2016 mainland China (演出 1942 / 1943) and Taiwan (演出 1941)

- Issue: Mainland: 4 场次 (one per day); Taiwan: 2 场次 (one per day)
- Resolution: Moegirl: Shanghai and Beijing each matinee + evening daily (13:00 / 18:00), 8 shows; official tw2016: New Taipei 6/25 evening only, 6/26 matinee + evening, 3 shows.
- Source: https://mikuexpo.com/tw2016/

### 3.10 · MIKU EXPO 2024 / 2025 / 2026 and MIKU WITH YOU 2024

- Issue: VocaDB date ranges only; multi-day cities counted one 场次 per day
- Resolution: Moegirl totals: 2024 NA 17 cities 21 shows, 2025 Asia 8 cities 9 shows, 2026 NA 15 cities 19 shows, same start time per date → one show per date; MIKU WITH YOU 2024 three cities 12 shows = 3 × 2 days × matinee + evening, 23 tracks each.
- Source: https://zh.moegirl.org.cn/MIKU_EXPO_2024

### 3.11 · SNOW MIKU LIVE! 2019 (演出 2422) and 初音ミク×鼓童 2017 (演出 2947)

- Issue: Counted as 2 shows (one per day)
- Resolution: Moegirl: SNOW MIKU 2019 on 2/9 and 2/10 matinee + evening each (4 shows); Kodo 2017 on 3/4 evening 19:00 only, 3/5 matinee 13:00 only (2 shows, split day/night).
- Source: https://zh.moegirl.org.cn/SNOW_MIKU_LIVE!_2019

### 3.12 · 初音ミク×鼓童スペシャルライブ２０１８ (演出 2948)

- Issue: VocaDB date range only; one per day → 2 场次
- Resolution: Fandom repost of official notice: 6/2 at 13:00 and 19:00, 6/3 at 13:00 only. Updated to 3 shows.
- Source: https://vocaloid.fandom.com/wiki/Hatsune_Miku_×_Kodo_Taiko_Special_Live_2018

### 3.13 · Row-note corrections summary

| Source list | Rows touched | Notes | Source |
| --- | --- | --- | --- |
| [9909](https://vocadb.net/L/9909) | 15 | rewrote notes on 1 rows (萌娘百科 / VocaDB Fandom 的逐日歌单：大阪与东京 Day 1–3 各 25 首) | https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2021 |
| [17933](https://vocadb.net/L/17933) | 4, 6, 21, 23, 25, 27 | rewrote notes on 6 rows (Fandom：大阪分「Day 1 & 3」与「Day 2」两套；VocaDB 少了 Day 3；福冈 / 东京 / 大阪各自的场次共用一套；大阪 Day 1 & 3 相同) | https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2024 |
| [16544](https://vocadb.net/L/16544) | 13, 17, 20 | rewrote notes on 3 rows (Fandom 的三套歌单把第三套归给 San Jose Day 1；VocaDB 写成 Day 2) | https://vocaloid.fandom.com/wiki/HATSUNE_MIKU_EXPO_2024_North_America |
| [31](https://vocadb.net/L/31) | — | explained 1 length deltas (Fandom：23 首固定 + 香港 1 首安可、台湾 2 首安可) | https://vocaloid.fandom.com/wiki/Hatsune_Miku_Live_Party_2012_(Mikupa)/Hong_Kong_and_Taiwan |
| [1000040398](https://vocadb.net/L/1000040398) | — | explained 2 length deltas (百科逐曲表：横浜 25 行；神戸多一首神戸限定的ダブルアンコール) | https://w.atwiki.jp/hmiku/pages/80537.html |

---

## 4. Notes that stop at city level (6 lists, settled via wiki)

These source lists note cities only (e.g. `Osaka`, `Shanghai, Beijing`). Wiki gives city-level setlists, meaning “city only” implies **all 场次 in that city share one program**; applied per city, no longer marked uncertain.

| Source list | Basis | Source |
| --- | --- | --- |
| [17933](https://vocadb.net/L/17933) | Fandom：大阪分「Day 1 & 3」与「Day 2」两套；VocaDB 少了 Day 3；福冈 / 东京 / 大阪各自的场次共用一套；大阪 Day 1 & 3 相同 | [source](https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2024) |
| [7852](https://vocadb.net/L/7852) | 大阪与东京各一套 27 首歌单，各城市所有场次相同 | [source](https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2018) |
| [7986](https://vocadb.net/L/7986) | 北京 / 成都 / 上海各一套歌单，同城各场相同 | [source](https://vocaloid.fandom.com/wiki/MIKU_WITH_YOU_2018) |
| [9359](https://vocadb.net/L/9359) | A 版（上海、北京）与 B 版（成都、广州），同城各场相同 | [source](https://vocaloid.fandom.com/wiki/MIKU_WITH_YOU_2019) |
| [20912](https://vocadb.net/L/20912) | 仙台 / 大阪 / 东京各自的场次共用一套 | [source](https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2025) |
| [27886](https://vocadb.net/L/27886) | 滨松 / 大阪 / 东京各自的场次共用一套 | [source](https://vocaloid.fandom.com/wiki/Hatsune_Miku_Magical_Mirai_2026) |

---

## 4b. Performances with per-track wiki setlists (203)

These 演出 use the 初音ミク Wiki per-performance track tables: VocaDB songLists are either shared across cities or missing (Symphony uses album tracklists). Wiki tables separate 公演替 / day-night / 场次; each row has source and メドレー segment labels for line-by-line review.

| 演出 (performance) | Series | Shows × tracks | Note | Source |
| --- | --- | --- | --- | --- |
| 初音ミク「マジカルミライ 2013」in YOKOHAMA (2519) | Magical Mirai | 2 × 45 | 歌单来自初音ミク Wiki 的逐曲表（横浜），按场次分 2 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2013」in YOKOHAMA（横浜）](https://w.atwiki.jp/hmiku/pages/67111.html) |
| 初音ミク「マジカルミライ 2014」in OSAKA (2517) | Magical Mirai | 2 × 50 | 歌单来自初音ミク Wiki 的逐曲表（大阪），25 行 | Official ticket page lists separately scheduled daytime and evening concerts on 2014-08-30 at INTEX Osaka Hall 5 (START 12:30 / 17:00). Exhibition Hall 4 is not a concert. Existing programme and song IDs are preserved. | [Magical Mirai 2014 Osaka official concert ticket page,初音ミク Wiki：初音ミク「マジカルミライ 2014」in OSAKA（大阪）](https://magicalmirai.com/2014/ticket_osaka.html) |
| 初音ミク「マジカルミライ 2014」in TOKYO (2518) | Magical Mirai | 2 × 50 | 歌单来自初音ミク Wiki 的逐曲表（东京），25 行 | Official ticket page lists separately scheduled daytime and evening concerts on 2014-09-20 at Tokyo Metropolitan Gymnasium (START 13:00 / 18:00). Existing programme and song IDs are preserved. | [Magical Mirai 2014 Tokyo official concert ticket page,初音ミク Wiki：初音ミク「マジカルミライ 2014」in TOKYO（东京）](https://magicalmirai.com/2014/ticket_tokyo.html) |
| 初音ミク「マジカルミライ 2018」in OSAKA (1561) | Magical Mirai | 4 × 104 | 歌单来自初音ミク Wiki 的逐曲表（大阪），26 行 | [初音ミク Wiki：初音ミク「マジカルミライ 2018」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67122.html) |
| 初音ミク「マジカルミライ 2018」in TOKYO (1745) | Magical Mirai | 4 × 104 | 歌单来自初音ミク Wiki 的逐曲表（东京），26 行 | [初音ミク Wiki：初音ミク「マジカルミライ 2018」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67122.html) |
| 初音ミク「マジカルミライ 2021」in OSAKA (3305) | Magical Mirai | 5 × 125 | 歌单来自初音ミク Wiki 的逐曲表（大阪），按场次分 5 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2021」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67125.html) |
| 初音ミク「マジカルミライ 2021」in TOKYO (3306) | Magical Mirai | 6 × 150 | 歌单来自初音ミク Wiki 的逐曲表（东京），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2021」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67125.html) |
| 初音ミク「マジカルミライ」10th Anniversary in OSAKA (4233) | Magical Mirai | 5 × 125 | 歌单来自初音ミク Wiki 的逐曲表（大阪），按场次分 5 份 | [初音ミク Wiki：初音ミク「マジカルミライ」10th Anniversary in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/66656.html) |
| 初音ミク「マジカルミライ」10th Anniversary in TOKYO (4234) | Magical Mirai | 6 × 150 | 歌单来自初音ミク Wiki 的逐曲表（东京），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ」10th Anniversary in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/66656.html) |
| 初音ミク「マジカルミライ 2023」in OSAKA (6045) | Magical Mirai | 6 × 144 | 歌单来自初音ミク Wiki 的逐曲表（大阪），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2023」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67126.html) |
| 初音ミク「マジカルミライ 2023」in TOKYO (6046) | Magical Mirai | 6 × 144 | 歌单来自初音ミク Wiki 的逐曲表（东京），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2023」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67126.html) |
| 初音ミク「マジカルミライ 2024」in FUKUOKA (7214) | Magical Mirai | 4 × 96 | 歌单来自初音ミク Wiki 的逐曲表（福冈），按场次分 4 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2024」in FUKUOKA（福冈）](https://w.atwiki.jp/hmiku/pages/66797.html) |
| 初音ミク「マジカルミライ 2024」in TOKYO (7215) | Magical Mirai | 6 × 144 | 歌单来自初音ミク Wiki 的逐曲表（东京），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2024」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/66797.html) |
| 初音ミク「マジカルミライ 2024」in OSAKA (7217) | Magical Mirai | 6 × 144 | 歌单来自初音ミク Wiki 的逐曲表（大阪），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2024」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/66797.html) |
| 初音ミク「マジカルミライ 2025」in SENDAI (8768) | Magical Mirai | 5 × 125 | 歌单来自初音ミク Wiki 的逐曲表（仙台），按场次分 5 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2025」in SENDAI（仙台）](https://w.atwiki.jp/hmiku/pages/67127.html) |
| 初音ミク「マジカルミライ 2025」in OSAKA (8769) | Magical Mirai | 6 × 150 | 歌单来自初音ミク Wiki 的逐曲表（大阪），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2025」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/67127.html) |
| 初音ミク「マジカルミライ 2025」in TOKYO (8770) | Magical Mirai | 6 × 150 | 歌单来自初音ミク Wiki 的逐曲表（东京），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2025」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/67127.html) |
| 初音ミク「マジカルミライ 2026」in HAMAMATSU (12249) | Magical Mirai | 6 × 156 | 歌单来自初音ミク Wiki 的逐曲表（浜松），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2026」in HAMAMATSU（浜松）](https://w.atwiki.jp/hmiku/pages/71541.html) |
| 初音ミク「マジカルミライ 2026」in OSAKA (12250) | Magical Mirai | 6 × 156 | 歌单来自初音ミク Wiki 的逐曲表（大阪），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2026」in OSAKA（大阪）](https://w.atwiki.jp/hmiku/pages/71541.html) |
| 初音ミク「マジカルミライ 2026」in TOKYO (12251) | Magical Mirai | 6 × 156 | 歌单来自初音ミク Wiki 的逐曲表（东京），按场次分 6 份 | [初音ミク Wiki：初音ミク「マジカルミライ 2026」in TOKYO（东京）](https://w.atwiki.jp/hmiku/pages/71541.html) |
| MIKU EXPO 2014 Jakarta (1939) | MIKU EXPO | 3 × 81 | 歌单来自初音ミク Wiki 的逐曲表（雅加达），27 行 | [初音ミク Wiki：MIKU EXPO 2014 Jakarta（雅加达）](https://w.atwiki.jp/hmiku/pages/67130.html) |
| MIKU EXPO 2014 Los Angeles (1937) | MIKU EXPO | 2 × 54 | 歌单来自初音ミク Wiki 的逐曲表（洛杉矶 / 纽约），27 行 | [初音ミク Wiki：MIKU EXPO 2014 Los Angeles（洛杉矶 / 纽约）](https://w.atwiki.jp/hmiku/pages/67131.html) |
| MIKU EXPO 2014 New York (1938) | MIKU EXPO | 2 × 54 | 歌单来自初音ミク Wiki 的逐曲表（洛杉矶 / 纽约），27 行 | [初音ミク Wiki：MIKU EXPO 2014 New York（洛杉矶 / 纽约）](https://w.atwiki.jp/hmiku/pages/67131.html) |
| MIKU EXPO 2016 Fukuoka (1399) | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（福冈），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Fukuoka（福冈）](https://w.atwiki.jp/hmiku/pages/67048.html) |
| MIKU EXPO 2016 Osaka (1400) | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（大阪），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Osaka（大阪）](https://w.atwiki.jp/hmiku/pages/67048.html) |
| MIKU EXPO 2016 Nagoya (1401) | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（名古屋），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Nagoya（名古屋）](https://w.atwiki.jp/hmiku/pages/67048.html) |
| MIKU EXPO 2016 Sapporo (1402) | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（札幌），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Sapporo（札幌）](https://w.atwiki.jp/hmiku/pages/67048.html) |
| MIKU EXPO 2016 Tokyo (1403) | MIKU EXPO | 4 × 104 | 歌单来自初音ミク Wiki 的逐曲表（东京），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Tokyo（东京）](https://w.atwiki.jp/hmiku/pages/67048.html) |
| MIKU EXPO 2016 Seattle (1859) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（西雅图），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Seattle（西雅图）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 San Francisco (1930) | MIKU EXPO | 2 × 54 | 歌单来自初音ミク Wiki 的逐曲表（旧金山），27 行 | [初音ミク Wiki：MIKU EXPO 2016 San Francisco（旧金山）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 Los Angeles (1931) | MIKU EXPO | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（洛杉矶），27 行 | [初音ミク Wiki：MIKU EXPO 2016 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 Dallas (1932) | MIKU EXPO | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（达拉斯），27 行 | [初音ミク Wiki：MIKU EXPO 2016 Dallas（达拉斯）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 Houston (1933) | MIKU EXPO | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（休斯敦），27 行 | [初音ミク Wiki：MIKU EXPO 2016 Houston（休斯敦）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 Toronto (1934) | MIKU EXPO | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（多伦多），27 行 | [初音ミク Wiki：MIKU EXPO 2016 Toronto（多伦多）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 Chicago (1935) | MIKU EXPO | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（芝加哥），27 行 | [初音ミク Wiki：MIKU EXPO 2016 Chicago（芝加哥）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 New York (1936) | MIKU EXPO | 2 × 54 | 歌单来自初音ミク Wiki 的逐曲表（纽约），27 行 | [初音ミク Wiki：MIKU EXPO 2016 New York（纽约）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 Monterrey (1860) | MIKU EXPO | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（蒙特雷），27 行 | [初音ミク Wiki：MIKU EXPO 2016 Monterrey（蒙特雷）](https://w.atwiki.jp/hmiku/pages/67134.html) |
| MIKU EXPO 2016 Mexico City (1924) | MIKU EXPO | 3 × 81 | 歌单来自初音ミク Wiki 的逐曲表（墨西哥城），27 行 | Schedule corrected against the final official 2016 tour page: June 4 has day and night shows (2:30pm / 8:30pm, both FINISHED); June 5 has only the daytime show (2:30pm FINISHED). June 5 night (8:30pm) is explicitly CANCEL and must not become a performed show. | [MIKU EXPO 2016 NORTH AMERICA — final official schedule,初音ミク Wiki：MIKU EXPO 2016 Mexico City（墨西哥城）](https://mikuexpo.com/na2016/) |
| MIKU EXPO 2016 New Taipei City (1941) | MIKU EXPO | 3 × 78 | 歌单来自初音ミク Wiki 的逐曲表（台北），按场次分 3 份 | [初音ミク Wiki：MIKU EXPO 2016 New Taipei City（台北）](https://w.atwiki.jp/hmiku/pages/67135.html) |
| MIKU EXPO 2016 Shanghai (1943) | MIKU EXPO | 4 × 104 | 歌单来自初音ミク Wiki 的逐曲表（上海），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67136.html) |
| MIKU EXPO 2016 Beijing (1942) | MIKU EXPO | 4 × 104 | 歌单来自初音ミク Wiki 的逐曲表（北京），26 行 | [初音ミク Wiki：MIKU EXPO 2016 Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67136.html) |
| MIKU EXPO 2017 Kuala Lumpur (1584) | MIKU EXPO | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（吉隆坡），27 行 | [初音ミク Wiki：MIKU EXPO 2017 Kuala Lumpur（吉隆坡）](https://w.atwiki.jp/hmiku/pages/67137.html) |
| MIKU EXPO 2018 Los Angeles (1673) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（洛杉矶），26 行；百科对这 2 首只标了 ※、没写属于哪些城市，无法归位：「Miku」、「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2018 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/67060.html) |
| MIKU EXPO 2018 San Jose (1674) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（圣何塞），26 行；百科对这 2 首只标了 ※、没写属于哪些城市，无法归位：「Miku」、「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2018 San Jose（圣何塞）](https://w.atwiki.jp/hmiku/pages/67060.html) |
| MIKU EXPO 2018 Dallas (1675) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（达拉斯），26 行；百科对这 2 首只标了 ※、没写属于哪些城市，无法归位：「Miku」、「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2018 Dallas（达拉斯）](https://w.atwiki.jp/hmiku/pages/67060.html) |
| MIKU EXPO 2018 Austin (1676) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（奥斯汀），26 行；百科对这 2 首只标了 ※、没写属于哪些城市，无法归位：「Miku」、「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2018 Austin（奥斯汀）](https://w.atwiki.jp/hmiku/pages/67060.html) |
| MIKU EXPO 2018 Washington, D.C. (1677) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（华盛顿），26 行；百科对这 2 首只标了 ※、没写属于哪些城市，无法归位：「Miku」、「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2018 Washington, D.C.（华盛顿）](https://w.atwiki.jp/hmiku/pages/67060.html) |
| MIKU EXPO 2018 New York (1678) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（纽约），26 行；百科对这 2 首只标了 ※、没写属于哪些城市，无法归位：「Miku」、「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2018 New York（纽约）](https://w.atwiki.jp/hmiku/pages/67060.html) |
| MIKU EXPO 2018 Mexico City (1925) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（墨西哥城），26 行；百科对这 2 首只标了 ※、没写属于哪些城市，无法归位：「Miku」、「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2018 Mexico City（墨西哥城）](https://w.atwiki.jp/hmiku/pages/67060.html) |
| MIKU EXPO 2018 Paris (1854) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（巴黎），26 行 | [初音ミク Wiki：MIKU EXPO 2018 Paris（巴黎）](https://w.atwiki.jp/hmiku/pages/67138.html) |
| MIKU EXPO 2018 Cologne (1855) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（科隆），26 行 | [初音ミク Wiki：MIKU EXPO 2018 Cologne（科隆）](https://w.atwiki.jp/hmiku/pages/67138.html) |
| MIKU EXPO 2018 London (1856) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（伦敦），26 行 | [初音ミク Wiki：MIKU EXPO 2018 London（伦敦）](https://w.atwiki.jp/hmiku/pages/67138.html) |
| MIKU EXPO 2019 New Taipei City (2489) | MIKU EXPO | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（台北），25 行 | [初音ミク Wiki：MIKU EXPO 2019 New Taipei City（台北）](https://w.atwiki.jp/hmiku/pages/67139.html) |
| MIKU EXPO 2019 Hong Kong (2490) | MIKU EXPO | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（香港），25 行 | [初音ミク Wiki：MIKU EXPO 2019 Hong Kong（香港）](https://w.atwiki.jp/hmiku/pages/67139.html) |
| MIKU EXPO 2020 London (2786) | MIKU EXPO | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（伦敦），25 行 | [初音ミク Wiki：MIKU EXPO 2020 London（伦敦）](https://w.atwiki.jp/hmiku/pages/67140.html) |
| MIKU EXPO 2020 Paris (2787) | MIKU EXPO | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（巴黎），25 行 | [初音ミク Wiki：MIKU EXPO 2020 Paris（巴黎）](https://w.atwiki.jp/hmiku/pages/67140.html) |
| MIKU EXPO 2020 Berlin (2788) | MIKU EXPO | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（柏林），25 行 | [初音ミク Wiki：MIKU EXPO 2020 Berlin（柏林）](https://w.atwiki.jp/hmiku/pages/67140.html) |
| MIKU EXPO 2020 Amsterdam (2789) | MIKU EXPO | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（阿姆斯特丹），25 行 | [初音ミク Wiki：MIKU EXPO 2020 Amsterdam（阿姆斯特丹）](https://w.atwiki.jp/hmiku/pages/67140.html) |
| MIKU EXPO 2021 Online (3224) | MIKU EXPO | 1 × 16 | 歌单来自初音ミク Wiki 的逐曲表（线上），16 行 | [初音ミク Wiki：MIKU EXPO 2021 Online（线上）](https://w.atwiki.jp/hmiku/pages/67074.html) |
| MIKU EXPO 2022 Rewind (4114) | MIKU EXPO | 1 × 18 | 歌单来自初音ミク Wiki 的逐曲表（线上），18 行 | [初音ミク Wiki：MIKU EXPO 2022 Rewind（线上）](https://w.atwiki.jp/hmiku/pages/67141.html) |
| MIKU EXPO 2022 Rewind+ (4490) | MIKU EXPO | 1 × 28 | 歌单来自初音ミク Wiki 的逐曲表（线上），28 行 | [初音ミク Wiki：MIKU EXPO 2022 Rewind+（线上）](https://w.atwiki.jp/hmiku/pages/67142.html) |
| MIKU EXPO 2023 VR (5751) | MIKU EXPO | 1 × 14 | 歌单来自初音ミク Wiki 的逐曲表（线上），14 行 | [初音ミク Wiki：MIKU EXPO 2023 VR（线上）](https://w.atwiki.jp/hmiku/pages/67143.html) |
| MIKU EXPO 2024 Vancouver (6516) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（温哥华），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Vancouver（温哥华）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Portland (6517) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（波特兰），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Portland（波特兰）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 San Jose (6518) | MIKU EXPO | 2 × 48 | 歌单来自初音ミク Wiki 的逐曲表（圣何塞），按场次分 2 份；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 San Jose（圣何塞）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Phoenix (6519) | MIKU EXPO | 2 × 48 | 歌单来自初音ミク Wiki 的逐曲表（凤凰城），按场次分 2 份；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Phoenix（凤凰城）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Los Angeles (7186) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（洛杉矶），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Denver (6520) | MIKU EXPO | 2 × 48 | 歌单来自初音ミク Wiki 的逐曲表（丹佛），按场次分 2 份；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Denver（丹佛）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Dallas (6521) | MIKU EXPO | 2 × 48 | 歌单来自初音ミク Wiki 的逐曲表（达拉斯），按场次分 2 份；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Dallas（达拉斯）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Austin (6522) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（奥斯汀），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Austin（奥斯汀）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Atlanta (6523) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（亚特兰大），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Atlanta（亚特兰大）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Orlando (6524) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（奥兰多），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Orlando（奥兰多）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Washington (6525) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（华盛顿），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Washington（华盛顿）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Newark (6526) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（纽瓦克），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Newark（纽瓦克）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Boston (6527) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（波士顿），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Boston（波士顿）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Detroit (6528) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（底特律），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Detroit（底特律）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Chicago (6529) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（芝加哥），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Chicago（芝加哥）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Toronto (6530) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（多伦多），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Toronto（多伦多）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 Mexico City (6531) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（墨西哥城），24 行；百科对这 1 首只标了 ※、没写属于哪些城市，无法归位：「Sharing The World（Spanish ver.）」 | [初音ミク Wiki：MIKU EXPO 2024 Mexico City（墨西哥城）](https://w.atwiki.jp/hmiku/pages/67090.html) |
| MIKU EXPO 2024 London (7266) | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（伦敦），23 行 | [初音ミク Wiki：MIKU EXPO 2024 London（伦敦）](https://w.atwiki.jp/hmiku/pages/67145.html) |
| MIKU EXPO 2024 Brussels (7267) | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（布鲁塞尔），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Brussels（布鲁塞尔）](https://w.atwiki.jp/hmiku/pages/67145.html) |
| MIKU EXPO 2024 Paris (7268) | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（巴黎），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Paris（巴黎）](https://w.atwiki.jp/hmiku/pages/67145.html) |
| MIKU EXPO 2024 Amsterdam (7269) | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（阿姆斯特丹），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Amsterdam（阿姆斯特丹）](https://w.atwiki.jp/hmiku/pages/67145.html) |
| MIKU EXPO 2024 Düsseldorf (7270) | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（杜塞尔多夫），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Düsseldorf（杜塞尔多夫）](https://w.atwiki.jp/hmiku/pages/67145.html) |
| MIKU EXPO 2024 Berlin (7271) | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（柏林），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Berlin（柏林）](https://w.atwiki.jp/hmiku/pages/67145.html) |
| MIKU EXPO 2024 Auckland (7765) | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（奥克兰），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Auckland（奥克兰）](https://w.atwiki.jp/hmiku/pages/67146.html) |
| MIKU EXPO 2024 Brisbane (7766) | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（布里斯班），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Brisbane（布里斯班）](https://w.atwiki.jp/hmiku/pages/67146.html) |
| MIKU EXPO 2024 Sydney (7767) | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（悉尼），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Sydney（悉尼）](https://w.atwiki.jp/hmiku/pages/67146.html) |
| MIKU EXPO 2024 Melbourne (7768) | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（墨尔本），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Melbourne（墨尔本）](https://w.atwiki.jp/hmiku/pages/67146.html) |
| MIKU EXPO 2024 Perth (7769) | MIKU EXPO | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（珀斯），23 行 | [初音ミク Wiki：MIKU EXPO 2024 Perth（珀斯）](https://w.atwiki.jp/hmiku/pages/67146.html) |
| MIKU EXPO 2025 Bangkok (9341) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（曼谷），24 行 | [初音ミク Wiki：MIKU EXPO 2025 Bangkok（曼谷）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2025 Hong Kong (9348) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（香港），24 行 | [初音ミク Wiki：MIKU EXPO 2025 Hong Kong（香港）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2025 Jakarta (9349) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（雅加达），24 行 | [初音ミク Wiki：MIKU EXPO 2025 Jakarta（雅加达）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2025 Manila (9350) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（马尼拉），24 行 | [初音ミク Wiki：MIKU EXPO 2025 Manila（马尼拉）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2025 Singapore (9351) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（新加坡），24 行 | [初音ミク Wiki：MIKU EXPO 2025 Singapore（新加坡）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2025 Kuala Lumpur (9352) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（吉隆坡），24 行 | [初音ミク Wiki：MIKU EXPO 2025 Kuala Lumpur（吉隆坡）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2025 Taipei (9555) | MIKU EXPO | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（台北），24 行 | [初音ミク Wiki：MIKU EXPO 2025 Taipei（台北）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2025 Seoul (9353) | MIKU EXPO | 2 × 48 | 歌单来自初音ミク Wiki 的逐曲表（首尔），按场次分 2 份 | [初音ミク Wiki：MIKU EXPO 2025 Seoul（首尔）](https://w.atwiki.jp/hmiku/pages/67470.html) |
| MIKU EXPO 2026 Chicago (9811) | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（芝加哥），按场次分 2 份 | [初音ミク Wiki：MIKU EXPO 2026 Chicago（芝加哥）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Denver (9812) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（丹佛），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Denver（丹佛）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Vancouver (9813) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（温哥华），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Vancouver（温哥华）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Seattle (9814) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（西雅图），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Seattle（西雅图）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 San Jose (9815) | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（圣何塞），按场次分 2 份 | [初音ミク Wiki：MIKU EXPO 2026 San Jose（圣何塞）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Los Angeles (9816) | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（洛杉矶），按场次分 2 份 | [初音ミク Wiki：MIKU EXPO 2026 Los Angeles（洛杉矶）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Glendale (9817) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（格伦代尔），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Glendale（格伦代尔）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Grand Prairie (9818) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（大草原城），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Grand Prairie（大草原城）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Cedar Park (9819) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（锡达帕克），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Cedar Park（锡达帕克）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Duluth (9820) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（杜鲁斯），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Duluth（杜鲁斯）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Washington (9821) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（华盛顿），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Washington（华盛顿）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Newark (9822) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（纽瓦克），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Newark（纽瓦克）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Boston (9823) | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（波士顿），按场次分 2 份 | [初音ミク Wiki：MIKU EXPO 2026 Boston（波士顿）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Hamilton (9824) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（哈密尔顿），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Hamilton（哈密尔顿）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 Mexico City (9825) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（墨西哥城），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Mexico City（墨西哥城）](https://w.atwiki.jp/hmiku/pages/68848.html) |
| MIKU EXPO 2026 London (12222) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（伦敦），26 行 | [初音ミク Wiki：MIKU EXPO 2026 London（伦敦）](https://w.atwiki.jp/hmiku/pages/71517.html) |
| MIKU EXPO 2026 Brussels (12223) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（布鲁塞尔），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Brussels（布鲁塞尔）](https://w.atwiki.jp/hmiku/pages/71517.html) |
| MIKU EXPO 2026 Amsterdam (12224) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（阿姆斯特丹），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Amsterdam（阿姆斯特丹）](https://w.atwiki.jp/hmiku/pages/71517.html) |
| MIKU EXPO 2026 Berlin (12225) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（柏林），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Berlin（柏林）](https://w.atwiki.jp/hmiku/pages/71517.html) |
| MIKU EXPO 2026 Düsseldorf (12226) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（杜塞尔多夫），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Düsseldorf（杜塞尔多夫）](https://w.atwiki.jp/hmiku/pages/71517.html) |
| MIKU EXPO 2026 Paris (12227) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（巴黎），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Paris（巴黎）](https://w.atwiki.jp/hmiku/pages/71517.html) |
| MIKU EXPO 2026 Madrid (12228) | MIKU EXPO | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（马德里），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Madrid（马德里）](https://w.atwiki.jp/hmiku/pages/71517.html) |
| MIKU EXPO 2026 Lisbon (12449) | MIKU EXPO | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（里斯本），26 行 | [初音ミク Wiki：MIKU EXPO 2026 Lisbon（里斯本）](https://w.atwiki.jp/hmiku/pages/71517.html) |
| MIKU WITH YOU 2017 in Shanghai (1619) | MIKU WITH YOU | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（北京），按场次分 2 份 | [初音ミク Wiki：MIKU WITH YOU 2017 in Shanghai（北京）](https://w.atwiki.jp/hmiku/pages/67160.html) |
| MIKU WITH YOU 2018 in Beijing (2085) | MIKU WITH YOU | 2 × 50 | 歌单来自初音ミク Wiki 的逐曲表（北京），25 行 | [初音ミク Wiki：MIKU WITH YOU 2018 in Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67175.html) |
| MIKU WITH YOU 2018 in Chengdu (2086) | MIKU WITH YOU | 2 × 50 | 歌单来自初音ミク Wiki 的逐曲表（成都），25 行 | [初音ミク Wiki：MIKU WITH YOU 2018 in Chengdu（成都）](https://w.atwiki.jp/hmiku/pages/67175.html) |
| MIKU WITH YOU 2018 in Shanghai (2087) | MIKU WITH YOU | 4 × 100 | 歌单来自初音ミク Wiki 的逐曲表（上海），25 行 | [初音ミク Wiki：MIKU WITH YOU 2018 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67175.html) |
| MIKU WITH YOU 2019 in Shanghai (3752) | MIKU WITH YOU | 4 × 100 | 歌单来自初音ミク Wiki 的逐曲表（上海），25 行 | [初音ミク Wiki：MIKU WITH YOU 2019 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67177.html) |
| MIKU WITH YOU 2019 in Chengdu (3753) | MIKU WITH YOU | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（成都），25 行 | [初音ミク Wiki：MIKU WITH YOU 2019 in Chengdu（成都）](https://w.atwiki.jp/hmiku/pages/67177.html) |
| MIKU WITH YOU 2019 in Beijing (3754) | MIKU WITH YOU | 2 × 50 | 歌单来自初音ミク Wiki 的逐曲表（北京），25 行 | [初音ミク Wiki：MIKU WITH YOU 2019 in Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67177.html) |
| MIKU WITH YOU 2019 in Guangzhou (3755) | MIKU WITH YOU | 3 × 75 | 歌单来自初音ミク Wiki 的逐曲表（广州），25 行 | [初音ミク Wiki：MIKU WITH YOU 2019 in Guangzhou（广州）](https://w.atwiki.jp/hmiku/pages/67177.html) |
| MIKU WITH YOU 2020 (3250) | MIKU WITH YOU | 1 × 18 | 歌单来自初音ミク Wiki 的逐曲表（线上），18 行 | [初音ミク Wiki：MIKU WITH YOU 2020（线上）](https://w.atwiki.jp/hmiku/pages/67178.html) |
| MIKU WITH YOU 2021 (4058) | MIKU WITH YOU | 1 × 17 | 歌单来自初音ミク Wiki 的逐曲表（线上），17 行 | [初音ミク Wiki：MIKU WITH YOU 2021（线上）](https://w.atwiki.jp/hmiku/pages/67180.html) |
| MIKU WITH YOU 2024 in Shanghai (7673) | MIKU WITH YOU | 4 × 92 | 歌单来自初音ミク Wiki 的逐曲表（上海），按场次分 4 份 | [初音ミク Wiki：MIKU WITH YOU 2024 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/67183.html) |
| MIKU WITH YOU 2024 in Beijing (7675) | MIKU WITH YOU | 4 × 92 | 歌单来自初音ミク Wiki 的逐曲表（北京），按场次分 4 份 | [初音ミク Wiki：MIKU WITH YOU 2024 in Beijing（北京）](https://w.atwiki.jp/hmiku/pages/67183.html) |
| MIKU WITH YOU 2024 in Guangzhou (7674) | MIKU WITH YOU | 4 × 92 | 歌单来自初音ミク Wiki 的逐曲表（广州），按场次分 4 份 | [初音ミク Wiki：MIKU WITH YOU 2024 in Guangzhou（广州）](https://w.atwiki.jp/hmiku/pages/67183.html) |
| MIKU WITH YOU 2025 (9644) | MIKU WITH YOU | 4 × 92 | 歌单来自初音ミク Wiki 的逐曲表（上海），按场次分 4 份 | [初音ミク Wiki：MIKU WITH YOU 2025（上海）](https://w.atwiki.jp/hmiku/pages/68149.html) |
| MIKU WITH YOU 2026 in Shanghai (13120) | MIKU WITH YOU | 4 × 96 | 歌单来自初音ミク Wiki 的逐曲表（上海），按场次分 4 份 | [初音ミク Wiki：MIKU WITH YOU 2026 in Shanghai（上海）](https://w.atwiki.jp/hmiku/pages/79886.html) |
| ミクの日感謝祭39's Giving Day (2520) | Live Party | 2 × 80 | 歌单来自初音ミク Wiki 的逐曲表（东京），40 行；日程来源：2010-03-09 Zepp Tokyo 昼 + 夜 2 场，逐曲表 40 行两场共用；昼场的嘉宾环节与夜场的应援 P MC 不计入曲目 | [初音ミク Wiki：ミクの日感謝祭39's Giving Day（东京）](https://w.atwiki.jp/hmiku/pages/67147.html) |
| 初音ミクライブパーティー 2011 Tokyo (2523) | Live Party | 1 × 39 | 歌单来自初音ミク Wiki 的逐曲表（东京），39 行 | [初音ミク Wiki：初音ミクライブパーティー 2011 Tokyo（东京）](https://w.atwiki.jp/hmiku/pages/67149.html) |
| MIKUNOPOLIS in LOS ANGELES “はじめまして、初音ミクです” (2521) | Live Party | 1 × 24 | 歌单来自初音ミク Wiki 的逐曲表（洛杉矶），24 行；日程来源：2011-07-02 洛杉矶 Nokia Theatre 单场，24 首；沿用 2010 感謝祭节目并加入英语版 | [MIKUNOPOLIS in Los Angeles 公式サイト,初音ミク Wiki：MIKUNOPOLIS in LOS ANGELES “はじめまして、初音ミクです”（洛杉矶）](http://miku.sega.jp/39/mikula_20111014.html) |
| 初音ミクライブパーティー 2011 Sapporo (2526) | Live Party | 2 × 52 | 歌单来自初音ミク Wiki 的逐曲表（札幌），26 行 | [初音ミク Wiki：初音ミクライブパーティー 2011 Sapporo（札幌）](https://w.atwiki.jp/hmiku/pages/67150.html) |
| 初音ミクライブパーティー 2011 Singapore (2527) | Live Party | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（新加坡），27 行；第 21 首按 VocaDB 歌单 1 登记为「Fire◎Flower 2011」（S/3383，2011 版），百科逐曲表只写曲名 | [VocaDB：Hatsune Miku Live Party 2011 Mikupa♪ Singapore,初音ミク Wiki：初音ミクライブパーティー 2011 Singapore（新加坡）](https://vocadb.net/L/1) |
| 初音ミクライブパーティー 2012 Tokyo (4056) | Live Party | 2 × 66 | 歌单来自初音ミク Wiki 的逐曲表（东京），33 行 | Official SEGA announcement lists separately scheduled MikuPa daytime and evening concerts on 2012-03-08 (START 14:00 / 19:00). This is distinct from the 2012-03-09 Thanksgiving finale already catalogued as 3000000011. Existing programme and song IDs are preserved. | [SEGA: Miku Day Thanksgiving 2012 official performance announcement,初音ミク Wiki：初音ミクライブパーティー 2012 Tokyo（东京）](https://info.miku.sega.jp/489) |
| 初音ミクコンサート 最後のミクの日感謝祭 (3000000011) | Live Party | 2 × 58 | 歌单来自初音ミク Wiki 的逐曲表（东京），29 行；另有 1 首未登记（同曲再演或检索未命中），未计入：「ワールドイズマイン（ダブルアンコール）」；日程来源：2012-03-09 TOKYO DOME CITY HALL 昼 + 夜 2 场，每场 29 首；昼场音响故障后「ワールドイズマイン」再演不计入曲数 | [ミクの日大感謝祭 公式サイト,初音ミク Wiki：初音ミクコンサート 最後のミクの日感謝祭（东京）](https://miku.sega.jp/39/) |
| 初音ミクライブパーティー 2012 Hong Kong (2524) | Live Party | 2 × 50 | 歌单来自初音ミク Wiki 的逐曲表（香港），25 行 | Official retrospective confirms two shows on 2012-10-02 at KITEC Star Hall (15:00 and 20:00). Existing programme and song IDs are preserved. | [Hatsune Miku Official Blog: Hong Kong MikuPa 2012 retrospective,初音ミク Wiki：初音ミクライブパーティー 2012 Hong Kong（香港）](https://blog.piapro.net/2012/10/post-576.html) |
| 初音ミクライブパーティー 2012 Taiwan (2525) | Live Party | 2 × 50 | 歌单来自初音ミク Wiki 的逐曲表（台北），25 行 | Sony Music Taiwan announcement lists two shows on 2012-10-06 at Taipei Show (台北展演二館), 14:00 and 19:00. Existing programme and song IDs are preserved. | [Sony Music Taiwan: MikuPa 2012 Taiwan announcement,初音ミク Wiki：初音ミクライブパーティー 2012 Taiwan（台北）](https://sonymusic.com.tw/news/%e5%ae%87%e5%ae%99%e6%9c%80%e5%bc%b7%e8%99%9b%e6%93%ac%e5%81%b6%e5%83%8f%e5%88%9d%e9%9f%b3%e6%9c%aa%e4%be%8610%e6%9c%886%e6%97%a5%e4%be%86%e5%8f%b0%e9%96%8b%e5%94%b1/) |
| 初音ミクライブパーティー 2013 Sapporo (2510) | Live Party | 4 × 104 | 歌单来自初音ミク Wiki 的逐曲表（札幌），26 行 | [初音ミク Wiki：初音ミクライブパーティー 2013 Sapporo（札幌）](https://w.atwiki.jp/hmiku/pages/67154.html) |
| 初音ミクライブパーティー 2013 Kansai (2511) | Live Party | 1 × 39 | 歌单来自初音ミク Wiki 的逐曲表（关西），39 行 | [初音ミク Wiki：初音ミクライブパーティー 2013 Kansai（关西）](https://w.atwiki.jp/hmiku/pages/66967.html) |
| 初音ミク×鼓童スペシャルライブ (2947) | Kodo | 3 × 66 | 歌单来自初音ミク Wiki 的逐曲表（NHK 大厅），22 行；其中 3 首不是 VOCALOID 歌曲（器乐曲、民谣・传统曲），按普通曲目登记、没有对应歌手 | The official 2017-01-10 Kodo announcement adds the March 5 19:00 show. That page is schedule evidence only, not a programme source. The existing 22-song Hatsune Miku Wiki table for this concert has no per-show when values; it is an event-level programme already used for the other two shows. No independent half-specific setlist for the added evening show is recorded. | [初音ミク Wiki：初音ミク×鼓童スペシャルライブ（NHK 大厅）,Kodo: additional Hatsune Miku × Kodo performance announced](https://w.atwiki.jp/hmiku/pages/67219.html) |
| 初音ミク×鼓童スペシャルライブ２０１８ (2948) | Kodo | 3 × 78 | 歌单来自初音ミク Wiki 的逐曲表（NHK 大厅），26 行；其中 5 首不是 VOCALOID 歌曲（器乐曲），按普通曲目登记、没有对应歌手 | [初音ミク Wiki：初音ミク×鼓童スペシャルライブ２０１８（NHK 大厅）](https://w.atwiki.jp/hmiku/pages/67230.html) |
| 初音ミク×鼓童スペシャルライブ２０２３ ～結～ (5910) | Kodo | 3 × 72 | 歌单来自初音ミク Wiki 的逐曲表（NHK 大厅），按场次分 3 份；其中 5 首不是 VOCALOID 歌曲（器乐曲），按普通曲目登记、没有对应歌手 | [初音ミク Wiki：初音ミク×鼓童スペシャルライブ２０２３ ～結～（NHK 大厅）](https://w.atwiki.jp/hmiku/pages/67232.html) |
| 初音ミク×鼓童スペシャルライブ～響演～ (12940) | Kodo | 2 × 36 | 歌单来自初音ミク Wiki 的逐曲表（NHK 大厅），18 行；其中 1 首不是 VOCALOID 歌曲（器乐曲），按普通曲目登记、没有对应歌手；日程来源：官方页：2026-11-20 仅夜场（开场 18:00／开演 19:00），11-21 仅昼场（开场 12:00／开演 13:00），共 2 场。百科注明鼓童原创曲名未定、曲顺暂定 | [鼓童×初音ミク 響演 公式サイト,初音ミク Wiki：初音ミク×鼓童スペシャルライブ～響演～（NHK 大厅）](https://kyouen-kodo-miku.com/) |
| 初音ミクシンフォニー 2016 東京都 (2957) | Symphony | 1 × 29 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），29 行 | [初音ミク Wiki：初音ミクシンフォニー 2016 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80167.html) |
| 初音ミクシンフォニー 2017 大阪市 (2958) | Symphony | 1 × 28 | 歌单来自初音ミク Wiki 的逐曲表（大阪公演），28 行 | [初音ミク Wiki：初音ミクシンフォニー 2017 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80237.html) |
| 初音ミクシンフォニー 2017 東京都 (2959) | Symphony | 1 × 29 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），29 行 | [初音ミク Wiki：初音ミクシンフォニー 2017 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80237.html) |
| 初音ミクシンフォニー 2018-2019 東京都 (2504) | Symphony | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），25 行 | [初音ミク Wiki：初音ミクシンフォニー 2018-2019 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80287.html) |
| 初音ミクシンフォニー 2018-2019 大阪市 (2960) | Symphony | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（大阪公演），26 行 | [初音ミク Wiki：初音ミクシンフォニー 2018-2019 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80287.html) |
| 初音ミクシンフォニー 2019 横浜市 (2870) | Symphony | 1 × 28 | 歌单来自初音ミク Wiki 的逐曲表（横浜公演），28 行 | [初音ミク Wiki：初音ミクシンフォニー 2019 横浜市（横浜公演）](https://w.atwiki.jp/hmiku/pages/80354.html) |
| 初音ミクシンフォニー 2019 大阪市 (2871) | Symphony | 1 × 28 | 歌单来自初音ミク Wiki 的逐曲表（大阪公演），28 行；其中 3 首不是 VOCALOID 歌曲（古典・管弦乐曲、民谣・传统曲），按普通曲目登记、没有对应歌手 | [初音ミク Wiki：初音ミクシンフォニー 2019 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80354.html) |
| 初音ミクシンフォニー 2020 〜5th Anniversary〜 東京都 (2954) | Symphony | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），23 行 | [初音ミク Wiki：初音ミクシンフォニー 2020 〜5th Anniversary〜 東京都（東京公演）](https://w.atwiki.jp/hmiku/pages/80404.html) |
| 初音ミクシンフォニー 2020 〜5th Anniversary〜 横浜市 (2955) | Symphony | 1 × 19 | 歌单来自初音ミク Wiki 的逐曲表（横浜公演），19 行 | [初音ミク Wiki：初音ミクシンフォニー 2020 〜5th Anniversary〜 横浜市（横浜公演）](https://w.atwiki.jp/hmiku/pages/80404.html) |
| 初音ミクシンフォニー 2020 〜5th Anniversary〜 大阪市 (2956) | Symphony | 1 × 18 | 歌单来自初音ミク Wiki 的逐曲表（大阪公演），18 行 | [初音ミク Wiki：初音ミクシンフォニー 2020 〜5th Anniversary〜 大阪市（大阪公演）](https://w.atwiki.jp/hmiku/pages/80404.html) |
| 初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 横浜市 (3710) | Symphony | 1 × 20 | 歌单来自初音ミク Wiki 的逐曲表（横浜公演），20 行 | [初音ミク Wiki：初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 横浜市（横浜公演）](https://w.atwiki.jp/hmiku/pages/80422.html) |
| 初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 神戸市 (3869) | Symphony | 1 × 20 | 歌单来自初音ミク Wiki 的逐曲表（神戸公演），20 行 | [初音ミク Wiki：初音ミクシンフォニー 2021 〜KAITO 15th Anniversary〜 神戸市（神戸公演）](https://w.atwiki.jp/hmiku/pages/80422.html) |
| 初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 東京 (4322) | Symphony | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），25 行 | [初音ミク Wiki：初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80506.html) |
| 初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 横浜 (4808) | Symphony | 1 × 22 | 歌单来自初音ミク Wiki 的逐曲表（横浜公演），22 行 | [初音ミク Wiki：初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80506.html) |
| 初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 大阪 (4814) | Symphony | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（大阪公演），23 行 | [初音ミク Wiki：初音ミクシンフォニー 2022 〜Hatsune Miku,Kagamine Rin,Kagamine Len 15th Anniversary〜 大阪（大阪公演）](https://w.atwiki.jp/hmiku/pages/80506.html) |
| 初音ミクシンフォニー 2023 東京 (4877) | Symphony | 1 × 22 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），22 行 | [初音ミク Wiki：初音ミクシンフォニー 2023 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80537.html) |
| 初音ミクシンフォニー 2023 横浜 (4878) | Symphony | 1 × 25 | 歌单来自初音ミク Wiki 的逐曲表（横浜公演），25 行 | [初音ミク Wiki：初音ミクシンフォニー 2023 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80537.html) |
| 初音ミクシンフォニー 2023 神戸 (4879) | Symphony | 1 × 26 | 歌单来自初音ミク Wiki 的逐曲表（神戸公演），26 行 | [初音ミク Wiki：初音ミクシンフォニー 2023 神戸（神戸公演）](https://w.atwiki.jp/hmiku/pages/80537.html) |
| 初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 東京 (12709) | Symphony | 1 × 21 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），21 行 | [初音ミク Wiki：初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80641.html) |
| 初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 横浜 (8033) | Symphony | 1 × 22 | 歌单来自初音ミク Wiki 的逐曲表（横浜公演），22 行 | [初音ミク Wiki：初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80641.html) |
| 初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 神戸 (8035) | Symphony | 1 × 22 | 歌单来自初音ミク Wiki 的逐曲表（神戸公演），22 行 | [初音ミク Wiki：初音ミクシンフォニー 2024 〜Luka 15th Anniversary〜 神戸（神戸公演）](https://w.atwiki.jp/hmiku/pages/80641.html) |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 札幌 (8037) | Symphony | 1 × 27 | 歌单来自初音ミク Wiki 的逐曲表（札幌公演），27 行 | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 札幌（札幌公演）](https://w.atwiki.jp/hmiku/pages/80551.html) |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 大阪 (8710) | Symphony | 1 × 16 | 歌单来自初音ミク Wiki 的逐曲表（大阪公演），16 行 | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 大阪（大阪公演）](https://w.atwiki.jp/hmiku/pages/80551.html) |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 東京 (8711) | Symphony | 1 × 17 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），17 行 | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80551.html) |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 横浜 (9267) | Symphony | 1 × 30 | 歌单来自初音ミク Wiki 的逐曲表（横浜公演），30 行；另有 1 首未登记（同曲再演或检索未命中），未计入：「ぽっぴっぽー（Grand Finale）」 | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 横浜（横浜公演）](https://w.atwiki.jp/hmiku/pages/80551.html) |
| 初音ミクシンフォニー 2025 〜10th Anniversary〜 神戸 (9276) | Symphony | 1 × 30 | 歌单来自初音ミク Wiki 的逐曲表（神戸公演），30 行；其中 1 首不是 VOCALOID 歌曲（古典・管弦乐曲），按普通曲目登记、没有对应歌手；另有 1 首未登记（同曲再演或检索未命中），未计入：「ぽっぴっぽー（Grand Finale）」 | [初音ミク Wiki：初音ミクシンフォニー 2025 〜10th Anniversary〜 神戸（神戸公演）](https://w.atwiki.jp/hmiku/pages/80551.html) |
| 初音ミクシンフォニー 2026 札幌 (12713) | Symphony | 1 × 19 | 歌单来自初音ミク Wiki 的逐曲表（札幌公演），19 行；其中 1 首不是 VOCALOID 歌曲（古典・管弦乐曲），按普通曲目登记、没有对应歌手 | [初音ミク Wiki：初音ミクシンフォニー 2026 札幌（札幌公演）](https://w.atwiki.jp/hmiku/pages/80458.html) |
| 初音ミクシンフォニー 2026 東京 (12714) | Symphony | 1 × 19 | 歌单来自初音ミク Wiki 的逐曲表（東京公演），19 行；其中 1 首不是 VOCALOID 歌曲（古典・管弦乐曲），按普通曲目登记、没有对应歌手 | [初音ミク Wiki：初音ミクシンフォニー 2026 東京（東京公演）](https://w.atwiki.jp/hmiku/pages/80458.html) |
| 初音ミクシンフォニー 2026-2027 〜Melodies on the Keys〜 横浜 (12739) | Symphony | 1 × 16 | 歌单来自初音ミク Wiki 的逐曲表（横浜），16 行；其中 1 首不是 VOCALOID 歌曲（古典・管弦乐曲），按普通曲目登记、没有对应歌手 | [初音ミク Wiki：初音ミクシンフォニー 2026-2027 〜Melodies on the Keys〜 横浜（横浜）](https://w.atwiki.jp/hmiku/pages/80296.html) |
| 初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 名古屋 (4765) | 408 | 2 × 46 | 歌单来自初音ミク Wiki 的逐曲表（名古屋），23 行；日程来源：2023-02-23 Zepp Nagoya 昼 + 夜 2 场，每场 23 首 | [初音ミク JAPAN LIVE TOUR 2023 〜THUNDERBOLT〜 公式サイト,初音ミク Wiki：初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 名古屋（名古屋）](https://piapro.net/japantour2023/) |
| 初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 大阪 (4766) | 408 | 2 × 46 | 歌单来自初音ミク Wiki 的逐曲表（大阪），23 行；日程来源：2023-03-04 Zepp Namba 昼 + 夜 2 场，每场 23 首 | [初音ミク JAPAN LIVE TOUR 2023 〜THUNDERBOLT〜 公式サイト,初音ミク Wiki：初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 大阪（大阪）](https://piapro.net/japantour2023/) |
| 初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 福岡市 (4767) | 408 | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（福冈），23 行；日程来源：2023-03-11 Zepp Fukuoka 仅夜场 1 场，歌单 23 首 | [初音ミク JAPAN LIVE TOUR 2023 〜THUNDERBOLT〜 公式サイト,初音ミク Wiki：初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 福岡市（福冈）](https://piapro.net/japantour2023/) |
| 初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 東京 (4768) | 408 | 4 × 92 | 歌单来自初音ミク Wiki 的逐曲表（东京），按场次分 4 份；日程来源：2023-03-18–19 Zepp DiverCity 每天昼 + 夜，共 4 场，每场 23 首 | [初音ミク JAPAN LIVE TOUR 2023 〜THUNDERBOLT〜 公式サイト,初音ミク Wiki：初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 東京（东京）](https://piapro.net/japantour2023/) |
| 初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 札幌 (4769) | 408 | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（札幌），23 行；日程来源：2023-03-25 Zepp Sapporo 仅夜场 1 场，歌单 23 首 | [初音ミク JAPAN LIVE TOUR 2023 〜THUNDERBOLT〜 公式サイト,初音ミク Wiki：初音ミク JAPAN TOUR 2023 〜THUNDERBOLT〜 札幌（札幌）](https://piapro.net/japantour2023/) |
| 初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 大阪 (8380) | 799 | 2 × 46 | 歌单来自初音ミク Wiki 的逐曲表（大阪），23 行；日程来源：2025-04-19 Zepp Namba 昼 + 夜 2 场，每场 23 首 | [初音ミク JAPAN LIVE TOUR 2025 〜BLOOMING〜 公式サイト,初音ミク Wiki：初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 大阪（大阪）](https://piapro.net/japantour2025/) |
| 初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 愛知 (8381) | 799 | 2 × 46 | 歌单来自初音ミク Wiki 的逐曲表（爱知），23 行；日程来源：2025-04-26 Zepp Nagoya 昼 + 夜 2 场，每场 23 首 | [初音ミク JAPAN LIVE TOUR 2025 〜BLOOMING〜 公式サイト,初音ミク Wiki：初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 愛知（爱知）](https://piapro.net/japantour2025/) |
| 初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 福岡 (8382) | 799 | 2 × 46 | 歌单来自初音ミク Wiki 的逐曲表（福冈），23 行；日程来源：2025-04-29 Zepp Fukuoka 昼 + 夜 2 场，每场 23 首 | [初音ミク JAPAN LIVE TOUR 2025 〜BLOOMING〜 公式サイト,初音ミク Wiki：初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 福岡（福冈）](https://piapro.net/japantour2025/) |
| 初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 東京 (8383) | 799 | 4 × 92 | 歌单来自初音ミク Wiki 的逐曲表（东京），按场次分 4 份；日程来源：2025-05-02–03 Zepp Haneda 每天昼 + 夜，共 4 场，每场 23 首 | [初音ミク JAPAN LIVE TOUR 2025 〜BLOOMING〜 公式サイト,初音ミク Wiki：初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 東京（东京）](https://piapro.net/japantour2025/) |
| 初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 香川 (8384) | 799 | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（香川），23 行；日程来源：2025-05-06 レクザムホール 大ホール 仅昼场 1 场，歌单 23 首 | [初音ミク JAPAN LIVE TOUR 2025 〜BLOOMING〜 公式サイト,初音ミク Wiki：初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 香川（香川）](https://piapro.net/japantour2025/) |
| 初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 北海道 (8385) | 799 | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（北海道），23 行；日程来源：2025-05-17 Zepp Sapporo 仅夜场 1 场，歌单 23 首 | [初音ミク JAPAN LIVE TOUR 2025 〜BLOOMING〜 公式サイト,初音ミク Wiki：初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 北海道（北海道）](https://piapro.net/japantour2025/) |
| 初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 沖縄 (8386) | 799 | 2 × 46 | 歌单来自初音ミク Wiki 的逐曲表（冲绳），23 行；日程来源：2025-05-31 那覇文化芸術劇場なはーと 大劇場 昼 + 夜 2 场，每场 23 首 | [初音ミク JAPAN LIVE TOUR 2025 〜BLOOMING〜 公式サイト,初音ミク Wiki：初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～ 沖縄（冲绳）](https://piapro.net/japantour2025/) |
| デコミク LIVE starring 初音ミク『Hello』 (9401) | 900000000 | 2 × 54 | 歌单来自初音ミク Wiki 的逐曲表（代代木），按场次分 2 份；日程来源：2026-02-14 国立代々木競技場第一体育館 昼・夜 2 场，每场 27 首；VocaDB 歌单 24530 只录了前 10 行，但同样把《ストリーミングハート》标成 Daytime、《キメラ》标成 Nighttime，昼夜结构一致 | [初音ミク Wiki：デコミク LIVE starring 初音ミク『Hello』（代代木）](https://w.atwiki.jp/hmiku/pages/72956.html) |
| ミクFES '09（夏） (3000000002) | 900000001 | 1 × 28 | 歌单来自初音ミク Wiki 的逐曲表（东京），28 行；日程来源：2009-08-31 新木場STUDIO COAST 单场，28 首，约 2 小时 30 分 | [初音ミク公式ブログ：ミクFES '09（夏）アフターリポート,初音ミク Wiki：ミクFES '09（夏）（东京）](https://blog.piapro.net/2009/09/fes09.html) |
| MIKU FES '24（春） (3000000003) | 900000001 | 1 × 23 | 歌单来自初音ミク Wiki 的逐曲表（东京），23 行；日程来源：2024-03-31 日本武道館 单场，23 首，另有 4 段 DJ 表演 | [MIKU FES '24（春）公式サイト,初音ミク Wiki：MIKU FES '24（春）（东京）](https://mikufes24spring.jp/) |
| 夏の終わりの39祭り (3000000004) | 900000002 | 1 × 4 | 歌单来自初音ミク Wiki 的逐曲表（横滨），4 行；日程来源：2012-08-29 19:00 横滨赤レンガ倉庫水幕舞台，单场 4 首 | [電撃オンライン：夏の終わりの39祭り レポート,初音ミク Wiki：夏の終わりの39祭り（横滨）](https://dengekionline.com/elem/000/000/528/528109/index-2.html) |
| 「夏祭初音鑑」大阪公演 (3000000005) | 900000003 | 10 × 110 | 歌单来自Sanka Blog 的逐曲表（大阪），11 行；日程来源：2013-08-03–07 大阪先行公演，5 天共 27 场（每天场次不完全相同）；大阪版更接近先行版本，与东京正式公演曲目差异较大；本目录只有日场/夜场两层，27 场在站内折算为 10 个场次；报道只留下这一套 11 首，可能有日替曲目，暂未找到完整可信资料 | [夏祭初音鑑 公式特設ページ,初音ミク公式ブログ：夏祭初音鑑 大阪公演 開催決定,Sanka Blog：「夏祭初音鑑」大阪公演（大阪）](http://kc-i.jp/hatsuap/) |
| 「夏祭初音鑑」東京公演 (3000000010) | 900000003 | 18 × 360 | 歌单来自初音ミクみく 的逐曲表（东京），20 行；日程来源：2013-08-21–29 东京正式公演，工作日 4 场、周末 5 场，9 天共 38 场，每场约 90 分钟；本目录只有日场/夜场两层，38 场在站内折算为 18 个场次；20 首来自东京会场的演出报告，可能有日替曲目，暂未找到逐日完整资料 | [夏祭初音鑑 公式特設ページ,初音ミクみく：「夏祭初音鑑」東京公演（东京）,ASCII.jp：夏祭初音鑑 東京公演,電撃オンライン：夏祭初音鑑 東京公演 スケジュール,KADOKAWA：夏祭初音鑑 東京公演 開催告知](http://kc-i.jp/hatsuap/) |
| 初音ミク GALAXY LIVE 2020 (3000000006) | 900000004 | 2 × 16 | 歌单来自初音ミク Wiki 的逐曲表（线上），8 行；日程来源：2020-09-26–27 在线演唱会，两天同一套 8 首 | [初音ミク GALAXY LIVE 公式サイト,初音ミク Wiki：初音ミク GALAXY LIVE 2020（线上）](https://galaxy-live.net/) |
| 初音ミク GALAXY LIVE 2021 (3000000007) | 900000004 | 2 × 24 | 歌单来自初音ミク Wiki 的逐曲表（线上），12 行；日程来源：2021-12-18–19 在线演唱会，两天同一套 12 首 | [初音ミク GALAXY LIVE 公式サイト,初音ミク Wiki：初音ミク GALAXY LIVE 2021（线上）](https://galaxy-live.net/) |
| 初音ミク LAWSON 50th Anniversary Special LIVE (3000000008) | 900000005 | 3 × 72 | 歌单来自初音ミク Wiki 的逐曲表（横滨），按场次分 3 份；日程来源：2026-01-17 昼+夜、01-18 仅昼，共 3 场；每场 24 首，第 8 首按场次替换 | [ローソン 50th Anniversary Special LIVE 特設サイト,初音ミク Wiki：初音ミク LAWSON 50th Anniversary Special LIVE（横滨）](https://l-tike.com/lawson50thmiku/) |
| ポケモン feat. 初音ミク VOLTAGE Live！ (3000000009) | 900000006 | 6 × 162 | 歌单来自VOLTAGE Live！官方的逐曲表（千叶），27 行；日程来源：2026-03-20–22 每天昼 12:00 + 夜 18:00，共 6 场；每场 27 首 | [ポケモン feat. 初音ミク VOLTAGE Live！ 公式サイト,VOLTAGE Live！官方：ポケモン feat. 初音ミク VOLTAGE Live！（千叶）](https://www.project-voltage.jp/live2026/) |
| 初音ミク×TOUCH！WOWOW2014 スペシャルライブ (3000000012) | 900000007 | 1 × 8 | 歌单 8 首，顺序来自两份互不依赖的同日观众记录；官方回顾证实开场 Sharing the World（日本演唱会初披露）并提到其后的 メルト、Yellow 与 秘密警察。主办公告只作日程证据，不是曲目顺序证据。Sharing The World 取 Expo 2014 原曲 66126（66752 是其 Cover）；Tell Your World 取正长版 8395（399060 是 61 秒 Google Chrome 广告原曲）。 | [初音ミク公式ブログ：初音ミク×TOUCH！WOWOW2014 スペシャルライブ レポ,mikudoc：行ってきた 初音ミク WOWOW スペシャルライブ,日替わり NAT’s Champloo：初音ミク×TOUCH！WOWOW2014 スペシャルライブ](https://blog.piapro.net/2014/11/z1411081-1.html) |

---

---

## 6. Performances still without a setlist (19)

No upstream songList and no wiki per-track table yet. Cancelled 场次 are in `performance_status`; performance pages show “cancelled” with announcement links; upcoming stays empty.

| 演出 (performance) | Series | Date | Status | VocaDB | Source |
| --- | --- | --- | --- | --- | --- |
| [2853](https://vocadb.net/E/2853) MIKU EXPO 2020 Vancouver | MIKU EXPO | none | **Cancelled** | Finished | [announcement](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2854](https://vocadb.net/E/2854) MIKU EXPO 2020 San Jose | MIKU EXPO | none | **Cancelled** | Finished | [announcement](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2855](https://vocadb.net/E/2855) MIKU EXPO 2020 Dallas | MIKU EXPO | none | **Cancelled** | Finished | [announcement](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2856](https://vocadb.net/E/2856) MIKU EXPO 2020 Atlanta | MIKU EXPO | none | **Cancelled** | Finished | [announcement](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2857](https://vocadb.net/E/2857) MIKU EXPO 2020 Washington D.C. | MIKU EXPO | none | **Cancelled** | Finished | [announcement](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2858](https://vocadb.net/E/2858) MIKU EXPO 2020 Asbury Park (New Jersey) | MIKU EXPO | none | **Cancelled** | Finished | [announcement](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2859](https://vocadb.net/E/2859) MIKU EXPO 2020 Boston | MIKU EXPO | none | **Cancelled** | Finished | [announcement](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2860](https://vocadb.net/E/2860) MIKU EXPO 2020 Chicago | MIKU EXPO | none | **Cancelled** | Finished | [announcement](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2861](https://vocadb.net/E/2861) MIKU EXPO 2020 Toronto | MIKU EXPO | none | **Cancelled** | Finished | [announcement](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2878](https://vocadb.net/E/2878) MIKU EXPO 2020 Los Angeles | MIKU EXPO | none | **Cancelled** | Finished | [announcement](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2879](https://vocadb.net/E/2879) MIKU EXPO 2020 Orlando | MIKU EXPO | none | **Cancelled** | Finished | [announcement](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2880](https://vocadb.net/E/2880) MIKU EXPO 2020 Montreal | MIKU EXPO | none | **Cancelled** | Finished | [announcement](https://twitter.com/mikuexpo/status/1310762426975936512) |
| [2790](https://vocadb.net/E/2790) MIKU EXPO 2020 Barcelona | MIKU EXPO | 2020-01-28 | Unlabeled | Finished | — |
| [3000000001](https://zh.moegirl.org.cn/初音未来·未来有你2026演唱会) MIKU WITH YOU 2026 in Chengdu | MIKU WITH YOU | 2026-12-26 | Upcoming | — | [announcement](https://zh.moegirl.org.cn/初音未来·未来有你2026演唱会) |
| [13226](https://vocadb.net/E/13226) SNOW MIKU LIVE! 2027 | SNOW MIKU | 2027-02-05 | Unlabeled | Draft | — |
| [2886](https://vocadb.net/E/2886) 初音ミク×鼓童スペシャルライブ２０２０～結～ | Kodo | none | **Cancelled** | Finished | [announcement](https://twitter.com/kodo_miku/status/1353583380097507333) |
| [13210](https://vocadb.net/E/13210) 初音ミクシンフォニー 2027 東京 | Symphony | none | Unlabeled | Draft | — |
| [12740](https://vocadb.net/E/12740) 初音ミクシンフォニー 2026-2027 〜Melodies on the Keys〜 大阪 | Symphony | 2027-01-10 | Unlabeled | Finished | — |
| [13209](https://vocadb.net/E/13209) 初音ミクシンフォニー 2027 横浜 | Symphony | 2027-03-13 | Unlabeled | Draft | — |

- [ ] Leave empty for now until physical release or official setlist
- [ ] Some held shows need manual ingest (note in comments)

**Additional notes**

> 
