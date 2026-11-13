<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { performanceCellOf, type PerformanceCell, type SetlistDisplay, type SetlistDisplayRow } from '~~/shared/edition-setlists.ts'
import { shortPerformanceName } from '~~/shared/performance-name.ts'
import { songCharacters } from '~/composables/useCharacters.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import { useLocale } from '~/composables/useLocale.ts'
import { isVocaloidSong, songCategoryLabel } from '~~/shared/repertoire.ts'

const props = defineProps<{
  display: SetlistDisplay
  /** 演出 the page shows; null on the raw view and the comparison view, which keep every 演出 label. */
  currentPerformanceId?: number | null
  /** City of the page's 演出, so a city-only note for that same city is dropped. */
  currentCity?: string | null
  /** Series name of the current 演出, stripped from other 演出 names. */
  seriesName?: string
  /** Series year of the current 演出, stripped from other 演出 names. */
  seriesNumber?: number | null
}>()

const { songById, songName, songHref, vocadbSongUrl } = useSongLookup()
const { locale, t } = useLocale()
const { localizePlace } = usePlaceNames()

/** Other 演出 names shortened to their city, in the site language. */
const shortNameOf = (name: string): string => {
  return localizePlace(shortPerformanceName(name, props.seriesName ?? '', props.seriesNumber ?? null))
}

/** One table row: a printed slot line plus whether it owns the merged 序号 cell. */
type SetlistTableRow = SetlistDisplayRow & {
  /** Whether this row is the first of its slot, so it prints the 序号. */
  startsSlot: boolean
  /** 演出 cell text and tooltip, computed once per row. */
  cell: PerformanceCell
}

/** Display rows annotated with the slot outline and their 演出 cell. */
const data = computed<SetlistTableRow[]>(() =>
  props.display.rows.map((row, position) => ({
    ...row,
    startsSlot: position === 0 || props.display.rows[position - 1]?.index !== row.index,
    cell: performanceCellOf({
      selectorLabel: row.selectorLabel,
      performanceIds: row.performanceIds,
      names: row.showDetail,
      allPerformanceIds: props.display.allPerformanceIds,
      currentPerformanceId: props.currentPerformanceId ?? null,
      currentCity: props.currentCity ?? null,
      shortName: shortNameOf,
    }),
  })),
)

/** Distinct song ids on a row, in printed order. */
const songIdsOf = (row: SetlistDisplayRow): number[] => [...new Set(row.items.flatMap((item) => item.songIds))]

/** 演出角色 for every song on a row, merged without duplicates. */
const charactersOf = (row: SetlistDisplayRow): string[] => {
  const names = new Set<string>()
  for (const songId of songIdsOf(row)) {
    const song = songById(songId)
    if (song === null) continue
    for (const name of songCharacters(song)) names.add(name)
  }
  return [...names]
}

/** 备注 cell: the repertoire category for a non-VOCALOID row, `—` for an ordinary song. */
const noteOf = (row: SetlistDisplayRow): string => {
  const labels = new Set<string>()
  for (const songId of songIdsOf(row)) {
    const song = songById(songId)
    if (song === null || isVocaloidSong(song)) continue
    labels.add(songCategoryLabel(song.category, t))
  }
  return labels.size === 0 ? '—' : [...labels].join(t('setlist.join'))
}

/** `rowspan` of the 序号 cell: the slot size on its first row, 1 on the absorbed rows. */
const positionRowSpan = (cell: { row: { original: SetlistTableRow } }): string =>
  cell.row.original.startsSlot ? String(cell.row.original.slotSize) : '1'

/** Hides the 序号 cell of an absorbed row, whose space the slot's `rowspan` already covers. */
const positionCellClass = (cell: { row: { original: SetlistTableRow } }): string => {
  const { startsSlot, slotSize } = cell.row.original
  if (!startsSlot) return 'hidden'
  return slotSize > 1 ? 'align-top font-mono text-base text-highlighted' : 'font-mono text-muted'
}

/** Outlines every row of a shared slot, so a substitution reads as one block. */
const rowClass = (row: { original: SetlistTableRow }): string =>
  row.original.slotSize > 1 ? 'border-t border-miku-500/30' : ''

/** Column set; the 場次 column is only labelled 演出 when the page shows many 演出. */
const columns = computed<TableColumn<SetlistTableRow>[]>(() => [
  {
    id: 'position',
    header: t('col.position'),
    meta: { rowspan: { td: positionRowSpan }, class: { th: 'w-14', td: positionCellClass } },
  },
  { id: 'song', header: t('col.song') },
  { id: 'characters', header: t('col.characters') },
  {
    id: 'shows',
    header: props.currentPerformanceId === null || props.currentPerformanceId === undefined ? t('col.performance') : t('col.shows'),
  },
  { id: 'note', header: t('col.note') },
])
</script>

<template>
  <TableSection
    :title="t('setlist.title')"
    :count="t('setlist.slotCount', { n: display.slotCount })"
    :fill="false"
    :data="data"
    :columns="columns"
    :meta="{ class: { tr: rowClass } }"
  >
    <template #position-cell="{ row }">
      {{ row.original.index }}
    </template>
    <template #song-cell="{ row }">
      <div class="flex flex-wrap items-center gap-x-1">
        <template v-for="(songId, songIndex) in songIdsOf(row.original)" :key="songId">
          <span v-if="songIndex > 0" class="text-muted">/</span>
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
      </div>
    </template>
    <template #characters-cell="{ row }">
      <CharacterChips :names="charactersOf(row.original)" />
    </template>
    <template #shows-cell="{ row }">
      <UTooltip
        v-if="row.original.cell.text"
        :text="row.original.cell.title.map(localizePlace).join(t('setlist.join'))"
        :content="{ side: 'top' }"
      >
        <span class="text-highlighted">{{ row.original.cell.text }}</span>
      </UTooltip>
    </template>
    <template #note-cell="{ row }">
      <span class="text-xs text-muted">{{ noteOf(row.original) }}</span>
    </template>
  </TableSection>
</template>
