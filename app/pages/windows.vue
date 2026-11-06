<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useCatalog } from '~/composables/useCatalog.ts'
import { countedSongIds, dayInstant, observeWindow, songById } from '~~/shared/stats.ts'
import type { Platform } from '~~/shared/types.ts'

// Observation windows need snapshots on both sides of a date; hidden until they exist.
definePageMeta({ middleware: 'retired' })

const { catalog, error, load } = useCatalog()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const editionKey = ref<string | undefined>(undefined)
const platform = ref<Platform>('youtube')

const editions = computed(() => {
  if (!catalog.value) return []
  return catalog.value.premieres.map((row) => {
    const series = catalog.value?.series.find((item) => item.id === row.series_id)
    return {
      key: `${row.series_id}:${row.series_number}`,
      label: `${series?.name ?? row.series_id} ${row.series_number}`,
      premiere: row,
    }
  })
})

/** Selects the first series year once premieres are loaded. */
const chooseEdition = (): void => {
  if (editionKey.value !== undefined || editions.value.length === 0) return
  editionKey.value = editions.value[0]?.key
}
watch(editions, chooseEdition)

const selected = computed(() => editions.value.find((row) => row.key === editionKey.value) ?? null)

const songIds = computed(() => {
  if (!catalog.value || !selected.value) return []
  const listIds = catalog.value.performances
    .filter((row) => `${row.series_id}:${row.series_number}` === selected.value?.key && row.song_list_id !== null)
    .map((row) => row.song_list_id as number)
  return countedSongIds(catalog.value, [...new Set(listIds)])
})

const announcedAt = computed(() => {
  if (!catalog.value || !selected.value) return null
  const listIds = new Set(catalog.value.performances
    .filter((row) => `${row.series_id}:${row.series_number}` === selected.value?.key && row.song_list_id !== null)
    .map((row) => row.song_list_id))
  const stamps = catalog.value.songLists
    .filter((row) => listIds.has(row.id) && row.announced_at)
    .map((row) => row.announced_at as string)
  return stamps.sort()[0] ?? null
})

const premiereObservations = computed(() => {
  if (!catalog.value || !selected.value) return []
  return observeWindow(catalog.value, songIds.value, platform.value, dayInstant(selected.value.premiere.premiere_date))
})

/** Display name for a song id. */
const songName = (songId: number): string => {
  const song = catalog.value ? songById(catalog.value, songId) : undefined
  return song?.name_ja || song?.name || String(songId)
}

const sufficient = computed(() => premiereObservations.value.filter((row) => row.status === 'ok').length)

/** One printed observation row; a missing snapshot is spelled out instead of left blank. */
type ObservationRow = {
  key: number
  songId: number
  before: string
  after: string
  delta: string
}

/** Observations with the three figures turned into cell text. */
const observationRows = computed<ObservationRow[]>(() =>
  premiereObservations.value.map((row) => {
    const ok = row.status === 'ok'
    return {
      key: row.songId,
      songId: row.songId,
      before: ok ? String(row.before) : '样本不足',
      after: ok ? String(row.after) : '样本不足',
      delta: ok ? String(row.delta) : '样本不足',
    }
  }),
)

const columns: TableColumn<ObservationRow>[] = [
  { id: 'song', header: '歌曲' },
  { accessorKey: 'before', header: '首演前' },
  { accessorKey: 'after', header: '首演后' },
  { accessorKey: 'delta', header: '差值' },
]
</script>

<template>
  <main class="space-y-4">
    <p class="max-w-3xl text-sm text-muted">
      观察点是系列年度首演日。某一侧没有快照时记为样本不足，不把曲线补齐。VocaDB 的日期只到日，边界取该日的 UTC 零点。
    </p>
    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UCard v-else>
      <div class="flex flex-wrap items-end gap-3">
        <FilterField label="系列年度">
          <USelect v-model="editionKey" :items="editions.map((row) => ({ label: row.label, value: row.key }))" size="sm" class="w-64" />
        </FilterField>
        <FilterField label="平台">
          <USelect
            v-model="platform"
            :items="[{ label: 'YouTube', value: 'youtube' }, { label: 'niconico', value: 'niconico' }, { label: '哔哩哔哩', value: 'bilibili' }]"
            size="sm"
            class="w-32"
          />
        </FilterField>
      </div>
      <p class="mt-3 text-xs text-muted">
        首演 {{ selected?.premiere.premiere_date ?? '—' }}：{{ sufficient }} / {{ premiereObservations.length }} 首两侧都有快照。
        歌单公布时间：{{ announcedAt ?? '公开 API 的歌单对象没有该字段' }}。
      </p>
    </UCard>

    <TableSection
      v-if="!error"
      title="首演窗口"
      :count="`${observationRows.length} 首`"
      :fill="false"
      :data="observationRows"
      :columns="columns"
      empty-icon="i-lucide-calendar-x"
      empty-title="没有可观察的歌曲"
      empty-description="先选择一个有首演日期的系列年度。"
    >
      <template #song-cell="{ row }">
        <SongTitle :song-id="row.original.songId" :original="songName(row.original.songId)" />
      </template>
      <template #before-cell="{ row }">
        <span class="tabular-nums text-muted">{{ row.original.before }}</span>
      </template>
      <template #after-cell="{ row }">
        <span class="tabular-nums text-muted">{{ row.original.after }}</span>
      </template>
      <template #delta-cell="{ row }">
        <span class="tabular-nums text-muted">{{ row.original.delta }}</span>
      </template>
    </TableSection>
  </main>
</template>
