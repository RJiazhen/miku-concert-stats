/**
 * Compresses retained poster originals into packaged WebP previews.
 *
 * Reads `data/tour-posters.json`, compresses each `originalSrc` into its
 * `src` path under `public/posters/` (max width 1800). Run from `prebuild`
 * / packaging so git keeps originals and only ships compressed previews.
 *
 * Usage:
 *   vp run posters:package
 *   # or: tsx scripts/package-posters.ts
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compressPosterImage } from './compress-poster.ts'
import { postersForTourEntry, type TourPostersFile } from '../shared/homepage-carousel.ts'

/**
 * Resolves a public URL path like `/posters/foo.webp` to a repo-relative file.
 */
const publicFileFromSrc = (src: string): string => {
  const trimmed = src.replace(/^\//, '')
  return path.join(process.cwd(), 'public', trimmed)
}

/**
 * Packages every mapped original into its compressed `src` preview path.
 */
const packageAllPosters = async (): Promise<number> => {
  const filePath = path.join(process.cwd(), 'data', 'tour-posters.json')
  const data = JSON.parse(readFileSync(filePath, 'utf8')) as TourPostersFile
  let count = 0
  for (const [tourId, entry] of Object.entries(data.tours)) {
    const posters = postersForTourEntry(entry)
    for (const [index, poster] of posters.entries()) {
      const input = publicFileFromSrc(poster.originalSrc || poster.src)
      const output = publicFileFromSrc(poster.src)
      if (!existsSync(input)) {
        console.warn(`skip ${tourId}#${index + 1}: missing original ${poster.originalSrc}`)
        continue
      }
      if (path.resolve(input) === path.resolve(output)) {
        console.warn(`skip ${tourId}#${index + 1}: original and src are the same path`)
        continue
      }
      const result = await compressPosterImage(input, { out: output })
      console.log(
        `${tourId}#${index + 1}: ${path.relative(process.cwd(), result.input)} → ${path.relative(process.cwd(), result.output)}`,
      )
      count += 1
    }
  }
  return count
}

const isDirectRun =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  try {
    const count = await packageAllPosters()
    console.log(`Packaged ${count} poster(s).`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}

export { packageAllPosters }
