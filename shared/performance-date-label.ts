import type { Translate } from './i18n/index.ts'
import type { PerformanceStatusValue } from './types.ts'

/** Catalog status that can change how a missing date is labelled. */
export type DateLabelStatus = PerformanceStatusValue | null | undefined

/**
 * Visible date text for a performance.
 * A known calendar date is always printed, including when the show is cancelled or upcoming.
 * A missing date is "cancelled" only for a sourced cancellation; otherwise it is undetermined.
 * This never returns a "not yet performed" phrase.
 */
export const performanceDateLabel = (
  startDate: string | null | undefined,
  t: Translate,
  options: { endDate?: string | null; status?: DateLabelStatus } = {},
): string => {
  const start = startDate?.trim() ?? ''
  if (start !== '') {
    const end = options.endDate?.trim() ?? ''
    return end !== '' && end !== start ? `${start} – ${end}` : start
  }
  if (options.status === 'cancelled') return t('common.dateCancelled')
  return t('common.dateUndetermined')
}

/** Status of one performance, or null when the catalog has no hand-checked row. */
export const performanceStatusOf = (
  statuses: readonly { performance_id: number; status: PerformanceStatusValue }[],
  performanceId: number,
): PerformanceStatusValue | null =>
  statuses.find((row) => row.performance_id === performanceId)?.status ?? null
