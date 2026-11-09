<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useCatalog } from '~/composables/useCatalog.ts'
import { useProducerFlags } from '~/composables/useProducerFlags.ts'
import { useSortableHeader } from '~/composables/useSortableHeader.ts'
import { useLocale } from '~/composables/useLocale.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import {
  buildProducerIndex,
  producerPath,
  rankProducers,
  type ProducerRow,
} from '~~/shared/producers.ts'

const { catalog, error, pending, load } = useCatalog()
const { songById } = useSongLookup()
const { t } = useLocale()
const flags = useProducerFlags()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

/** Name filter, applied over the already aggregated rows. */
const query = ref('')

/** Show label / studio / group credits too; off by default so they never rank. */
const includeLabels = ref(false)

/** Aggregated producers; `rows` also carries the flagged labels. */
const index = computed(() => (catalog.value ? buildProducerIndex(catalog.value, { flags }) : null))

/** Rows the table ranks: the counted producers, plus labels once the switch is on. */
const visibleRows = computed<ProducerRow[]>(() => {
  const current = index.value
  if (current === null) return []
  return includeLabels.value ? current.rows : current.countedRows
})

/** How many flagged labels the switch can add; 0 hides the switch entirely. */
const labelCount = computed(() => (index.value === null ? 0 : index.value.rows.length - index.value.countedRows.length))

/** A producer row plus its position under the default order and the text the table prints. */
type RankedProducer = {
  rank: number
  name: string
  /** Checked flag; `label` rows only appear behind the switch and carry a badge. */
  kind: ProducerRow['kind']
  songCount: number
  performedSongCount: number
  appearanceCount: number
  performanceCount: number
  showCount: number
  firstYear: number | null
  lastYear: number | null
  topSong: { id: number; name: string } | null
}

/** Song name behind the 代表作 link, kept out of the sort key. */
const topSongOf = (row: ProducerRow): { id: number; name: string } | null => {
  const id = row.topSongId
  return id === null ? null : { id, name: songById(id)?.name ?? String(id) }
}

const rows = computed<RankedProducer[]>(() => {
  const ordered = rankProducers(visibleRows.value, 'songCount')
  return ordered.map((row, position) => ({
    rank: position + 1,
    name: row.name,
    kind: row.kind,
    songCount: row.songCount,
    performedSongCount: row.performedSongCount,
    appearanceCount: row.appearanceCount,
    performanceCount: row.performanceCount,
    showCount: row.showCount,
    firstYear: row.firstYear,
    lastYear: row.lastYear,
    topSong: topSongOf(row),
  }))
})

/** Rows left after the name search; a blank query keeps everything. */
const filtered = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  if (needle === '') return rows.value
  return rows.value.filter((row) => row.name.toLocaleLowerCase().includes(needle))
})

/** Distinct songs credited by at least one visible producer, and how many of them were performed. */
const totals = computed(() => {
  const all = visibleRows.value
  const songs = new Set<number>()
  const performed = new Set<number>()
  for (const row of all) {
    for (const id of row.songIds) songs.add(id)
    for (const id of row.performedSongIds) performed.add(id)
  }
  return { producers: all.length, songs: songs.size, performed: performed.size }
})

/** Default order: most credited songs first. */
const sorting = ref<{ id: string; desc: boolean }[]>([{ id: 'songCount', desc: true }])

/** Sortable header button, shared with every other table on the site. */
const sortableHeader = useSortableHeader()

const columns: TableColumn<RankedProducer>[] = [
  { accessorKey: 'rank', header: sortableHeader(t('col.rank')), enableSorting: true },
  { accessorKey: 'name', header: sortableHeader(t('producers.breadcrumb')), enableSorting: true },
  { accessorKey: 'songCount', header: sortableHeader(t('col.songCount')), enableSorting: true },
  { accessorKey: 'performedSongCount', header: sortableHeader(t('col.performedSongCount')), enableSorting: true },
  { accessorKey: 'appearanceCount', header: sortableHeader(t('col.appearanceCount')), enableSorting: true },
  { accessorKey: 'performanceCount', header: sortableHeader(t('col.performanceCountShort')), enableSorting: true },
  { accessorKey: 'showCount', header: sortableHeader(t('col.shows')), enableSorting: true },
  { accessorKey: 'firstYear', header: sortableHeader(t('col.firstYear')), enableSorting: true },
  { accessorKey: 'lastYear', header: sortableHeader(t('col.lastYear')), enableSorting: true },
  { accessorKey: 'topSong', header: t('col.topSongs'), enableSorting: false },
]

/** Blank marker for a missing value. */
const cell = (value: number | null): string => (value === null ? '—' : String(value))

/** Localized badge of a flagged row; null for a core producer. */
const kindLabelOf = (kind: ProducerRow['kind']): string | null => {
  if (kind === 'label') return t('producers.kindLabel')
  if (kind === 'support') return t('producers.kindSupport')
  return null
}

useHead({ title: computed(() => t('producers.indexTitle')) })
</script>

<template>
  <main class="space-y-6">
    <section class="pt-4 sm:pt-8">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Hatsune Miku Concert Statistics</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-5xl">
        {{ t('producers.heading1') }}<br class="sm:hidden">{{ t('producers.heading2') }}
      </h1>
      <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <UBadge color="primary" variant="subtle" icon="i-lucide-user-round">{{ t('common.producers', { n: totals.producers }) }}</UBadge>
        <UBadge color="neutral" variant="subtle">{{ t('producers.creditedSongs', { n: totals.songs }) }}</UBadge>
        <UBadge color="neutral" variant="subtle">{{ t('producers.performedSongs', { n: totals.performed }) }}</UBadge>
        <UButton to="/" color="neutral" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">{{ t('producers.viewRanking') }}</UButton>
      </div>
    </section>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('common.catalogError')"
      :description="error"
    />

    <TableSection
      v-if="catalog || pending"
      :title="t('producers.tableTitle')"
      :count="t('common.producers', { n: filtered.length })"
      v-model:sorting="sorting"
      :data="filtered"
      :columns="columns"
      :loading="pending"
      empty-icon="i-lucide-user-x"
      :empty-title="t('producers.emptyTitle')"
      :empty-description="t('producers.emptyDesc')"
    >
      <template #note>
        <div class="grid items-start gap-x-6 gap-y-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <ul class="row-span-2 grid gap-1 text-xs leading-relaxed text-muted">
            <li>{{ t('producers.noteSongs') }}</li>
            <li>{{ t('producers.notePerformed') }}</li>
            <li>{{ t('producers.noteCounts') }}</li>
          </ul>
          <FilterField :label="t('producers.filter')" class="justify-self-end">
            <UInput v-model="query" icon="i-lucide-search" size="sm" class="w-44" autocomplete="off" />
          </FilterField>
          <UCheckbox
            v-if="labelCount > 0"
            v-model="includeLabels"
            :label="t('producers.includeLabels', { n: labelCount })"
            class="justify-self-end self-start text-xs"
            size="sm"
          />
        </div>
      </template>
      <template #rank-cell="{ row }">
        <span class="font-mono text-muted">{{ row.original.rank }}</span>
      </template>
      <template #name-cell="{ row }">
        <span class="inline-flex items-center gap-1.5">
          <NuxtLink :to="producerPath(row.original.name)" class="text-highlighted no-underline hover:text-primary">
            {{ row.original.name }}
          </NuxtLink>
          <UBadge v-if="kindLabelOf(row.original.kind)" color="neutral" variant="subtle" size="sm">{{ kindLabelOf(row.original.kind) }}</UBadge>
        </span>
      </template>
      <template #songCount-cell="{ row }">
        <UBadge color="primary" variant="subtle">{{ row.original.songCount }}</UBadge>
      </template>
      <template #performedSongCount-cell="{ row }">
        <span class="tabular-nums text-muted">{{ row.original.performedSongCount }}</span>
      </template>
      <template #appearanceCount-cell="{ row }">
        <span class="tabular-nums text-muted">{{ row.original.appearanceCount }}</span>
      </template>
      <template #performanceCount-cell="{ row }">
        <span class="tabular-nums text-muted">{{ row.original.performanceCount }}</span>
      </template>
      <template #showCount-cell="{ row }">
        <span class="tabular-nums text-muted">{{ row.original.showCount }}</span>
      </template>
      <template #firstYear-cell="{ row }">
        <span class="tabular-nums text-muted">{{ cell(row.original.firstYear) }}</span>
      </template>
      <template #lastYear-cell="{ row }">
        <span class="tabular-nums text-muted">{{ cell(row.original.lastYear) }}</span>
      </template>
      <template #topSong-cell="{ row }">
        <NuxtLink
          v-if="row.original.topSong"
          :to="`/songs/${row.original.topSong.id}`"
          class="block max-w-40 truncate text-xs text-primary no-underline hover:underline"
        >
          <SongTitle :song-id="row.original.topSong.id" :original="row.original.topSong.name" truncate />
        </NuxtLink>
        <span v-else class="text-muted">—</span>
      </template>
    </TableSection>
  </main>
</template>
