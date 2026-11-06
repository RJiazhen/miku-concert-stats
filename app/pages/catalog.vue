<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useCatalog } from '~/composables/useCatalog.ts'
import { songCharacters } from '~/composables/useCharacters.ts'
import { playbackForSongs, songById, songIdsForPerformance, summarizeBands } from '~~/shared/stats.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import type { Platform } from '~~/shared/types.ts'

// No playback snapshot is published yet, so the navigation keeps this page out.
definePageMeta({ middleware: 'retired' })

const { catalog, error, pending, load } = useCatalog()
const { songHref, vocadbSongUrl } = useSongLookup()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const seriesId = ref<number | undefined>(undefined)
const performanceId = ref<number | undefined>(undefined)
const platform = ref<Platform>('youtube')

const seriesOptions = computed(() => catalog.value?.series ?? [])

const performances = computed(() => {
  const rows = catalog.value?.performances.filter((row) => row.series_id === seriesId.value) ?? []
  return [...rows].sort((left, right) => (left.start_date ?? '').localeCompare(right.start_date ?? '') || left.id - right.id)
})

/** Selects the first series once the catalog arrives. */
const chooseInitialSeries = (): void => {
  if (seriesId.value !== undefined || !catalog.value) return
  seriesId.value = catalog.value.series[0]?.id
}
watch(catalog, chooseInitialSeries)

/** Keeps the performance select inside the chosen series. */
const choosePerformance = (): void => {
  if (performances.value.some((row) => row.id === performanceId.value)) return
  performanceId.value = performances.value[0]?.id
}
watch(performances, choosePerformance)

const selected = computed(() => performances.value.find((row) => row.id === performanceId.value) ?? null)

const songIds = computed(() => {
  if (!catalog.value || performanceId.value === undefined) return []
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

/** 演出角色 chips for a catalog song; empty when no vocalist matched. */
const songCharactersOf = (songId: number): string[] => {
  const song = catalog.value ? songById(catalog.value, songId) : undefined
  return songCharacters(song ?? null)
}

/** View count text. Missing snapshots stay blank rather than zero. */
const viewText = (count: number | null): string => (count === null ? '无快照' : count.toLocaleString('zh-Hans'))

/** One printed playback row. */
type PlaybackRow = {
  key: number
  songId: number
  band: string
  viewCount: string
  video: { pv_type: string | null; url: string } | null
}

/** Playback facts turned into the text the table prints. */
const playbackRows = computed<PlaybackRow[]>(() =>
  playbacks.value.map((row) => ({
    key: row.songId,
    songId: row.songId,
    band: bands.value.find((band) => band.id === row.band)?.label ?? '—',
    viewCount: viewText(row.viewCount),
    video: row.video === null ? null : { pv_type: row.video.pv_type, url: row.video.url },
  })),
)

const columns: TableColumn<PlaybackRow>[] = [
  { id: 'song', header: '歌曲' },
  { id: 'characters', header: '歌手' },
  { accessorKey: 'band', header: '区间' },
  { accessorKey: 'viewCount', header: '播放量' },
  { id: 'video', header: '投稿' },
]
</script>

<template>
  <main class="space-y-4">
    <p class="max-w-3xl text-sm text-muted">
      选择一个演出，查看歌单里每首歌曲在选定平台上的播放量区间。串烧只在能核到至少两首组成歌曲时才拆开计数。
    </p>
    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UCard v-else>
      <div class="flex flex-wrap items-end gap-3">
        <FilterField label="系列">
          <USelect v-model="seriesId" :items="seriesOptions.map((row) => ({ label: row.name, value: row.id }))" size="sm" class="w-56" />
        </FilterField>
        <FilterField label="场次">
          <USelect
            v-model="performanceId"
            :items="performances.map((row) => ({ label: `${row.start_date ?? '日期未知'} · ${row.name}`, value: row.id }))"
            size="sm"
            class="w-80"
          />
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

    <UCard v-if="!error">
      <BandChart :bands="bands" />
      <p v-if="quarantined.length" class="text-xs text-muted">未拆分的串烧 {{ quarantined.length }} 行，不计入上面的比例。</p>
    </UCard>

    <TableSection
      v-if="!error"
      title="播放量"
      :count="`${playbackRows.length} 首`"
      :fill="false"
      :data="playbackRows"
      :columns="columns"
      :loading="pending"
      empty-icon="i-lucide-music"
      empty-title="没有可统计的歌曲"
      empty-description="先选择一个有歌单的演出。"
    >
      <template #song-cell="{ row }">
        <ULink :to="songHref(row.original.songId)" class="text-primary">
          <SongTitle :song-id="row.original.songId" :original="songName(row.original.songId)" />
        </ULink>
        <ULink
          v-if="vocadbSongUrl(row.original.songId)"
          :to="vocadbSongUrl(row.original.songId) ?? ''"
          target="_blank"
          class="ml-1 text-dimmed hover:text-primary"
          aria-label="在 VocaDB 查看"
        >
          <UIcon name="i-lucide-external-link" class="size-3" />
        </ULink>
      </template>
      <template #characters-cell="{ row }">
        <CharacterChips :names="songCharactersOf(row.original.songId)" />
      </template>
      <template #band-cell="{ row }">
        <span class="text-muted">{{ row.original.band }}</span>
      </template>
      <template #viewCount-cell="{ row }">
        <span class="tabular-nums text-muted">{{ row.original.viewCount }}</span>
      </template>
      <template #video-cell="{ row }">
        <ULink v-if="row.original.video" :to="row.original.video.url" target="_blank" class="text-primary">{{ row.original.video.pv_type || 'PV' }}</ULink>
        <span v-else class="text-muted">无代表投稿</span>
      </template>
    </TableSection>
  </main>
</template>
