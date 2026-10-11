/** Name translation on a VocaDB entry. */
export type ApiName = {
  language: string
  value: string
}

/** Web link on an event or song. */
export type ApiWebLink = {
  url: string
  description?: string
  disabled?: boolean
}

/** PV object from the public API. */
export type ApiPv = {
  id: number
  service: string
  pvId: string
  url: string
  name?: string
  author?: string
  pvType?: string
  publishDate?: string
  disabled?: boolean
}

/** Song object embedded in a song list or returned by songs.get. */
export type ApiSong = {
  id: number
  name: string
  names?: ApiName[]
  artistString?: string
  songType?: string
  publishDate?: string
  lengthSeconds?: number
  pvs?: ApiPv[]
  webLinks?: ApiWebLink[]
}

/** One line of a VocaDB song list. */
export type ApiSongInList = {
  notes?: string
  order: number
  song: ApiSong
}

/** Paged song-list response. totalCount is zero unless getTotalCount was requested. */
export type ApiSongListPage = {
  items: ApiSongInList[]
}

/** Song list stub attached to an event. */
export type ApiSongListRef = {
  id: number
  name: string
  featuredCategory?: string
}

/** Venue stub. Country code is required before a showtime may be stored. */
export type ApiVenue = {
  name?: string
  addressCountryCode?: string
}

/** Release event from /api/releaseEvents/{id} or the series events array. */
export type ApiEvent = {
  id: number
  name: string
  names?: ApiName[]
  description?: string
  date?: string
  endDate?: string
  seriesId?: number
  seriesNumber?: number
  seriesSuffix?: string
  status?: string
  venueName?: string
  venue?: ApiVenue | null
  songList?: ApiSongListRef | null
  webLinks?: ApiWebLink[]
  category?: string
}

/** Release event series from /api/releaseEventSeries/{id}. */
export type ApiSeries = {
  id: number
  name: string
  names?: ApiName[]
  description?: string
  category?: string
  events?: ApiEvent[]
  webLinks?: ApiWebLink[]
}
