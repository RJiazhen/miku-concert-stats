<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCatalog } from '../composables/useCatalog.ts'
import { countedSongIds, dayInstant, observeWindow, songById } from '../shared/stats.ts'
import type { Platform } from '../shared/types.ts'

const { catalog, error, pending, load } = useCatalog()

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

const announcementObservations = computed(() => {
  if (!catalog.value) return []
  return observeWindow(catalog.value, songIds.value, platform.value, announcedAt.value)
})

/** Display name for a song id. */
const songName = (songId: number): string => {
  const song = catalog.value ? songById(catalog.value, songId) : undefined
  return song?.name_ja || song?.name || String(songId)
}

const sufficient = computed(() => premiereObservations.value.filter((row) => row.status === 'ok').length)
</script>

<template>
  <main>
    <p class="lede">
      观察点是年版首演日和歌单公布时间。某一侧没有快照时记为样本不足，不把曲线补齐。VocaDB 的日期只到日，边界取该日的 UTC 零点。
    </p>
    <p v-if="pending" class="status">正在浏览器中加载目录…</p>
    <p v-else-if="error" class="status">{{ error }}</p>
    <ClientOnly>
      <section v-if="catalog" class="panel">
        <div class="controls">
          <label>
            年版
            <select v-model="editionKey">
              <option v-for="edition in editions" :key="edition.key" :value="edition.key">{{ edition.label }}</option>
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
        <p class="note">
          首演 {{ selected?.premiere.premiere_date ?? '—' }}：{{ sufficient }} / {{ premiereObservations.length }} 首两侧都有快照。
          歌单公布时间：{{ announcedAt ?? '公开 API 的歌单对象没有该字段' }}。
          公布时间窗口中样本不足 {{ announcementObservations.filter((row) => row.status !== 'ok').length }} 首。
        </p>
        <div class="scroll">
          <table>
            <thead>
              <tr>
                <th>歌曲</th>
                <th>首演前</th>
                <th>首演后</th>
                <th>差值</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in premiereObservations" :key="row.songId">
                <td>{{ songName(row.songId) }}</td>
                <td>{{ row.status === 'ok' ? row.before : '样本不足' }}</td>
                <td>{{ row.status === 'ok' ? row.after : '样本不足' }}</td>
                <td>{{ row.status === 'ok' ? row.delta : '样本不足' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </ClientOnly>
  </main>
</template>
