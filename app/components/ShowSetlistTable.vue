<script setup lang="ts">
import { computed } from 'vue'
import { derivedItemSongIds } from '~~/shared/performance-setlists.ts'
import type { Catalog, PerformanceShowSetlistItemRow, PerformanceShowSetlistRow } from '~~/shared/types.ts'
import { formatCharacters } from '~/composables/useCharacters.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import { catalogBadge, catalogSourceNote, fromVocaDB } from '~~/shared/repertoire.ts'

const props = defineProps<{
  catalog: Catalog
  show: PerformanceShowSetlistRow
  items: PerformanceShowSetlistItemRow[]
}>()

const { songById, songName, songHref: songHrefOf, songHrefTarget } = useSongLookup()

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
  wiki: '来自百科的逐曲表',
}

/** Provenance note for a row the catalog registered outside VocaDB; null for a normal song. */
const repertoireNoteOf = (item: PerformanceShowSetlistItemRow): string | null => {
  const notes = new Set<string>()
  for (const songId of songIdsOf(item)) {
    const note = catalogSourceNote(songById(songId))
    if (note !== null) notes.add(note)
  }
  return notes.size === 0 ? null : [...notes].join('、')
}

/** Explanation cell: the evidence kind, the category note when it applies, then the raw note. */
const explanationOf = (item: PerformanceShowSetlistItemRow): string => {
  const parts = [EVIDENCE_LABEL[item.evidence]]
  const repertoire = repertoireNoteOf(item)
  if (repertoire !== null) parts.push(repertoire)
  if (item.notes !== null && item.notes.trim() !== '') parts.push(`原备注：${item.notes}`)
  return parts.join('；')
}

/** Catalog page for repertoire VocaDB does not list, VocaDB entry otherwise. */
const songHref = songHrefOf

/** Whether a title is an outside entry that the badge should mark. */
const outsideEntry = (songId: number): boolean => !fromVocaDB(songById(songId))

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
                  <ULink :to="songHref(songId)" :target="songHrefTarget(songId)" class="text-highlighted hover:text-primary">
                    <SongTitle :song-id="songId" :original="songName(songId)" />
                  </ULink>
                  <UBadge
                    v-if="outsideEntry(songId)"
                    color="warning"
                    variant="subtle"
                    size="sm"
                    :title="catalogBadge(songById(songId)) ?? undefined"
                  >
                    非 VocaDB
                  </UBadge>
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
