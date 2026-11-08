<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { derivedItemSongIds, type ShowSetlistPrintItem, type ShowSetlistPrintRow } from '~~/shared/performance-setlists.ts'
import type { Catalog, PerformanceShowSetlistItemRow, PerformanceShowSetlistRow } from '~~/shared/types.ts'
import { songCharacters } from '~/composables/useCharacters.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import { useLocale } from '~/composables/useLocale.ts'
import { songCategoryLabel } from '~~/shared/repertoire.ts'

const props = defineProps<{
  catalog: Catalog
  /** Rows to print; a merged 演出 table passes every 场次 that played each row. */
  rows: ShowSetlistPrintRow[]
  /** Every 场次 of the 演出 in calendar order; only passed for a merged table. */
  shows?: PerformanceShowSetlistRow[]
  /** Section heading, e.g. `合并歌单` or one 场次 label. */
  title: string
  /** Small text right after the heading, e.g. `每场 22 首`. */
  count?: string | null
  /** One-line explanation under the heading. */
  note?: string | null
}>()

const { songById, songName, songHref, vocadbSongUrl } = useSongLookup()
const { locale, t } = useLocale()

/** One table row: a single song or medley of a printed 序号. */
type SetlistTableRow = {
  /** 序号 shared by every alternative at this slot. */
  position: number
  /** Alternatives printed under the 序号; 1 for an ordinary row. */
  slotSize: number
  /** Whether this row owns the merged 序号 cell. */
  startsSlot: boolean
  /** The printed alternative, with the 場次 that played it. */
  entry: ShowSetlistPrintItem
}

/** The part of a `UTable` cell the span callbacks read. */
type SetlistCell = { row: { original: SetlistTableRow } }

/** The part of a `UTable` row its own class callback reads. */
type SetlistRow = { original: SetlistTableRow }

/**
 * Flattens the printed rows into one table row per song or medley.
 * A slot of alternatives becomes several rows with the same `position`, so the 序号 cell can
 * span them and the numbering stays equal to the song count of one 場次.
 */
const data = computed<SetlistTableRow[]>(() =>
  props.rows.flatMap((row) =>
    row.items.map((entry, index) => ({
      position: row.position,
      slotSize: row.items.length,
      startsSlot: index === 0,
      entry,
    })),
  ),
)

/** `rowspan` of the 序号 cell: the slot size on its first row, 1 on the absorbed rows. */
const positionRowSpan = (cell: SetlistCell): string =>
  cell.row.original.startsSlot ? String(cell.row.original.slotSize) : '1'

/** Hides the 序号 cell of an absorbed row, whose space the slot's `rowspan` already covers. */
const positionCellClass = (cell: SetlistCell): string => {
  const { startsSlot, slotSize } = cell.row.original
  if (!startsSlot) return 'hidden'
  // A shared 序号 is emphasized the way the `/raw` comparison table prints slots.
  return slotSize > 1 ? 'align-top font-mono text-base text-highlighted' : 'font-mono text-muted'
}

/** Outlines every row of a slot, so a substitution reads as one block rather than two songs. */
const rowClass = (row: SetlistRow): string =>
  row.original.slotSize > 1 ? 'border-t border-miku-500/30' : ''

/**
 * Columns. A merged table puts the 场次 of each alternative inside 备注 instead of giving it a
 * column of its own, so the table stays the four columns a single 場次 table has.
 */
const columns = computed<TableColumn<SetlistTableRow>[]>(() => [
  {
    id: 'position',
    header: t('col.position'),
    meta: { rowspan: { td: positionRowSpan }, class: { th: 'w-14', td: positionCellClass } },
  },
  { id: 'song', header: t('col.song') },
  { id: 'characters', header: t('col.characters') },
  { id: 'note', header: t('col.note') },
])

/** Song ids of one printed item, with a medley expanded to its parts. */
const songIdsOf = (item: PerformanceShowSetlistItemRow): number[] => derivedItemSongIds(props.catalog, item)

/** Medley name when an item points at a medley instead of a single song. */
const medleyName = (item: PerformanceShowSetlistItemRow): string | null => {
  if (item.medley_id === null) return null
  return props.catalog.medleys.find((row) => row.id === item.medley_id)?.name ?? t('setlist.medley', { id: item.medley_id })
}

/** 演出角色 for one printed item, merged without duplicates. */
const charactersOf = (item: PerformanceShowSetlistItemRow): string[] => {
  const names = new Set<string>()
  for (const songId of songIdsOf(item)) {
    const song = songById(songId)
    if (song === null) continue
    for (const name of songCharacters(song)) names.add(name)
  }
  return [...names]
}

/** 备注 cell of one printed item: the repertoire category for a non-VOCALOID row, `—` otherwise. */
const noteOf = (item: PerformanceShowSetlistItemRow): string => {
  const labels = new Set<string>()
  for (const songId of songIdsOf(item)) {
    const song = songById(songId)
    if (song === null || isVocaloidSong(song)) continue
    labels.add(songCategoryLabel(song.category, locale.value))
  }
  return labels.size === 0 ? '—' : [...labels].join('、')
}/** `M/D` of a stored date; the year is already on the page. */
const monthDay = (date: string): string => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`

/** Compact 场次 label for a cell, e.g. `8/11 日场`; the year is already on the page. */
const shortShowLabel = (show: PerformanceShowSetlistRow): string => {
  const date = show.date
  const label = date === null ? t('common.unknownDate') : monthDay(date)
  if (show.half === 'day') return `${label} ${t('common.dayShow')}`
  if (show.half === 'night') return `${label} ${t('common.nightShow')}`
  return label
}

/** 场次 of the whole 演出 that share one half. */
const halfCount = (half: 'day' | 'night'): number => (props.shows ?? []).filter((show) => show.half === half).length

/** 场次 of the whole 演出 that share one date. */
const dateCount = (date: string): number => (props.shows ?? []).filter((show) => show.date === date).length

/**
 * 场次 of one alternative: empty when every 場次 played it, a compressed `仅日场` / `仅夜场` /
 * `仅 8/11` when it covers that whole half or day, otherwise the shows that played it.
 */
const showScopeOf = (item: ShowSetlistPrintItem): string => {
  const played = item.shows ?? []
  const all = props.shows ?? []
  if (played.length === 0 || played.length >= all.length) return ''
  const first = played[0]
  if (first === undefined) return ''
  const halves = new Set(played.map((show) => show.half))
  if (halves.size === 1 && (first.half === 'day' || first.half === 'night') && played.length === halfCount(first.half)) {
    return first.half === 'day' ? t('setlist.onlyDay') : t('setlist.onlyNight')
  }
  const dates = new Set(played.map((show) => show.date))
  if (dates.size === 1 && first.date !== null && played.length === dateCount(first.date)) {
    return t('setlist.onlyDate', { date: monthDay(first.date) })
  }
  return t('setlist.onlyShows', { shows: played.map(shortShowLabel).join(t('setlist.join')) })
}

/**
 * 备注 cell of one printed item: its 场次 first, then the repertoire category of a non-VOCALOID
 * row. A song every 場次 played with no special category still prints `—`.
 */
const remarkOf = (item: ShowSetlistPrintItem): string => {
  const note = noteOf(item.item)
  const parts = [showScopeOf(item), note === '—' ? '' : note].filter((part) => part !== '')
  return parts.length === 0 ? '—' : parts.join(' · ')
}
</script>

<template>
  <TableSection
    :title="title"
    :count="count ?? null"
    :note="note ?? null"
    :fill="false"
    :data="data"
    :columns="columns"
    :meta="{ class: { tr: rowClass } }"
  >
    <template #position-cell="{ row }">
      {{ row.original.position }}
    </template>
    <template #song-cell="{ row }">
      <template v-if="row.original.entry.item.medley_id !== null">
        <span class="text-highlighted">{{ medleyName(row.original.entry.item) }}</span>
        <span class="text-muted">{{ t('setlist.medleyParts', { songs: songIdsOf(row.original.entry.item).map((id) => songName(id)).join(' / ') }) }}</span>
      </template>
      <span v-else class="inline-flex flex-wrap items-center gap-x-1">
        <template v-for="(songId, index) in songIdsOf(row.original.entry.item)" :key="songId">
          <span v-if="index > 0" class="text-muted">/</span>
          <ULink :to="songHref(songId)" class="text-highlighted hover:text-primary">
            <SongTitle :song-id="songId" :original="songName(songId)" />
          </ULink>
          <ULink
            v-if="vocadbSongUrl(songId)"
            :to="vocadbSongUrl(songId) ?? ''"
            target="_blank"
            class="shrink-0 text-dimmed hover:text-primary"
            aria-label="VocaDB"
          >
            <UIcon name="i-lucide-external-link" class="size-3" />
          </ULink>
        </template>
      </span>
    </template>
    <template #characters-cell="{ row }">
      <CharacterChips :names="charactersOf(row.original.entry.item)" />
    </template>
    <template #note-cell="{ row }">
      <span class="text-xs">{{ remarkOf(row.original.entry) }}</span>
    </template>
  </TableSection>
</template>
