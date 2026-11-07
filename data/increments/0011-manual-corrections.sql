-- Hand-maintained corrections to VocaDB rows that 0001 keeps rewriting.
--
-- 0001, 0004 and 0005 are regenerated (0001 / 0004) or re-run (0005) on every collect, so every
-- statement here runs after them. All statements are idempotent: a second run matches nothing.
--
--   1. Display-name fixes  — 13120 MIKU WITH YOU 2026 in Shanghai
--   2. ハジメテノオト Short version (389595) merged into 10951 and dropped
--   3. 初音ミクの消失 -DEAD END- (2925) merged into 295872 and dropped
--   4. 2025 JAPAN LIVE TOUR display names and venues (series 799)
--   5. 2010 感謝祭 venue (2520) corrected from the renamed VocaDB venue entity
--   6. 2017 未来有你 (1619) renamed from the old `HATSUNE MIKU with YOU` branding
--
-- Each section explains why; sources are in the section comments.


BEGIN;
-- Manual corrections to catalog rows whose VocaDB fields are incomplete or ambiguous.
-- 0001 deletes and rewrites every catalog row, so these UPDATEs have to run after it, and
-- they are idempotent: running twice leaves the same values.
--
-- 13120  MIKU WITH YOU 2026
--   VocaDB names the Shanghai event `MIKU WITH YOU 2026` with no city, because until 2026 the
--   series had a single stop. The series now also plays Chengdu (3000000001), so the 上海 stop
--   needs its city in the name to stay distinguishable; 2024 and 2025 stops follow the same
--   `MIKU WITH YOU <year> in <city>` shape upstream.
--   Sources: https://vocadb.net/E/13120 (upstream name), https://w.atwiki.jp/hmiku/pages/79886.html
--            (上海静安体育中心, 2 days x day/night)
UPDATE performances
   SET name = 'MIKU WITH YOU 2026 in Shanghai',
       name_ja = '初音未来·未来有你2026演唱会 上海站',
       series_suffix = 'in Shanghai'
 WHERE id = 13120;

-- Drops the VocaDB Short version of ハジメテノオト (389595) from the catalog.
--
-- Why: the song only entered the catalog through the 初音ミクシンフォニー album tracklists.
-- `scripts/vocadb/album-setlists.ts` follows `originalVersionId` to the chain root, and that root
-- is the 136 s Short version. Every シンフォニー setlist page on 初音ミク Wiki lists the full song
-- (e.g. https://w.atwiki.jp/hmiku/pages/80167.html), and no other 演出 ever played the Short
-- version, so the entry has no performance to describe. Merge it into 10951 and remove it.
--
-- 0004 rewrites these rows on every `pnpm collect:albums`, so this file runs last and is
-- idempotent: after the first run the UPDATEs match nothing and the DELETEs are no-ops.
UPDATE setlist_item_songs SET song_id = 10951 WHERE song_id = 389595;
UPDATE performance_show_setlist_items SET song_id = 10951 WHERE song_id = 389595;
DELETE FROM song_producers WHERE song_id = 389595;
DELETE FROM song_vocalists WHERE song_id = 389595;
DELETE FROM videos WHERE song_id = 389595;
DELETE FROM songs WHERE id = 389595;

-- Drops the VocaDB entry `初音ミクの消失 -DEAD END-` (2925) and points every reference at the
-- performed version (295872, the 110 s Short version).
--
-- Why: concerts never played -DEAD END-. MIKU EXPO 2016 Tokyo, マジカルミライ 2023
-- (about 2 min 40 s after the live arrangement) and 初音ミク×鼓童 2017 all perform the Short
-- version, and `performance_show_setlist_items` has 0 rows for 2925. The 9 rows that do point at
-- 2925 are the VocaDB songLists and the 39's Giving Day / 鼓童 increments, which the 百科 curation
-- overwrote anyway; repointing them keeps the listed-song layer consistent.
--
-- 0001, 0004 and 0005 rewrite the 2925 rows every time they run, so this file runs last and is
-- idempotent: after the first run the UPDATEs match nothing and the DELETEs are no-ops.
UPDATE setlist_items SET listed_song_id = 295872 WHERE listed_song_id = 2925;
UPDATE setlist_item_songs SET song_id = 295872 WHERE song_id = 2925;
UPDATE performance_show_setlist_items SET song_id = 295872 WHERE song_id = 2925;
DELETE FROM song_producers WHERE song_id = 2925;
DELETE FROM song_vocalists WHERE song_id = 2925;
DELETE FROM videos WHERE song_id = 2925;
DELETE FROM songs WHERE id = 2925;

-- 799  初音ミク JAPAN LIVE TOUR 2025 〜BLOOMING〜
--   VocaDB names the series and its events `JAPAN TOUR 2025` and leaves every venue empty.
--   The official site, the atwiki setlist page and the ticket listings all write
--   `JAPAN LIVE TOUR 2025`; the venues below are from the same atwiki schedule. Display-only
--   correction, runs after 0001 rewrites the rows and is idempotent.
--   Sources: https://piapro.net/japantour2025/
--            https://w.atwiki.jp/hmiku/pages/67158.html (schedule and venues)
UPDATE series
   SET name = '初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～',
       name_ja = '初音ミク JAPAN LIVE TOUR 2025 ～BLOOMING～'
 WHERE id = 799;
UPDATE performances
   SET name = REPLACE(REPLACE(name, 'JAPAN TOUR 2025', 'JAPAN LIVE TOUR 2025'), '〜', '～'),
       name_ja = REPLACE(REPLACE(name_ja, 'JAPAN TOUR 2025', 'JAPAN LIVE TOUR 2025'), '〜', '～'),
       country_code = 'JP'
 WHERE series_id = 799;
UPDATE performances SET venue_name = 'Zepp Namba' WHERE id = 8380;
UPDATE performances SET venue_name = 'Zepp Nagoya' WHERE id = 8381;
UPDATE performances SET venue_name = 'Zepp Fukuoka' WHERE id = 8382;
UPDATE performances SET venue_name = 'Zepp Haneda' WHERE id = 8383;
UPDATE performances SET venue_name = 'レクザムホール 大ホール' WHERE id = 8384;
UPDATE performances SET venue_name = 'Zepp Sapporo' WHERE id = 8385;
UPDATE performances SET venue_name = '那覇文化芸術劇場なはーと 大劇場' WHERE id = 8386;

-- 2520  ミクの日感謝祭39's Giving Day
--   VocaDB links the venue entity whose current name is `Zepp Haneda`, but the 2010 concert was at
--   Zepp Tokyo in Odaiba (the venue closed in 2022; the entity was later reused/renamed). The wiki
--   schedule and the official archive both name Zepp Tokyo, so the display name follows them.
--   Sources: https://w.atwiki.jp/hmiku/pages/67147.html
--            http://miku.sega.jp/39/mikufes.html
UPDATE performances SET venue_name = 'Zepp Tokyo' WHERE id = 2520;

-- 1619  HATSUNE MIKU with YOU 2017 CHINA FESTIVAL
--   VocaDB still carries the old `HATSUNE MIKU with YOU 2017 CHINA FESTIVAL` branding. The name
--   does not contain the series label `MIKU WITH YOU`, so the zh-CN display never swaps in
--   `未来有你` and the row stays English while every other stop reads `未来有你 <year> <city>`.
--   Rename it to the same shape as 2018-2026 (`MIKU WITH YOU <year> in <city>`), keeping the
--   official Chinese name in name_ja. Display-only; venue, date and song list stay untouched.
--   Sources: https://vocadb.net/E/1619
--            https://zh.moegirl.org.cn/未来有你·初音未来2017演唱会 (上海新国际博览中心, 2017-11-25)
UPDATE performances
   SET name = 'MIKU WITH YOU 2017 in Shanghai'
 WHERE id = 1619;
COMMIT;
