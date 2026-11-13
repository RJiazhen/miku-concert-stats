/** Local clock time taken from a Japanese event description, with the excerpt that justified it. */
export type ShowtimeHit = {
  showtime_local: string
  timezone: 'Asia/Tokyo'
  time_evidence: string
}

/**
 * Reads a single Showtime or 開演 clock time from a VocaDB description.
 * Returns null unless the venue country is JP and exactly one valid HH:MM appears,
 * so a daytime/night pair is not collapsed into a guessed start.
 */
export const parseShowtime = (description: string | null, countryCode: string | null): ShowtimeHit | null => {
  if (countryCode !== 'JP' || description === null || description.trim() === '') return null
  const pattern = /(?:Showtime|開演)\s*[:：]?\s*(\d{1,2}):(\d{2})/gi
  const times = new Map<string, string>()
  for (const match of description.matchAll(pattern)) {
    const hour = Number(match[1])
    const minute = Number(match[2])
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) continue
    const showtime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    if (times.has(showtime)) continue
    const index = match.index ?? 0
    const excerpt = description
      .slice(Math.max(0, index - 16), index + match[0].length + 16)
      .replace(/\s+/g, ' ')
      .trim()
    times.set(showtime, excerpt)
  }
  if (times.size !== 1) return null
  const entry = [...times.entries()][0]
  if (!entry) return null
  return {
    showtime_local: entry[0],
    timezone: 'Asia/Tokyo',
    time_evidence: entry[1],
  }
}
