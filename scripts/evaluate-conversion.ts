import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { loadCatalog } from '../shared/catalog.ts'
import { evaluatePairs, pairsFromCatalog } from '../shared/correlation.ts'
import type { SqlRow } from '../shared/types.ts'
import { applyCatalogSql, repoRoot } from './build-catalog.ts'
import { conversionSql } from './sql/emit.ts'

/** Rebuilds the conversion increment from snapshots already present in SQL files. */
export const writeConversionSql = (root = repoRoot()): string => {
  const db = new Database(':memory:')
  try {
    applyCatalogSql(db, root)
    const catalog = loadCatalog({
      /** Reads rows with better-sqlite3 for the formula evaluation. */
      all: (sql: string) => db.prepare(sql).all() as SqlRow[],
    })
    const evaluation = evaluatePairs(pairsFromCatalog(catalog))
    const target = path.join(root, 'data', 'increments', '0003-conversion.sql')
    const sql = conversionSql([
      evaluation.id,
      evaluation.status,
      evaluation.version,
      evaluation.scope,
      evaluation.sample_period,
      evaluation.train_metrics_json,
      evaluation.holdout_metrics_json,
      evaluation.formula_json,
      evaluation.reason,
    ])
    writeFileSync(target, sql)
    return target
  } finally {
    db.close()
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  console.log(`Wrote ${writeConversionSql()}`)
}
