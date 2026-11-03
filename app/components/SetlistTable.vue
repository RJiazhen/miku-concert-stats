<script setup lang="ts">
import { computed } from 'vue'
import type { SetlistDisplay, SetlistDisplayRow } from '~~/shared/edition-setlists.ts'
import type { RotationReview } from '~~/shared/rotation.ts'
import { formatCharacters } from '~/composables/useCharacters.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'

const props = defineProps<{
  display: SetlistDisplay
  review: RotationReview
}>()

const { songById, songName } = useSongLookup()

/** Rotation line lookup so uncertainty reasons stay visible. */
const lineByKey = computed(() => new Map(props.review.lines.map((line) => [`${line.songListId}:${line.position}`, line])))

/** Whether a displayed row starts a shared slot. */
const startsSlot = (row: SetlistDisplayRow, index: number): boolean => {
  if (row.slotSize < 2) return false
  const previous = props.display.rows[index - 1]
  return !previous || previous.index !== row.index
}

/** Distinct song ids on a row, in printed order. */
const songIdsOf = (row: SetlistDisplayRow): number[] => [...new Set(row.items.flatMap((item) => item.songIds))]

/** Song name for the first song on a row. */
const primarySongId = (row: SetlistDisplayRow): number => songIdsOf(row)[0] ?? 0

/** Notes shown in the source column, de-duplicated. */
const notesOf = (row: SetlistDisplayRow): string => {
  const notes = row.items.map((item) => item.notes?.trim() ?? '').filter((note) => note !== '')
  return [...new Set(notes)].join(' / ')
}

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

/** Uncertainty reasons for the lines on this row. */
const reasonsOf = (row: SetlistDisplayRow): string[] => {
  const reasons = new Set<string>()
  for (const item of row.items) {
    const line = lineByKey.value.get(`${item.songListId}:${item.position}`)
    if (!line?.uncertain) continue
    for (const reason of line.reasons) reasons.add(reason)
  }
  return [...reasons]
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-default/60">
    <table class="w-full min-w-3xl border-collapse text-sm">
      <thead class="bg-elevated/60 text-left text-xs tracking-wide text-muted uppercase">
        <tr>
          <th class="w-16 px-3 py-2 font-medium">序号</th>
          <th class="px-3 py-2 font-medium">歌曲</th>
          <th class="px-3 py-2 font-medium">演出角色</th>
          <th class="px-3 py-2 font-medium">VocaDB 备注</th>
          <th class="px-3 py-2 font-medium">场次</th>
          <th class="px-3 py-2 font-medium">不确定</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, position) in display.rows"
          :key="`${row.index}-${position}`"
          class="align-top odd:bg-elevated/20"
          :class="row.slotSize > 1 ? 'border-t border-miku-500/30' : 'border-t border-default/40'"
        >
          <td v-if="startsSlot(row, position)" :rowspan="row.slotSize" class="px-3 py-2 font-mono text-muted">
            <span class="text-base text-highlighted">{{ row.index }}</span>
            <UBadge v-if="row.slotSize > 1" color="secondary" variant="subtle" size="sm" class="mt-1 block w-fit">
              替换 {{ row.slotSize }}
            </UBadge>
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
          <td class="px-3 py-2 text-muted">{{ notesOf(row) || '（空，全部场次）' }}</td>
          <td class="px-3 py-2">
            <span v-if="row.showLabel" class="text-highlighted">{{ row.showLabel }}</span>
            <span v-if="row.showLabel && row.showDetail.length > 0" class="mt-0.5 block text-[10px] text-dimmed" :title="row.showDetail.join('、')">
              {{ row.showDetail.length }} 场
            </span>
          </td>
          <td class="px-3 py-2 text-xs text-warning">
            {{ reasonsOf(row).join('；') || '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
