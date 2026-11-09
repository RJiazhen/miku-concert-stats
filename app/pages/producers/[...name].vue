<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { TableColumn } from '@nuxt/ui'
import { useCatalog } from '~/composables/useCatalog.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useProducerFlags } from '~/composables/useProducerFlags.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { useSortableHeader } from '~/composables/useSortableHeader.ts'
import { useLocale } from '~/composables/useLocale.ts'
import { useSongVariants } from '~/composables/useSongVariants.ts'
import { buildProducerIndex, producerRoleLabel, rolesPresent, type ProducerRoleCounts } from '~~/shared/producers.ts'
import { variantKindLabel } from '~~/shared/song-variants.ts'

const route = useRoute()
const { catalog, error, pending, load } = useCatalog()
const { localizePlace } = usePlaceNames()
const { localizeSeries, localizePerformanceSeries } = useSeriesTitles()
const { locale, t } = useLocale()
const flags = useProducerFlags()

/** Checked variant list; rows whose song is a variant of another carry its kind. */
const variants = useSongVariants()

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

/** Aggregated producers; the page reads exactly the index the ranking shows, labels included. */
const index = computed(() => (catalog.value ? buildProducerIndex(catalog.value, { flags, variants }) : null))

/** Exact-name lookup; null while loading or when the name is not in the catalog. */
const producer = computed(() => index.value?.byName.get(producerName.value) ?? null)

/** Localized flag of a label or collaborator page; null for an ordinary producer. */
const kindBadge = computed(() => {
  const kind = producer.value?.kind
  if (kind === 'label') return t('producers.kindLabel')
  if (kind === 'support') return t('producers.kindSupport')
  return null
})

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
    { label: t('col.songCount'), value: row.songCount },
    { label: t('col.performedSongCount'), value: row.performedSongCount },
    { label: t('col.appearanceCount'), value: row.appearanceCount },
    { label: t('col.performanceCount'), value: row.performanceCount },
    { label: t('col.shows'), value: row.showCount },
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
  return rolesPresent(roles).map((role) => ({ label: producerRoleLabel(role, locale.value), count: roles[role] }))
})

/** One row of the 署名曲目 table. */
type SongView = {
  songId: number
  name: string
  publishYear: number | null
  showCount: number
  /** Localized badge text for a variant row; null on the canonical row. */
  variantLabel: string | null
  /** Curator note shown as the badge tooltip; null when the entry has none. */
  variantNote: string | null
}

/** Credited songs, most-performed first, exactly as the aggregation ordered them. */
const songRows = computed<SongView[]>(() =>
  (producer.value?.songs ?? []).map((song) => ({
    songId: song.songId,
    name: song.name,
    publishYear: song.publishYear,
    showCount: song.showCount,
    variantLabel: song.variantKind === null ? null : variantKindLabel(song.variantKind, locale.value),
    variantNote: song.variantNote,
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
      seriesLabel: series === undefined ? t('series.seriesFallback', { id: performance.series_id }) : localizeSeries(series.name),
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

const songColumns = computed<TableColumn<SongView>[]>(() => [
  { accessorKey: 'name', header: sortableHeader(t('col.songTitle')), enableSorting: true },
  { accessorKey: 'publishYear', header: sortableHeader(t('col.publishYear')), enableSorting: true },
  { accessorKey: 'showCount', header: sortableHeader(t('col.shows')), enableSorting: true },
])

const appearanceColumns = computed<TableColumn<AppearanceView>[]>(() => [
  { accessorKey: 'date', header: sortableHeader(t('col.date')), enableSorting: true },
  { accessorKey: 'seriesLabel', header: sortableHeader(t('col.series')), enableSorting: true, meta: { class: { td: 'max-w-32' } } },
  { accessorKey: 'performanceLabel', header: sortableHeader(t('col.performance')), enableSorting: true, meta: { class: { td: 'max-w-[260px]' } } },
  { id: 'songs', header: t('col.songs'), accessorFn: (row) => row.songs.map((song) => song.name).join('、'), meta: { class: { td: 'max-w-[280px]' } } },
])

/** Blank marker for a missing value. */
const cell = (value: string | number | null): string => (value === null || value === '' ? '—' : String(value))

useHead({ title: computed(() => producer.value?.name ?? producerName.value ?? t('producers.breadcrumb')) })
</script>

<template>
  <main class="space-y-6">
    <PageSkeleton v-if="pending" />
    <UAlert v-else-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UEmpty
      v-else-if="catalog && !producer"
      icon="i-lucide-user-x"
      :title="t('producers.notFound')"
      :description="t('producers.notFoundDesc')"
    />

    <template v-else-if="producer">
      <UBreadcrumb
        :items="[
          { label: t('producers.breadcrumb'), to: '/producers' },
          { label: producer.name },
        ]"
      />

      <header class="space-y-3">
        <h1 class="text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
          {{ producer.name }}
        </h1>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <UBadge v-if="kindBadge" color="neutral" variant="subtle">{{ kindBadge }}</UBadge>
          <UBadge
            v-for="fact in facts"
            :key="fact.label"
            color="primary"
            variant="subtle"
          >
            {{ fact.label }} {{ fact.value }}
          </UBadge>
          <UBadge color="neutral" variant="subtle">{{ t('producers.yearSpan', { span: yearSpan }) }}</UBadge>
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
          {{ t('producers.roles') }}
          <span class="text-highlighted">
            {{ roleFacts.map((role) => `${role.label} ${role.count}`).join(' · ') }}
          </span>
        </p>
      </header>

      <TableSection
        v-if="catalog || pending"
        :title="t('producers.signedSongs')"
        :count="t('common.songs', { n: songRows.length })"
        :note="t('producers.signedSongsNote')"
        :fill="false"
        v-model:sorting="songSorting"
        :data="songRows"
        :columns="songColumns"
        :loading="pending"
        empty-icon="i-lucide-music"
        :empty-title="t('producers.noSongs')"
        :empty-description="t('producers.noSongsDesc')"
      >
        <template #name-cell="{ row }">
          <span class="inline-flex items-center gap-x-2">
            <NuxtLink :to="`/songs/${row.original.songId}`" class="text-highlighted no-underline hover:text-primary">
              <SongTitle :song-id="row.original.songId" :original="row.original.name" />
            </NuxtLink>
            <UTooltip
              v-if="row.original.variantLabel"
              :text="row.original.variantNote ?? ''"
              :disabled="!row.original.variantNote"
              :content="{ side: 'top' }"
            >
              <UBadge color="secondary" variant="subtle" size="sm" class="shrink-0">
                {{ row.original.variantLabel }}
              </UBadge>
            </UTooltip>
          </span>
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
        :title="t('producers.appearances')"
        :count="t('common.performances', { n: appearances.length })"
        :note="t('producers.appearancesNote')"
        :fill="false"
        v-model:sorting="appearanceSorting"
        :data="appearances"
        :columns="appearanceColumns"
        :loading="pending"
        empty-icon="i-lucide-calendar-x"
        :empty-title="t('producers.noAppearances')"
        :empty-description="t('producers.noAppearancesDesc')"
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
                <span v-if="index > 0" class="shrink-0 text-muted">{{ t('setlist.join') }}</span>
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
