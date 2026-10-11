<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCatalog } from '../composables/useCatalog.ts'
import { reviewRotations } from '../shared/rotation.ts'
import { rankSongAppearances, type RankingMode, type SongRanking } from '../shared/stats.ts'

const { catalog, error, pending, load } = useCatalog()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const mode = ref<RankingMode>('setlist')
const selectedSeries = ref<number[]>([])
const seriesTouched = ref(false)
const yearFromText = ref('')
const yearToText = ref('')
const includeBroadcast = ref(false)
const includeMedleyComponents = ref(false)

type SortKey = 'rank' | 'name' | 'artists' | 'count' | 'seriesCount' | 'firstYear' | 'lastYear'

const sortKey = ref<SortKey>('count')
const sortDesc = ref(true)

const seriesOptions = computed(() => catalog.value?.series ?? [])

/** Checks every series once, the first time the catalog is available. */
const selectAllSeries = (): void => {
  if (seriesTouched.value || !catalog.value) return
  selectedSeries.value = catalog.value.series.map((row) => row.id)
  seriesTouched.value = true
}
watch(catalog, selectAllSeries, { immediate: true })

/** Parses a four-digit year. Any other text leaves that side of the range open. */
const yearOrNull = (value: string): number | null => {
  if (!/^\d{4}$/.test(value.trim())) return null
  return Number(value.trim())
}

type RankedSong = SongRanking & { rank: number }

const ranked = computed((): RankedSong[] => {
  if (!catalog.value || selectedSeries.value.length === 0) return []
  return rankSongAppearances(catalog.value, {
    mode: mode.value,
    seriesIds: selectedSeries.value,
    yearFrom: yearOrNull(yearFromText.value),
    yearTo: yearOrNull(yearToText.value),
    includeBroadcast: includeBroadcast.value,
    includeMedleyComponents: includeMedleyComponents.value,
  }).map((row, index) => ({ ...row, rank: index + 1 }))
})

/** Reorders rows for the clicked column. Rank numbers stay tied to the default count order. */
const sorted = computed((): RankedSong[] => {
  const direction = sortDesc.value ? -1 : 1
  const key = sortKey.value
  return [...ranked.value].sort((left, right) => {
    const a = left[key]
    const b = right[key]
    if (a === b) return left.songId - right.songId
    if (a === null) return 1
    if (b === null) return -1
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * direction || left.songId - right.songId
    return String(a).localeCompare(String(b), 'zh-Hans') * direction || left.songId - right.songId
  })
})

/** Switches sort column, or flips direction when the active header is clicked again. */
const toggleSort = (key: SortKey): void => {
  if (sortKey.value === key) {
    sortDesc.value = !sortDesc.value
    return
  }
  sortKey.value = key
  sortDesc.value = key === 'count' || key === 'seriesCount' || key === 'lastYear' || key === 'rank'
}

/** Sets whether each song is counted once per setlist or once per performance. */
const setMode = (next: RankingMode): void => {
  mode.value = next
}

/** Blank marker for a missing artist or year. */
const cell = (value: string | number | null): string => (value === null || value === '' ? '—' : String(value))

/** Direction mark for the active header. */
const sortMark = (key: SortKey): string => {
  if (sortKey.value !== key) return ''
  return sortDesc.value ? ' ↓' : ' ↑'
}

const rotation = computed(() => (catalog.value ? reviewRotations(catalog.value) : null))

const uncertainLines = computed(() => rotation.value?.lines.filter((line) => line.uncertain) ?? [])

const mismatchedShows = computed(() => rotation.value?.shows ?? [])

/** Song title for an unresolved setlist line. */
const lineSongName = (songIds: readonly number[]): string => {
  const songId = songIds[0]
  if (!catalog.value || songId === undefined) return '—'
  return catalog.value.songs.find((song) => song.id === songId)?.name ?? String(songId)
}

/** Performance title for a mismatched show. */
const performanceName = (performanceId: number): string => {
  return catalog.value?.performances.find((row) => row.id === performanceId)?.name ?? String(performanceId)
}
</script>

<template>
  <main>
    <p class="lede">
      按歌单或按场次统计每首歌出现的次数。默认不计配信、线上和 VR 场，也不把串烧的组成歌曲单独计入。
    </p>
    <p class="note">
      「按歌单」是默认口径：VocaDB 的一份歌单通常代表一次巡演或一个年版，各场临时换上的曲子不会从这份计数里分开。初音ミクシンフォニー在 VocaDB 没有歌单，所以不会出现在这张表里。
    </p>
    <p v-if="pending" class="status">正在浏览器中加载目录…</p>
    <p v-else-if="error" class="status">{{ error }}</p>
    <ClientOnly>
      <section v-if="catalog" class="panel">
        <div class="controls">
          <div class="segmented" role="group" aria-label="计数方式">
            <button type="button" :aria-pressed="mode === 'setlist'" @click="setMode('setlist')">按歌单</button>
            <button type="button" :aria-pressed="mode === 'show'" @click="setMode('show')">按场次</button>
          </div>
          <label>
            起始年
            <input v-model="yearFromText" inputmode="numeric" placeholder="不限" autocomplete="off">
          </label>
          <label>
            结束年
            <input v-model="yearToText" inputmode="numeric" placeholder="不限" autocomplete="off">
          </label>
        </div>
        <div class="checks">
          <label>
            <input v-model="includeBroadcast" type="checkbox">
            计入配信 / 线上 / VR
          </label>
          <label>
            <input v-model="includeMedleyComponents" type="checkbox">
            计入串烧组成
          </label>
          <label v-for="series in seriesOptions" :key="series.id">
            <input v-model="selectedSeries" type="checkbox" :value="series.id">
            {{ series.name }}
          </label>
        </div>
        <p v-if="sorted.length === 0" class="note">当前筛选下没有可计数的歌曲。</p>
        <div v-else class="scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <button type="button" :aria-pressed="sortKey === 'rank'" @click="toggleSort('rank')">名次{{ sortMark('rank') }}</button>
                </th>
                <th>
                  <button type="button" :aria-pressed="sortKey === 'name'" @click="toggleSort('name')">歌曲{{ sortMark('name') }}</button>
                </th>
                <th>
                  <button type="button" :aria-pressed="sortKey === 'artists'" @click="toggleSort('artists')">艺人{{ sortMark('artists') }}</button>
                </th>
                <th>
                  <button type="button" :aria-pressed="sortKey === 'count'" @click="toggleSort('count')">次数{{ sortMark('count') }}</button>
                </th>
                <th>
                  <button type="button" :aria-pressed="sortKey === 'seriesCount'" @click="toggleSort('seriesCount')">系列数{{ sortMark('seriesCount') }}</button>
                </th>
                <th>
                  <button type="button" :aria-pressed="sortKey === 'firstYear'" @click="toggleSort('firstYear')">最早年份{{ sortMark('firstYear') }}</button>
                </th>
                <th>
                  <button type="button" :aria-pressed="sortKey === 'lastYear'" @click="toggleSort('lastYear')">最晚年份{{ sortMark('lastYear') }}</button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in sorted" :key="row.songId">
                <td>{{ row.rank }}</td>
                <td>
                  <a :href="`https://vocadb.net/S/${row.songId}`">{{ row.name }}</a>
                </td>
                <td>{{ cell(row.artists) }}</td>
                <td :title="row.reasons.join('\n')">{{ row.approximate ? `≈ ${row.count}` : row.count }}</td>
                <td>{{ row.seriesCount }}</td>
                <td>{{ cell(row.firstYear) }}</td>
                <td>{{ cell(row.lastYear) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h2>未解析的备注</h2>
        <p class="note">
          {{ uncertainLines.length }} 行备注无法确定到具体场次，{{ mismatchedShows.length }} 场的歌单长度和该歌单的常见长度不一致。
        </p>
        <div v-if="mismatchedShows.length" class="scroll">
          <table>
            <thead>
              <tr>
                <th>场次</th>
                <th>歌单</th>
                <th>原因</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="show in mismatchedShows" :key="show.performanceId">
                <td>{{ performanceName(show.performanceId) }}</td>
                <td>{{ show.songListId }}</td>
                <td>{{ show.reasons.join('；') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="uncertainLines.length" class="scroll">
          <table>
            <thead>
              <tr>
                <th>歌单</th>
                <th>歌曲</th>
                <th>备注</th>
                <th>原因</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in uncertainLines" :key="`${line.songListId}:${line.position}`">
                <td>{{ line.songListId }}</td>
                <td>{{ lineSongName(line.songIds) }}</td>
                <td>{{ cell(line.notes) }}</td>
                <td>{{ line.reasons.join('；') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </ClientOnly>
  </main>
</template>
