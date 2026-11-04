import { describe, expect, it } from 'vitest'
import { availableProducers } from '../shared/producer-options.ts'

describe('availableProducers', () => {
  it('offers only producers that occur and counts the rows crediting them', () => {
    const options = availableProducers([
      { producerList: ['ryo', 'kz'] },
      { producerList: ['ryo'] },
      { producerList: [] },
      { producerList: ['八王子P'] },
    ])
    expect(new Map(options.map((option) => [option.name, option.count]))).toEqual(
      new Map([
        ['ryo', 2],
        ['kz', 1],
        ['八王子P', 1],
      ]),
    )
    expect(options.map((option) => option.name)).not.toContain('supercell')
  })

  it('sorts by occurrence count descending, then by name', () => {
    const options = availableProducers([
      { producerList: ['Beta'] },
      { producerList: ['Alpha'] },
      { producerList: ['Alpha', 'Beta'] },
      { producerList: ['Gamma', 'Gamma'] },
    ])
    expect(options).toEqual([
      { name: 'Alpha', count: 2 },
      { name: 'Beta', count: 2 },
      { name: 'Gamma', count: 1 },
    ])
  })

  it('counts a producer once per row even when the row repeats the name', () => {
    expect(availableProducers([{ producerList: ['kz', 'kz'] }])).toEqual([{ name: 'kz', count: 1 }])
  })

  it('returns no options when there are no rows or no producers', () => {
    expect(availableProducers([])).toEqual([])
    expect(availableProducers([{ producerList: [] }])).toEqual([])
  })
})
