import raw from '~~/data/song-variants.json'
import { parseSongVariants, type SongVariantIndex } from '~~/shared/song-variants.ts'

/** Parsed once: the variant file is static build-time data. */
export const songVariants: SongVariantIndex = parseSongVariants(raw)

/** Hand-checked variant mapping shared by ranking, raw data, and song pages. */
export const useSongVariants = (): SongVariantIndex => songVariants
