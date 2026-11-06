-- 演出 VocaDB does not list. Ids from 3,000,000,000 up are reserved for these
-- (shared/repertoire.ts: LOCAL_PERFORMANCE_ID_BASE), so they never collide with a releaseEvent id.
--
-- 3000000001  MIKU WITH YOU 2026 in Chengdu, 2026-12-26 19:00 at 成都金融城演艺中心.
--             The Shanghai run (13120) ended 2026-11-01 and the Chengdu date plus ticketing were
--             announced at that show; VocaDB still lists only the Shanghai event for series 173.
--             One show only, so it needs no day/night curation.
-- Sources: https://zh.moegirl.org.cn/初音未来·未来有你2026演唱会 (schedule, venue, 19:00 start)
--          https://hainan.ifeng.com/c/8xpNM43cRrr (ticketing announcement, 2026-11-06)
--
-- 0001 deletes and rewrites every catalog row, so this file has to run after it; INSERT OR IGNORE
-- makes it a no-op once the row is already there.
BEGIN;
INSERT OR IGNORE INTO performances (id, series_id, name, name_ja, venue_name, country_code, start_date, end_date, showtime_local, timezone, time_precision, time_evidence, role, series_number, series_suffix, song_list_id, vocadb_status, source_url, retrieved_at) VALUES
(3000000001, 173, 'MIKU WITH YOU 2026 in Chengdu', '初音未来·未来有你2026演唱会 成都站', '成都金融城演艺中心', 'CN', '2026-12-26', NULL, '19:00', 'Asia/Shanghai', 'day', '萌娘百科与开票公告都写 2026-12-26 19:00 开演', 'show', 2026, 'in Chengdu', NULL, NULL, 'https://zh.moegirl.org.cn/初音未来·未来有你2026演唱会', '2026-11-06T08:52:00.000Z');
INSERT OR IGNORE INTO performance_links (performance_id, url, description) VALUES
(3000000001, 'https://hainan.ifeng.com/c/8xpNM43cRrr', 'Ticketing announcement'),
(3000000001, 'https://zh.moegirl.org.cn/初音未来·未来有你2026演唱会', 'Moegirlpedia');
COMMIT;
