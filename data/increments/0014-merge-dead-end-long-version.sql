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
BEGIN;
UPDATE setlist_items SET listed_song_id = 295872 WHERE listed_song_id = 2925;
UPDATE setlist_item_songs SET song_id = 295872 WHERE song_id = 2925;
UPDATE performance_show_setlist_items SET song_id = 295872 WHERE song_id = 2925;
DELETE FROM song_producers WHERE song_id = 2925;
DELETE FROM song_vocalists WHERE song_id = 2925;
DELETE FROM videos WHERE song_id = 2925;
DELETE FROM songs WHERE id = 2925;
COMMIT;
