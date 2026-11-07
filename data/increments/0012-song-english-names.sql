-- English names for songs whose `songs.name_en` VocaDB leaves empty or spells differently from
-- the wikis. One file for every English name the site shows.
--
-- The Chinese titles for these live in `data/song-titles.zh-CN.json`; the English name belongs in
-- the catalog so `shared/lookup.ts` matches a search typed in English too. Values follow the English
-- column voca.wiki / 萌娘百科 print next to the Japanese title, or the song's own official title.
--
-- Every song row is gone by this point: the last increment that inserts `songs` rows is `0009`,
-- so this file can correct VocaDB songs, wiki-found songs (`0009`) and hand-registered repertoire
-- rows (block 2 of `0009`) alike. `0001` rewrites every catalog row on each run, so the file runs after it and
-- is idempotent — plain `UPDATE`s, no ordering between statements.

BEGIN;

-- Songs the wiki-only setlists and the standalone lives introduced; VocaDB gives no English name
-- for many older or collaboration tracks, so the search index cannot match their spelling.
UPDATE songs SET name_en = 'Crosslight' WHERE id = 1465;
UPDATE songs SET name_en = 'Finder' WHERE id = 2440;
UPDATE songs SET name_en = 'Mad Lovers' WHERE id = 2886;
UPDATE songs SET name_en = 'Heart Beat' WHERE id = 5232;
UPDATE songs SET name_en = 'Far Away' WHERE id = 8396;
UPDATE songs SET name_en = '39' WHERE id = 14480;
UPDATE songs SET name_en = 'Violence Trigger' WHERE id = 219144;
UPDATE songs SET name_en = 'Lonely Universe' WHERE id = 232181;
UPDATE songs SET name_en = 'Future Final War' WHERE id = 271920;
UPDATE songs SET name_en = 'Ψ' WHERE id = 460547;
UPDATE songs SET name_en = 'THUNDERBOLT' WHERE id = 468978;
UPDATE songs SET name_en = 'Invitation!' WHERE id = 501614;
UPDATE songs SET name_en = 'Battle! Hatsune Miku' WHERE id = 557560;
UPDATE songs SET name_en = 'Got you!' WHERE id = 563199;
UPDATE songs SET name_en = 'JUVENILE' WHERE id = 566239;
UPDATE songs SET name_en = 'I''m a Ghost Type' WHERE id = 579184;
UPDATE songs SET name_en = 'GO! Team BIPPA' WHERE id = 581632;
UPDATE songs SET name_en = 'Hyu~dorodoro' WHERE id = 584100;
UPDATE songs SET name_en = 'Encounter' WHERE id = 586628;
UPDATE songs SET name_en = 'PARTY ROCK ETERNITY' WHERE id = 589291;
UPDATE songs SET name_en = 'Esper Esper' WHERE id = 593626;
UPDATE songs SET name_en = 'MELLOMELLOID' WHERE id = 594927;
UPDATE songs SET name_en = 'Glorious Day' WHERE id = 598025;
UPDATE songs SET name_en = 'After Epochs' WHERE id = 625986;
UPDATE songs SET name_en = 'Champion' WHERE id = 650687;
UPDATE songs SET name_en = 'OOPARTS' WHERE id = 840401;
UPDATE songs SET name_en = 'DOKIDOKI!' WHERE id = 853916;
UPDATE songs SET name_en = 'Cyan Blue' WHERE id = 887891;
UPDATE songs SET name_en = 'Crossroad' WHERE id = 929916;
UPDATE songs SET name_en = 'Minna Miku Miku ni Shite Ageru♪' WHERE id = 16943;
UPDATE songs SET name_en = 'A Certain Prostitute''s Love' WHERE id = 17294;
UPDATE songs SET name_en = 'Headphone Addiction' WHERE id = 25665;
UPDATE songs SET name_en = 'Academy ×∀ssassinatioИ' WHERE id = 25666;
UPDATE songs SET name_en = 'Colorful Pop Beat' WHERE id = 29749;
UPDATE songs SET name_en = 'Walking in the Center of the World' WHERE id = 152288;
UPDATE songs SET name_en = 'Because I''m Not Human' WHERE id = 8787;
UPDATE songs SET name_en = 'Electric Lover -I am Programmer''s Song-' WHERE id = 2000000024;
UPDATE songs SET name_en = 'HATUNEtive' WHERE id = 2000000025;
UPDATE songs SET name_en = 'intro (De P Megamix)' WHERE id = 2000000026;
UPDATE songs SET name_en = 'Jousei Jijitsu Trilogy Megamix' WHERE id = 2000000027;
UPDATE songs SET name_en = 'Love War (future retro remix by kz)' WHERE id = 2000000028;
UPDATE songs SET name_en = 'Sky Burial' WHERE id = 1674;
UPDATE songs SET name_en = 'Sugar Bits' WHERE id = 23276;
UPDATE songs SET name_en = 'Moon Shadow Dancing Blossom' WHERE id = 9047;
UPDATE songs SET name_en = 'Chaining Intention' WHERE id = 2447;
UPDATE songs SET name_en = 'Hello/How are you?' WHERE id = 1416;
UPDATE songs SET name_en = 'Crescent Moon Rider' WHERE id = 1088;
UPDATE songs SET name_en = 'SWEET MEMORIES' WHERE id = 683540;
UPDATE songs SET name_en = 'Orange Crossroads' WHERE id = 25668;
UPDATE songs SET name_en = 'ONE NIGHT GIRL' WHERE id = 1089;
UPDATE songs SET name_en = 'SWEET MEMORIES' WHERE id = 2000000029;
UPDATE songs SET name_en = 'Corrupted Flower' WHERE id = 13418;

-- Kana titles whose English name is what the site shows: サンドリヨン's Chinese title is
-- `Cendrillon`, and these three are the same idea for English names.
UPDATE songs SET name_en = 'Cendrillon' WHERE id = 7238;
UPDATE songs SET name_en = 'Time Limit' WHERE id = 2732;
UPDATE songs SET name_en = 'Dance Robot Dance' WHERE id = 141649;
UPDATE songs SET name_en = 'Crystal Snow' WHERE id = 703459;

-- The 2026-11-07 review table (tmp/zh-titles-review.md) confirmed these names song by song. It also
-- corrects VocaDB spellings the wikis print differently (`アイ` AI → EYE, `げんてん` Origin →
-- Genten, `ビバハピ` Viva Happy → VIVA HAPPY). `アニマル` takes `Animal`: voca.wiki writes
-- `Animal(DECO*27)` only to tell it apart from another song of the same name.
UPDATE songs SET name_en = 'Sound' WHERE id = 1340;
UPDATE songs SET name_en = 'Ungray Days' WHERE id = 282018;
UPDATE songs SET name_en = 'Genten' WHERE id = 687114;
UPDATE songs SET name_en = 'Cherry Pop' WHERE id = 816725;
UPDATE songs SET name_en = 'BLACK★ROCK SHOOTER' WHERE id = 1323;
UPDATE songs SET name_en = 'VIVA HAPPY' WHERE id = 35603;
UPDATE songs SET name_en = 'Heart Alamode' WHERE id = 67964;
UPDATE songs SET name_en = 'EYE' WHERE id = 215656;
UPDATE songs SET name_en = 'Telepathy' WHERE id = 752940;
UPDATE songs SET name_en = 'Android Girl' WHERE id = 230406;
UPDATE songs SET name_en = 'Animal' WHERE id = 371426;

COMMIT;
