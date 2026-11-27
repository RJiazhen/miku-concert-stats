# Visual design plan

Living visible design plan for this project’s web GUI. Agents update this file when UI meaningfully changes or when guidance here is wrong or thin. Broader product/scope history: [design.md](design.md). Runtime modules: [architecture.md](architecture.md).

## Product / brand

- Product name: Hatsune Miku Concert Setlist Statistics (`miku-concert-stats`)
- Platforms: web (Nuxt 3 + Nuxt UI 4 on Cloudflare Workers)
- One-sentence visual direction: dark-first catalog site with near-black surfaces, teal/magenta concert-stage glow, and data-led pages (home banner, rankings, timeline, tour detail) rather than a marketing landing stack.
- Dark theme first (default); light theme required. `@nuxtjs/color-mode` follows system when possible; header `UColorModeButton` toggles and remembers.

## Typography

- Display / hero: Nuxt UI / Tailwind stack already in use on the site (do not introduce Inter/Roboto/Arial as a new “AI default” layer on top).
- Body / UI: same design-system body scale as Nuxt UI components.
- Prefer expressive hierarchy within the existing system; avoid swapping the whole stack without a deliberate redesign.

## Color

- Design tokens: Nuxt UI `primary: miku`, `secondary: magenta` in `app/app.config.ts`; scales in `@theme` in `app/assets/css/main.css`.
- Accents: teal `#39C5BB`, magenta `#E12885` (radial glow on a fixed `-z-10` layer, not inside content, for contrast).
- Background: near-black dark canvas with subtle radial glow; light theme uses neutral page surfaces (e.g. banner stage `--home-banner-stage-bg` tracks theme).
- Character chips: optional cheer colors from `data/characters.json`.
- Avoid generic AI palettes (purple-on-white defaults, cream+terracotta broadsheet, etc.) unless product art direction explicitly calls for them.

## Layout principles

- First viewport / home: banner (tour posters) then compact site-wide stat tiles, then Upcoming — one reading order, not a dashboard of competing cards in the hero.
- Hero / banner: full page width; posters `object-fit: cover` with tunable `--home-banner-poster-max-width` and side fades; no floating promo chips on the artwork.
- One job per section / screen region (rank filters+table, timeline chart+filters, tour setlist).

## Motion

- Intentional motions: home banner carousel transitions; timeline/chart hover and filter panel open on narrow viewports; color-mode transition via Nuxt UI where present.
- What not to animate: decorative glow pulsing that hurts contrast; gratuitous card entrance spam on data tables.

## Key screens

| Screen / route | Platform | Purpose | Notes |
| --- | --- | --- | --- |
| `/` | web | Home: banner, stats tiles, upcoming | Poster max width / stage bg CSS vars on `HomeSetlistCarousel.vue` |
| `/rank` | web | Song appearance ranking | Filters + sortable table |
| `/timeline` | web | Series/year charts | Sticky rail at `rail` (91rem)+; floating filters when narrow |
| `/tours/:id` | web | Tour detail + setlists | Title + snake under links (left) / poster right (click → light lightbox); snake columns/width track section width; shared programme collapses to one setlist |
| `/series/:id` | web | Series index of 演出 | Links from ranking |

## Iteration log

| Date | Change |
| --- | --- |
| 2026-11-27 | Initial scaffold from new-repo-setup; seeded from existing `docs/design.md` / architecture notes |
| 2026-11-27 | Tour detail (`/tours/:id`) replaces show detail as the primary concert page; city tabs for multi-stop setlists |
| 2026-11-27 | Tour detail layout: poster on the right; stops as compact vertical timeline instead of a rigid list |
| 2026-11-27 | Tour stops: serpentine L→R snake path (4 cols default) under the header for a denser schedule |
| 2026-11-27 | Tour poster: one-click fullscreen `UModal` lightbox; snake numbered with continuous rails |
