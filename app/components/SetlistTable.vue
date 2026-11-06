<script setup lang="ts">
import { computed } from 'vue'
import { performanceCellOf, type PerformanceCell, type SetlistDisplay, type SetlistDisplayRow } from '~~/shared/edition-setlists.ts'
import { shortPerformanceName } from '~~/shared/performance-name.ts'
import { formatCharacters } from '~/composables/useCharacters.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import { isVocaloidSong, songCategoryLabels } from '~~/shared/repertoire.ts'

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
const { localizePlace } = usePlaceNames()

/** Other 演出 names shortened to their city, in the site language. */
const shortNameOf = (name: string): string => {
  return localizePlace(shortPerformanceName(name, props.seriesName ?? '', props.seriesNumber ?? null))
}

/** 演出 cell for every row, computed once per display. */
const cells = computed<PerformanceCell[]>(() =>
  props.display.rows.map((row) =>
    performanceCellOf({
      selectorLabel: row.selectorLabel,
      performanceIds: row.performanceIds,
      names: row.showDetail,
      allPerformanceIds: props.display.allPerformanceIds,
      currentPerformanceId: props.currentPerformanceId ?? null,
      currentCity: props.currentCity ?? null,
      shortName: shortNameOf,
    }),
  ),
)

/** Whether a displayed row starts a shared slot. */
const startsSlot = (row: SetlistDisplayRow, index: number): boolean => {
  if (row.slotSize < 2) return false
  const previous = props.display.rows[index - 1]
  return !previous || previous.index !== row.index
}

/** Distinct song ids on a row, in printed order. */
const songIdsOf = (row: SetlistDisplayRow): number[] => [...new Set(row.items.flatMap((item) => item.songIds))]

/** 演出角色 for every song on a row, merged without duplicates. */
const charactersOf = (row: SetlistDisplayRow): string => {
  const names = new Set<string>()
  for (const songId of songIdsOf(row)) {
    const song = songById(songId)
    if (song === null) continue
    const text = formatCharacters(song)
    if (text !== '—') for (const name of text.split('、')) names.add(name)
  }
  return names.size === 0 ? '—' : [...names].join('、')
}

/** 备注 cell: the repertoire category for a non-VOCALOID row, `—` for an ordinary song. */
const noteOf = (row: SetlistDisplayRow): string => {
  const labels = new Set<string>()
  for (const songId of songIdsOf(row)) {
    const song = songById(songId)
    if (song === null || isVocaloidSong(song)) continue
    labels.add(songCategoryLabels[song.category])
  }
  return labels.size === 0 ? '—' : [...labels].join('、')
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-default/60">
    <table class="w-max min-w-2xl border-collapse text-sm whitespace-nowrap">
      <thead class="bg-elevated/60 text-left text-xs tracking-wide text-muted uppercase">
        <tr>
          <th class="w-14 px-3 py-2 font-medium">序号</th>
          <th class="px-3 py-2 font-medium">歌曲</th>
          <th class="px-3 py-2 font-medium">歌手</th>
          <th class="px-3 py-2 font-medium">{{ currentPerformanceId === null || currentPerformanceId === undefined ? '演出' : '场次' }}</th>
          <th class="px-3 py-2 font-medium">备注</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, position) in display.rows"
          :key="`${row.index}-${position}`"
          class="align-top odd:bg-elevated/20"
          :class="row.slotSize > 1 ? 'border-t border-miku-500/30' : 'border-t border-default/40'"
        >
          <td
            v-if="startsSlot(row, position)"
            :rowspan="row.slotSize"
            class="px-3 py-2 align-top font-mono text-base text-highlighted"
          >
            {{ row.index }}
          </td>
          <td v-else-if="row.slotSize < 2" class="px-3 py-2 font-mono text-muted">
            {{ row.index }}
          </td>
          <td class="px-3 py-2">
            <div class="flex flex-wrap items-center gap-x-1">
              <template v-for="(songId, songIndex) in songIdsOf(row)" :key="songId">
                <span v-if="songIndex > 0" class="text-muted">/</span>
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
            </div>
          </td>
          <td class="px-3 py-2 text-muted">{{ charactersOf(row) }}</td>
          <td class="px-3 py-2">
            <UTooltip
              v-if="cells[position]?.text"
              :text="cells[position]?.title.map(localizePlace).join('、')"
              :content="{ side: 'top' }"
            >
              <span class="text-highlighted">{{ cells[position]?.text }}</span>
            </UTooltip>
          </td>
          <td class="px-3 py-2 text-xs text-muted">{{ noteOf(row) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
