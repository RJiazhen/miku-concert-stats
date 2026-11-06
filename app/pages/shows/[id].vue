<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useCatalog } from '~/composables/useCatalog.ts'
import { placeNames, usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { albumSetlistSources } from '~~/shared/album-setlists.ts'
import { buildCityIndex, matchCity } from '~~/shared/cities.ts'
import { catalogSchedules } from '~~/shared/performance-setlists.ts'
import { performanceHeaderFacts } from '~~/shared/performance-header.ts'
import { reviewRotations } from '~~/shared/rotation.ts'

const route = useRoute()
const { catalog, error, pending, load } = useCatalog()
const { localizePlace, showChinese } = usePlaceNames()
const { localizePerformanceSeries, seriesTitle } = useSeriesTitles()

/** Parsed once: the city matcher only depends on the static place list. */
const cityIndex = buildCityIndex(placeNames)

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const performanceId = computed(() => Number(route.params.id))
const performance = computed(() => catalog.value?.performances.find((row) => row.id === performanceId.value) ?? null)
const review = computed(() => (catalog.value ? reviewRotations(catalog.value) : null))

/** 场次 of this 演出, using the day/night dates stored in the catalog. */
const shows = computed(() => {
  const current = performance.value
  if (!catalog.value || !review.value || !current) return []
  return catalogSchedules(catalog.value, review.value).get(current.id) ?? []
})

/** Whether the catalog derived a 場次 layer for this 演出, including a wiki-sourced one. */
const hasDerived = computed(() =>
  catalog.value?.performanceSetlists.some((row) => row.performance_id === performanceId.value) ?? false,
)

/** Hand-checked outcome when the catalog has one, e.g. a cancelled show. */
const statusNote = computed(() => {
  const current = performance.value
  if (!catalog.value || !current) return null
  return catalog.value.performanceStatus.find((row) => row.performance_id === current.id) ?? null
})

/** Series behind this show, needed to translate the label inside the performance name. */
const series = computed(() => {
  const current = performance.value
  if (!catalog.value || !current) return null
  return catalog.value.series.find((row) => row.id === current.series_id) ?? null
})

/** Album behind this performance's setlist, empty when the list is VocaDB's own or a wiki table. */
const albumSources = computed(() => {
  const listId = performance.value?.song_list_id
  if (!catalog.value || listId === null || listId === undefined) return []
  // A wiki-sourced setlist replaces the album tracklist, so the album notice would be wrong.
  const fromWiki = catalog.value.performanceShowSetlistItems.some(
    (row) => row.performance_id === performanceId.value && row.evidence === 'wiki',
  )
  if (fromWiki) return []
  return albumSetlistSources(catalog.value, [listId])
})

/** Performance name with its series and place in the site language. */
const performanceLabel = computed(() => {
  const current = performance.value
  if (!current) return ''
  return localizePlace(localizePerformanceSeries(current.name, series.value?.name ?? '', current.series_number))
})

/** Date span, venue, and start time printed under the title; empty fields stay null. */
const headerFacts = computed(() => (performance.value ? performanceHeaderFacts(performance.value) : null))

/** Series name and series year in the site language, e.g. `初音ミクライブパーティー 2012`. */
const seriesView = computed(() => (series.value ? seriesTitle(series.value.name) : null))

/** City of this show; the VocaDB spelling is kept when the site shows original names. */
const cityName = computed(() => {
  const current = performance.value
  if (!current) return null
  const match = matchCity(current, cityIndex)
  if (match === null) return null
  return showChinese.value ? match.city : match.original
})

/** Series name for the first crumb; null when the catalog has no series row. */
const breadcrumbSeriesLabel = computed(() => seriesView.value?.primary ?? null)

/** Breadcrumb trail: 系列 (links to `/series/{id}`) → 演出 (links to `/shows/{id}`). */
const breadcrumb = computed(() => {
  const current = performance.value
  if (!current) return []
  const items: { label: string, to?: string }[] = []
  if (breadcrumbSeriesLabel.value !== null) {
    items.push({ label: breadcrumbSeriesLabel.value, to: `/series/${current.series_id}` })
  }
  items.push({ label: performanceLabel.value, to: `/shows/${current.id}` })
  return items
})

/** One-line facts under the title: date, city, venue, and start time, joined only when present. */
const headerLine = computed(() => {
  const facts = headerFacts.value
  const parts = [
    facts?.dates ?? '日期未知',
    cityName.value,
    facts?.venue,
    facts?.showtime ? `开演 ${facts.showtime}` : null,
  ]
  return parts.filter((part): part is string => part !== null && part !== '').join(' · ')
})
</script>

<template>
  <main class="space-y-6">
    <p v-if="pending" class="text-sm text-muted">正在浏览器中加载目录…</p>
    <UAlert v-else-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UEmpty v-else-if="catalog && !performance" icon="i-lucide-calendar-x" title="找不到这个演出" description="这个 id 不在已提交的目录里。" />

    <template v-else-if="performance">
      <UBreadcrumb :items="breadcrumb" />

      <header class="space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">{{ performanceLabel }}</h1>
        <p class="text-sm text-muted">{{ headerLine }}</p>
        <p v-if="seriesView" class="text-xs text-muted">
          <NuxtLink
            :to="`/series/${performance.series_id}`"
            class="text-primary hover:underline"
          >
            {{ seriesView.primary }} 系列
          </NuxtLink>
        </p>
        <p v-if="shows.length > 0" class="text-xs text-muted">
          场次（{{ shows.length }}）：
          <template v-for="(show, index) in shows" :key="show.key">
            <span v-if="index > 0"> · </span>
            <span class="text-highlighted">{{ show.label }}</span>
          </template>
        </p>
        <div class="flex flex-wrap gap-2 text-xs">
          <UButton :to="performance.source_url" target="_blank" color="neutral" variant="outline" size="xs" icon="i-lucide-external-link">
            VocaDB 演出
          </UButton>
        </div>
      </header>

      <UAlert
        v-if="statusNote"
        :color="statusNote.status === 'cancelled' ? 'error' : 'warning'"
        variant="subtle"
        icon="i-lucide-calendar-x"
        :title="statusNote.status === 'cancelled' ? '这场演出已取消' : statusNote.status === 'postponed' ? '这场演出已延期' : '这场演出尚未举行'"
        :description="statusNote.note ?? undefined"
      >
        <template #actions>
          <UButton :to="statusNote.source_url" target="_blank" color="neutral" variant="outline" size="xs" icon="i-lucide-external-link">
            来源
          </UButton>
        </template>
      </UAlert>
      <UAlert
        v-if="performance.song_list_id === null && !statusNote && !hasDerived"
        color="warning"
        variant="subtle"
        icon="i-lucide-info"
        title="这个演出在 VocaDB 没有歌单"
        description="没有歌单时无法列出曲目。"
      />
      <template v-else>
        <AlbumSetlistAlert :sources="albumSources" />
        <ShowSetlistSection
          v-if="catalog"
          :catalog="catalog"
          :performance-id="performance.id"
        />
        <USkeleton v-else class="h-64 w-full rounded-xl" />
      </template>
    </template>
  </main>
</template>
