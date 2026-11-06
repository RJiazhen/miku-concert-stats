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
BEGIN;
UPDATE setlist_item_songs SET song_id = 10951 WHERE song_id = 389595;
UPDATE performance_show_setlist_items SET song_id = 10951 WHERE song_id = 389595;
DELETE FROM song_producers WHERE song_id = 389595;
DELETE FROM song_vocalists WHERE song_id = 389595;
DELETE FROM videos WHERE song_id = 389595;
DELETE FROM songs WHERE id = 389595;
COMMIT;
