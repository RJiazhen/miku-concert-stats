import { describe, expect, it } from 'vitest'
import {
  filterLocations,
  parseShowLocations,
  planShowLocationUpdates,
  renderShowLocationSql,
  type LocationGroup,
} from '../shared/show-locations.ts'

/** Two checked locations, enough to exercise lookups and validation. */
const table = parseShowLocations({
  version: 1,
  locations: [
    { city: '温哥华', country: 'CA', aliases: ['Vancouver'], venues: ['Thunderbird Arena'] },
    { city: '东京', country: 'JP', aliases: ['Tokyo'], venues: [] },
  ],
})

/** One city with a blank, a whitespace, and a conflicting stored country code. */
const groups: LocationGroup[] = [
  {
    city: '温哥华',
    aliases: ['Vancouver'],
    venues: ['Thunderbird Arena'],
    performances: [
      { id: 3, country: null },
      { id: 1, country: '  ' },
      { id: 2, country: 'US' },
    ],
  },
]

describe('show location table', () => {
  it('validates the country code and city uniqueness', () => {
    expect(table.byCity.get('温哥华')?.country).toBe('CA')
    expect(() => parseShowLocations({ version: 1, locations: [{ city: 'A', country: 'XX' }] })).toThrow(
      'is not an ISO 3166-1 alpha-2 code',
    )
    expect(() => parseShowLocations({
      version: 1,
      locations: [{ city: 'A', country: 'JP' }, { city: 'A', country: 'JP' }],
    })).toThrow('listed twice')
  })

  it('fills only blank country codes and reports a different stored code', () => {
    const plan = planShowLocationUpdates(groups, table)
    expect(plan.updates).toEqual([{ country: 'CA', performanceIds: [1, 3] }])
    expect(plan.conflicts).toEqual([
      { performanceId: 2, city: '温哥华', stored: 'US', expected: 'CA' },
    ])
    expect(renderShowLocationSql(plan)).toContain(
      "UPDATE performances SET country_code = 'CA' WHERE (country_code IS NULL OR trim(country_code) = '') AND id IN (1, 3);",
    )
  })

  it('searches by city, alias, venue, and country name', () => {
    expect(filterLocations(table, 'vancouver').map((row) => row.city)).toEqual(['温哥华'])
    expect(filterLocations(table, 'thunderbird').map((row) => row.city)).toEqual(['温哥华'])
    expect(filterLocations(table, '日本').map((row) => row.city)).toEqual(['东京'])
    expect(filterLocations(table, '')).toHaveLength(2)
  })
})
