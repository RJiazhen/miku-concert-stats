import { bandForCount } from './bands.ts'
import { latestSnapshot, representativeVideo } from './stats.ts'
import type { Catalog, ConversionFormulaRow } from './types.ts'

/** Id of the only formula this project knows how to publish. */
export const FORMULA_ID = 'nico-to-youtube-log10'

/** Scope text stored beside the formula so a later reader can see what was tested. */
export const FORMULA_SCOPE =
  'Pairs are the same VocaDB song with an enabled representative niconico PV and YouTube PV, using each video’s latest snapshot. ' +
  'Strata are publish decade, niconico view band, and YouTube pvType. Holdout songs are those whose id modulo 5 is 0. ' +
  'The form is log10(youtube views) = a + b * log10(niconico views).'

/** One paired observation used to fit or score the conversion. */
export type ViewPair = {
  songId: number
  niconicoViews: number
  youtubeViews: number
  publishDate: string | null
  pvType: string | null
  collectedAt: string
}

/** Fit and error summary for one split. */
export type SplitMetrics = {
  n: number
  pearsonR: number | null
  medianApe: number | null
}

/** Result of the publication gates. */
export type FormulaEvaluation = ConversionFormulaRow

/** Minimum paired songs required before a formula may be published. */
export const MIN_TRAIN = 40
export const MIN_HOLDOUT = 15
export const MIN_ABSOLUTE_R = 0.8
export const MAX_MEDIAN_APE = 0.25
export const STRATUM_MIN = 8
export const MAX_STRATUM_APE = 0.4

/** Holdout membership. About one fifth of song ids are reserved. */
export const isHoldoutSong = (songId: number): boolean => songId % 5 === 0

/** Decade label such as 2010s. Unknown when the publish date has no year. */
export const decadeOf = (publishDate: string | null): string => {
  if (publishDate === null || !/^\d{4}/.test(publishDate)) return 'unknown'
  const year = Number(publishDate.slice(0, 4))
  const start = Math.floor(year / 10) * 10
  return `${start}s`
}

/** Stratum key from the niconico side's band, the song decade, and the YouTube PV type. */
export const stratumKey = (pair: ViewPair): string => {
  return `${decadeOf(pair.publishDate)}|${bandForCount(pair.niconicoViews)}|${pair.pvType ?? 'unknown'}`
}

/**
 * Builds pairs from representative videos that both have a positive latest snapshot.
 * Songs missing either platform are skipped rather than filled.
 */
export const pairsFromCatalog = (catalog: Catalog): ViewPair[] => {
  const pairs: ViewPair[] = []
  for (const song of catalog.songs) {
    const niconico = representativeVideo(catalog.videos, song.id, 'niconico')
    const youtube = representativeVideo(catalog.videos, song.id, 'youtube')
    if (!niconico || !youtube) continue
    const niconicoSnapshot = latestSnapshot(catalog.snapshots, 'niconico', niconico.platform_video_id)
    const youtubeSnapshot = latestSnapshot(catalog.snapshots, 'youtube', youtube.platform_video_id)
    if (!niconicoSnapshot || !youtubeSnapshot) continue
    if (niconicoSnapshot.view_count <= 0 || youtubeSnapshot.view_count <= 0) continue
    const collectedAt = niconicoSnapshot.collected_at > youtubeSnapshot.collected_at
      ? niconicoSnapshot.collected_at
      : youtubeSnapshot.collected_at
    pairs.push({
      songId: song.id,
      niconicoViews: niconicoSnapshot.view_count,
      youtubeViews: youtubeSnapshot.view_count,
      publishDate: song.publish_date,
      pvType: youtube.pv_type,
      collectedAt,
    })
  }
  return pairs
}

/** Pearson correlation. Null when either side has no variance or fewer than two points. */
export const pearson = (xs: readonly number[], ys: readonly number[]): number | null => {
  const n = xs.length
  if (n !== ys.length || n < 2) return null
  const meanX = xs.reduce((sum, value) => sum + value, 0) / n
  const meanY = ys.reduce((sum, value) => sum + value, 0) / n
  let covariance = 0
  let varX = 0
  let varY = 0
  for (let index = 0; index < n; index += 1) {
    const dx = (xs[index] ?? 0) - meanX
    const dy = (ys[index] ?? 0) - meanY
    covariance += dx * dy
    varX += dx * dx
    varY += dy * dy
  }
  if (varX === 0 || varY === 0) return null
  return covariance / Math.sqrt(varX * varY)
}

/** Ordinary least squares for y = a + b x. Null when x has no variance. */
export const fitLine = (xs: readonly number[], ys: readonly number[]): { a: number; b: number } | null => {
  const n = xs.length
  if (n !== ys.length || n < 2) return null
  const meanX = xs.reduce((sum, value) => sum + value, 0) / n
  const meanY = ys.reduce((sum, value) => sum + value, 0) / n
  let varX = 0
  let covariance = 0
  for (let index = 0; index < n; index += 1) {
    const dx = (xs[index] ?? 0) - meanX
    varX += dx * dx
    covariance += dx * ((ys[index] ?? 0) - meanY)
  }
  if (varX === 0) return null
  const b = covariance / varX
  return { a: meanY - b * meanX, b }
}

/** Predicted YouTube views from the published log10 line. */
export const predictYoutube = (a: number, b: number, niconicoViews: number): number => {
  return 10 ** (a + b * Math.log10(niconicoViews))
}

/** Absolute percentage error. Caller must pass a positive actual value. */
export const absolutePercentageError = (actual: number, predicted: number): number => {
  return Math.abs(actual - predicted) / actual
}

/** Median of a non-empty numeric list. */
export const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((left, right) => left - right)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
  return sorted[mid] ?? 0
}

/** Log-space correlation and median APE against a fit. APE is null when no fit is supplied. */
export const splitMetrics = (pairs: readonly ViewPair[], fit: { a: number; b: number } | null): SplitMetrics => {
  const logsX = pairs.map((pair) => Math.log10(pair.niconicoViews))
  const logsY = pairs.map((pair) => Math.log10(pair.youtubeViews))
  const errors = fit
    ? pairs.map((pair) => absolutePercentageError(pair.youtubeViews, predictYoutube(fit.a, fit.b, pair.niconicoViews)))
    : []
  return {
    n: pairs.length,
    pearsonR: pearson(logsX, logsY),
    medianApe: errors.length === 0 ? null : median(errors),
  }
}

/**
 * Decides whether the log-line formula may be published.
 * Gates are applied to the training fit and the untouched holdout.
 * Strata with at least eight holdout pairs must each stay within the stratum MAPE cap.
 */
export const evaluatePairs = (pairs: readonly ViewPair[]): FormulaEvaluation => {
  const train = pairs.filter((pair) => !isHoldoutSong(pair.songId))
  const holdout = pairs.filter((pair) => isHoldoutSong(pair.songId))
  const trainLogsX = train.map((pair) => Math.log10(pair.niconicoViews))
  const trainLogsY = train.map((pair) => Math.log10(pair.youtubeViews))
  const fit = fitLine(trainLogsX, trainLogsY)
  const trainMetrics = splitMetrics(train, fit)
  const holdoutMetrics = splitMetrics(holdout, fit)
  const failures: string[] = []
  if (train.length < MIN_TRAIN) failures.push(`training pairs ${train.length} < ${MIN_TRAIN}`)
  if (holdout.length < MIN_HOLDOUT) failures.push(`holdout pairs ${holdout.length} < ${MIN_HOLDOUT}`)
  if (trainMetrics.pearsonR === null || Math.abs(trainMetrics.pearsonR) < MIN_ABSOLUTE_R) {
    failures.push('training |r| below 0.8')
  }
  if (holdoutMetrics.pearsonR === null || Math.abs(holdoutMetrics.pearsonR) < MIN_ABSOLUTE_R) {
    failures.push('holdout |r| below 0.8')
  }
  if (trainMetrics.medianApe === null || trainMetrics.medianApe > MAX_MEDIAN_APE) {
    failures.push('training median APE above 25%')
  }
  if (holdoutMetrics.medianApe === null || holdoutMetrics.medianApe > MAX_MEDIAN_APE) {
    failures.push('holdout median APE above 25%')
  }
  if (fit) {
    const strata = new Map<string, ViewPair[]>()
    for (const pair of holdout) {
      const key = stratumKey(pair)
      const list = strata.get(key)
      if (list) list.push(pair)
      else strata.set(key, [pair])
    }
    for (const [key, group] of strata) {
      if (group.length < STRATUM_MIN) continue
      const metrics = splitMetrics(group, fit)
      if (metrics.medianApe === null || metrics.medianApe > MAX_STRATUM_APE) {
        failures.push(`holdout stratum ${key} median APE above 40%`)
      }
    }
  }
  const collected = pairs.map((pair) => pair.collectedAt).sort()
  const samplePeriod = collected.length === 0 ? null : `${collected[0]}..${collected[collected.length - 1]}`
  const published = failures.length === 0 && fit !== null
  return {
    id: FORMULA_ID,
    status: published ? 'published' : 'unpublished',
    version: published ? '1' : null,
    scope: FORMULA_SCOPE,
    sample_period: samplePeriod,
    train_metrics_json: JSON.stringify(trainMetrics),
    holdout_metrics_json: JSON.stringify(holdoutMetrics),
    formula_json: published && fit ? JSON.stringify({ form: 'log10(youtube)=a+b*log10(niconico)', a: fit.a, b: fit.b }) : null,
    reason: published ? 'All publication gates passed.' : failures.join('; '),
  }
}
