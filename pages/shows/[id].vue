<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useCatalog } from '../../composables/useCatalog.ts'
import { reviewRotations, type ResolvedRotationLine } from '../../shared/rotation.ts'

const route = useRoute()
const { catalog, error, pending, load } = useCatalog()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const performanceId = computed(() => Number(route.params.id))

const performance = computed(() => catalog.value?.performances.find((row) => row.id === performanceId.value) ?? null)

const review = computed(() => (catalog.value ? reviewRotations(catalog.value) : null))

const lines = computed(() => {
  const current = performance.value
  if (!review.value || !current || current.song_list_id === null) return []
  return review.value.lines.filter((line) => line.songListId === current.song_list_id)
})

const mismatch = computed(() => review.value?.shows.find((show) => show.performanceId === performanceId.value) ?? null)

/** Display name for the first counted song on a line. */
const songName = (line: ResolvedRotationLine): string => {
  const songId = line.songIds[0] ?? line.listedSongId
  const song = catalog.value?.songs.find((row) => row.id === songId)
  return song?.name ?? String(songId)
}

/** Names of the performances a parsed line was assigned to. */
const assignedNames = (line: ResolvedRotationLine): string => {
  if (!catalog.value) return ''
  return line.performanceIds
    .map((id) => catalog.value?.performances.find((row) => row.id === id)?.name ?? String(id))
    .join('、')
}

/** Whether this show is one of the performances the note resolved to. */
const onThisShow = (line: ResolvedRotationLine): string => {
  return line.performanceIds.includes(performanceId.value) ? '本场演唱' : '本场未唱'
}
</script>

<template>
  <main>
    <p v-if="pending" class="status">正在浏览器中加载目录…</p>
    <p v-else-if="error" class="status">{{ error }}</p>
    <p v-else-if="catalog && !performance" class="status">找不到这场演出。</p>
    <section v-if="performance" class="panel">
      <h2>{{ performance.name }}</h2>
      <p class="note">
        {{ performance.start_date ?? '日期未知' }}
        <template v-if="performance.end_date && performance.end_date !== performance.start_date"> – {{ performance.end_date }}</template>
        · {{ performance.venue_name || '场馆未记录' }}
        · <NuxtLink v-if="performance.series_number !== null" :to="`/editions/${performance.series_id}/${performance.series_number}`">这个年版</NuxtLink>
        · <NuxtLink to="/catalog">播放量</NuxtLink>
        · <a :href="performance.source_url">VocaDB</a>
      </p>
      <p v-if="performance.song_list_id === null" class="note">这场在 VocaDB 没有歌单。</p>
      <p v-else-if="mismatch" class="note">{{ mismatch.reasons.join('；') }}</p>
      <div v-if="lines.length" class="scroll">
        <table>
          <thead>
            <tr>
              <th>歌曲</th>
              <th>本场</th>
              <th>VocaDB 备注</th>
              <th>解析到的场次</th>
              <th>不确定</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in lines" :key="line.position">
              <td><a :href="`https://vocadb.net/S/${line.songIds[0] ?? line.listedSongId}`">{{ songName(line) }}</a></td>
              <td>{{ onThisShow(line) }}</td>
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
