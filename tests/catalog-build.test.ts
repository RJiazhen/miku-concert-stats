import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { buildCatalogFile, compressCatalogFile } from '../scripts/build-catalog.ts'

describe('catalog artifacts', () => {
  it('writes a gzip copy that inflates to the sqlite file', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'miku-catalog-'))
    try {
      const schema = fileURLToPath(new URL('../data/schema.sql', import.meta.url))
      cpSync(schema, path.join(root, 'data', 'schema.sql'), { recursive: true })
      const sqlite = buildCatalogFile(root)
      const compressed = compressCatalogFile(sqlite)
      expect(path.basename(compressed)).toBe('catalog.sqlite.gz')
      expect(gunzipSync(readFileSync(compressed)).equals(readFileSync(sqlite))).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
