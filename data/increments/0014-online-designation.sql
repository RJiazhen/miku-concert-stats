-- Online-only performances that have no physical venue.
-- These six events are streamed or held in VR; they are explicitly marked ONLINE
-- (not an ISO 3166-1 alpha-2 code) so the timeline city-migration chart can show
-- them separately from Japan / abroad / unknown. This file runs after 0001 and
-- 0013, so `pnpm collect` and `pnpm locations --sync` cannot turn these rows back
-- into blank country codes.

UPDATE performances SET country_code = 'ONLINE' WHERE id = 3000000006;
UPDATE performances SET country_code = 'ONLINE' WHERE id = 3224;
UPDATE performances SET country_code = 'ONLINE' WHERE id = 3000000007;
UPDATE performances SET country_code = 'ONLINE' WHERE id = 4114;
UPDATE performances SET country_code = 'ONLINE' WHERE id = 4490;
UPDATE performances SET country_code = 'ONLINE' WHERE id = 5751;
