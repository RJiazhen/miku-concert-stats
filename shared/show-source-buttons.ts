/** i18n keys the show header uses for source buttons. */
export type ShowSourceButtonLabelKey =
  | 'show.albumTracks'
  | 'show.eventSource'
  | 'show.setlistSource'
  | 'show.vocadbEvent'
  | 'show.vocadbSetlist'
  | 'song.wiki'

/** One external source button on the show header. */
export type ShowSourceButton = {
  url: string
  labelKey: ShowSourceButtonLabelKey
  /** Optional tooltip, usually the stored source title. */
  title?: string
}

/** Inputs needed to list the header source buttons of one 演出. */
export type ShowSourceButtonInput = {
  sourceUrl: string
  fromVocaDB: boolean
  vocaDBListUrl: string | null
  albumUrl: string | null
  setlistSources: readonly { url: string; title?: string | null }[]
}

/** Trims a URL and drops a trailing slash so identical pages are not drawn twice. */
const normalizeSourceUrl = (url: string): string => url.trim().replace(/\/+$/, '')

/** Whether a setlist-source URL is a Hatsune Miku Wiki page. */
const isHatsuneMikuWikiUrl = (url: string): boolean => url.includes('w.atwiki.jp')

/**
 * Lists the show-header source buttons with one entry per distinct URL.
 *
 * The event page is always first. A setlist-source URL that is already the event,
 * VocaDB list, or album URL is not repeated: official partial corroboration stays
 * on the event button. Remaining programme URLs become setlist-source buttons,
 * except Hatsune Miku Wiki pages, which keep the wiki label.
 */
export const showSourceButtons = (input: ShowSourceButtonInput): ShowSourceButton[] => {
  const buttons: ShowSourceButton[] = []
  const seen = new Set<string>()
  const add = (url: string | null, labelKey: ShowSourceButtonLabelKey, title?: string | null): void => {
    const trimmed = url?.trim() ?? ''
    if (trimmed === '') return
    const key = normalizeSourceUrl(trimmed)
    if (key === '' || seen.has(key)) return
    seen.add(key)
    const button: ShowSourceButton = { url: trimmed, labelKey }
    const tip = title?.trim() ?? ''
    if (tip !== '') button.title = tip
    buttons.push(button)
  }

  add(input.sourceUrl, input.fromVocaDB ? 'show.vocadbEvent' : 'show.eventSource')
  add(input.vocaDBListUrl, 'show.vocadbSetlist')
  add(input.albumUrl, 'show.albumTracks')
  for (const source of input.setlistSources) {
    add(source.url, isHatsuneMikuWikiUrl(source.url) ? 'song.wiki' : 'show.setlistSource', source.title)
  }
  return buttons
}
