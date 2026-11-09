import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { applyCatalogSql, repoRoot } from './build-catalog.ts'
import { loadCatalog } from '../shared/catalog.ts'
import { parseCharacterConfig } from '../shared/characters.ts'
import { buildNameCoverage, renderNameCoverage } from '../shared/name-coverage.ts'
import { parseSongAliases } from '../shared/song-aliases.ts'
import { parseSongTitles } from '../shared/song-titles.ts'
import type { SqlRow } from '../shared/types.ts'

/** Scratch path of the worklist. It is generated on demand and never committed. */
const OUTPUT = path.join('tmp', 'name-coverage.md')

/** Reads a JSON file from the repository. */
const readJson = (root: string, relative: string): unknown => {
  return JSON.parse(readFileSync(path.join(root, relative), 'utf8'))
}

/** Builds the catalog from the committed SQL so the worklist matches what the site shows. */
const readCatalog = (root: string) => {
  const db = new Database(':memory:')
  try {
    applyCatalogSql(db, root)
    return loadCatalog({
      /** Runs one read-only query against the in-memory catalog. */
      all: (sql: string) => db.prepare(sql).all() as SqlRow[],
    })
  } finally {
    db.close()
  }
}

const root = repoRoot()
const report = buildNameCoverage({
  catalog: readCatalog(root),
  characterRules: parseCharacterConfig(readJson(root, path.join('data', 'characters.json'))),
  zhTitles: parseSongTitles(readJson(root, path.join('data', 'song-titles.zh-CN.json'))),
  hantTitles: parseSongTitles(readJson(root, path.join('data', 'song-titles.zh-Hant.json'))),
  songAliases: parseSongAliases(readJson(root, path.join('data', 'song-aliases.json'))),
})
const target = path.join(root, OUTPUT)
mkdirSync(path.dirname(target), { recursive: true })
writeFileSync(target, renderNameCoverage(report))
console.log(`Wrote ${OUTPUT}`)
