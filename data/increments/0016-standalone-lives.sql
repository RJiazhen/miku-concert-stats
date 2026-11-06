-- Standalone concerts that VocaDB's recorded series do not list. They are added by hand so the
-- catalog covers the whole Miku live history, not only the seven VocaDB series.
--
-- 0001 deletes and rewrites every catalog row, so this file has to run after it; INSERT OR IGNORE
-- keeps the rows once they are there. Ids from 3,000,000,000 up are reserved for 演出 VocaDB does
-- not list (shared/repertoire.ts: LOCAL_PERFORMANCE_ID_BASE), and local series ids start at
-- 900,000,000. Every row here comes from a setlist table or an official report, not from VocaDB.
--
-- Sources:
--   ミクFES '09（夏）          https://w.atwiki.jp/hmiku/pages/67185.html
--                            https://blog.piapro.net/2009/09/fes09.html
--   MIKU FES '24（春）        https://w.atwiki.jp/hmiku/pages/67186.html
--                            https://mikufes24spring.jp/
--   夏の終わりの39祭り         https://w.atwiki.jp/vocalive/pages/167.html
--                            https://dengekionline.com/elem/000/000/528/528109/index-2.html
--   夏祭初音鑑（大阪公演）     https://sanka-gets.hatenablog.com/entry/ar308119
--                            http://kc-i.jp/hatsuap/
--                            https://blog.piapro.net/2013/06/livehatsune-appeanrace.html
--   夏祭初音鑑（東京公演）     http://vocaloid.blog120.fc2.com/blog-entry-16607.html
--                            https://prtimes.jp/main/html/rd/p/000000106.000007006.html
--                            https://dengekionline.com/elem/000/000/671/671042/
--                            https://ascii.jp/elem/000/000/818/818660/
--   初音ミク GALAXY LIVE 2020  https://w.atwiki.jp/hmiku/pages/67209.html
--                            https://galaxy-live.net/
--   初音ミク GALAXY LIVE 2021  https://w.atwiki.jp/hmiku/pages/67211.html
--                            https://galaxy-live.net/
--   LAWSON 50th                https://w.atwiki.jp/hmiku/pages/68447.html
--                            https://l-tike.com/lawson50thmiku/
--   ポケモン feat. 初音ミク      https://www.project-voltage.jp/live2026/afterreport.html
--                            https://www.project-voltage.jp/live2026/
BEGIN;
INSERT OR IGNORE INTO series (id, name, name_ja, description, source_url, retrieved_at) VALUES
(900000001, 'ミクFES', 'ミクFES', '初音ミク的周年纪念演唱会系列：2009 年 8 月 31 日的首场单独公演，以及 2024 年 3 月 31 日的 16 周年公演。', 'https://w.atwiki.jp/hmiku/pages/67185.html', '2026-11-06T12:15:00.000Z'),
(900000002, '夏の終わりの39祭り', '夏の終わりの39祭り', '2012 年 8 月 29 日在横滨红砖仓库举行的初音ミク 5 周年水幕舞台活动，与 PlayStation Vita《初音ミク -Project DIVA- f》联动。', 'https://w.atwiki.jp/vocalive/pages/167.html', '2026-11-06T12:15:00.000Z'),
(900000003, '夏祭初音鑑', '夏祭初音鑑', '2013 年 8 月由 ANGEL Project 主办的 HATSUNE Appearance 迷你演唱会：大阪先行公演 8/3–8/7 在グランフロント大阪 ナレッジシアター（5 天 27 场），东京正式公演 8/21–8/29 在ベルサール秋葉原 B1F（9 天 38 场），两地合计 14 天 65 场。', 'http://kc-i.jp/hatsuap/', '2026-11-06T12:15:00.000Z'),
(900000004, '初音ミク GALAXY LIVE', '初音ミク GALAXY LIVE', '初音ミク的在线 3D 演唱会系列，2020 与 2021 年各办一次，以故事段落和专用 3D 模型为特色。', 'https://w.atwiki.jp/hmiku/pages/67209.html', '2026-11-06T12:15:00.000Z'),
(900000005, '初音ミク LAWSON 50th Anniversary Special LIVE', '初音ミク LAWSON 50th Anniversary Special LIVE', 'ローソン创业 50 周年纪念演唱会，2026 年 1 月 17–18 日在横浜アリーナ举行。', 'https://w.atwiki.jp/hmiku/pages/68447.html', '2026-11-06T12:15:00.000Z'),
(900000006, 'ポケモン feat. 初音ミク VOLTAGE Live！', 'ポケモン feat. 初音ミク VOLTAGE Live！', '宝可梦与初音ミク联动企划的首场线下演唱会，2026 年 3 月 20–22 日在 LaLa arena TOKYO-BAY 举行。', 'https://www.project-voltage.jp/live2026/', '2026-11-06T12:15:00.000Z');
INSERT OR IGNORE INTO performances (id, series_id, name, name_ja, venue_name, country_code, start_date, end_date, showtime_local, timezone, time_precision, time_evidence, role, series_number, series_suffix, song_list_id, vocadb_status, source_url, retrieved_at) VALUES
(3000000002, 900000001, 'ミクFES ''09（夏）', 'ミクFES ''09（夏）', '新木場STUDIO COAST', 'JP', '2009-08-31', NULL, NULL, NULL, 'day', NULL, 'show', 2009, 'in 東京', NULL, NULL, 'https://w.atwiki.jp/hmiku/pages/67185.html', '2026-11-06T12:15:00.000Z'),
(3000000003, 900000001, 'MIKU FES ''24（春）', 'MIKU FES ''24（春）', '日本武道館', 'JP', '2024-03-31', NULL, NULL, NULL, 'day', NULL, 'show', 2024, 'in 東京', NULL, NULL, 'https://w.atwiki.jp/hmiku/pages/67186.html', '2026-11-06T12:15:00.000Z'),
(3000000004, 900000002, '夏の終わりの39祭り', '夏の終わりの39祭り', '横浜赤レンガ倉庫 イベント広場', 'JP', '2012-08-29', NULL, '19:00', 'Asia/Tokyo', 'day', '初音ミク Wiki 与 PlayStation 官方活动页都写 2012-08-29 19:00 开演', 'show', 2012, 'in 横浜', NULL, NULL, 'https://w.atwiki.jp/vocalive/pages/167.html', '2026-11-06T12:15:00.000Z'),
(3000000005, 900000003, '「夏祭初音鑑」大阪公演', '「夏祭初音鑑」大阪公演', 'グランフロント大阪 北館4F ナレッジシアター', 'JP', '2013-08-03', '2013-08-07', NULL, NULL, 'day', NULL, 'show', 2013, 'in 大阪', NULL, NULL, 'https://blog.piapro.net/2013/06/livehatsune-appeanrace.html', '2026-11-06T12:15:00.000Z'),
(3000000010, 900000003, '「夏祭初音鑑」東京公演', '「夏祭初音鑑」東京公演', 'ベルサール秋葉原 B1F', 'JP', '2013-08-21', '2013-08-29', NULL, NULL, 'day', NULL, 'show', 2013, 'in 東京', NULL, NULL, 'https://prtimes.jp/main/html/rd/p/000000106.000007006.html', '2026-11-06T12:15:00.000Z'),
(3000000006, 900000004, '初音ミク GALAXY LIVE 2020', '初音ミク GALAXY LIVE 2020', 'オンライン', NULL, '2020-09-26', '2020-09-27', NULL, NULL, 'day', NULL, 'show', 2020, 'Online', NULL, NULL, 'https://w.atwiki.jp/hmiku/pages/67209.html', '2026-11-06T12:15:00.000Z'),
(3000000007, 900000004, '初音ミク GALAXY LIVE 2021', '初音ミク GALAXY LIVE 2021', 'オンライン', NULL, '2021-12-18', '2021-12-19', NULL, NULL, 'day', NULL, 'show', 2021, 'Online', NULL, NULL, 'https://w.atwiki.jp/hmiku/pages/67211.html', '2026-11-06T12:15:00.000Z'),
(3000000008, 900000005, '初音ミク LAWSON 50th Anniversary Special LIVE', '初音ミク LAWSON 50th Anniversary Special LIVE', '横浜アリーナ', 'JP', '2026-01-17', '2026-01-18', NULL, NULL, 'day', NULL, 'show', 2026, 'in 横浜', NULL, NULL, 'https://w.atwiki.jp/hmiku/pages/68447.html', '2026-11-06T12:15:00.000Z'),
(3000000009, 900000006, 'ポケモン feat. 初音ミク VOLTAGE Live！', 'ポケモン feat. 初音ミク VOLTAGE Live！', 'LaLa arena TOKYO-BAY', 'JP', '2026-03-20', '2026-03-22', NULL, NULL, 'day', NULL, 'show', 2026, 'in 千葉', NULL, NULL, 'https://www.project-voltage.jp/live2026/afterreport.html', '2026-11-06T12:15:00.000Z');
INSERT OR IGNORE INTO performance_links (performance_id, url, description) VALUES
(3000000002, 'https://blog.piapro.net/2009/09/fes09.html', 'After report (HATSUNE MIKU OFFICIAL BLOG)'),
(3000000003, 'https://mikufes24spring.jp/', 'Website'),
(3000000004, 'https://dengekionline.com/elem/000/000/528/528109/index-2.html', 'Event report (Dengeki Online)'),
(3000000005, 'http://kc-i.jp/hatsuap/', 'Website'),
(3000000005, 'https://blog.piapro.net/2013/06/livehatsune-appeanrace.html', 'Osaka announcement (HATSUNE MIKU OFFICIAL BLOG)'),
(3000000010, 'http://kc-i.jp/hatsuap/', 'Website'),
(3000000010, 'https://prtimes.jp/main/html/rd/p/000000106.000007006.html', 'Tokyo announcement'),
(3000000010, 'https://dengekionline.com/elem/000/000/671/671042/', 'Show schedule (Dengeki Online)'),
(3000000010, 'https://ascii.jp/elem/000/000/818/818660/', 'Show count (ASCII.jp)'),
(3000000006, 'https://galaxy-live.net/', 'Website'),
(3000000007, 'https://galaxy-live.net/', 'Website'),
(3000000008, 'https://l-tike.com/lawson50thmiku/', 'Website'),
(3000000009, 'https://www.project-voltage.jp/live2026/', 'Website');
INSERT OR IGNORE INTO edition_premieres (series_id, series_number, premiere_performance_id, premiere_date, premiere_showtime_local, rule) VALUES
(900000001, 2009, 3000000002, '2009-08-31', NULL, 'Manual: the only recorded ミクFES concert of 2009.'),
(900000001, 2024, 3000000003, '2024-03-31', NULL, 'Manual: the only recorded ミクFES concert of 2024.'),
(900000002, 2012, 3000000004, '2012-08-29', '19:00', 'Manual: a one-off event, so it is its own premiere.'),
(900000003, 2013, 3000000005, '2013-08-03', NULL, 'Manual: the Osaka run opened first; the Tokyo run started 2013-08-21.'),
(900000004, 2020, 3000000006, '2020-09-26', NULL, 'Manual: the first GALAXY LIVE.'),
(900000004, 2021, 3000000007, '2021-12-18', NULL, 'Manual: the second GALAXY LIVE.'),
(900000005, 2026, 3000000008, '2026-01-17', NULL, 'Manual: a one-off anniversary live.'),
(900000006, 2026, 3000000009, '2026-03-20', NULL, 'Manual: a one-off collaboration live.');
COMMIT;
