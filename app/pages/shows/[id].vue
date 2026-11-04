<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useCatalog } from '~/composables/useCatalog.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { buildSetlistDisplay } from '~~/shared/edition-setlists.ts'
import { albumSetlistSources } from '~~/shared/album-setlists.ts'
import { reviewRotations } from '~~/shared/rotation.ts'

const route = useRoute()
const { catalog, error, pending, load } = useCatalog()
const { localizePlace } = usePlaceNames()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const performanceId = computed(() => Number(route.params.id))
const performance = computed(() => catalog.value?.performances.find((row) => row.id === performanceId.value) ?? null)
const review = computed(() => (catalog.value ? reviewRotations(catalog.value) : null))

/** One show's own song list, with day-specific lines folded into slots. */
const display = computed(() => {
  const current = performance.value
  if (!catalog.value || !review.value || !current || current.song_list_id === null) return null
  return buildSetlistDisplay(catalog.value, review.value, [current.song_list_id])
})

const editionNumber = computed(() => performance.value?.series_number ?? null)

/** Album behind this performance's setlist, empty when the list is VocaDB's own. */
const albumSources = computed(() => {
  const listId = performance.value?.song_list_id
  if (!catalog.value || listId === null || listId === undefined) return []
  return albumSetlistSources(catalog.value, [listId])
})

/** Performance name with its place in the site language. */
const performanceLabel = computed(() => (performance.value ? localizePlace(performance.value.name) : ''))
</script>

<template>
  <main class="space-y-6">
    <p v-if="pending" class="text-sm text-muted">正在浏览器中加载目录…</p>
    <UAlert v-else-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UEmpty v-else-if="catalog && !performance" icon="i-lucide-calendar-x" title="找不到这场演出" description="这个 id 不在已提交的目录里。" />

    <template v-else-if="performance">
      <UBreadcrumb :items="[{ label: '排行', to: '/' }, { label: '场次' }, { label: performanceLabel }]" />

      <header class="space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">{{ performanceLabel }}</h1>
        <p class="text-sm text-muted">
          {{ performance.start_date ?? '日期未知' }}
          <template v-if="performance.end_date && performance.end_date !== performance.start_date"> – {{ performance.end_date }}</template>
          · {{ performance.venue_name || '场馆未记录' }}
          <template v-if="performance.showtime_local">· 开演 {{ performance.showtime_local }}</template>
        </p>
        <div class="flex flex-wrap gap-2 text-xs">
          <UButton
            v-if="editionNumber !== null"
            :to="`/editions/${performance.series_id}/${editionNumber}`"
            color="neutral"
            variant="outline"
            size="xs"
            icon="i-lucide-calendar-days"
          >
            这个年版
          </UButton>
          <UButton :to="performance.source_url" target="_blank" color="neutral" variant="outline" size="xs" icon="i-lucide-external-link">
            VocaDB 演出
          </UButton>
        </div>
      </header>

      <UAlert
        v-if="performance.song_list_id === null"
        color="warning"
        variant="subtle"
        icon="i-lucide-info"
        title="这场在 VocaDB 没有歌单"
        description="没有歌单时无法列出曲目。"
      />
      <template v-else>
        <AlbumSetlistAlert :sources="albumSources" />
        <SetlistTable v-if="display && review" :display="display" :review="review" />
        <USkeleton v-else class="h-64 w-full rounded-xl" />
      </template>
    </template>
  </main>
</template>
