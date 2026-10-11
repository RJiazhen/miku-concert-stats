import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { applyCatalogSql, repoRoot } from './build-catalog.ts'
import { writeConversionSql } from './evaluate-conversion.ts'
import { sqlLiteral } from './sql/emit.ts'

/** YouTube videos.list item. viewCount is omitted when the API does not return it. */
export type YoutubeVideoItem = {
  id?: string
  statistics?: { viewCount?: string }
}

/** One snapshot row derived from a videos.list payload. */
export type SnapshotInsert = {
  platform: 'youtube'
  platform_video_id: string
  collected_at: string
  view_count: number
  source: 'youtube-data-api-v3'
  source_url: string
}

/**
 * Turns a videos.list JSON body into snapshot rows.
 * Items without a numeric viewCount are skipped so a missing stat is not stored as zero.
 */
export const snapshotsFromYoutube = (
  body: { items?: YoutubeVideoItem[]; error?: { message?: string } },
  collectedAt: string,
): SnapshotInsert[] => {
  if (body.error) throw new Error(body.error.message ?? 'YouTube Data API error')
  const rows: SnapshotInsert[] = []
  for (const item of body.items ?? []) {
    if (!item.id || !item.statistics?.viewCount) continue
    if (!/^\d+$/.test(item.statistics.viewCount)) continue
    rows.push({
      platform: 'youtube',
      platform_video_id: item.id,
      collected_at: collectedAt,
      view_count: Number(item.statistics.viewCount),
      source: 'youtube-data-api-v3',
      source_url: `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${item.id}`,
    })
  }
  return rows
}

/** Appends snapshot inserts. The file is created with a header on first use. */
export const appendSnapshotSql = (file: string, rows: readonly SnapshotInsert[]): void => {
  if (rows.length === 0) return
  const lines = rows.map((row) =>
    `INSERT OR IGNORE INTO view_snapshots (platform, platform_video_id, collected_at, view_count, source, source_url) VALUES (${[
      sqlLiteral(row.platform),
      sqlLiteral(row.platform_video_id),
      sqlLiteral(row.collected_at),
      sqlLiteral(row.view_count),
      sqlLiteral(row.source),
      sqlLiteral(row.source_url),
    ].join(', ')});`,
  )
  if (!existsSync(file)) {
    writeFileSync(file, `-- YouTube Data API v3 videos.list statistics. Append-only.\n${lines.join('\n')}\n`)
    return
  }
  const current = readFileSync(file, 'utf8')
  const prefix = current.endsWith('\n') ? '' : '\n'
  appendFileSync(file, `${prefix}${lines.join('\n')}\n`)
}

/** Reads YouTube video ids already in the catalog SQL. */
export const youtubeVideoIds = (root = repoRoot()): string[] => {
  const db = new Database(':memory:')
  try {
    applyCatalogSql(db, root)
    const rows = db.prepare(`SELECT DISTINCT platform_video_id FROM videos WHERE platform = 'youtube' AND disabled = 0`).all() as { platform_video_id: string }[]
    return rows.map((row) => row.platform_video_id)
  } finally {
    db.close()
  }
}

/** Collects current YouTube view counts when YOUTUBE_API_KEY is set. Exits without writing when it is not. */
export const snapshotYoutube = async (root = repoRoot()): Promise<number> => {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) {
    console.log('YOUTUBE_API_KEY is unset; skipping YouTube snapshots. No view counts were estimated.')
    return 0
  }
  const ids = youtubeVideoIds(root)
  const collectedAt = new Date().toISOString()
  const all: SnapshotInsert[] = []
  for (let index = 0; index < ids.length; index += 50) {
    const batch = ids.slice(index, index + 50)
    const url = new URL('https://www.googleapis.com/youtube/v3/videos')
    url.searchParams.set('part', 'statistics')
    url.searchParams.set('id', batch.join(','))
    url.searchParams.set('key', key)
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`YouTube Data API ${response.status}`)
    const body = (await response.json()) as { items?: YoutubeVideoItem[]; error?: { message?: string } }
    all.push(...snapshotsFromYoutube(body, collectedAt))
  }
  const file = path.join(root, 'data', 'increments', '0002-youtube-snapshots.sql')
  appendSnapshotSql(file, all)
  writeConversionSql(root)
  console.log(`Appended ${all.length} YouTube snapshots to ${file}`)
  return all.length
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  await snapshotYoutube()
}
