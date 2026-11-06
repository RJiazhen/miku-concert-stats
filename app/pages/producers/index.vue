<script setup lang="ts">
import { computed, h, onMounted, ref, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useCatalog } from '~/composables/useCatalog.ts'
import { useRankingTableHeight } from '~/composables/useRankingTableHeight.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import {
  buildProducerIndex,
  producerPath,
  producerRoleLabels,
  rankProducers,
  rolesPresent,
  type ProducerRow,
} from '~~/shared/producers.ts'

const UButton = resolveComponent('UButton')

const { catalog, error, pending, load } = useCatalog()
const { songById } = useSongLookup()
const { tableAnchor, tableStyle } = useRankingTableHeight()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

/** Name filter, applied over the already aggregated rows. */
const query = ref('')

/** Aggregated producers, ranked under the default 曲目数 order. */
const index = computed(() => (catalog.value ? buildProducerIndex(catalog.value) : null))

/** A producer row plus its position under the default order and the text the table prints. */
type RankedProducer = {
  rank: number
  name: string
  songCount: number
  performedSongCount: number
  appearanceCount: number
  performanceCount: number
  showCount: number
  firstYear: number | null
  lastYear: number | null
  rolesText: string
  topSongs: { id: number; name: string }[]
}

/** Song names behind the 代表作 links, kept out of the sort key. */
const topSongsOf = (row: ProducerRow): { id: number; name: string }[] =>
  row.topSongIds.map((id) => ({ id, name: songById(id)?.name ?? String(id) }))

const rows = computed<RankedProducer[]>(() => {
  const ordered = index.value === null ? [] : rankProducers(index.value.rows, 'songCount')
  return ordered.map((row, position) => ({
    rank: position + 1,
    name: row.name,
    songCount: row.songCount,
    performedSongCount: row.performedSongCount,
    appearanceCount: row.appearanceCount,
    performanceCount: row.performanceCount,
    showCount: row.showCount,
    firstYear: row.firstYear,
    lastYear: row.lastYear,
    rolesText: rolesPresent(row.roles).map((role) => producerRoleLabels[role]).join('、') || '—',
    topSongs: topSongsOf(row),
  }))
})

/** Rows left after the name search; a blank query keeps everything. */
const filtered = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  if (needle === '') return rows.value
  return rows.value.filter((row) => row.name.toLocaleLowerCase().includes(needle))
})

/** Distinct songs credited by at least one producer, and how many of them were performed. */
const totals = computed(() => {
  const all = index.value?.rows ?? []
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

/** Sortable header button, matching the song and city rankings. */
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

const columns: TableColumn<RankedProducer>[] = [
  { accessorKey: 'rank', header: sortableHeader('名次'), enableSorting: true },
  { accessorKey: 'name', header: sortableHeader('制作人'), enableSorting: true },
  { accessorKey: 'songCount', header: sortableHeader('曲目数'), enableSorting: true },
  { accessorKey: 'performedSongCount', header: sortableHeader('演出曲目'), enableSorting: true },
  { accessorKey: 'appearanceCount', header: sortableHeader('表演次数'), enableSorting: true },
  { accessorKey: 'performanceCount', header: sortableHeader('演出数'), enableSorting: true },
  { accessorKey: 'showCount', header: sortableHeader('场次'), enableSorting: true },
  { accessorKey: 'firstYear', header: sortableHeader('最早年份'), enableSorting: true },
  { accessorKey: 'lastYear', header: sortableHeader('最晚年份'), enableSorting: true },
  { accessorKey: 'rolesText', header: '主要角色', enableSorting: false },
  { accessorKey: 'topSongs', header: '代表作', enableSorting: false },
]

/** Blank marker for a missing value. */
const cell = (value: number | null): string => (value === null ? '—' : String(value))
</script>

<template>
  <main class="space-y-6">
    <section class="pt-4 sm:pt-8">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Hatsune Miku Concert Statistics</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-5xl">
        制作人<br class="sm:hidden">排行榜
      </h1>
      <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <UBadge color="primary" variant="subtle" icon="i-lucide-user-round">{{ totals.producers }} 位制作人</UBadge>
        <UBadge color="neutral" variant="subtle">{{ totals.songs }} 首署名曲目</UBadge>
        <UBadge color="neutral" variant="subtle">{{ totals.performed }} 首上过演唱会</UBadge>
        <UButton to="/" color="neutral" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">查看曲目排行</UButton>
      </div>
    </section>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="目录加载失败"
      :description="error"
    />

    <section v-else class="space-y-3">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="text-lg font-semibold text-highlighted">
          排行
          <span class="ml-1 text-sm font-normal text-muted">{{ filtered.length }} 位</span>
        </h2>
        <label class="flex items-center gap-2 text-xs text-muted">
          搜索制作人
          <UInput v-model="query" icon="i-lucide-search" size="sm" class="w-44" autocomplete="off" />
        </label>
      </div>

      <ul class="grid gap-1 text-xs leading-relaxed text-muted">
        <li>「曲目数」：有署名的不同歌曲数，不同版本分别计数；</li>
        <li>「演出曲目」：其中至少上过一场演唱会的歌曲数；</li>
        <li>「表演次数」按场次累计，「演出数」每场演出计一次，「场次」按天计数、日场 / 夜场分开。</li>
      </ul>

      <UTable
        v-if="catalog"
        ref="tableAnchor"
        v-model:sorting="sorting"
        :data="filtered"
        :columns="columns"
        :loading="pending"
        sticky
        class="ranking-scroll"
        :style="tableStyle"
        :ui="{ th: 'px-3 py-2.5', td: 'px-3 py-2.5' }"
      >
        <template #rank-cell="{ row }">
          <span class="font-mono text-muted">{{ row.original.rank }}</span>
        </template>
        <template #name-cell="{ row }">
          <NuxtLink :to="producerPath(row.original.name)" class="text-highlighted no-underline hover:text-primary">
            {{ row.original.name }}
          </NuxtLink>
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
        <template #rolesText-cell="{ row }">
          <span class="text-xs text-muted">{{ row.original.rolesText }}</span>
        </template>
        <template #topSongs-cell="{ row }">
          <ul v-if="row.original.topSongs.length > 0" class="space-y-0.5">
            <li v-for="song in row.original.topSongs" :key="song.id" class="min-w-0">
              <NuxtLink :to="`/songs/${song.id}`" class="block max-w-40 truncate text-xs text-primary no-underline hover:underline">
                <SongTitle :song-id="song.id" :original="song.name" truncate />
              </NuxtLink>
            </li>
          </ul>
          <span v-else class="text-muted">—</span>
        </template>
        <template #empty>
          <UEmpty
            icon="i-lucide-user-x"
            title="没有符合条件的制作人"
            description="换一个更短的名字。"
            variant="naked"
          />
        </template>
      </UTable>
      <USkeleton v-else class="h-72 w-full rounded-xl" />
    </section>
  </main>
</template>
