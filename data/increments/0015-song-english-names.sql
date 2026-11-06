-- English names VocaDB leaves empty for four performed songs.
--
-- The Chinese titles for these live in `data/song-titles.zh-CN.json`; the English name belongs
-- in the catalog so `shared/lookup.ts` matches a search typed in English too. Values follow the
-- English column those wikis list next to the Japanese title:
--   7238   サンドリヨン          Cendrillon          (VocaDB English name, 萌娘百科/Vocawiki)
--   2732   タイムリミット        Time Limit          (萌娘百科 infobox)
--   141649 ダンスロボットダンス  Dance Robot Dance   (萌娘百科/Vocawiki)
--   703459 クリスタルスノウ      Crystal Snow        (萌娘百科/Vocawiki)
--
-- 0001 rewrites every catalog row on each run, so this file runs last and is idempotent.
BEGIN;
UPDATE songs SET name_en = 'Cendrillon'         WHERE id = 7238;
UPDATE songs SET name_en = 'Time Limit'         WHERE id = 2732;
UPDATE songs SET name_en = 'Dance Robot Dance'  WHERE id = 141649;
UPDATE songs SET name_en = 'Crystal Snow'       WHERE id = 703459;
COMMIT;
