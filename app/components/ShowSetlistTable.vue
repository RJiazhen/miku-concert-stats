<script setup lang="ts">
import { computed } from 'vue'
import { derivedItemSongIds, type ShowSetlistPrintRow } from '~~/shared/performance-setlists.ts'
import type { Catalog, PerformanceShowSetlistItemRow, PerformanceShowSetlistRow } from '~~/shared/types.ts'
import { formatCharacters } from '~/composables/useCharacters.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import { isVocaloidSong, songCategoryLabels } from '~~/shared/repertoire.ts'

const props = defineProps<{
  catalog: Catalog
  /** Rows to print; a merged 演出 table passes every 场次 that played each row. */
  rows: ShowSetlistPrintRow[]
  /** Labels of every 场次 of the 演出, in order; only printed when the rows are merged. */
  showLabels?: string[]
}>()

const { songById, songName, songHref, vocadbSongUrl } = useSongLookup()

/** Whether the table prints the 场次 column, which only a merged 演出 table needs. */
const merged = computed(() => (props.showLabels?.length ?? 0) > 1)

/** Song ids of one row, with a medley expanded to its parts. */
const songIdsOf = (item: PerformanceShowSetlistItemRow): number[] => derivedItemSongIds(props.catalog, item)

/** Medley name when a row points at a medley instead of a single song. */
const medleyName = (item: PerformanceShowSetlistItemRow): string | null => {
  if (item.medley_id === null) return null
  return props.catalog.medleys.find((row) => row.id === item.medley_id)?.name ?? `串烧 ${item.medley_id}`
}

/** 演出角色 for one row, merged without duplicates. */
const charactersOf = (item: PerformanceShowSetlistItemRow): string => {
  const names = new Set<string>()
  for (const songId of songIdsOf(item)) {
    const song = songById(songId)
    if (song === null) continue
    const text = formatCharacters(song)
    if (text !== '—') for (const name of text.split('、')) names.add(name)
  }
  return names.size === 0 ? '—' : [...names].join('、')
}

/** 备注 cell: the repertoire category for a non-VOCALOID row, `—` for an ordinary song. */
const noteOf = (item: PerformanceShowSetlistItemRow): string => {
  const labels = new Set<string>()
  for (const songId of songIdsOf(item)) {
    const song = songById(songId)
    if (song === null || isVocaloidSong(song)) continue
    labels.add(songCategoryLabels[song.category])
  }
  return labels.size === 0 ? '—' : [...labels].join('、')
}

/** Compact 场次 label for a cell, e.g. `8/11 日场`; the year is already on the page. */
const shortShowLabel = (show: PerformanceShowSetlistRow): string => {
  const date = show.date
  const monthDay = date === null ? '日期未知' : `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
  if (show.half === 'day') return `${monthDay} 日场`
  if (show.half === 'night') return `${monthDay} 夜场`
  return monthDay
}

/** 场次 cell of a merged row: every 场次 when shared, otherwise the ones that played it. */
const showCellOf = (row: ShowSetlistPrintRow): string => {
  const shows = row.shows ?? []
  if (shows.length === 0 || shows.length >= (props.showLabels?.length ?? 0)) return '—'
  return `仅 ${shows.map(shortShowLabel).join('、')}`
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-default/60">
    <table class="w-max min-w-full border-collapse text-sm whitespace-nowrap">
      <thead class="bg-elevated/60 text-left text-xs tracking-wide text-muted uppercase">
        <tr>
          <th class="w-14 px-3 py-2 font-medium">序号</th>
          <th class="px-3 py-2 font-medium">歌曲</th>
          <th class="px-3 py-2 font-medium">歌手</th>
          <th v-if="merged" class="px-3 py-2 font-medium">场次</th>
          <th class="px-3 py-2 font-medium">备注</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="`${row.item.position}-${row.item.song_id ?? row.item.medley_id}`"
          class="border-t border-default/40 align-top odd:bg-elevated/20"
        >
          <td class="px-3 py-2 font-mono text-muted">
            {{ row.item.position }}
          </td>
          <td class="px-3 py-2">
            <template v-if="row.item.medley_id !== null">
              <span class="text-highlighted">{{ medleyName(row.item) }}</span>
              <span class="text-muted">（串烧：{{ songIdsOf(row.item).map((id) => songName(id)).join(' / ') }}）</span>
            </template>
            <span v-else class="flex flex-wrap items-center gap-x-1">
              <template v-for="(songId, index) in songIdsOf(row.item)" :key="songId">
                <span v-if="index > 0" class="text-muted">/</span>
                <ULink :to="songHref(songId)" class="text-highlighted hover:text-primary">
                  <SongTitle :song-id="songId" :original="songName(songId)" />
                </ULink>
                <ULink
                  v-if="vocadbSongUrl(songId)"
                  :to="vocadbSongUrl(songId) ?? ''"
                  target="_blank"
                  class="shrink-0 text-dimmed hover:text-primary"
                  aria-label="在 VocaDB 查看"
                >
                  <UIcon name="i-lucide-external-link" class="size-3" />
                </ULink>
              </template>
            </span>
          </td>
          <td class="px-3 py-2 text-muted">{{ charactersOf(row.item) }}</td>
          <td v-if="merged" class="px-3 py-2 text-xs text-muted">{{ showCellOf(row) }}</td>
          <td class="px-3 py-2 text-xs text-muted">{{ noteOf(row.item) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
