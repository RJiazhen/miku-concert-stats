<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCatalog } from '~/composables/useCatalog.ts'
import { useSetlistMerges } from '~/composables/useSetlistMerges.ts'
import { buildSetlistDisplay, editionSongLists, partitionSongLists } from '~~/shared/edition-setlists.ts'
import { reviewRotations } from '~~/shared/rotation.ts'

const route = useRoute()
const { catalog, error, pending, load } = useCatalog()
const merges = useSetlistMerges()

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

/** Merged groups plus standalone song lists for this edition. */
const sides = computed(() => {
  if (!catalog.value) return []
  return partitionSongLists(editionSongLists(catalog.value, seriesId.value, seriesNumber.value), merges)
})

const sideIndex = ref(0)
watch(sides, () => {
  sideIndex.value = 0
})

const sideOptions = computed(() =>
  sides.value.map((side, index) => ({
    label: side.length > 1 ? `合并 ${side.length} 份歌单（${side.join(' / ')}）` : `歌单 ${side[0] ?? ''}`,
    value: index,
  })),
)

const display = computed(() => {
  if (!catalog.value || !review.value) return null
  const side = sides.value[sideIndex.value]
  if (!side || side.length === 0) return null
  return buildSetlistDisplay(catalog.value, review.value, side)
})

const premiere = computed(() => {
  if (!catalog.value) return null
  return catalog.value.premieres.find((row) => row.series_id === seriesId.value && row.series_number === seriesNumber.value) ?? null
})
</script>

<template>
  <main class="space-y-6">
    <p v-if="pending" class="text-sm text-muted">正在浏览器中加载目录…</p>
    <UAlert v-else-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />

    <template v-else-if="catalog">
      <UBreadcrumb :items="[{ label: '排行', to: '/' }, { label: '年版' }, { label: `${series?.name ?? seriesId} ${seriesNumber}` }]" />

      <header class="space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">
          {{ series?.name ?? seriesId }} {{ seriesNumber }}
        </h1>
        <p class="text-sm text-muted">
          {{ performances.length }} 场
          <template v-if="premiere">· 首演 {{ premiere.premiere_date }}</template>
          · 同一版本的不同地区歌单已按人工清单合并，替换曲目共享序号
        </p>
      </header>

      <UCard>
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">场次</h2>
        </template>
        <ul class="space-y-1 text-sm">
          <li v-for="performance in performances" :key="performance.id">
            <NuxtLink :to="`/shows/${performance.id}`" class="text-primary">
              {{ performance.start_date ?? '日期未知' }} · {{ performance.name }}
            </NuxtLink>
            <span v-if="performance.song_list_id === null" class="text-muted"> · 无歌单</span>
          </li>
          <li v-if="performances.length === 0" class="text-muted">这个年版没有演出记录。</li>
        </ul>
      </UCard>

      <UCard v-if="sideOptions.length > 1">
        <div class="flex flex-wrap items-end gap-3">
          <label class="grid gap-1 text-xs text-muted">
            显示范围
            <USelect v-model="sideIndex" :items="sideOptions" size="sm" class="w-80" />
          </label>
          <p class="pb-2 text-xs text-muted">合并视图与逐场歌单使用同一份 VocaDB 数据</p>
        </div>
      </UCard>

      <USkeleton v-if="pending" class="h-64 w-full rounded-xl" />
      <UEmpty v-else-if="!display" icon="i-lucide-list-x" title="这个年版没有歌单" description="VocaDB 上没有可用的歌单记录。" />
      <SetlistTable v-else-if="display && review" :display="display" :review="review" />
    </template>
  </main>
</template>
