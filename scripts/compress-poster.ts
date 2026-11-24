/**
 * Compresses and encodes concert poster images for `public/posters/`.
 *
 * Recommended delivery: WebP at most 1800 px wide (downscale only; never upscale).
 * Reads JPEG / PNG / WebP (and other formats sharp supports), writes `{stem}.webp`.
 *
 * Usage:
 *   pnpm posters:compress <input> [more…]
 *   pnpm posters:compress --out public/posters <input>
 *   pnpm posters:compress --width 1800 --quality 82 poster-intake/miku-expo/foo.png
 *
 * Defaults: width 1800, quality 82, output next to the input (or `--out` directory)
 * with the same basename and a `.webp` extension.
 */
import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

/** Default maximum width in pixels for shipped poster assets. */
export const POSTER_MAX_WIDTH = 1800

/** Default WebP quality (sharp `quality`, 1–100). */
export const POSTER_WEBP_QUALITY = 82

export type CompressPosterOptions = {
  /** Maximum output width in pixels; wider sources are downscaled. */
  maxWidth?: number
  /** WebP quality 1–100. */
  quality?: number
  /**
   * Output path: a `.webp` file, or a directory (then `{basename}.webp` is written there).
   * When omitted, writes beside the input with a `.webp` extension.
   */
  out?: string
}

export type CompressPosterResult = {
  input: string
  output: string
  width: number
  height: number
  bytesIn: number
  bytesOut: number
}

/**
 * Resolves the WebP output path for one input and an optional `--out` value.
 */
export const resolvePosterOutputPath = (input: string, out?: string): string => {
  const stem = path.basename(input, path.extname(input))
  if (!out) return path.join(path.dirname(input), `${stem}.webp`)
  if (out.toLowerCase().endsWith('.webp')) return out
  try {
    if (statSync(out).isDirectory()) return path.join(out, `${stem}.webp`)
  } catch {
    // Missing path: treat bare names without an extension as directories.
  }
  if (path.extname(out) === '') return path.join(out, `${stem}.webp`)
  return out
}

/**
 * Resizes (width ≤ maxWidth, no upscale) and encodes one image as WebP.
 */
export const compressPosterImage = async (
  input: string,
  options: CompressPosterOptions = {},
): Promise<CompressPosterResult> => {
  const maxWidth = options.maxWidth ?? POSTER_MAX_WIDTH
  const quality = options.quality ?? POSTER_WEBP_QUALITY
  const output = resolvePosterOutputPath(input, options.out)
  mkdirSync(path.dirname(output), { recursive: true })

  const bytesIn = statSync(input).size
  const image = sharp(input, { failOn: 'none' })
  const meta = await image.metadata()
  const width = meta.width ?? 0
  const pipeline =
    width > maxWidth
      ? image.resize({ width: maxWidth, withoutEnlargement: true })
      : image

  const { data, info } = await pipeline
    .webp({ quality, effort: 4 })
    .toBuffer({ resolveWithObject: true })

  writeFileSync(output, data)

  return {
    input,
    output,
    width: info.width,
    height: info.height,
    bytesIn,
    bytesOut: data.byteLength,
  }
}

/**
 * Parses CLI flags and positional input paths for the compress script.
 */
export const parseCompressPosterArgs = (
  argv: string[],
): { inputs: string[]; maxWidth: number; quality: number; out?: string } => {
  const inputs: string[] = []
  let maxWidth = POSTER_MAX_WIDTH
  let quality = POSTER_WEBP_QUALITY
  let out: string | undefined

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--width' || arg === '-w') {
      const value = Number(argv[++i])
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid --width value: ${argv[i] ?? '(missing)'}`)
      }
      maxWidth = Math.floor(value)
      continue
    }
    if (arg === '--quality' || arg === '-q') {
      const value = Number(argv[++i])
      if (!Number.isFinite(value) || value < 1 || value > 100) {
        throw new Error(`Invalid --quality value: ${argv[i] ?? '(missing)'}`)
      }
      quality = Math.floor(value)
      continue
    }
    if (arg === '--out' || arg === '-o') {
      out = argv[++i]
      if (!out) throw new Error('Missing path after --out')
      continue
    }
    if (arg === '--help' || arg === '-h') {
      return { inputs: [], maxWidth, quality, out }
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown flag: ${arg}`)
    }
    inputs.push(arg)
  }

  return { inputs, maxWidth, quality, out }
}

/**
 * Prints CLI usage for `pnpm posters:compress`.
 */
const printUsage = (): void => {
  console.log(`Usage: pnpm posters:compress [options] <image> [more…]

Encode poster images as WebP for public/posters/.

Options:
  -w, --width <px>      Max width (default ${POSTER_MAX_WIDTH}; never upscales)
  -q, --quality <1-100> WebP quality (default ${POSTER_WEBP_QUALITY})
  -o, --out <path>      Output .webp file or directory
  -h, --help            Show this help

Examples:
  pnpm posters:compress poster-intake/miku-expo/miku-expo-2026-europe.png
  pnpm posters:compress --out public/posters intake.png
`)
}

/**
 * Formats one compress result as a single log line.
 */
const formatResult = (result: CompressPosterResult): string => {
  const kb = (n: number) => `${(n / 1024).toFixed(1)} KiB`
  return (
    `${path.relative(process.cwd(), result.input)} → ${path.relative(process.cwd(), result.output)} ` +
    `(${result.width}×${result.height}, ${kb(result.bytesIn)} → ${kb(result.bytesOut)})`
  )
}

const isDirectRun =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  try {
    const parsed = parseCompressPosterArgs(process.argv.slice(2))
    if (parsed.inputs.length === 0) {
      printUsage()
      process.exit(process.argv.slice(2).some((a) => a === '--help' || a === '-h') ? 0 : 1)
    }
    for (const input of parsed.inputs) {
      const result = await compressPosterImage(input, {
        maxWidth: parsed.maxWidth,
        quality: parsed.quality,
        out: parsed.out,
      })
      console.log(formatResult(result))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}
