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
BEGIN;
UPDATE performances
   SET name = 'MIKU WITH YOU 2026 in Shanghai',
       name_ja = '初音未来·未来有你2026演唱会 上海站',
       series_suffix = 'in Shanghai'
 WHERE id = 13120;
COMMIT;
