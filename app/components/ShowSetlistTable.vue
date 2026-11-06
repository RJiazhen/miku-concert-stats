<script setup lang="ts">
import { computed } from 'vue'
import { derivedItemSongIds, type ShowSetlistPrintRow } from '~~/shared/performance-setlists.ts'
import type { Catalog, PerformanceShowSetlistItemRow, PerformanceShowSetlistRow } from '~~/shared/types.ts'
import { formatCharacters } from '~/composables/useCharacters.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import { catalogBadge, catalogSourceNote, fromVocaDB } from '~~/shared/repertoire.ts'

const props = defineProps<{
  catalog: Catalog
  /** Rows to print; a merged 演出 table passes every 场次 that played each row. */
  rows: ShowSetlistPrintRow[]
  /** Labels of every 场次 of the 演出, in order; only printed when the rows are merged. */
  showLabels?: string[]
  /** Raw JSON reason list of one 场次; absent for a merged table. */
  reasons?: string
}>()

const { songById, songName, songHref: songHrefOf, songHrefTarget } = useSongLookup()

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

/** Parsed reason codes of the printed 场次, shown once under a per-show table. */
const reasons = computed<string[]>(() => {
  try {
    const parsed: unknown = JSON.parse(props.reasons ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
})
</script>

<template>
  <div class="space-y-2">
    <div class="overflow-x-auto rounded-xl border border-default/60">
      <table class="w-max min-w-xl border-collapse text-sm whitespace-nowrap">
        <thead class="bg-elevated/60 text-left text-xs tracking-wide text-muted uppercase">
          <tr>
            <th class="w-14 px-3 py-2 font-medium">序号</th>
            <th class="px-3 py-2 font-medium">歌曲</th>
            <th class="px-3 py-2 font-medium">歌手</th>
            <th v-if="merged" class="px-3 py-2 font-medium">场次</th>
            <th class="px-3 py-2 font-medium">数据说明</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="`${row.item.position}-${row.item.song_id ?? row.item.medley_id}`"
            class="border-t border-default/40 align-top odd:bg-elevated/20"
          >
            <td class="px-3 py-2 font-mono text-muted" :title="row.item.source_position === null ? '人工补充' : `源歌单第 ${row.item.source_position} 行`">
              {{ row.item.position }}
            </td>
            <td class="px-3 py-2">
              <template v-if="row.item.medley_id !== null">
                <span class="text-highlighted">{{ medleyName(row.item) }}</span>
                <span class="text-muted">（串烧：{{ songIdsOf(row.item).map((id) => songName(id)).join(' / ') }}）</span>
              </template>
              <span v-else class="flex flex-wrap items-baseline gap-x-1">
                <template v-for="(songId, index) in songIdsOf(row.item)" :key="songId">
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
            <td class="px-3 py-2 text-muted">{{ charactersOf(row.item) }}</td>
            <td v-if="merged" class="px-3 py-2 text-xs text-muted">{{ showCellOf(row) }}</td>
            <td class="px-3 py-2 text-xs text-muted">{{ explanationOf(row.item) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="reasons.length > 0" class="text-xs text-warning">
      本场仍不确定的地方：{{ reasons.join('；') }}
    </p>
  </div>
</template>
