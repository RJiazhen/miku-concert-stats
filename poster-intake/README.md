# Poster intake

This folder is a persistent, project-local place to drop official concert poster or main-visual files. It is not a tour database. Each subdirectory is named after an *existing* catalog series or a standalone concert group.

Dropped image files are gitignored. These README files are tracked so the folders stay in the repository.

## How a dropped file becomes a carousel background

1. Put the image in the folder that matches the catalog series or group (see each folder's README).
2. Name it `{tourId}.jpg`, `{tourId}.png`, or `{tourId}.webp`, using the tour id from `data/tours.json`.
3. Keep the **uncompressed original** under `public/posters/originals/` (e.g. `{tourId}-01.png`). Do not overwrite originals with packaged previews.
4. Add or update the tour id in `data/tour-posters.json` as `{ "posters": [ { src, originalSrc, sourceUrl, sourcePage, … } ] }`. `src` is the packaged preview (`/posters/{tourId}.webp`); `originalSrc` points at the file in `originals/`. A tour may list several posters; the UI shows the first until a multi-poster view exists. Fullscreen lightbox uses `originalSrc`.
5. Generate packaged previews (max width **1800px**, WebP) with:
   ```bash
   vp run posters:package
   ```
   `vp run dev` / `prebuild` also run packaging. One-off compression of a single file remains `vp run posters:compress -- --out public/posters path/to/file.png`.
6. The homepage banner resolves posters as 演出 → tour → tour poster (first entry). It will not guess a file from a performance id or a loose filename.

**Originals vs packaged:** git keeps originals under `public/posters/originals/`. Packaged WebP previews under `public/posters/` are produced on package/build for page and banner use; fullscreen uses the original. The homepage banner crops with `object-fit: cover` and a top focal point into a wide hero, and lays a readability mask over the artwork so title text stays readable; keep the important subject in the upper two-thirds when the source is portrait or tall.

Only use images you can source from a reliable official event page or official announcement (or an allowed homemade fallback below), and keep the provenance in `tour-posters.json`.

## Source preference (choose the best available)

When picking or replacing a tour poster, use the **highest** option that exists at good quality. Prefer higher ranks over lower ones even if a lower-rank file is already mapped.

1. **High-resolution official vertical poster** — the tour’s official portrait key visual / poster art (not a cropped social thumbnail).
2. **High-resolution official horizontal poster** — official landscape key visual / poster art when no suitable vertical official poster exists.
3. **High-resolution official tour-site horizontal OG image** — e.g. `{officialTourSite}/images/og.jpg` (or equivalent Open Graph / share image) when it is a full landscape visual.
4. **Official tour website screenshot** — capture the site hero / key visual without redundant chrome (nav, cookie banners, scrollbars, “Finished” badges, etc.). May be processed twice (capture → crop/clean → compress).
5. **Homemade poster from existing elements** — compose from official site assets (backgrounds, character art, logos) only when 1–4 are unavailable or unusable; document that it is a composite in `sourceUrl` / rights notes.

Transparent character cutouts alone, product-pack shots, and low-res social thumbs are not valid substitutes when a higher-rank source exists.
