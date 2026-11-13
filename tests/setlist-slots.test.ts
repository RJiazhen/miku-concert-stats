import { describe, expect, it } from 'vitest'
import { itemsMergeable, parseNoteSelectors, selectorLabel, type SlotItem } from '../shared/setlist-slots.ts'

/** Slot item fixture. Notes drive the selectors; performances drive the show sets. */
const slotItem = (performanceIds: number[], notes: string | null, songId = 1): SlotItem => ({
  songListId: 10,
  position: 1,
  songIds: [songId],
  notes,
  performanceIds,
  selectors: parseNoteSelectors(notes),
})

describe('note selectors', () => {
  it('reads city, day, show number, and half from fragments', () => {
    expect(parseNoteSelectors('Fukuoka Day 1')).toEqual([{ city: 'fukuoka', day: 1, show: null, half: null }])
    expect(parseNoteSelectors('DAY 2')).toEqual([{ city: null, day: 2, show: null, half: null }])
    expect(parseNoteSelectors('Nighttime Shows')).toEqual([{ city: null, day: null, show: null, half: 'night' }])
    expect(parseNoteSelectors('DAY 1 1st and 2nd Show')).toEqual([
      { city: null, day: 1, show: 1, half: null },
      { city: null, day: 1, show: 2, half: null },
    ])
  })

  it('returns nothing for notes without a usable dimension', () => {
    expect(parseNoteSelectors(null)).toEqual([])
    expect(parseNoteSelectors('  ')).toEqual([])
    expect(parseNoteSelectors('Encore')).toEqual([])
    expect(parseNoteSelectors('Encore / Audience Request')).toEqual([])
  })

  it('labels a selector list for the show column', () => {
    expect(selectorLabel(parseNoteSelectors('Osaka Day 2'))).toBe('大阪 第 2 天')
    expect(selectorLabel(parseNoteSelectors('Beijing / Chengdu'))).toBe('北京、成都')
    expect(selectorLabel([])).toBeNull()
  })
})

describe('slot mergeability', () => {
  it('matches the same day across two cities', () => {
    const tokyo = slotItem([1], 'Day 1')
    const osaka = slotItem([2], 'Day 1')
    expect(itemsMergeable(tokyo, osaka)).toBe(true)
  })

  it('keeps a day 1 song away from a day 2 song in another city', () => {
    const osaka = slotItem([2], 'Day 1')
    const tokyo = slotItem([1], 'Day 2')
    expect(itemsMergeable(osaka, tokyo)).toBe(false)
  })

  it('splits days recorded on one multi-day performance', () => {
    const dayOne = slotItem([5], 'DAY 1')
    const dayTwo = slotItem([5], 'DAY 2')
    expect(itemsMergeable(dayOne, dayTwo)).toBe(true)
    const encoreOne = slotItem([6], 'Encore')
    const encoreTwo = slotItem([6], 'Encore')
    expect(itemsMergeable(encoreOne, encoreTwo)).toBe(false)
  })

  it('merges city-only alternatives and keeps relative order independent', () => {
    const fukuoka = slotItem([1], 'Fukuoka')
    const tokyo = slotItem([2], 'Tokyo')
    const osaka = slotItem([3], 'Osaka')
    expect(itemsMergeable(fukuoka, tokyo)).toBe(true)
    expect(itemsMergeable(tokyo, osaka)).toBe(true)
    expect(itemsMergeable(fukuoka, osaka)).toBe(true)
  })

  it('never treats an unconditional song as an alternative', () => {
    const always = slotItem([1, 2], null)
    const tokyo = slotItem([1], 'Tokyo')
    expect(itemsMergeable(always, tokyo)).toBe(false)
  })

  it('pairs halves across cities but not day against night', () => {
    const tokyoNight = slotItem([1], 'Nighttime Shows')
    const osakaNight = slotItem([2], 'Nighttime Shows')
    expect(itemsMergeable(tokyoNight, osakaNight)).toBe(true)
    const osakaDay = slotItem([2], 'Daytime Shows')
    expect(itemsMergeable(tokyoNight, osakaDay)).toBe(false)
  })
})
