# Public API: keep contract docs and skill in sync

`/api/v1` is the public contract for external AI agents. When adding, renaming, changing parameters, or removing an endpoint, update the interface docs and the skill in the **same** commit — never ship route code alone.

## Four places that must stay aligned

1. `scripts/build-api.ts` → `index.json`: add/change path examples under `endpoints` (`/api/v1/index.json` is that self-description).
2. `skills/query-concert-stats/endpoints/<name>.md`: **one file per endpoint (or closely related family)**, with frontmatter `name` / `description`, covering request, params and defaults, response fields, how to answer from them, and common errors. New endpoint → new file; do not dump details back into `SKILL.md`.
3. `skills/query-concert-stats/SKILL.md`: facade only — when to use the skill, wording rules, counting semantics, endpoint table (links to sub-docs), workflows index, answer checklist. Endpoint changes: one row in the table; details in the sub-doc.
4. `docs/architecture.md` sections on the public read-only JSON API and the skill: endpoint roles, build artifacts, data sources, sub-doc layout.

`vp run build:catalog` regenerates `public/api` and `server/assets/api` only; it does not refresh prose — write those four by hand.

## Sub-doc style

- Only what this endpoint needs beyond the facade: params, defaults, field meaning, counting differences, common errors. Do not copy wording rules or 场次/演出 definitions.
- Keep each file readable in one pass; lists for fields; `json` examples marked as “fields change as data updates.”
- Served as `/skill/endpoints/<name>.md`; path must match `^endpoints/[a-z-]+\.md$`; lowercase hyphenated names.
- Spell out defaults and counting differences. If the same param defaults differently per endpoint, name it (`includeBroadcast`: off by default on `rank`, on by default on `timeline`).
- External agents cannot read source; never write “see the code.”
- Prefer reusing aggregations in `shared/`; do not reimplement stats inside the Worker.
- Lock “page and API same numbers” with tests (see `tests/timeline-api.test.ts`); when counting rules change, fail the test first, then fix.
- Preprocessed endpoint data belongs under `server/assets/` and is produced by `scripts/build-api.ts` — do not ship SQLite as a Worker asset.
