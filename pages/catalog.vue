<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCatalog } from '../composables/useCatalog.ts'
import { playbackForSongs, songById, songIdsForPerformance, summarizeBands } from '../shared/stats.ts'
import type { Platform } from '../shared/types.ts'

const { catalog, error, pending, load } = useCatalog()

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

const playbacks = computed(() => {
  if (!catalog.value) return []
  return playbackForSongs(catalog.value, songIds.value, platform.value)
})

const bands = computed(() => summarizeBands(playbacks.value))

const premiere = computed(() => {
  if (!catalog.value || !selected.value || selected.value.series_number === null) return null
  return catalog.value.premieres.find((row) => row.series_id === selected.value?.series_id && row.series_number === selected.value?.series_number) ?? null
})

const quarantined = computed(() => {
  if (!catalog.value || selected.value?.song_list_id === null || !selected.value) return []
  const listId = selected.value.song_list_id
  return catalog.value.medleyQuarantine.filter((row) => row.song_list_id === listId)
})

/** Display name for a song id. */
const songName = (songId: number): string => {
  const song = catalog.value ? songById(catalog.value, songId) : undefined
  return song?.name_ja || song?.name || String(songId)
}

/** View count text. Missing snapshots stay blank rather than zero. */
const viewText = (count: number | null): string => (count === null ? '无快照' : count.toLocaleString('zh-Hans'))
</script>

<template>
  <main>
    <p class="lede">
      选择一场演出，查看歌单里每首歌曲在选定平台上的播放量区间。串烧只在能核到至少两首组成歌曲时才拆开计数。
    </p>
    <p v-if="pending" class="status">正在浏览器中加载目录…</p>
    <p v-else-if="error" class="status">{{ error }}</p>
    <ClientOnly>
      <section v-if="catalog" class="panel">
        <div class="controls">
          <label>
            系列
            <select v-model.number="seriesId">
              <option v-for="series in seriesOptions" :key="series.id" :value="series.id">{{ series.name }}</option>
            </select>
          </label>
          <label>
            场次
            <select v-model.number="performanceId">
              <option v-for="performance in performances" :key="performance.id" :value="performance.id">
                {{ performance.start_date ?? '日期未知' }} · {{ performance.name }}
              </option>
            </select>
          </label>
          <label>
            平台
            <select v-model="platform">
              <option value="youtube">YouTube</option>
              <option value="niconico">niconico</option>
              <option value="bilibili">哔哩哔哩</option>
            </select>
          </label>
        </div>
        <p v-if="selected" class="note">
          {{ selected.venue_name || '场馆未记录' }}
          · 日期精度 {{ selected.time_precision }}
          · 角色 {{ selected.role }}
          <template v-if="selected.showtime_local"> · 开演 {{ selected.showtime_local }}（{{ selected.timezone }}）</template>
          <template v-if="premiere">
            · 该年版首演 {{ premiere.premiere_date }}
            <template v-if="premiere.premiere_performance_id === selected.id">（本场）</template>
          </template>
          · <NuxtLink :to="`/shows/${selected.id}`">这场歌单</NuxtLink>
          <template v-if="selected.series_number !== null">
            · <NuxtLink :to="`/editions/${selected.series_id}/${selected.series_number}`">这个年版</NuxtLink>
          </template>
          · <a :href="selected.source_url">VocaDB 演出</a>
        </p>
        <p v-if="selected?.time_evidence" class="note">开演摘录：{{ selected.time_evidence }}</p>
        <BandChart :bands="bands" />
        <p v-if="quarantined.length" class="note">未拆分的串烧 {{ quarantined.length }} 行，不计入上面的比例。</p>
        <div class="scroll">
          <table>
            <thead>
              <tr>
                <th>歌曲</th>
                <th>区间</th>
                <th>播放量</th>
                <th>投稿</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in playbacks" :key="row.songId">
                <td>
                  <a :href="`https://vocadb.net/S/${row.songId}`">{{ songName(row.songId) }}</a>
                </td>
                <td>{{ bands.find((band) => band.id === row.band)?.label }}</td>
                <td>{{ viewText(row.viewCount) }}</td>
                <td>
                  <a v-if="row.video" :href="row.video.url">{{ row.video.pv_type || 'PV' }}</a>
                  <span v-else>无代表投稿</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </ClientOnly>
  </main>
</template>
