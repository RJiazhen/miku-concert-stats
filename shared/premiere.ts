import type { EditionPremiereRow, PerformanceRole } from './types.ts'

/** Stored on every premiere row so a reviewer can see the rule that picked the date. */
export const PREMIERE_RULE =
  'Earliest start_date among role=show for the same series_id and series_number. ' +
  'role=broadcast is excluded. Equal dates prefer the lower performance id. ' +
  'VocaDB dates are day precision and are not replaced by later livestream dates.'

/** Fields required to choose the first 演出 of a series year. */
export type PremiereCandidate = {
  id: number
  series_id: number
  series_number: number | null
  start_date: string | null
  role: PerformanceRole
  showtime_local: string | null
}

/**
 * Classifies a performance as broadcast when the name or description mentions a livestream.
 * "Online" alone stays a show; only 配信 and livestream match.
 */
export const performanceRole = (name: string, description: string | null): PerformanceRole => {
  const haystack = `${name}\n${description ?? ''}`
  if (/配信|livestream/i.test(haystack)) return 'broadcast'
  return 'show'
}

/**
 * Picks the first 演出 of each series year (系列年度).
 * 演出 without a series number or a start date cannot win.
 */
export const premieresFor = (candidates: readonly PremiereCandidate[]): EditionPremiereRow[] => {
  const groups = new Map<string, PremiereCandidate[]>()
  for (const candidate of candidates) {
    if (candidate.role !== 'show') continue
    if (candidate.series_number === null || candidate.start_date === null) continue
    const key = `${candidate.series_id}:${candidate.series_number}`
    const list = groups.get(key)
    if (list) list.push(candidate)
    else groups.set(key, [candidate])
  }

  const rows: EditionPremiereRow[] = []
  for (const group of groups.values()) {
    const winner = group.reduce((best, candidate) => {
      if (candidate.start_date === null || best.start_date === null) return best
      if (candidate.start_date < best.start_date) return candidate
      if (candidate.start_date > best.start_date) return best
      return candidate.id < best.id ? candidate : best
    })
    if (winner.series_number === null || winner.start_date === null) continue
    rows.push({
      series_id: winner.series_id,
      series_number: winner.series_number,
      premiere_performance_id: winner.id,
      premiere_date: winner.start_date,
      premiere_showtime_local: winner.showtime_local,
      rule: PREMIERE_RULE,
    })
  }
  rows.sort((left, right) => left.series_id - right.series_id || left.series_number - right.series_number)
  return rows
}
