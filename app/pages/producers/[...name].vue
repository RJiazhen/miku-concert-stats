<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { TableColumn } from '@nuxt/ui'
import { useCatalog } from '~/composables/useCatalog.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { useSortableHeader } from '~/composables/useSortableHeader.ts'
import { buildProducerIndex, producerRoleLabels, rolesPresent, type ProducerRoleCounts } from '~~/shared/producers.ts'

const route = useRoute()
const { catalog, error, pending, load } = useCatalog()
const { localizePlace } = usePlaceNames()
const { localizeSeries, localizePerformanceSeries } = useSeriesTitles()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

/**
 * Producer name from the catch-all route.
 * The link encodes the name, so one name that contains `/` still arrives as one value;
 * joining the segments also accepts a hand-typed path that used a literal slash.
 */
const producerName = computed(() => {
  const raw = route.params.name
  if (Array.isArray(raw)) return raw.join('/')
  return raw ?? ''
})

/** Aggregated producers; the page reads exactly the index the ranking shows. */
const index = computed(() => (catalog.value ? buildProducerIndex(catalog.value) : null))

/** Exact-name lookup; null while loading or when the name is not in the catalog. */
const producer = computed(() => index.value?.byName.get(producerName.value) ?? null)

/** VocaDB artist page, only for structured credits that carry an id. */
const vocadbArtistUrl = computed(() => {
  const artistId = producer.value?.artistId ?? null
  return artistId === null ? null : `https://vocadb.net/Ar/${artistId}`
})

/** 曲目数, 演出曲目, 表演次数, 演出数 and 场次 in header order. */
const facts = computed(() => {
  const row = producer.value
  if (row === null) return []
  return [
    { label: '曲目数', value: row.songCount },
    { label: '演出曲目', value: row.performedSongCount },
    { label: '表演次数', value: row.appearanceCount },
    { label: '演出数', value: row.performanceCount },
    { label: '场次', value: row.showCount },
  ]
})

/** First–last appearance year, or a dash when no credited song was performed. */
const yearSpan = computed(() => {
  const row = producer.value
  if (row === null || row.firstYear === null || row.lastYear === null) return '—'
  return row.firstYear === row.lastYear ? String(row.firstYear) : `${row.firstYear}–${row.lastYear}`
})

/** Roles with a non-zero credited song count, in display order. */
const roleFacts = computed(() => {
  const roles: ProducerRoleCounts | undefined = producer.value?.roles
  if (roles === undefined) return []
  return rolesPresent(roles).map((role) => ({ label: producerRoleLabels[role], count: roles[role] }))
})

/** One row of the 署名曲目 table. */
type SongView = {
  songId: number
  name: string
  publishYear: number | null
  showCount: number
}

/** Credited songs, most-performed first, exactly as the aggregation ordered them. */
const songRows = computed<SongView[]>(() =>
  (producer.value?.songs ?? []).map((song) => ({
    songId: song.songId,
    name: song.name,
    publishYear: song.publishYear,
    showCount: song.showCount,
  })),
)

/** One row of the 出场记录 table. */
type AppearanceView = {
  key: string
  date: string | null
  seriesId: number
  seriesLabel: string
  performanceId: number
  performanceLabel: string
  /** Credited songs of this producer that the 演出 played, most-performed first. */
  songs: { songId: number; name: string }[]
}

/** Credited songs this producer had performed in each 演出, keyed by 演出 id. */
const songsByPerformance = computed(() => {
  const map = new Map<number, { songId: number; name: string }[]>()
  for (const song of producer.value?.songs ?? []) {
    for (const performanceId of song.performanceIds) {
      const bucket = map.get(performanceId) ?? []
      bucket.push({ songId: song.songId, name: song.name })
      map.set(performanceId, bucket)
    }
  }
  return map
})

/** Performances that played any credited song, oldest first and one row per 演出. */
const appearances = computed<AppearanceView[]>(() => {
  const row = producer.value
  const current = catalog.value
  if (row === null || current === null) return []
  const performanceById = new Map(current.performances.map((performance) => [performance.id, performance]))
  const seriesById = new Map(current.series.map((series) => [series.id, series]))
  const views = row.performanceIds.flatMap((performanceId) => {
    const performance = performanceById.get(performanceId)
    if (performance === undefined) return []
    const series = seriesById.get(performance.series_id)
    const seriesName = series?.name ?? String(performance.series_id)
    return [{
      key: String(performance.id),
      date: performance.start_date,
      seriesId: performance.series_id,
      seriesLabel: series === undefined ? `系列 ${performance.series_id}` : localizeSeries(series.name),
      performanceId: performance.id,
      performanceLabel: localizePlace(localizePerformanceSeries(performance.name, seriesName, performance.series_number)),
      songs: songsByPerformance.value.get(performance.id) ?? [],
    }]
  })
  views.sort(
    (left, right) =>
      (left.date ?? '9999').localeCompare(right.date ?? '9999') || left.performanceId - right.performanceId,
  )
  return views
})

/** Default order keeps the aggregation's 场次 order; clicking a header re-sorts. */
const songSorting = ref<{ id: string; desc: boolean }[]>([{ id: 'showCount', desc: true }])

/** The 出场记录 table keeps its chronological order until a header is clicked. */
const appearanceSorting = ref<{ id: string; desc: boolean }[]>([])

/** Sortable header button, shared with every other table on the site. */
const sortableHeader = useSortableHeader()

const songColumns: TableColumn<SongView>[] = [
  { accessorKey: 'name', header: sortableHeader('曲名'), enableSorting: true },
  { accessorKey: 'publishYear', header: sortableHeader('投稿年份'), enableSorting: true },
  { accessorKey: 'showCount', header: sortableHeader('场次'), enableSorting: true },
]

const appearanceColumns: TableColumn<AppearanceView>[] = [
  { accessorKey: 'date', header: sortableHeader('日期'), enableSorting: true },
  { accessorKey: 'seriesLabel', header: sortableHeader('系列'), enableSorting: true, meta: { class: { td: 'max-w-32' } } },
  { accessorKey: 'performanceLabel', header: sortableHeader('演出'), enableSorting: true, meta: { class: { td: 'max-w-[260px]' } } },
  { id: 'songs', header: '歌曲', accessorFn: (row) => row.songs.map((song) => song.name).join('、'), meta: { class: { td: 'max-w-[280px]' } } },
]

/** Blank marker for a missing value. */
const cell = (value: string | number | null): string => (value === null || value === '' ? '—' : String(value))

useHead({ title: computed(() => producer.value?.name ?? producerName.value ?? '制作人') })
</script>

<template>
  <main class="space-y-6">
    <p v-if="pending" class="text-sm text-muted">正在浏览器中加载目录…</p>
    <UAlert v-else-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UEmpty
      v-else-if="catalog && !producer"
      icon="i-lucide-user-x"
      title="找不到这位制作人"
      description="这个名字不在已提交的目录里。"
    />

    <template v-else-if="producer">
      <UBreadcrumb
        :items="[
          { label: '制作人', to: '/producers' },
          { label: producer.name },
        ]"
      />

      <header class="space-y-3">
        <h1 class="text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
          {{ producer.name }}
        </h1>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <UBadge
            v-for="fact in facts"
            :key="fact.label"
            color="primary"
            variant="subtle"
          >
            {{ fact.label }} {{ fact.value }}
          </UBadge>
          <UBadge color="neutral" variant="subtle">年份 {{ yearSpan }}</UBadge>
          <UButton
            v-if="vocadbArtistUrl"
            :to="vocadbArtistUrl"
            target="_blank"
            color="neutral"
            variant="outline"
            size="xs"
            icon="i-lucide-external-link"
          >
            VocaDB
          </UButton>
        </div>
        <p v-if="roleFacts.length > 0" class="text-sm text-muted">
          署名角色
          <span class="text-highlighted">
            {{ roleFacts.map((role) => `${role.label} ${role.count}`).join(' · ') }}
          </span>
        </p>
      </header>

      <TableSection
        v-if="catalog || pending"
        title="署名曲目"
        :count="`${songRows.length} 首`"
        note="「场次」是该曲在演唱会中被表演的场次数"
        :fill="false"
        v-model:sorting="songSorting"
        :data="songRows"
        :columns="songColumns"
        :loading="pending"
        empty-icon="i-lucide-music"
        empty-title="没有署名曲目"
        empty-description="目录里没有这位制作人的署名。"
      >
        <template #name-cell="{ row }">
          <NuxtLink :to="`/songs/${row.original.songId}`" class="text-highlighted no-underline hover:text-primary">
            <SongTitle :song-id="row.original.songId" :original="row.original.name" />
          </NuxtLink>
        </template>
        <template #publishYear-cell="{ row }">
          <span class="tabular-nums text-muted">{{ cell(row.original.publishYear) }}</span>
        </template>
        <template #showCount-cell="{ row }">
          <span class="tabular-nums text-muted">{{ row.original.showCount }}</span>
        </template>
      </TableSection>

      <TableSection
        v-if="catalog || pending"
        title="出场记录"
        :count="`${appearances.length} 个演出`"
        note="同一演出只列一行；「歌曲」是这位制作人在该演出中被表演的曲目"
        :fill="false"
        v-model:sorting="appearanceSorting"
        :data="appearances"
        :columns="appearanceColumns"
        :loading="pending"
        empty-icon="i-lucide-calendar-x"
        empty-title="没有出场记录"
        empty-description="这位制作人的署名曲目还没有出现在已收录的歌单里。"
      >
        <template #date-cell="{ row }">
          <span class="whitespace-nowrap font-mono text-muted">{{ cell(row.original.date) }}</span>
        </template>
        <template #seriesLabel-cell="{ row }">
          <UTooltip :text="row.original.seriesLabel" :content="{ side: 'top' }">
            <NuxtLink
              :to="`/series/${row.original.seriesId}`"
              class="block max-w-32 truncate text-primary no-underline hover:underline"
            >
              {{ row.original.seriesLabel }}
            </NuxtLink>
          </UTooltip>
        </template>
        <template #performanceLabel-cell="{ row }">
          <UTooltip :text="row.original.performanceLabel" :content="{ side: 'top' }">
            <NuxtLink
              :to="`/shows/${row.original.performanceId}`"
              class="block max-w-[260px] truncate text-primary no-underline hover:underline"
            >
              {{ row.original.performanceLabel }}
            </NuxtLink>
          </UTooltip>
        </template>
        <template #songs-cell="{ row }">
          <UTooltip v-if="row.original.songs.length > 0" :content="{ side: 'top' }">
            <div class="flex max-w-[280px] flex-nowrap items-center gap-x-2 overflow-hidden">
              <template v-for="(song, index) in row.original.songs" :key="song.songId">
                <span v-if="index > 0" class="shrink-0 text-muted">、</span>
                <NuxtLink
                  :to="`/songs/${song.songId}`"
                  class="min-w-0 truncate text-highlighted no-underline hover:text-primary"
                >
                  <SongTitle :song-id="song.songId" :original="song.name" truncate />
                </NuxtLink>
              </template>
            </div>
            <template #content>
              <ul class="space-y-0.5">
                <li v-for="song in row.original.songs" :key="song.songId">
                  <NuxtLink :to="`/songs/${song.songId}`" class="text-primary no-underline hover:underline">
                    {{ song.name }}
                  </NuxtLink>
                </li>
              </ul>
            </template>
          </UTooltip>
          <span v-else class="text-muted">—</span>
        </template>
      </TableSection>
    </template>
  </main>
</template>
