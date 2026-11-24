# miku-expo

Catalog series 82, MIKU EXPO. Official site: https://mikuexpo.com/ (and subdomains).

Current banner performances from the 2026 Europe edition share tour `miku-expo-2026-europe` and one official hero visual:

- `12227` MIKU EXPO 2026 Paris (2026-11-22)
- `12226` MIKU EXPO 2026 Düsseldorf (2026-11-20)
- `12225` MIKU EXPO 2026 Berlin (2026-11-17)
- `12224` MIKU EXPO 2026 Amsterdam (2026-11-15)

`12223` Brussels and `12222` London are on the same tour and stay inside the 12-month window, but they sit just outside the five-slide cap.

Current placeholder, already wired in `data/tour-posters.json` and `public/posters/miku-expo-2026-europe.webp`:

- Source file: https://mikuexpo.com/europe2026/images/hero_chara.webp
- Official page: https://mikuexpo.com/europe2026/
- Artist credit: suzunosuke © CFM
- Accessed: 2026-11-23

Drop a corrected poster as `{tourId}.jpg` (or `.png` / `.webp`) here, then run `pnpm posters:compress --out public/posters` and update the mapping. A shared official edition visual keeps one file for the whole tour. Recommended delivery: WebP at most 1800px wide via `pnpm posters:compress` (see root README). Prefer 3:4 or similar portrait source; the banner crops the top of the frame into a wide hero with a readability mask.
