/**
 * Public surface of the 場次 setlist layer, split by responsibility:
 *
 * - `performance-setlist-curation.ts`: types for `data/performance-setlists.json` plus its parser
 *   and the catalog cross-check.
 * - `performance-setlist-build.ts`: expands the source song lists into one setlist per 場次.
 * - `performance-setlist-query.ts`: reads the derived rows back for pages, counts, and printing.
 *
 * Import from here; the three modules are implementation details.
 */
export * from './performance-setlist-curation.ts'
export * from './performance-setlist-build.ts'
export * from './performance-setlist-query.ts'
