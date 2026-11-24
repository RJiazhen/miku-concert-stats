# Poster intake

This folder is a persistent, project-local place to drop official concert poster or main-visual files. It is not a tour database. Each subdirectory is named after an *existing* catalog series or a standalone concert group.

Dropped image files are gitignored. These README files are tracked so the folders stay in the repository.

## How a dropped file becomes a carousel background

1. Put the image in the folder that matches the catalog series or group (see each folder's README).
2. Name it `{tourId}.jpg`, `{tourId}.png`, or `{tourId}.webp`, using the tour id from `data/tours.json`.
3. Encode a web-sized WebP into `public/posters/` under the same `{tourId}` stem:
   ```bash
   pnpm posters:compress --out public/posters path/to/{tourId}.png
   ```
   That writes `public/posters/{tourId}.webp` (max width **1800px**, WebP quality 82 by default; wider sources are downscaled, narrower ones are not upscaled).
4. Add or update the tour id in `data/tour-posters.json` with `src` pointing at that `.webp`, the official `sourceUrl` / `sourcePage`, `accessedAt`, any artist credit, and a short rights note.
5. The homepage banner resolves posters as 演出 → tour → tour poster. It will not guess a file from a performance id or a loose filename.

**Recommended delivery for `public/posters/`:** WebP, width at most **1800px**. Intake may still be JPEG, PNG, or WebP; run `pnpm posters:compress` (`scripts/compress-poster.ts`) before wiring the mapping. Prefer a 3:4 or other portrait-friendly poster ratio. The banner crops with `object-fit: cover` and a top focal point into a wide hero, and lays a readability mask over the artwork so title text stays readable; keep the important subject in the upper two-thirds.

Only use images you can source from a reliable official event page or official announcement, and keep the provenance in `tour-posters.json`.
