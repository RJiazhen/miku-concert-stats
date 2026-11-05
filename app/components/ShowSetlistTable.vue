<script setup lang="ts">
import { computed } from 'vue'
import { derivedItemSongIds } from '~~/shared/performance-setlists.ts'
import type { Catalog, PerformanceShowSetlistItemRow, PerformanceShowSetlistRow } from '~~/shared/types.ts'
import { formatCharacters } from '~/composables/useCharacters.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'

const props = defineProps<{
  catalog: Catalog
  show: PerformanceShowSetlistRow
  items: PerformanceShowSetlistItemRow[]
}>()

const { songById, songName } = useSongLookup()

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

/** Chinese explanation of where the row came from. */
const EVIDENCE_LABEL: Record<PerformanceShowSetlistItemRow['evidence'], string> = {
  note: '按歌单备注定位到本场',
  shared: '整份歌单共用',
  curated: '人工校正',
}

/** Explanation cell: the evidence kind, plus the raw note when there is one. */
const explanationOf = (item: PerformanceShowSetlistItemRow): string => {
  const label = EVIDENCE_LABEL[item.evidence]
  if (item.notes === null || item.notes.trim() === '') return label
  return `${label}（原备注：${item.notes}）`
}

/** Parsed reason codes, shown once under the table. */
const reasons = computed<string[]>(() => {
  try {
    const parsed: unknown = JSON.parse(props.show.reasons)
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
})
</script>

<template>
  <div class="space-y-2">
    <div class="overflow-x-auto rounded-xl border border-default/60">
      <table class="w-full min-w-xl border-collapse text-sm">
        <thead class="bg-elevated/60 text-left text-xs tracking-wide text-muted uppercase">
          <tr>
            <th class="w-14 px-3 py-2 font-medium">序号</th>
            <th class="px-3 py-2 font-medium">歌曲</th>
            <th class="px-3 py-2 font-medium">歌手</th>
            <th class="px-3 py-2 font-medium">数据说明</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.position"
            class="border-t border-default/40 align-top odd:bg-elevated/20"
          >
            <td class="px-3 py-2 font-mono text-muted" :title="item.source_position === null ? '人工补充' : `源歌单第 ${item.source_position} 行`">
              {{ item.position }}
            </td>
            <td class="px-3 py-2">
              <template v-if="item.medley_id !== null">
                <span class="text-highlighted">{{ medleyName(item) }}</span>
                <span class="text-muted">（串烧：{{ songIdsOf(item).map((id) => songName(id)).join(' / ') }}）</span>
              </template>
              <span v-else class="flex flex-wrap items-baseline gap-x-1">
                <template v-for="(songId, index) in songIdsOf(item)" :key="songId">
                  <span v-if="index > 0" class="text-muted">/</span>
                  <ULink :to="`https://vocadb.net/S/${songId}`" target="_blank" class="text-highlighted hover:text-primary">
                    <SongTitle :song-id="songId" :original="songName(songId)" />
                  </ULink>
                </template>
              </span>
            </td>
            <td class="px-3 py-2 text-muted">{{ charactersOf(item) }}</td>
            <td class="px-3 py-2 text-xs text-muted">{{ explanationOf(item) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="reasons.length > 0" class="text-xs text-warning">
      本场仍不确定的地方：{{ reasons.join('；') }}
    </p>
  </div>
</template>
