import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LOCALES } from '../shared/i18n/locale.ts'
import { catalogForLocale } from '../shared/i18n/split-modules.ts'
import {
  HOMEPAGE_STAT_TILE_HREFS,
  SERIES_INDEX_PATH,
  SERIES_PAGE_HEADING_IDS,
} from '../shared/homepage.ts'

describe('series index headings', () => {
  it('gives the Series and Performances tables visible localized h2 headings with stable fragment ids', () => {
    const page = readFileSync(new URL('../app/pages/series/index.vue', import.meta.url), 'utf8')
    const table = readFileSync(new URL('../app/components/TableSection.vue', import.meta.url), 'utf8')
    expect(page).toContain('SERIES_PAGE_HEADING_IDS')
    expect(page).toContain(':heading-id="SERIES_PAGE_HEADING_IDS.series"')
    expect(page).toContain(":title=\"t('series.tableTitle')\"")
    expect(page).toContain(':heading-id="SERIES_PAGE_HEADING_IDS.performances"')
    expect(page).toContain(":title=\"t('series.performancesTitle')\"")
    const seriesHeading = page.indexOf(':heading-id="SERIES_PAGE_HEADING_IDS.series"')
    const performancesHeading = page.indexOf(':heading-id="SERIES_PAGE_HEADING_IDS.performances"')
    expect(seriesHeading).toBeGreaterThan(-1)
    expect(performancesHeading).toBeGreaterThan(seriesHeading)
    expect(table).toContain('headingId?: string')
    expect(table).toContain(':id="headingId || undefined"')
    expect(table).toContain("headingId ? 'scroll-mt-24' : undefined")
    expect(table).toContain('currentHash() !== `#${id}`')
    expect(table).toContain('scrollMarginTop')
    expect(table).toContain("window.scrollTo({ top: Math.max(0, top), behavior: 'auto' })")
    expect(table).toContain("addEventListener('hashchange'")
    expect(table).toContain("root.style.scrollBehavior = 'auto'")
    expect(SERIES_PAGE_HEADING_IDS.series).toBe('series')
    expect(SERIES_PAGE_HEADING_IDS.performances).toBe('performances')
    expect(HOMEPAGE_STAT_TILE_HREFS.series).toBe(`${SERIES_INDEX_PATH}#${SERIES_PAGE_HEADING_IDS.series}`)
    expect(HOMEPAGE_STAT_TILE_HREFS.performances).toBe(
      `${SERIES_INDEX_PATH}#${SERIES_PAGE_HEADING_IDS.performances}`,
    )
    for (const locale of LOCALES) {
      const messages = catalogForLocale(locale)
      expect(messages['series.tableTitle'].length).toBeGreaterThan(0)
      expect(messages['series.performancesTitle'].length).toBeGreaterThan(0)
    }
    expect(catalogForLocale('en')['series.tableTitle']).toBe('Series')
    expect(catalogForLocale('en')['series.performancesTitle']).toBe('Performances')
    expect(catalogForLocale('zh')['series.tableTitle']).toBe('系列')
    expect(catalogForLocale('zh')['series.performancesTitle']).toBe('演出')
  })
})
