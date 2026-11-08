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
UPDATE songs SET name_en = 'Clover♣Club' WHERE id = 5833;
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

-- 404329  🔪、🔪、🔪: the catalog `name` stays VocaDB's emoji default; the Japanese title the site
-- shows is registered as an alias in `data/song-aliases.json`. Only the English name belongs here.
UPDATE songs SET name_en = 'Knife, Knife, Knife' WHERE id = 404329;

-- The 2026-11-08 English pass: every song that still had an empty `name_en` and a Japanese
-- title. Values follow VocaDB's English name where it has one; where VocaDB leaves it empty the
-- Romanized title or the song's own Latin default name is used (`ジェミニ` → Gemini, `ロキ` →
-- ROKI, `De Los Santos`). The local repertoire entries `2000000001`–`2000000023` are classical
-- and Kodo pieces the catalog registers by hand, so their English titles are written here.
UPDATE songs SET name_en = 'Nyanyanyanyanyanyanya!' WHERE id = 123;
UPDATE songs SET name_en = 'Repairers of the Deceptive World' WHERE id = 298;
UPDATE songs SET name_en = 'Pane dhiria' WHERE id = 381;
UPDATE songs SET name_en = 'The Cherry Blossoms of the Netherworlds' WHERE id = 383;
UPDATE songs SET name_en = 'Tokyo Teddy Bear' WHERE id = 555;
UPDATE songs SET name_en = 'Ievan Polkka' WHERE id = 638;
UPDATE songs SET name_en = 'Till We Meet Again' WHERE id = 1331;
UPDATE songs SET name_en = 'Mozaik Role' WHERE id = 1381;
UPDATE songs SET name_en = 'Dark Alice' WHERE id = 1434;
UPDATE songs SET name_en = 'Project Diva desu.' WHERE id = 2321;
UPDATE songs SET name_en = 'Grated Brush' WHERE id = 2477;
UPDATE songs SET name_en = 'Shut up and Feel My Vibes!' WHERE id = 3301;
UPDATE songs SET name_en = 'Payapaya Kitten' WHERE id = 5635;
UPDATE songs SET name_en = 'Heartbeat #0822' WHERE id = 6099;
UPDATE songs SET name_en = 'Gemini' WHERE id = 8093;
UPDATE songs SET name_en = 'DoReMiFa Rondo' WHERE id = 8601;
UPDATE songs SET name_en = 'Crazy ∞ nighT' WHERE id = 13724;
UPDATE songs SET name_en = 'Re-Education' WHERE id = 13728;
UPDATE songs SET name_en = 'Yoshiwara Lament' WHERE id = 14435;
UPDATE songs SET name_en = 'MACARON' WHERE id = 15565;
UPDATE songs SET name_en = 'Snow Song Show' WHERE id = 18306;
UPDATE songs SET name_en = 'Twilight ∞ nighT' WHERE id = 22102;
UPDATE songs SET name_en = 'Afterglow' WHERE id = 23901;
UPDATE songs SET name_en = 'Delusion Tax' WHERE id = 38916;
UPDATE songs SET name_en = 'Stickybug' WHERE id = 48030;
UPDATE songs SET name_en = 'EveR ∞ LastinG ∞ NighT' WHERE id = 63660;
UPDATE songs SET name_en = 'Blank Map for Two of Us' WHERE id = 71629;
UPDATE songs SET name_en = 'Atturpore' WHERE id = 95875;
UPDATE songs SET name_en = 'Miku' WHERE id = 115016;
UPDATE songs SET name_en = 'Delusion Sentiment Compensation Federation' WHERE id = 131090;
UPDATE songs SET name_en = 'We Are Different !!! (or Same)' WHERE id = 140137;
UPDATE songs SET name_en = 'Teo' WHERE id = 161199;
UPDATE songs SET name_en = 'Ooedo Julia-Night' WHERE id = 164109;
UPDATE songs SET name_en = 'Chentaku' WHERE id = 177679;
UPDATE songs SET name_en = 'Leia - Remind' WHERE id = 210407;
UPDATE songs SET name_en = 'Reunion' WHERE id = 230396;
UPDATE songs SET name_en = 'SPARKS -Reloaded-' WHERE id = 230401;
UPDATE songs SET name_en = 'Albino -revive-' WHERE id = 247035;
UPDATE songs SET name_en = 'Jitterbug' WHERE id = 256954;
UPDATE songs SET name_en = 'ROKI' WHERE id = 269364;
UPDATE songs SET name_en = 'Light Blue Invasion' WHERE id = 294036;
UPDATE songs SET name_en = 'Fondant Step' WHERE id = 303006;
UPDATE songs SET name_en = 'Non-breath oblige' WHERE id = 335988;
UPDATE songs SET name_en = 'Cinderella' WHERE id = 346457;
UPDATE songs SET name_en = 'Showtime Ruler' WHERE id = 363262;
UPDATE songs SET name_en = 'Colorful Marine Snow' WHERE id = 371523;
UPDATE songs SET name_en = 'Salamander' WHERE id = 376689;
UPDATE songs SET name_en = 'Chimera' WHERE id = 396081;
UPDATE songs SET name_en = '88☆彡' WHERE id = 400359;
UPDATE songs SET name_en = 'Anyway the Wind Blows' WHERE id = 469831;
UPDATE songs SET name_en = 'You Should Drink Milk!' WHERE id = 470132;
UPDATE songs SET name_en = 'Tengaku -Soukyou-' WHERE id = 495802;
UPDATE songs SET name_en = 'Electrical Forecast' WHERE id = 534385;
UPDATE songs SET name_en = 'What Kind of Future' WHERE id = 536349;
UPDATE songs SET name_en = 'Happy Cheat Day' WHERE id = 552180;
UPDATE songs SET name_en = 'Fly With You' WHERE id = 560308;
UPDATE songs SET name_en = 'MAGA MAGA' WHERE id = 580170;
UPDATE songs SET name_en = 'Eon Ticket' WHERE id = 586830;
UPDATE songs SET name_en = 'Journey''s Prequels, Journey''s Traces' WHERE id = 592083;
UPDATE songs SET name_en = 'Parry' WHERE id = 629064;
UPDATE songs SET name_en = 'HAO' WHERE id = 640212;
UPDATE songs SET name_en = 'Rabbit Hole (Reloaded)' WHERE id = 668053;
UPDATE songs SET name_en = 'Monitoring' WHERE id = 668055;
UPDATE songs SET name_en = 'EVOLVE EVOLVE EVOLVE' WHERE id = 709668;
UPDATE songs SET name_en = 'Salomé' WHERE id = 753184;
UPDATE songs SET name_en = 'Idol Warrior' WHERE id = 760683;
UPDATE songs SET name_en = 'Facade Question' WHERE id = 771172;
UPDATE songs SET name_en = 'Coward Mont Blanc (Reloaded)' WHERE id = 777659;
UPDATE songs SET name_en = 'Marshmallow' WHERE id = 848354;
UPDATE songs SET name_en = 'HAPPINESS FOR YOU!' WHERE id = 862431;
UPDATE songs SET name_en = 'Lost Love Elegy (Reloaded)' WHERE id = 878206;
UPDATE songs SET name_en = 'Departure Song' WHERE id = 906978;
UPDATE songs SET name_en = 'Love Words V' WHERE id = 915394;
UPDATE songs SET name_en = 'De Los Santos' WHERE id = 920269;
UPDATE songs SET name_en = 'Spiral Melodies' WHERE id = 925294;
UPDATE songs SET name_en = 'Kaien' WHERE id = 1011745;
UPDATE songs SET name_en = 'Nanbu Ushioi Uta' WHERE id = 1013337;
UPDATE songs SET name_en = 'Inochi Moyashite Tatakeyo' WHERE id = 1013343;
UPDATE songs SET name_en = 'Rainbow Amusement Park' WHERE id = 1037976;
UPDATE songs SET name_en = 'Rang Women Yongbao Kuqi' WHERE id = 1054502;

UPDATE songs SET name_en = 'Piano Concerto No. 5 "Emperor" — I. Allegro' WHERE id = 2000000001;
UPDATE songs SET name_en = 'Piano Concerto No. 2 — I. Allegro' WHERE id = 2000000002;
UPDATE songs SET name_en = 'Symphony No. 9' WHERE id = 2000000003;
UPDATE songs SET name_en = 'Piano Sonata No. 11 in A Major, K. 331 — III. Rondo alla turca' WHERE id = 2000000004;
UPDATE songs SET name_en = 'Sleigh Ride' WHERE id = 2000000005;
UPDATE songs SET name_en = 'White Christmas' WHERE id = 2000000006;
UPDATE songs SET name_en = 'Jingle Bells' WHERE id = 2000000007;
UPDATE songs SET name_en = 'Hachi no Kaze' WHERE id = 2000000008;
UPDATE songs SET name_en = 'Tomoe' WHERE id = 2000000010;
UPDATE songs SET name_en = 'Miyake' WHERE id = 2000000011;
UPDATE songs SET name_en = 'MEGURU' WHERE id = 2000000012;
UPDATE songs SET name_en = 'SHAKE' WHERE id = 2000000013;
UPDATE songs SET name_en = 'Nōkan + Heidō' WHERE id = 2000000014;
UPDATE songs SET name_en = 'Zoku' WHERE id = 2000000015;
UPDATE songs SET name_en = 'LION (Shishiku)' WHERE id = 2000000017;
UPDATE songs SET name_en = 'BURNING' WHERE id = 2000000018;
UPDATE songs SET name_en = 'Super Turkish March' WHERE id = 2000000019;
UPDATE songs SET name_en = 'Ah, Wonderful Nyan Life' WHERE id = 2000000020;
UPDATE songs SET name_en = 'Ochame Kinou' WHERE id = 2000000021;
UPDATE songs SET name_en = 'Nyan Cat' WHERE id = 2000000022;
UPDATE songs SET name_en = 'Otome Dissection' WHERE id = 2000000023;

COMMIT;
