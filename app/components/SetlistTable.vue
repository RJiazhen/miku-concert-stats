<script setup lang="ts">
import { computed } from 'vue'
import { performanceCellOf, type PerformanceCell, type SetlistDisplay, type SetlistDisplayRow } from '~~/shared/edition-setlists.ts'
import { formatRotationReason, type RotationReview } from '~~/shared/rotation.ts'
import { shortPerformanceName } from '~~/shared/performance-name.ts'
import { formatCharacters } from '~/composables/useCharacters.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'

const props = defineProps<{
  display: SetlistDisplay
  review: RotationReview
  /** 演出 the page shows; null on the raw view and the comparison view, which keep every 演出 label. */
  currentPerformanceId?: number | null
  /** City of the page's 演出, so a city-only note for that same city is dropped. */
  currentCity?: string | null
  /** Series name of the current 演出, stripped from other 演出 names. */
  seriesName?: string
  /** Series year of the current 演出, stripped from other 演出 names. */
  seriesNumber?: number | null
}>()

const { songById, songName } = useSongLookup()
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

/** Rotation line lookup so a row can show why the parser was unsure. */
const lineByKey = computed(() => new Map(props.review.lines.map((line) => [`${line.songListId}:${line.position}`, line])))

/** Whether a displayed row starts a shared slot. */
const startsSlot = (row: SetlistDisplayRow, index: number): boolean => {
  if (row.slotSize < 2) return false
  const previous = props.display.rows[index - 1]
  return !previous || previous.index !== row.index
}

/** Distinct song ids on a row, in printed order. */
const songIdsOf = (row: SetlistDisplayRow): number[] => [...new Set(row.items.flatMap((item) => item.songIds))]

/** Position of every line on this row, used for the tooltip. */
const positionsOf = (row: SetlistDisplayRow): string => row.items.map((item) => `${item.songListId}:${item.position}`).join(', ')

/** 演出角色 for every song on a row, merged without duplicates. */
const charactersOf = (row: SetlistDisplayRow): string => {
  const names = new Set<string>()
  for (const songId of songIdsOf(row)) {
    const song = songById(songId)
    if (song === null) continue
    const text = formatCharacters(song.artist_string)
    if (text !== '—') for (const name of text.split('、')) names.add(name)
  }
  return names.size === 0 ? '—' : [...names].join('、')
}

/** One part of the 数据说明 cell: a parser warning or a muted original note. */
type NotePart = {
  text: string
  warning: boolean
}

/** Warnings and muted context for a row whose lines carry setlist notes. */
const notePartsOf = (row: SetlistDisplayRow): NotePart[] => {
  const parts = new Map<string, NotePart>()
  for (const item of row.items) {
    const line = lineByKey.value.get(`${item.songListId}:${item.position}`)
    if (!line) continue
    for (const reason of line.reasons) {
      const text = formatRotationReason(reason)
      parts.set(`w:${text}`, { text, warning: true })
    }
    for (const text of line.info) parts.set(`i:${text}`, { text, warning: false })
  }
  return [...parts.values()].sort((left, right) => Number(right.warning) - Number(left.warning))
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-default/60">
    <table class="w-full min-w-2xl border-collapse text-sm">
      <thead class="bg-elevated/60 text-left text-xs tracking-wide text-muted uppercase">
        <tr>
          <th class="w-14 px-3 py-2 font-medium">序号</th>
          <th class="px-3 py-2 font-medium">歌曲</th>
          <th class="px-3 py-2 font-medium">演出角色</th>
          <th class="px-3 py-2 font-medium">{{ currentPerformanceId === null || currentPerformanceId === undefined ? '演出' : '场次' }}</th>
          <th class="px-3 py-2 font-medium">数据说明</th>
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
            :title="positionsOf(row)"
          >
            {{ row.index }}
          </td>
          <td v-else-if="row.slotSize < 2" class="px-3 py-2 font-mono text-muted" :title="positionsOf(row)">
            {{ row.index }}
          </td>
          <td class="px-3 py-2">
            <div class="flex flex-wrap items-baseline gap-x-1">
              <template v-for="(songId, songIndex) in songIdsOf(row)" :key="songId">
                <span v-if="songIndex > 0" class="text-muted">/</span>
                <ULink :to="`https://vocadb.net/S/${songId}`" target="_blank" class="text-highlighted hover:text-primary">
                  <SongTitle :song-id="songId" :original="songName(songId)" />
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
          <td class="px-3 py-2 text-xs">
            <template v-for="(part, partIndex) in notePartsOf(row)" :key="`${part.warning ? 'w' : 'i'}:${part.text}`">
              <span v-if="partIndex > 0" class="text-muted">；</span>
              <span :class="part.warning ? 'text-warning' : 'text-muted'">{{ part.text }}</span>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
