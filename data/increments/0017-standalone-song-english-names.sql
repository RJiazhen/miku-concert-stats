-- English display names for songs the standalone setlists introduced. VocaDB leaves `name_en`
-- NULL for many older or collaboration tracks, so the search index cannot match their English
-- spelling. These are the names printed by voca.wiki or the song's own official English title.
-- Covers `0016-standalone-lives.sql` (including 夏祭初音鑑 東京公演), and runs after `0010` so the
-- hand-registered repertoire rows exist; every statement is idempotent.
BEGIN;
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
COMMIT;
