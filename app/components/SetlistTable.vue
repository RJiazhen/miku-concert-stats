<script setup lang="ts">
import { computed } from 'vue'
import type { SetlistDisplay, SetlistDisplayRow } from '~~/shared/edition-setlists.ts'
import { formatRotationReason, type RotationReview } from '~~/shared/rotation.ts'
import { formatCharacters } from '~/composables/useCharacters.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'

const props = defineProps<{
  display: SetlistDisplay
  review: RotationReview
}>()

const { songById, songName } = useSongLookup()

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

/** Chinese notes for a row whose lines the rotation parser could not place exactly. */
const notesOf = (row: SetlistDisplayRow): string[] => {
  const notes = new Set<string>()
  for (const item of row.items) {
    const line = lineByKey.value.get(`${item.songListId}:${item.position}`)
    if (!line?.uncertain) continue
    for (const reason of line.reasons) notes.add(formatRotationReason(reason))
  }
  return [...notes]
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
          <th class="px-3 py-2 font-medium">场次</th>
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
            <UTooltip v-if="row.showLabel" :text="row.showDetail.join('、')" :content="{ side: 'top' }">
              <span class="text-highlighted">{{ row.showLabel }}</span>
            </UTooltip>
          </td>
          <td class="px-3 py-2 text-xs text-warning">
            {{ notesOf(row).join('；') }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
