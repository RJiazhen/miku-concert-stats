import { createError, defineEventHandler, getQuery } from 'h3'
import { mapSongSearch } from '../../shared/lookup.ts'

/** User-Agent sent with the on-demand VocaDB search. */
const USER_AGENT = 'miku-concert-stats/0.1 (+https://github.com/RJiazhen/miku-concert-stats)'

/**
 * Searches VocaDB only when the browser asks.
 * The client is expected to skip this route when the local catalog already matches.
 */
const lookup = async (event: Parameters<typeof getQuery>[0]) => {
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  if (q.length < 1 || q.length > 80) {
    throw createError({ statusCode: 400, statusMessage: 'Query must be 1 to 80 characters' })
  }
  const url = new URL('https://vocadb.net/api/songs')
  url.searchParams.set('query', q)
  url.searchParams.set('maxResults', '5')
  url.searchParams.set('fields', 'PVs')
  url.searchParams.set('lang', 'Default')
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  })
  if (!response.ok) {
    throw createError({ statusCode: 502, statusMessage: 'VocaDB lookup failed' })
  }
  const body: unknown = await response.json()
  return mapSongSearch(body)
}

export default defineEventHandler(lookup)
