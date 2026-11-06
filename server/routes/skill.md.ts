import { createError, defineEventHandler } from 'h3'
import { useStorage } from 'nitropack/runtime'

/** Asset key inside the `skill` server-assets mount declared in `nuxt.config.ts`. */
const SKILL_ASSET_KEY = 'query-concert-stats/SKILL.md'

/**
 * Serves `skills/query-concert-stats/SKILL.md` as plain text at `/skill.md`.
 * An external agent can fetch this URL instead of installing the skill from the repository;
 * the file is bundled at build time so the Worker never needs a filesystem.
 */
const serveSkill = async () => {
  const content = await useStorage('assets:skill').getItem<string>(SKILL_ASSET_KEY)
  if (typeof content !== 'string') {
    throw createError({ statusCode: 500, statusMessage: 'Skill unavailable', message: 'skill 文件不可用' })
  }

  // Returning a web Response avoids h3's node adapter: the Worker runs without `event.node.res`.
  // Plain text keeps every chat client and HTTP fetcher happy, and avoids a download prompt.
  return new Response(content, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  })
}

export default defineEventHandler(serveSkill)
