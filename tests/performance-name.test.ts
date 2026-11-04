import { describe, expect, it } from 'vitest'
import { shortPerformanceName } from '../shared/performance-name.ts'

describe('short performance names', () => {
  it('drops the series label and year shown in the series column', () => {
    expect(shortPerformanceName('MIKU EXPO 2024 Vancouver', 'MIKU EXPO', 2024)).toBe('Vancouver')
    expect(shortPerformanceName('初音ミクライブパーティー 2011 Tokyo', '初音ミクライブパーティー', 2011)).toBe('Tokyo')
    expect(shortPerformanceName('初音ミクシンフォニー 2018-2019 東京都', '初音ミクシンフォニー', 2018)).toBe('東京都')
  })

  it('handles a quoted series label with the year inside the quotes', () => {
    expect(shortPerformanceName('初音ミク「マジカルミライ 2019」in TOKYO', '初音ミク「マジカルミライ」', 2019)).toBe('TOKYO')
  })

  it('keeps anniversaries and edition subtitles that distinguish the show', () => {
    expect(shortPerformanceName('MIKU EXPO 2022 Rewind', 'MIKU EXPO', 2022)).toBe('Rewind')
    expect(shortPerformanceName('初音ミクシンフォニー 2020 〜5th Anniversary〜 東京都', '初音ミクシンフォニー', 2020)).toBe('5th Anniversary 東京都')
    expect(shortPerformanceName('MIKU EXPO 2022 Rewind+', 'MIKU EXPO', 2022)).toBe('Rewind+')
  })

  it('returns an empty label when the name is only the series label', () => {
    expect(shortPerformanceName('MIKU WITH YOU 2020', 'MIKU WITH YOU', 2020)).toBe('')
  })

  it('leaves names alone when the series label does not appear', () => {
    expect(shortPerformanceName('Some Other Show', 'MIKU EXPO', 2024)).toBe('Some Other Show')
  })
})
