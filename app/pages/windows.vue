<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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

const editionKey = ref<string | null>(null)
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

/** Selects the first edition once premieres are loaded. */
const chooseEdition = (): void => {
  if (editionKey.value !== null || editions.value.length === 0) return
  editionKey.value = editions.value[0]?.key ?? null
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
</script>

<template>
  <main class="space-y-4">
    <p class="max-w-3xl text-sm text-muted">
      观察点是年版首演日。某一侧没有快照时记为样本不足，不把曲线补齐。VocaDB 的日期只到日，边界取该日的 UTC 零点。
    </p>
    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UCard v-else>
      <div class="flex flex-wrap items-end gap-3">
        <label class="grid gap-1 text-xs text-muted">
          年版
          <USelect v-model="editionKey" :items="editions.map((row) => ({ label: row.label, value: row.key }))" size="sm" class="w-64" />
        </label>
        <label class="grid gap-1 text-xs text-muted">
          平台
          <USelect
            v-model="platform"
            :items="[{ label: 'YouTube', value: 'youtube' }, { label: 'niconico', value: 'niconico' }, { label: '哔哩哔哩', value: 'bilibili' }]"
            size="sm"
            class="w-32"
          />
        </label>
      </div>
      <p class="mt-3 text-xs text-muted">
        首演 {{ selected?.premiere.premiere_date ?? '—' }}：{{ sufficient }} / {{ premiereObservations.length }} 首两侧都有快照。
        歌单公布时间：{{ announcedAt ?? '公开 API 的歌单对象没有该字段' }}。
      </p>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th class="px-2 py-1.5 font-medium">歌曲</th>
              <th class="px-2 py-1.5 font-medium">首演前</th>
              <th class="px-2 py-1.5 font-medium">首演后</th>
              <th class="px-2 py-1.5 font-medium">差值</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in premiereObservations" :key="row.songId" class="border-t border-default/40">
              <td class="px-2 py-1.5">
                <SongTitle :song-id="row.songId" :original="songName(row.songId)" />
              </td>
              <td class="px-2 py-1.5 text-muted">{{ row.status === 'ok' ? row.before : '样本不足' }}</td>
              <td class="px-2 py-1.5 text-muted">{{ row.status === 'ok' ? row.after : '样本不足' }}</td>
              <td class="px-2 py-1.5 text-muted">{{ row.status === 'ok' ? row.delta : '样本不足' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </main>
</template>
