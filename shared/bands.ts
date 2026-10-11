import type { BandId } from './types.ts'

/** Inclusive lower bounds used to label a view count. The top band is open-ended. */
export const BANDS: readonly { id: BandId; label: string; min: number | null; max: number | null }[] = [
  { id: 'none', label: '尚无快照', min: null, max: null },
  { id: 'under_100k', label: '不足 10 万', min: 0, max: 100_000 },
  { id: '100k_1m', label: '10 万–100 万', min: 100_000, max: 1_000_000 },
  { id: '1m_10m', label: '100 万–1000 万', min: 1_000_000, max: 10_000_000 },
  { id: '10m_plus', label: '1000 万及以上', min: 10_000_000, max: null },
]

/**
 * Maps a view count into a fixed band.
 * A missing count stays in `none` so the UI does not invent a bucket.
 */
export const bandForCount = (count: number | null): BandId => {
  if (count === null || !Number.isFinite(count) || count < 0) return 'none'
  if (count < 100_000) return 'under_100k'
  if (count < 1_000_000) return '100k_1m'
  if (count < 10_000_000) return '1m_10m'
  return '10m_plus'
}

/** Human label for a band id. */
export const bandLabel = (id: BandId): string => {
  const found = BANDS.find((band) => band.id === id)
  return found ? found.label : id
}
