<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCatalog } from '~/composables/useCatalog.ts'
import { formatCharacters } from '~/composables/useCharacters.ts'
import { playbackForSongs, songById, songIdsForPerformance, summarizeBands } from '~~/shared/stats.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import type { Platform } from '~~/shared/types.ts'

// No playback snapshot is published yet, so the navigation keeps this page out.
definePageMeta({ middleware: 'retired' })

const { catalog, error, pending, load } = useCatalog()
const { songHref, songHrefTarget } = useSongLookup()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const seriesId = ref<number | null>(null)
const performanceId = ref<number | null>(null)
const platform = ref<Platform>('youtube')

const seriesOptions = computed(() => catalog.value?.series ?? [])

const performances = computed(() => {
  const rows = catalog.value?.performances.filter((row) => row.series_id === seriesId.value) ?? []
  return [...rows].sort((left, right) => (left.start_date ?? '').localeCompare(right.start_date ?? '') || left.id - right.id)
})

/** Selects the first series once the catalog arrives. */
const chooseInitialSeries = (): void => {
  if (seriesId.value !== null || !catalog.value) return
  seriesId.value = catalog.value.series[0]?.id ?? null
}
watch(catalog, chooseInitialSeries)

/** Keeps the performance select inside the chosen series. */
const choosePerformance = (): void => {
  if (performances.value.some((row) => row.id === performanceId.value)) return
  performanceId.value = performances.value[0]?.id ?? null
}
watch(performances, choosePerformance)

const selected = computed(() => performances.value.find((row) => row.id === performanceId.value) ?? null)

const songIds = computed(() => {
  if (!catalog.value || performanceId.value === null) return []
  return songIdsForPerformance(catalog.value, performanceId.value)
})

const playbacks = computed(() => (catalog.value ? playbackForSongs(catalog.value, songIds.value, platform.value) : []))
const bands = computed(() => summarizeBands(playbacks.value))

const premiere = computed(() => {
  if (!catalog.value || !selected.value || selected.value.series_number === null) return null
  return catalog.value.premieres.find((row) => row.series_id === selected.value?.series_id && row.series_number === selected.value?.series_number) ?? null
})

const quarantined = computed(() => {
  if (!catalog.value || !selected.value || selected.value.song_list_id === null) return []
  const listId = selected.value.song_list_id
  return catalog.value.medleyQuarantine.filter((row) => row.song_list_id === listId)
})

/** Display name for a song id. */
const songName = (songId: number): string => {
  const song = catalog.value ? songById(catalog.value, songId) : undefined
  return song?.name_ja || song?.name || String(songId)
}

/** 演出角色 for a catalog song, or an em dash when none matched. */
const songCharactersText = (songId: number): string => {
  const song = catalog.value ? songById(catalog.value, songId) : undefined
  return formatCharacters(song ?? null)
}

/** View count text. Missing snapshots stay blank rather than zero. */
const viewText = (count: number | null): string => (count === null ? '无快照' : count.toLocaleString('zh-Hans'))
</script>

<template>
  <main class="space-y-4">
    <p class="max-w-3xl text-sm text-muted">
      选择一个演出，查看歌单里每首歌曲在选定平台上的播放量区间。串烧只在能核到至少两首组成歌曲时才拆开计数。
    </p>
    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UCard v-else>
      <div class="flex flex-wrap items-end gap-3">
        <label class="grid gap-1 text-xs text-muted">
          系列
          <USelect v-model="seriesId" :items="seriesOptions.map((row) => ({ label: row.name, value: row.id }))" size="sm" class="w-56" />
        </label>
        <label class="grid gap-1 text-xs text-muted">
          场次
          <USelect
            v-model="performanceId"
            :items="performances.map((row) => ({ label: `${row.start_date ?? '日期未知'} · ${row.name}`, value: row.id }))"
            size="sm"
            class="w-80"
          />
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
      <p v-if="selected" class="mt-3 text-xs text-muted">
        {{ selected.venue_name || '场馆未记录' }}
        · 日期精度 {{ selected.time_precision }}
        · 角色 {{ selected.role }}
        <template v-if="selected.showtime_local"> · 开演 {{ selected.showtime_local }}（{{ selected.timezone }}）</template>
        <template v-if="premiere"> · 该系列年度首演 {{ premiere.premiere_date }}</template>
        · <NuxtLink :to="`/shows/${selected.id}`" class="text-primary">这个演出的歌单</NuxtLink>
        · <ULink :to="selected.source_url" target="_blank" class="text-primary">VocaDB 演出</ULink>
      </p>
      <p v-if="selected?.time_evidence" class="mt-1 text-xs text-muted">开演摘录：{{ selected.time_evidence }}</p>
    </UCard>
    <UCard>
      <BandChart :bands="bands" />
      <p v-if="quarantined.length" class="text-xs text-muted">未拆分的串烧 {{ quarantined.length }} 行，不计入上面的比例。</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th class="px-2 py-1.5 font-medium">歌曲</th>
              <th class="px-2 py-1.5 font-medium">歌手</th>
              <th class="px-2 py-1.5 font-medium">区间</th>
              <th class="px-2 py-1.5 font-medium">播放量</th>
              <th class="px-2 py-1.5 font-medium">投稿</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in playbacks" :key="row.songId" class="border-t border-default/40">
              <td class="px-2 py-1.5">
                <ULink :to="songHref(row.songId)" :target="songHrefTarget(row.songId)" class="text-primary">
                  <SongTitle :song-id="row.songId" :original="songName(row.songId)" />
                </ULink>
              </td>
              <td class="px-2 py-1.5 text-muted">{{ songCharactersText(row.songId) }}</td>
              <td class="px-2 py-1.5 text-muted">{{ bands.find((band) => band.id === row.band)?.label }}</td>
              <td class="px-2 py-1.5 tabular-nums text-muted">{{ viewText(row.viewCount) }}</td>
              <td class="px-2 py-1.5">
                <ULink v-if="row.video" :to="row.video.url" target="_blank" class="text-primary">{{ row.video.pv_type || 'PV' }}</ULink>
                <span v-else class="text-muted">无代表投稿</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </main>
</template>
