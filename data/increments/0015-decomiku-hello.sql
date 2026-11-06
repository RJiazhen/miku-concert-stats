-- VocaDB event 9401 (デコミク LIVE starring 初音ミク『Hello』) belongs to no release-event series
-- (seriesId is null), so `pnpm collect` — which walks SERIES_IDS — never reaches it. The event and
-- its (empty) song list 24530 are added here, together with a local series that groups the
-- デコミク LIVE line. The wiki table at data/wiki-raw/decomiku2026.json supplies the 27 songs.
--
-- 9401 is a real VocaDB id, so `source_url` stays https://vocadb.net/E/9401. The series id is a
-- local one (900,000,000) because VocaDB has no series for this event; it never collides with a
-- VocaDB series id.
--
-- VocaDB: https://vocadb.net/E/9401 (name, date, venue, status, web links)
--         https://vocadb.net/L/24530 (song list attached to the event; no lines yet)
-- Wiki:   https://w.atwiki.jp/hmiku/pages/72956.html (setlist, 2026-02-14 昼 + 夜, 27 songs each)
-- 0001 rewrites every catalog row, so this file has to run after it; INSERT OR IGNORE keeps the
-- rows once they are there, and a future VocaDB collection of 9401 will not duplicate them.
BEGIN;
INSERT OR IGNORE INTO series (id, name, name_ja, description, source_url, retrieved_at) VALUES
(900000000, 'デコミク LIVE starring 初音ミク', 'デコミク LIVE starring 初音ミク', 'DECO*27 与 OTOIRO 主办、初音ミク出演的 3D 演唱会系列。首场『Hello』于 2026-02-14 在国立代々木競技場第一体育館举行，昼・夜两场。', 'https://otoiro.co.jp/live/decomikulive2026', '2026-11-06T11:20:00.000Z');
INSERT OR IGNORE INTO performances (id, series_id, name, name_ja, venue_name, country_code, start_date, end_date, showtime_local, timezone, time_precision, time_evidence, role, series_number, series_suffix, song_list_id, vocadb_status, source_url, retrieved_at) VALUES
(9401, 900000000, 'デコミク LIVE starring 初音ミク『Hello』', 'デコミク LIVE starring 初音ミク『Hello』', '国立代々木競技場第一体育館', 'JP', '2026-02-14', NULL, NULL, NULL, 'day', NULL, 'show', 2026, NULL, 24530, 'Finished', 'https://vocadb.net/E/9401', '2026-11-06T11:20:00.000Z');
INSERT OR IGNORE INTO performance_links (performance_id, url, description) VALUES
(9401, 'https://otoiro.co.jp/live/decomikulive2026', 'Website'),
(9401, 'https://x.com/DecoMiku_Live', 'X (Twitter)');
INSERT OR IGNORE INTO song_lists (id, name, featured_category, source_url, retrieved_at, announced_at) VALUES
(24530, 'デコミク LIVE starring 初音ミク 『Hello』', 'Concerts', 'https://vocadb.net/L/24530', '2026-11-06T11:20:00.000Z', NULL);
INSERT OR IGNORE INTO edition_premieres (series_id, series_number, premiere_performance_id, premiere_date, premiere_showtime_local, rule) VALUES
(900000000, 2026, 9401, '2026-02-14', NULL, 'Manual: VocaDB event 9401 belongs to no recorded series and has a single date, so it is its own premiere.');
COMMIT;
