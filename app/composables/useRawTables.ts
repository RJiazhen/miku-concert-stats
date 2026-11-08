import { computed, ref, type Ref } from 'vue'
import { producerCredit } from '~~/shared/credit.ts'
import { songCategoryLabel } from '~~/shared/repertoire.ts'
import type { SongVariantIndex } from '~~/shared/song-variants.ts'
import type { Catalog } from '~~/shared/types.ts'
import { songCharacters } from '~/composables/useCharacters.ts'
import { useLocale } from '~/composables/useLocale.ts'

export type Cell = { text: string; href?: string; chips?: string[] }
export type RawTable = { id: string; label: string; headers: string[]; rows: Cell[][] }

/** Row limit before the "show more" button. */
const PAGE = 100

/** Song id to name and links, so the tables can print readable cells. */
export type RawSongLookup = {
  songName: (id: number) => string
  songHref: (id: number) => string
  vocadbSongUrl: (id: number) => string | null
}

/** Data tables mirroring the SQLite rows, plus the "show more" pagination they share. */
export const useRawTables = (
  catalog: Ref<Catalog | null>,
  variants: SongVariantIndex,
  lookup: RawSongLookup,
) => {
  const { songName, songHref, vocadbSongUrl } = lookup
  const { locale, t } = useLocale()
  const shown = ref<Record<string, number>>({})

  /** Visible row count for a table. */
  const limitOf = (id: string): number => shown.value[id] ?? PAGE

  /** Reveals another page of rows. */
  const showMore = (id: string): void => {
    shown.value = { ...shown.value, [id]: limitOf(id) + PAGE }
  }

/** Data tables mirroring the SQLite rows, each with a source link. */
const tables = computed<RawTable[]>(() => {
  if (!catalog.value) return []
  const songsById = new Map(catalog.value.songs.map((song) => [song.id, song]))
  const performancesById = new Map(catalog.value.performances.map((row) => [row.id, row]))
  const seriesById = new Map(catalog.value.series.map((row) => [row.id, row]))
  const songNameOf = (id: number): string => songsById.get(id)?.name ?? String(id)

  const tables: RawTable[] = [
    {
      id: 'series',
      label: t('raw.tableSeries'),
      headers: ['id', t('raw.colName'), 'VocaDB'],
      rows: catalog.value.series.map((row) => [
        { text: String(row.id) },
        { text: row.name },
        { text: row.source_url, href: row.source_url },
      ]),
    },
    {
      id: 'performances',
      label: t('raw.tablePerformances'),
      headers: ['id', t('raw.colSeries'), t('raw.colName'), t('raw.colVenue'), t('raw.colStart'), t('raw.colEnd'), t('raw.colRole'), t('raw.colSetlist'), 'VocaDB'],
      rows: catalog.value.performances.map((row) => [
        { text: String(row.id) },
        { text: seriesById.get(row.series_id)?.name ?? String(row.series_id) },
        { text: row.name },
        { text: row.venue_name ?? '—' },
        { text: row.start_date ?? '—' },
        { text: row.end_date ?? '—' },
        { text: row.role },
        { text: row.song_list_id === null ? '—' : String(row.song_list_id) },
        { text: row.source_url, href: row.source_url },
      ]),
    },
    {
      id: 'premieres',
      label: t('raw.tablePremieres'),
      headers: [t('raw.colSeries'), t('raw.colYear'), t('raw.colPremiereDate'), t('raw.colPerformance'), t('raw.colRule')],
      rows: catalog.value.premieres.map((row) => [
        { text: seriesById.get(row.series_id)?.name ?? String(row.series_id) },
        { text: String(row.series_number) },
        { text: row.premiere_date },
        {
          text: performancesById.get(row.premiere_performance_id)?.name ?? String(row.premiere_performance_id),
          href: `https://vocadb.net/E/${row.premiere_performance_id}`,
        },
        { text: row.rule },
      ]),
    },
    {
      id: 'songLists',
      label: t('raw.tableSongLists'),
      headers: ['id', t('raw.colName'), t('raw.colSource'), t('raw.colAnnouncedAt'), 'VocaDB'],
      rows: catalog.value.songLists.map((row) => [
        { text: String(row.id) },
        { text: row.name },
        { text: row.source === 'album' ? t('raw.valueAlbum') : 'VocaDB', href: row.source === 'album' ? row.source_url : undefined },
        { text: row.announced_at ?? '—' },
        { text: row.source_url, href: row.source_url },
      ]),
    },
    {
      id: 'setlistItems',
      label: t('raw.tableSetlistItems'),
      headers: [t('raw.colSongList'), t('raw.colPosition'), t('raw.colSong'), t('raw.colNote'), 'VocaDB'],
      rows: catalog.value.setlistItems.map((row) => [
        { text: String(row.song_list_id) },
        { text: String(row.position) },
        { text: songNameOf(row.listed_song_id), href: songHref(row.listed_song_id) },
        { text: row.notes ?? '' },
        { text: vocadbSongUrl(row.listed_song_id) === null ? '—' : 'VocaDB', href: vocadbSongUrl(row.listed_song_id) ?? undefined },
      ]),
    },
    {
      id: 'setlistItemSongs',
      label: t('raw.tableSetlistItemSongs'),
      headers: [t('raw.colSongList'), t('raw.colPosition'), t('raw.colSong'), t('raw.colCharacters'), 'VocaDB'],
      rows: catalog.value.setlistItemSongs.map((row) => [
        { text: String(row.song_list_id) },
        { text: String(row.position) },
        { text: songNameOf(row.song_id), href: songHref(row.song_id) },
        { text: row.role },
        { text: vocadbSongUrl(row.song_id) === null ? '—' : 'VocaDB', href: vocadbSongUrl(row.song_id) ?? undefined },
      ]),
    },
    {
      id: 'songs',
      label: t('raw.tableSongs'),
      headers: ['id', t('raw.colName'), t('raw.colJapaneseName'), t('raw.colProducers'), t('raw.colSingers'), t('raw.colType'), t('raw.colCategory'), t('raw.colPublishDate'), t('raw.colSource')],
      rows: catalog.value.songs.map((row) => [
        { text: String(row.id) },
        { text: row.name },
        { text: row.name_ja ?? '—' },
        { text: producerCredit(row.artist_string) ?? '—' },
        { text: songCharacters(row).join(t('setlist.join')), chips: songCharacters(row) },
        { text: row.song_type },
        { text: row.category === 'vocaloid' ? 'VOCALOID' : songCategoryLabel(row.category, locale.value) },
        { text: row.publish_date ?? '—' },
        { text: row.category === 'vocaloid' ? 'VocaDB' : t('raw.valueWiki'), href: row.source_url },
      ]),
    },
    {
      id: 'videos',
      label: t('raw.tableVideos'),
      headers: ['PV id', t('raw.colSong'), t('raw.colPlatform'), t('raw.colTitle'), t('raw.colType'), t('raw.colDate'), t('raw.colLink')],
      rows: catalog.value.videos.map((row) => [
        { text: String(row.vocadb_pv_id) },
        { text: songNameOf(row.song_id), href: songHref(row.song_id) },
        { text: row.platform },
        { text: row.title ?? '—' },
        { text: row.pv_type ?? '—' },
        { text: row.publish_date ?? '—' },
        { text: row.url, href: row.url },
      ]),
    },
    {
      id: 'medley',
      label: t('raw.tableQuarantine'),
      headers: [t('raw.colSongList'), t('raw.colPosition'), t('raw.colOriginalSong'), t('raw.colReason')],
      rows: catalog.value.medleyQuarantine.map((row) => [
        { text: String(row.song_list_id) },
        { text: String(row.position) },
        { text: songNameOf(row.listed_song_id), href: songHref(row.listed_song_id) },
        { text: row.reason },
      ]),
    },
    {
      id: 'sources',
      label: t('raw.tableSources'),
      headers: ['id', t('raw.colName'), t('raw.colLicense'), t('raw.colDescription')],
      rows: catalog.value.sources.map((row) => [
        { text: row.id },
        { text: row.name, href: row.url },
        { text: row.license, href: row.license },
        { text: row.notes },
      ]),
    },
  ]

  // The variant table keys on the variant id, which is not stored on the entry.
  const variantRows: Cell[][] = []
  for (const [variantId, entry] of variants.entries) {
    variantRows.push([
      { text: String(variantId), href: songHref(variantId) },
      { text: songName(entry.canonical), href: songHref(entry.canonical) },
      { text: entry.kind },
      { text: entry.note ?? '' },
      { text: songName(variantId) },
    ])
  }
  tables.push({ id: 'variants', label: t('raw.tableVariants'), headers: [t('raw.colVariantId'), t('raw.colMergedInto'), t('raw.colKind'), t('raw.colDescription'), t('raw.colVariantName')], rows: variantRows })
  return tables
})


  return { tables, pageSize: PAGE, limitOf, showMore }
}
