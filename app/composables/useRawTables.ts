import { computed, ref, type Ref } from 'vue'
import { producerCredit } from '~~/shared/credit.ts'
import { songCategoryLabels } from '~~/shared/repertoire.ts'
import type { SongVariantIndex } from '~~/shared/song-variants.ts'
import type { Catalog } from '~~/shared/types.ts'
import { songCharacters } from '~/composables/useCharacters.ts'

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
      label: '系列',
      headers: ['id', '名称', 'VocaDB'],
      rows: catalog.value.series.map((row) => [
        { text: String(row.id) },
        { text: row.name },
        { text: row.source_url, href: row.source_url },
      ]),
    },
    {
      id: 'performances',
      label: '演出',
      headers: ['id', '系列', '名称', '场馆', '开始', '结束', '角色', '歌单', 'VocaDB'],
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
      label: '年度首演',
      headers: ['系列', '年度', '首演日', '演出', '规则'],
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
      label: '歌单',
      headers: ['id', '名称', '来源', '公布时间', 'VocaDB'],
      rows: catalog.value.songLists.map((row) => [
        { text: String(row.id) },
        { text: row.name },
        { text: row.source === 'album' ? '专辑曲目' : 'VocaDB', href: row.source === 'album' ? row.source_url : undefined },
        { text: row.announced_at ?? '—' },
        { text: row.source_url, href: row.source_url },
      ]),
    },
    {
      id: 'setlistItems',
      label: '歌单行',
      headers: ['歌单', '序号', '歌曲', '备注', 'VocaDB'],
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
      label: '歌单行对应歌曲',
      headers: ['歌单', '序号', '歌曲', '角色', 'VocaDB'],
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
      label: '歌曲',
      headers: ['id', '名称', '日文名', '制作人', '歌手', '类型', '类别', '投稿日期', '来源'],
      rows: catalog.value.songs.map((row) => [
        { text: String(row.id) },
        { text: row.name },
        { text: row.name_ja ?? '—' },
        { text: producerCredit(row.artist_string) ?? '—' },
        { text: songCharacters(row).join('、'), chips: songCharacters(row) },
        { text: row.song_type },
        { text: row.category === 'vocaloid' ? 'VOCALOID' : songCategoryLabels[row.category] },
        { text: row.publish_date ?? '—' },
        { text: row.category === 'vocaloid' ? 'VocaDB' : '初音ミク Wiki', href: row.source_url },
      ]),
    },
    {
      id: 'videos',
      label: '投稿链接',
      headers: ['PV id', '歌曲', '平台', '标题', '类型', '日期', '链接'],
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
      label: '串烧隔离',
      headers: ['歌单', '序号', '原曲', '原因'],
      rows: catalog.value.medleyQuarantine.map((row) => [
        { text: String(row.song_list_id) },
        { text: String(row.position) },
        { text: songNameOf(row.listed_song_id), href: songHref(row.listed_song_id) },
        { text: row.reason },
      ]),
    },
    {
      id: 'sources',
      label: '来源',
      headers: ['id', '名称', '许可', '说明'],
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
  tables.push({ id: 'variants', label: '版本合并', headers: ['变体 id', '并入', '类型', '说明', '变体名'], rows: variantRows })
  return tables
})


  return { tables, pageSize: PAGE, limitOf, showMore }
}
