import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import cities from '../../i18n/modules/cities.ts'
import col from '../../i18n/modules/col.ts'
import feedback from '../../i18n/modules/feedback.ts'
import producers from '../../i18n/modules/producers.ts'
import rank from '../../i18n/modules/rank.ts'
import raw from '../../i18n/modules/raw.ts'
import report from '../../i18n/modules/report.ts'
import search from '../../i18n/modules/search.ts'
import series from '../../i18n/modules/series.ts'
import shell from '../../i18n/modules/shell.ts'
import show from '../../i18n/modules/show.ts'
import song from '../../i18n/modules/song.ts'
import timeline from '../../i18n/modules/timeline.ts'
import { I18N_MODULE_NAMES, type I18nModuleName } from './module-names.ts'
import { LOCALES, type Locale } from './locale.ts'

/** One UI string key mapped to every supported locale. */
export type LocalizedEntry = Record<Locale, string>

/** One feature module: flat message keys → per-locale strings. */
export type MessageModule = Record<string, LocalizedEntry>

/** All feature modules keyed by basename. */
const MODULES: Record<I18nModuleName, MessageModule> = {
  shell,
  col,
  rank,
  song,
  series,
  cities,
  producers,
  show,
  timeline,
  search,
  report,
  feedback,
  raw,
}

/**
 * Returns every multi-locale feature module after checking each key has all locales.
 * Used by the Nuxt split module and by Node-side translators for scripts/tests.
 */
export const loadMessageModules = (modulesDir?: string): Record<I18nModuleName, MessageModule> => {
  if (modulesDir !== undefined) {
    const onDisk = readdirSync(modulesDir)
      .filter((entry) => entry.endsWith('.ts'))
      .map((entry) => basename(entry, '.ts'))
    const unexpected = onDisk.filter((name) => !I18N_MODULE_NAMES.includes(name as I18nModuleName))
    if (unexpected.length > 0) {
      throw new Error(`Unknown i18n modules on disk (add them to I18N_MODULE_NAMES): ${unexpected.join(', ')}`)
    }
    for (const name of I18N_MODULE_NAMES) {
      if (!onDisk.includes(name)) {
        throw new Error(`Missing i18n module file: ${name}.ts`)
      }
    }
  }
  for (const name of I18N_MODULE_NAMES) {
    assertCompleteModule(name, MODULES[name])
  }
  return MODULES
}

/**
 * Ensures every key in a module declares all supported locales as strings.
 */
const assertCompleteModule = (name: string, module: MessageModule): void => {
  for (const [key, entry] of Object.entries(module)) {
    if (entry === null || typeof entry !== 'object') {
      throw new Error(`i18n module ${name}: key ${key} is not a locale map`)
    }
    for (const locale of LOCALES) {
      const value = entry[locale]
      if (typeof value !== 'string') {
        throw new Error(`i18n module ${name}: key ${key} missing locale ${locale}`)
      }
    }
  }
}

/**
 * Projects multi-locale modules into flat per-locale JSON files under `localesDir`.
 * Returns the relative paths written for each locale (for `@nuxtjs/i18n` `files`).
 */
export const writeLocaleJson = (
  modules: Record<I18nModuleName, MessageModule>,
  localesDir: string,
): Record<Locale, string[]> => {
  const files = {} as Record<Locale, string[]>
  for (const locale of LOCALES) {
    files[locale] = []
    mkdirSync(join(localesDir, locale), { recursive: true })
    for (const name of I18N_MODULE_NAMES) {
      const flat: Record<string, string> = {}
      for (const [key, entry] of Object.entries(modules[name])) {
        flat[key] = entry[locale]
      }
      const relative = `${locale}/${name}.json`
      writeFileSync(join(localesDir, relative), `${JSON.stringify(flat, null, 2)}\n`, 'utf8')
      files[locale].push(relative)
    }
  }
  return files
}

/**
 * Loads modules and writes per-locale JSON under `localesDir`.
 */
export const splitI18nModules = (modulesDir: string, localesDir: string): Record<Locale, string[]> => {
  const modules = loadMessageModules(modulesDir)
  return writeLocaleJson(modules, localesDir)
}

/**
 * Builds a flat catalog for one locale from already-split JSON files.
 */
export const readLocaleCatalog = (localesDir: string, locale: Locale): Record<string, string> => {
  const catalog: Record<string, string> = {}
  for (const name of I18N_MODULE_NAMES) {
    const text = readFileSync(join(localesDir, locale, `${name}.json`), 'utf8')
    Object.assign(catalog, JSON.parse(text) as Record<string, string>)
  }
  return catalog
}

/**
 * Flat message catalog for one locale, projected from the multi-locale modules in memory.
 * For scripts and tests only — importing this pulls every language into the bundle.
 */
export const catalogForLocale = (locale: Locale): Record<string, string> => {
  const modules = loadMessageModules()
  const catalog: Record<string, string> = {}
  for (const name of I18N_MODULE_NAMES) {
    for (const [key, entry] of Object.entries(modules[name])) {
      catalog[key] = entry[locale]
    }
  }
  return catalog
}
