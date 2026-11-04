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

/** One artist credit on a song. */
export type ApiArtist = {
  /** VocaDB artist id, repeated on the nested artist object. */
  id?: number
  name?: string
  categories?: string
  roles?: string
  artist?: { id?: number; name?: string }
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
  /** Song this entry is a version of, which may itself be another version. */
  originalVersionId?: number
  /** Structured credits; `categories` / `roles` carry `Vocalist` for singers. */
  artists?: ApiArtist[]
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

/** One track of an album from /api/albums/{id}?fields=Tracks. */
export type ApiAlbumTrack = {
  discNumber?: number
  trackNumber?: number
  name?: string
  song?: {
    id: number
    name?: string
    songType?: string
    /** Song this album track performs, when the track is a version of one. */
    originalVersionId?: number
  } | null
}

/** Album object with its tracklist. */
export type ApiAlbum = {
  id: number
  name: string
  discType?: string
  tracks?: ApiAlbumTrack[]
}
