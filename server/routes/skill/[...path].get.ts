import { createError, defineEventHandler, getRouterParam, type H3Event } from 'h3'
import { useStorage } from 'nitropack/runtime'

/** Reference files an external agent may fetch; anything else is refused. */
const ALLOWED = /^endpoints\/[a-z-]+\.md$/

/**
 * Serves one endpoint reference of `skills/query-concert-stats` as plain text at
 * `/skill/endpoints/<name>.md`.
 *
 * `SKILL.md` stays the front door at `/skill.md`; these files are the per-endpoint detail it links
 * to, so an agent that only has the skill text can still read the exact parameters and fields.
 * The path is checked against a fixed pattern, so the route cannot reach any other bundled asset.
 */
const serveEndpointReference = async (event: H3Event) => {
  const path = getRouterParam(event, 'path', { decode: true }) ?? ''
  if (!ALLOWED.test(path)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found', message: '没有这份接口说明' })
  }
  const content = await useStorage('assets:skill').getItem<string>(`query-concert-stats/${path}`)
  if (typeof content !== 'string') {
    throw createError({ statusCode: 404, statusMessage: 'Not found', message: '没有这份接口说明' })
  }

  // A web Response keeps the Worker path off h3's node adapter, same as `/skill.md`.
  return new Response(content, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  })
}

export default defineEventHandler(serveEndpointReference)
