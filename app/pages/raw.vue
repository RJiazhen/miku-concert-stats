<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useCatalog } from '~/composables/useCatalog.ts'
import { useSongVariants } from '~/composables/useSongVariants.ts'
import { useSetlistMerges } from '~/composables/useSetlistMerges.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import { buildSetlistDisplay, displaySides } from '~~/shared/edition-setlists.ts'
import { albumSetlistSources } from '~~/shared/album-setlists.ts'
import { formatRotationReason, reviewRotations } from '~~/shared/rotation.ts'
import { countedSongIds } from '~~/shared/stats.ts'
import { useRawTables } from '~/composables/useRawTables.ts'
import { useRawQuality } from '~/composables/useRawQuality.ts'
import { useLocale } from '~/composables/useLocale.ts'

const { catalog, error, pending, load } = useCatalog()
const variants = useSongVariants()
const merges = useSetlistMerges()
const { songName, songHref, vocadbSongUrl } = useSongLookup()
const { locale, t } = useLocale()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const review = computed(() => (catalog.value ? reviewRotations(catalog.value) : null))
const { tables, pageSize, limitOf, showMore } = useRawTables(catalog, variants, { songName, songHref, vocadbSongUrl })
const {
  songsWithoutVideo,
  incompletePerformances,
  albumFallbackPerformances,
  albumFallbackLists,
  listsWithoutAnnouncement,
  uncertainLines,
  mismatchedShows,
  duplicateCandidates,
  qualitySummary,
} = useRawQuality(catalog, variants, merges, review)

type Tab = 'edition' | 'shows' | 'tables' | 'quality'
const tab = ref<Tab>('edition')
const tabs = computed<{ value: Tab; label: string }[]>(() => [
  { value: 'edition', label: t('raw.tabEdition') },
  { value: 'shows', label: t('raw.tabShows') },
  { value: 'tables', label: t('raw.tabTables') },
  { value: 'quality', label: t('raw.tabQuality') },
])

/** Builds the series-year comparison view of the merged setlist. */
const editions = computed(() => {
  if (!catalog.value) return []
  return catalog.value.premieres
    .map((row) => {
      const series = catalog.value?.series.find((item) => item.id === row.series_id)
      return { key: `${row.series_id}:${row.series_number}`, label: `${series?.name ?? row.series_id} ${row.series_number}`, premiere: row }
    })
    .sort((left, right) => left.label.localeCompare(right.label, 'zh-Hans'))
})

type EditionItem = { label: string; value: string }

/** Chosen series year; empty means "the newest one". */
const chosenEditionKey = ref('')
const sideIndex = ref(0)

/** Options for the searchable series-year menu. */
const editionItems = computed<EditionItem[]>(() => editions.value.map((row) => ({ label: row.label, value: row.key })))

/** Newest series year, used until the visitor picks another one. */
const defaultEditionKey = computed(() => editions.value[editions.value.length - 1]?.key ?? '')

const editionKey = computed(() => chosenEditionKey.value || defaultEditionKey.value)
const selectedEdition = computed(() => editions.value.find((row) => row.key === editionKey.value) ?? null)

/** Displayed menu value, derived from the active series year. */
const editionModel = computed<EditionItem | undefined>(() => editionItems.value.find((item) => item.value === editionKey.value))

/** Stores the visitor's series-year choice. */
const selectEdition = (item: EditionItem | undefined): void => {
  chosenEditionKey.value = item?.value ?? ''
}

/** Song lists of the selected series year, split into merged groups and standalone lists. */
const sides = computed(() => {
  if (!catalog.value || !selectedEdition.value || !review.value) return []
  const [seriesIdText, numberText] = selectedEdition.value.key.split(':')
  const ids = new Set<number>()
  for (const performance of catalog.value.performances) {
    if (performance.series_id !== Number(seriesIdText) || performance.series_number !== Number(numberText)) continue
    if (performance.song_list_id !== null) ids.add(performance.song_list_id)
  }
  return displaySides([...ids], merges, review.value)
})

/** Side options: a merged group or one song list. */
const sideOptions = computed(() =>
  sides.value.map((side, index) => ({
    label: side.length > 1 ? t('raw.mergeSides', { n: side.length, list: side.join(' / ') }) : t('raw.setlistSide', { name: side[0] ?? '' }),
    value: index,
  })),
)

watch(sides, () => {
  sideIndex.value = 0
})

/** Explains why a list that belongs to a merge group is shown on its own. */
const splitNote = computed(() => {
  const side = sides.value[sideIndex.value]
  if (!side || side.length !== 1 || !review.value) return null
  const listId = side[0]
  if (listId === undefined || merges.groupOf(listId) === null) return null
  if (!review.value.shows.some((show) => show.songListId === listId)) return null
  return t('raw.lengthMismatch')
})

const display = computed(() => {
  if (!catalog.value || !review.value) return null
  const side = sides.value[sideIndex.value]
  if (!side || side.length === 0) return null
  return buildSetlistDisplay(catalog.value, review.value, side)
})

/** Album sources behind the raw comparison side. */
const albumSources = computed(() => {
  if (!catalog.value) return []
  const side = sides.value[sideIndex.value] ?? []
  return albumSetlistSources(catalog.value, side)
})

/** One row of the 场次歌单 table. */
type ShowSetlistRow = {
  performanceId: number
  name: string
  series: string
  startDate: string | null
  shows: number
  sourceRows: number
  status: string
  resolution: string
  change: string
  pendingReview: boolean
  conflict: boolean
  sources: number
}

/** Columns of the 场次歌单 table. */
const showSetlistColumns = computed<TableColumn<ShowSetlistRow>[]>(() => [
  { accessorKey: 'name', header: t('col.performance') },
  { accessorKey: 'series', header: t('col.series') },
  { accessorKey: 'startDate', header: t('col.date') },
  { accessorKey: 'shows', header: t('col.shows') },
  { accessorKey: 'sourceRows', header: t('col.sourceRows') },
  { id: 'status', header: t('col.status') },
  { accessorKey: 'resolution', header: t('col.resolution') },
  { accessorKey: 'sources', header: t('col.sources') },
])

/** Derived 演出 rows joined with their 场次 counts, grouped by series for the 场次歌单 tab. */
const showSetlists = computed<ShowSetlistRow[]>(() => {
  if (!catalog.value) return []
  const seriesName = new Map(catalog.value.series.map((row) => [row.id, row.name]))
  const showsByPerformance = new Map<number, number>()
  for (const row of catalog.value.performanceShowSetlists) {
    showsByPerformance.set(row.performance_id, (showsByPerformance.get(row.performance_id) ?? 0) + 1)
  }
  const sourceCount = new Map<number, number>()
  for (const row of catalog.value.performanceSetlistSources) {
    sourceCount.set(row.performance_id, (sourceCount.get(row.performance_id) ?? 0) + 1)
  }
  return catalog.value.performanceSetlists
    .map((row) => {
      const performance = catalog.value?.performances.find((entry) => entry.id === row.performance_id)
      return {
        performanceId: row.performance_id,
        name: performance?.name ?? String(row.performance_id),
        series: seriesName.get(performance?.series_id ?? 0) ?? '—',
        startDate: performance?.start_date ?? null,
        shows: showsByPerformance.get(row.performance_id) ?? 0,
        sourceRows: row.source_row_count,
        status: row.status,
        resolution: row.resolution,
        change: row.change,
        pendingReview: row.pending_review === 1,
        conflict: row.conflict === 1,
        sources: sourceCount.get(row.performance_id) ?? 0,
      }
    })
    .sort((left, right) => left.series.localeCompare(right.series, 'ja') || (left.startDate ?? '9999').localeCompare(right.startDate ?? '9999'))
})/** Download links for the raw files. */
const downloads = computed(() => [
  { label: t('raw.linkCatalog'), href: '/data/catalog.sqlite' },
  { label: t('raw.linkSchema'), href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/data/schema.sql' },
  { label: t('raw.linkIncrements'), href: 'https://github.com/RJiazhen/miku-concert-stats/tree/main/data/increments' },
  { label: t('raw.linkVariants'), href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/data/song-variants.json' },
  { label: t('raw.linkMerges'), href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/data/setlist-merges.json' },
  { label: t('raw.linkShowSetlists'), href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/data/performance-setlists.json' },
  { label: t('raw.linkReview'), href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/docs/reports/setlist-review.md' },
  { label: t('raw.linkZhTitles'), href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/data/song-titles.zh-CN.json' },
])

/** Song counts for one list, used in the year view header. */
const editionSongCount = computed(() => {
  if (!catalog.value || !selectedEdition.value) return 0
  const [seriesId, number] = selectedEdition.value.key.split(':')
  const listIds = catalog.value.performances
    .filter((row) => row.series_id === Number(seriesId) && row.series_number === Number(number) && row.song_list_id !== null)
    .map((row) => row.song_list_id as number)
  return countedSongIds(catalog.value, [...new Set(listIds)], variants).length
})

useHead({ title: computed(() => t('raw.title')) })
</script>

<template>
  <main class="space-y-6">
    <header class="space-y-3">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Raw Data</p>
      <h1 class="text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">{{ t('raw.title') }}</h1>
      <p class="max-w-3xl text-sm text-muted">
        {{ t('raw.description') }}
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="item in downloads"
          :key="item.label"
          :to="item.href"
          :target="item.href.startsWith('http') || item.href.endsWith('.sqlite') ? '_blank' : undefined"
          color="neutral"
          variant="outline"
          size="xs"
          trailing-icon="i-lucide-download"
        >
          {{ item.label }}
        </UButton>
      </div>
    </header>

    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />

    <UTabs
      v-model="tab"
      :items="tabs"
      :content="false"
      color="neutral"
      variant="pill"
      size="sm"
    />

    <section v-if="tab === 'edition'" class="space-y-4">
      <p class="text-xs text-muted">
        {{ t('raw.editionNote') }}
      </p>
      <UCard>
        <div class="flex flex-wrap items-end gap-3">
          <FilterField :label="t('raw.editionYear')">
            <USelectMenu
              :model-value="editionModel"
              :items="editionItems"
              by="value"
              search-input
              :placeholder="t('raw.editionYearPlaceholder')"
              size="sm"
              class="w-72"
              @update:model-value="selectEdition"
            />
          </FilterField>
          <FilterField :label="t('raw.editionRange')">
            <USelect v-model="sideIndex" :items="sideOptions" size="sm" class="w-72" />
          </FilterField>
          <p class="pb-2 text-xs text-muted">{{ t('raw.editionSongCount', { n: editionSongCount }) }}</p>
        </div>
      </UCard>
      <UAlert v-if="splitNote" color="warning" variant="subtle" icon="i-lucide-info" :description="splitNote" />
      <AlbumSetlistAlert :sources="albumSources" />
      <USkeleton v-if="pending" class="h-64 w-full rounded-xl" />
      <UEmpty
        v-else-if="!display"
        icon="i-lucide-list-x"
        :title="t('raw.editionEmptyTitle')"
        :description="t('raw.editionEmptyDesc')"
      />
      <SetlistTable v-else-if="display" :display="display" />
    </section>

    <section v-else-if="tab === 'shows'" class="space-y-4">
      <TableSection
        :title="t('raw.showsTitle')"
        :count="t('raw.showsCount', { n: showSetlists.length })"
        :note="t('raw.showsNote')"
        :fill="false"
        :data="showSetlists"
        :columns="showSetlistColumns"
        empty-icon="i-lucide-list-x"
        :empty-title="t('raw.showsEmptyTitle')"
        :empty-description="t('raw.showsEmptyDesc')"
      >
        <template #name-cell="{ row }">
          <NuxtLink :to="`/shows/${row.original.performanceId}`" class="text-primary">{{ row.original.name }}</NuxtLink>
          <span v-if="row.original.pendingReview" class="ml-1 text-warning">· {{ t('raw.pendingReview') }}</span>
          <span v-if="row.original.conflict" class="ml-1 text-error">· {{ t('raw.conflict') }}</span>
        </template>
        <template #series-cell="{ row }">
          <span class="text-muted">{{ row.original.series }}</span>
        </template>
        <template #startDate-cell="{ row }">
          <span class="text-muted">{{ row.original.startDate ?? t('common.unknownDate') }}</span>
        </template>
        <template #shows-cell="{ row }">
          <span class="tabular-nums text-muted">{{ row.original.shows }}</span>
        </template>
        <template #sourceRows-cell="{ row }">
          <span class="tabular-nums text-muted">{{ row.original.sourceRows }}</span>
        </template>
        <template #status-cell="{ row }">
          <span class="text-muted">{{ row.original.status }} / {{ row.original.change }}</span>
        </template>
        <template #resolution-cell="{ row }">
          <span class="text-muted">{{ row.original.resolution }}</span>
        </template>
        <template #sources-cell="{ row }">
          <span class="tabular-nums text-muted">{{ row.original.sources }}</span>
        </template>
      </TableSection>
    </section>

    <section v-else-if="tab === 'tables'" class="space-y-4">
      <UCard v-for="table in tables" :key="table.id">
        <template #header>
          <div class="flex items-baseline justify-between gap-2">
            <h2 class="text-base font-semibold text-highlighted">{{ table.label }}</h2>
            <span class="text-xs text-muted">
              {{ t('raw.rows', { n: table.rows.length }) }}
              <template v-if="table.rows.length > pageSize">{{ t('raw.showingFirst', { n: Math.min(limitOf(table.id), table.rows.length) }) }}</template>
            </span>
          </div>
        </template>
        <p v-if="table.rows.length === 0" class="text-sm text-muted">{{ t('raw.tableEmpty') }}</p>
        <div v-else class="overflow-x-auto">
          <table class="w-max min-w-full whitespace-nowrap text-sm">
            <thead class="text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th v-for="header in table.headers" :key="header" class="px-2 py-1.5 font-medium whitespace-nowrap">{{ header }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in table.rows.slice(0, limitOf(table.id))" :key="index" class="border-t border-default/40">
                <td v-for="(cell, cellIndex) in row" :key="cellIndex" class="px-2 py-1.5 align-top">
                  <CharacterChips v-if="cell.chips && cell.chips.length > 0" :names="cell.chips" />
                  <ULink v-else-if="cell.href" :to="cell.href" target="_blank" class="text-primary">{{ cell.text }}</ULink>
                  <span v-else class="text-muted">{{ cell.text }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <template v-if="table.rows.length > limitOf(table.id)" #footer>
          <UButton color="neutral" variant="outline" size="xs" @click="showMore(table.id)">{{ t('common.more') }}</UButton>
        </template>
      </UCard>
    </section>

    <section v-else class="space-y-4">
      <UCard>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div v-for="item in qualitySummary" :key="item.label" class="rounded-lg bg-elevated/40 p-3">
            <p class="text-xs text-muted">{{ item.label }}</p>
            <p class="text-xl font-semibold text-highlighted">{{ item.value }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">{{ t('raw.uncertainTitle') }}</h2>
        </template>
        <p class="text-sm text-muted">{{ t('raw.uncertainLine', { lines: uncertainLines.length, shows: mismatchedShows.length }) }}</p>
        <div v-if="mismatchedShows.length > 0" class="mt-3 space-y-1 text-sm">
          <p v-for="show in mismatchedShows.slice(0, 10)" :key="show.performanceId" class="text-muted">
            <NuxtLink :to="`/shows/${show.performanceId}`" class="text-primary">{{ t('raw.performanceLink', { id: show.performanceId }) }}</NuxtLink>
            · {{ t('raw.colSongList') }} {{ show.songListId }} · {{ show.reasons.map((reason) => formatRotationReason(reason, locale)).join(t('setlist.join')) }}
          </p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">{{ t('raw.duplicatesTitle') }}</h2>
        </template>
        <p class="text-sm text-muted">
          {{ t('raw.duplicatesNote') }}
          <ULink to="https://github.com/RJiazhen/miku-concert-stats/blob/main/data/song-variants.json" target="_blank" class="text-primary">{{ t('raw.linkVariants') }}</ULink>.
        </p>
        <ul class="mt-3 space-y-2 text-sm">
          <li v-for="group in duplicateCandidates.slice(0, 40)" :key="group.key">
            <span class="text-highlighted">{{ group.key }}</span>
            <span class="text-muted">
              <template v-for="(song, index) in group.songs" :key="song.id">
                <span v-if="index > 0"> · </span>
                <ULink :to="songHref(song.id)" class="text-primary">{{ song.id }} {{ song.name }}</ULink>
                <ULink
                  v-if="vocadbSongUrl(song.id)"
                  :to="vocadbSongUrl(song.id) ?? ''"
                  target="_blank"
                  class="ml-1 text-dimmed hover:text-primary"
                  aria-label="VocaDB"
                >
                  <UIcon name="i-lucide-external-link" class="size-3" />
                </ULink>
              </template>
            </span>
          </li>
        </ul>
        <p v-if="duplicateCandidates.length === 0" class="mt-2 text-sm text-muted">{{ t('raw.noCandidates') }}</p>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">{{ t('raw.missingTitle') }}</h2>
        </template>
        <div class="space-y-2 text-sm text-muted">
          <p>{{ t('raw.songsWithoutVideo', { n: songsWithoutVideo.length }) }}</p>
          <p>{{ t('raw.incompletePerformances', { n: incompletePerformances.length }) }}</p>
          <p>
            {{ t('raw.albumFallback', { performances: albumFallbackPerformances.length, albums: albumFallbackLists }) }}
            {{ t('raw.albumFallbackNote') }}
          </p>
          <p>{{ t('raw.listsWithoutAnnouncement', { n: listsWithoutAnnouncement.length }) }}</p>
          <p>{{ t('raw.medleyQuarantine', { n: catalog?.medleyQuarantine.length ?? 0 }) }}</p>
        </div>
      </UCard>
    </section>
  </main>
</template>
