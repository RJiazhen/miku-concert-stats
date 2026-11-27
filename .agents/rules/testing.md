# Testing scope: only necessary tests

Tests in this project guard counting semantics and data-processing rules, not every line of code. Default: do not add tests. Write them only when an item below applies, and prefer extending an existing test file over creating a new one.

## Worth testing

- Pure logic that changes on-site statistics: premiere selection, 场次/演出 dedupe, variant merge, mashup split, year ranges.
- Parsing with a clear external spec or past failure: showtime clocks, setlist slots, cross-region/multi-version merges, credit and character role parsing.
- Critical assertions on committed data: a few catalog checks against real SQL under `data/` (see `tests/catalog.test.ts`). Do not snapshot every row.

## Do not write

- Fine-grained tests that restate fields: getters/setters, simple maps, constants, i18n copy, Tailwind classes, component render trees.
- One `it` per branch; fold related assertions into one case.
- Things the type system or framework already guarantees (prop types, required params, defaults).
- Coverage-only tests, or one-off tests nobody will keep.

## Change and delete

- When changing behavior, update existing tests first; delete `it`/`describe` for removed behavior — do not leave commented tests.
- When deleting a function, column, page, script, or table, delete its tests and related `tests/catalog.test.ts` assertions in the same change.
- Do not add compatibility tests for deleted APIs, or tests that only assert something no longer exists.
- Do not leave empty test files; delete the file when its suite is empty.

## Running

- Run `vp test` (or `vp test <file>`) when the change touches the pure logic or data rules above.
- Skip tests for copy-only, style-only, or docs-only changes.
