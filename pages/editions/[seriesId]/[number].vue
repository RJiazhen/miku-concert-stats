<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useCatalog } from '../../../composables/useCatalog.ts'
import { reviewRotations, type ResolvedRotationLine } from '../../../shared/rotation.ts'

const route = useRoute()
const { catalog, error, pending, load } = useCatalog()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const seriesId = computed(() => Number(route.params.seriesId))
const seriesNumber = computed(() => Number(route.params.number))

const series = computed(() => catalog.value?.series.find((row) => row.id === seriesId.value) ?? null)

const performances = computed(() => {
  const rows = catalog.value?.performances.filter((row) => row.series_id === seriesId.value && row.series_number === seriesNumber.value) ?? []
  return [...rows].sort((left, right) => (left.start_date ?? '').localeCompare(right.start_date ?? '') || left.id - right.id)
})

const review = computed(() => (catalog.value ? reviewRotations(catalog.value) : null))

const lines = computed(() => {
  const listIds = new Set(performances.value.map((row) => row.song_list_id).filter((id): id is number => id !== null))
  return review.value?.lines.filter((line) => listIds.has(line.songListId)) ?? []
})

/** Display name for the first counted song on a line. */
const songName = (line: ResolvedRotationLine): string => {
  const songId = line.songIds[0] ?? line.listedSongId
  const song = catalog.value?.songs.find((row) => row.id === songId)
  return song?.name ?? String(songId)
}

/** Names of the performances a parsed line was assigned to. */
const assignedNames = (line: ResolvedRotationLine): string => {
  return line.performanceIds
    .map((id) => performances.value.find((row) => row.id === id)?.name ?? catalog.value?.performances.find((row) => row.id === id)?.name ?? String(id))
    .join('、')
}
</script>

<template>
  <main>
    <p v-if="pending" class="status">正在浏览器中加载目录…</p>
    <p v-else-if="error" class="status">{{ error }}</p>
    <section v-else-if="catalog" class="panel">
      <h2>{{ series?.name ?? seriesId }} {{ seriesNumber }}</h2>
      <p v-if="performances.length === 0" class="note">这个年版没有演出记录。</p>
      <ul v-else class="note">
        <li v-for="performance in performances" :key="performance.id">
          <NuxtLink :to="`/shows/${performance.id}`">{{ performance.start_date ?? '日期未知' }} · {{ performance.name }}</NuxtLink>
          <template v-if="performance.song_list_id === null"> · 无歌单</template>
        </li>
      </ul>
      <div v-if="lines.length" class="scroll">
        <table>
          <thead>
            <tr>
              <th>歌曲</th>
              <th>VocaDB 备注</th>
              <th>解析到的场次</th>
              <th>不确定</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in lines" :key="`${line.songListId}:${line.position}`">
              <td><a :href="`https://vocadb.net/S/${line.songIds[0] ?? line.listedSongId}`">{{ songName(line) }}</a></td>
              <td>{{ line.notes?.trim() ? line.notes : '（空，每一场）' }}</td>
              <td>{{ assignedNames(line) }}</td>
              <td>{{ line.uncertain ? line.reasons.join('；') : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
