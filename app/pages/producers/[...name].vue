<script setup lang="ts">
import { computed, h, onMounted, ref, resolveComponent } from 'vue'
import { useRoute } from 'vue-router'
import type { TableColumn } from '@nuxt/ui'
import { useCatalog } from '~/composables/useCatalog.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { buildProducerIndex, producerRoleLabels, rolesPresent, type ProducerRoleCounts } from '~~/shared/producers.ts'

const UButton = resolveComponent('UButton')

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
  rolesText: string
  publishYear: number | null
  showCount: number
}

/** Credited songs, most-performed first, exactly as the aggregation ordered them. */
const songRows = computed<SongView[]>(() =>
  (producer.value?.songs ?? []).map((song) => ({
    songId: song.songId,
    name: song.name,
    rolesText: song.roles.map((role) => producerRoleLabels[role]).join('、'),
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
}

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

/** Sortable header button, matching the ranking tables. */
const sortableHeader = (label: string) => ({ column }: { column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc?: boolean) => void } }) => {
  const sorted = column.getIsSorted()
  return h(UButton, {
    color: 'neutral',
    variant: 'ghost',
    size: 'xs',
    label,
    trailingIcon: sorted ? (sorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow') : 'i-lucide-arrow-up-down',
    class: '-mx-2',
    onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
  })
}

const songColumns: TableColumn<SongView>[] = [
  { accessorKey: 'name', header: sortableHeader('曲名'), enableSorting: true },
  { accessorKey: 'rolesText', header: '角色', enableSorting: false },
  { accessorKey: 'publishYear', header: sortableHeader('投稿年份'), enableSorting: true },
  { accessorKey: 'showCount', header: sortableHeader('场次'), enableSorting: true },
]

const appearanceColumns: TableColumn<AppearanceView>[] = [
  { accessorKey: 'date', header: sortableHeader('日期'), enableSorting: true },
  { accessorKey: 'seriesLabel', header: sortableHeader('系列'), enableSorting: true },
  { accessorKey: 'performanceLabel', header: sortableHeader('演出'), enableSorting: true },
]

/** Blank marker for a missing value. */
const cell = (value: string | number | null): string => (value === null || value === '' ? '—' : String(value))
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

      <section class="space-y-3">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-lg font-semibold text-highlighted">
            署名曲目
            <span class="ml-1 text-sm font-normal text-muted">{{ songRows.length }} 首</span>
          </h2>
          <p class="text-xs text-muted">「场次」是该曲在演唱会中被表演的场次数</p>
        </div>

        <UTable
          v-if="catalog"
          v-model:sorting="songSorting"
          :data="songRows"
          :columns="songColumns"
          :loading="pending"
        >
          <template #name-cell="{ row }">
            <NuxtLink :to="`/songs/${row.original.songId}`" class="text-highlighted no-underline hover:text-primary">
              <SongTitle :song-id="row.original.songId" :original="row.original.name" />
            </NuxtLink>
          </template>
          <template #rolesText-cell="{ row }">
            <span class="text-xs text-muted">{{ row.original.rolesText || '—' }}</span>
          </template>
          <template #publishYear-cell="{ row }">
            <span class="tabular-nums text-muted">{{ cell(row.original.publishYear) }}</span>
          </template>
          <template #showCount-cell="{ row }">
            <span class="tabular-nums text-muted">{{ row.original.showCount }}</span>
          </template>
          <template #empty>
            <UEmpty icon="i-lucide-music" title="没有署名曲目" description="目录里没有这位制作人的署名。" variant="naked" />
          </template>
        </UTable>
        <USkeleton v-else class="h-56 w-full rounded-xl" />
      </section>

      <section class="space-y-3">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-lg font-semibold text-highlighted">
            出场记录
            <span class="ml-1 text-sm font-normal text-muted">{{ appearances.length }} 个演出</span>
          </h2>
          <p class="text-xs text-muted">同一演出只列一行</p>
        </div>

        <UTable
          v-if="catalog"
          v-model:sorting="appearanceSorting"
          :data="appearances"
          :columns="appearanceColumns"
          :loading="pending"
        >
          <template #date-cell="{ row }">
            <span class="whitespace-nowrap font-mono text-muted">{{ cell(row.original.date) }}</span>
          </template>
          <template #seriesLabel-cell="{ row }">
            <NuxtLink :to="`/series/${row.original.seriesId}`" class="text-primary no-underline hover:underline">
              {{ row.original.seriesLabel }}
            </NuxtLink>
          </template>
          <template #performanceLabel-cell="{ row }">
            <NuxtLink :to="`/shows/${row.original.performanceId}`" class="text-primary no-underline hover:underline">
              {{ row.original.performanceLabel }}
            </NuxtLink>
          </template>
          <template #empty>
            <UEmpty
              icon="i-lucide-calendar-x"
              title="没有出场记录"
              description="这位制作人的署名曲目还没有出现在已收录的歌单里。"
              variant="naked"
            />
          </template>
        </UTable>
        <USkeleton v-else class="h-56 w-full rounded-xl" />
      </section>
    </template>
  </main>
</template>
