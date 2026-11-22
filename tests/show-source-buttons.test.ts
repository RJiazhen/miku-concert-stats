import { describe, expect, it } from 'vitest'
import { showSourceButtons } from '../shared/show-source-buttons.ts'

const PIAPRO = 'https://blog.piapro.net/2014/11/z1411081-1.html'
const NAT = 'https://nat.hatenadiary.com/entry/20141101/p1'
const MIKUDOC = 'https://mikudoc.blogspot.com/2014/11/wowow_1.html'
const WIKI = 'https://w.atwiki.jp/hmiku/pages/67134.html'
const VOCADB_EVENT = 'https://vocadb.net/E/1924'
const VOCADB_LIST = 'https://vocadb.net/L/221'

describe('showSourceButtons', () => {
  it('keeps one official event button and shows stored attendee setlist sources for WOWOW 2014', () => {
    const buttons = showSourceButtons({
      sourceUrl: PIAPRO,
      fromVocaDB: false,
      vocaDBListUrl: null,
      albumUrl: null,
      setlistSources: [
        { url: PIAPRO, title: '初音ミク公式ブログ：初音ミク×TOUCH！WOWOW2014 スペシャルライブ レポ' },
        { url: NAT, title: '日替わり NAT’s Champloo：初音ミク×TOUCH！WOWOW2014 スペシャルライブ' },
        { url: MIKUDOC, title: 'mikudoc：行ってきた 初音ミク WOWOW スペシャルライブ' },
      ],
    })
    expect(buttons.map((button) => button.url)).toEqual([PIAPRO, NAT, MIKUDOC])
    expect(buttons.map((button) => button.labelKey)).toEqual(['show.eventSource', 'show.setlistSource', 'show.setlistSource'])
    expect(buttons.filter((button) => button.url === PIAPRO)).toHaveLength(1)
    expect(buttons.some((button) => button.url === NAT && button.labelKey === 'show.setlistSource')).toBe(true)
  })

  it('does not invent a second row when the NAT setlist source is already stored', () => {
    const buttons = showSourceButtons({
      sourceUrl: PIAPRO,
      fromVocaDB: false,
      vocaDBListUrl: null,
      albumUrl: null,
      setlistSources: [
        { url: NAT, title: 'NAT' },
        { url: NAT, title: 'NAT again' },
      ],
    })
    expect(buttons.filter((button) => button.url === NAT)).toHaveLength(1)
  })

  it('keeps a VocaDB event button and a Hatsune Miku Wiki setlist button when the URLs differ', () => {
    const buttons = showSourceButtons({
      sourceUrl: VOCADB_EVENT,
      fromVocaDB: true,
      vocaDBListUrl: VOCADB_LIST,
      albumUrl: null,
      setlistSources: [{ url: WIKI, title: '初音ミク Wiki：MIKU EXPO 2016 Mexico City' }],
    })
    expect(buttons).toEqual([
      { url: VOCADB_EVENT, labelKey: 'show.vocadbEvent' },
      { url: VOCADB_LIST, labelKey: 'show.vocadbSetlist' },
      { url: WIKI, labelKey: 'song.wiki', title: '初音ミク Wiki：MIKU EXPO 2016 Mexico City' },
    ])
  })

  it('does not draw a second button when the event URL is already the wiki setlist URL', () => {
    const buttons = showSourceButtons({
      sourceUrl: WIKI,
      fromVocaDB: false,
      vocaDBListUrl: null,
      albumUrl: null,
      setlistSources: [{ url: `${WIKI}/`, title: 'Wiki' }],
    })
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toEqual({ url: WIKI, labelKey: 'show.eventSource' })
  })
})
