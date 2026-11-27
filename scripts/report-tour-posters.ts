/**
 * Writes a temporary tour + poster audit markdown for manual review.
 * Output lives under gitignored `temp/` and must not be committed.
 *
 *   vp run report:tour-posters
 *   # or: tsx scripts/report-tour-posters.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseTours, type Tour } from '../shared/tours.ts'
import type { HomepagePosterRecord, TourPostersFile } from '../shared/homepage-carousel.ts'

/** Repository root from this script’s location. */
const repoRoot = (): string => path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Scratch audit path; generated on demand and never committed. */
const OUTPUT = path.join('temp', 'tour-poster-audit.md')

/** Poster presence relative to the tour registry and `public/`. */
type PosterStatus = 'missing' | 'mapped' | 'file-missing'

/** One audit row for a tour. */
type TourPosterAuditRow = {
  tour: Tour
  status: PosterStatus
  poster: HomepagePosterRecord | null
  filePath: string | null
}

/** Reads a JSON file from the repository. */
const readJson = (root: string, relative: string): unknown =>
  JSON.parse(readFileSync(path.join(root, relative), 'utf8'))

/** Resolves a poster `src` like `/posters/foo.webp` to a repo-relative public path. */
const publicPathFromSrc = (src: string): string | null => {
  if (!src.startsWith('/')) return null
  return path.join('public', src.slice(1))
}

/** Classifies one tour against the poster registry and the local file. */
const auditTour = (tour: Tour, posters: TourPostersFile, root: string): TourPosterAuditRow => {
  const poster = posters.tours[tour.id] ?? null
  if (poster === null) {
    return { tour, status: 'missing', poster: null, filePath: null }
  }
  const filePath = publicPathFromSrc(poster.src)
  if (filePath === null || !existsSync(path.join(root, filePath))) {
    return { tour, status: 'file-missing', poster, filePath }
  }
  return { tour, status: 'mapped', poster, filePath }
}

/** Formats one tour block for the markdown audit. */
const renderTourBlock = (row: TourPosterAuditRow): string => {
  const { tour, status, poster, filePath } = row
  const lines = [
    `### \`${tour.id}\``,
    '',
    `- **name:** ${tour.name}`,
    `- **seriesId:** ${tour.seriesId}`,
    `- **sourceUrl:** ${tour.sourceUrl ?? '—'}`,
    `- **stops:** ${tour.performanceIds.length} (${tour.performanceIds.join(', ')})`,
    `- **poster status:** ${status}`,
  ]
  if (poster !== null) {
    lines.push(
      `- **src:** ${poster.src}`,
      `- **file:** ${filePath ?? '—'}`,
      `- **sourcePage:** ${poster.sourcePage}`,
      `- **sourceUrl (image):** ${poster.sourceUrl}`,
      `- **sourceLabel:** ${poster.sourceLabel}`,
      `- **accessedAt:** ${poster.accessedAt}`,
    )
  } else {
    lines.push('- **src:** —')
  }
  lines.push('')
  return lines.join('\n')
}

/** Builds the full audit markdown. */
const renderAudit = (rows: readonly TourPosterAuditRow[]): string => {
  const missing = rows.filter((row) => row.status === 'missing')
  const fileMissing = rows.filter((row) => row.status === 'file-missing')
  const mapped = rows.filter((row) => row.status === 'mapped')
  const header = [
    '# Tour poster audit',
    '',
    'Temporary checklist for correcting wrong posters or filling missing ones.',
    'Regenerate with `vp run report:tour-posters` (or `tsx scripts/report-tour-posters.ts`).',
    'Do not commit this file (`temp/` is gitignored).',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Totals: **${rows.length}** tours · **${mapped.length}** mapped · **${missing.length}** missing · **${fileMissing.length}** file-missing`,
    '',
  ]
  const sections: string[] = [...header]
  if (missing.length > 0) {
    sections.push('## Missing poster', '', ...missing.map(renderTourBlock))
  }
  if (fileMissing.length > 0) {
    sections.push('## Mapped but file missing', '', ...fileMissing.map(renderTourBlock))
  }
  sections.push('## All tours', '', ...rows.map(renderTourBlock))
  return `${sections.join('\n').trimEnd()}\n`
}

const root = repoRoot()
const tours = parseTours(readJson(root, path.join('data', 'tours.json')))
const posters = readJson(root, path.join('data', 'tour-posters.json')) as TourPostersFile
const rows = tours.tours.map((tour) => auditTour(tour, posters, root))
const target = path.join(root, OUTPUT)
mkdirSync(path.dirname(target), { recursive: true })
writeFileSync(target, renderAudit(rows))
console.log(`Wrote ${OUTPUT}`)
console.log(
  `tours=${rows.length} mapped=${rows.filter((r) => r.status === 'mapped').length} missing=${rows.filter((r) => r.status === 'missing').length} file_missing=${rows.filter((r) => r.status === 'file-missing').length}`,
)
