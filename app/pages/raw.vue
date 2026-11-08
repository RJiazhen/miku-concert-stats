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

const { catalog, error, pending, load } = useCatalog()
const variants = useSongVariants()
const merges = useSetlistMerges()
const { songName, songHref, vocadbSongUrl } = useSongLookup()

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
const tabs: { value: Tab; label: string }[] = [
  { value: 'edition', label: '跨演出歌单' },
  { value: 'shows', label: '场次歌单' },
  { value: 'tables', label: '数据表' },
  { value: 'quality', label: '质量报告' },
]

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
    label: side.length > 1 ? `合并 ${side.length} 份歌单（${side.join(' / ')}）` : `歌单 ${side[0] ?? ''}`,
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
  return '这个演出的歌单长度与同组其他演出不一致，因此单独显示，不与它们合并。'
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
const showSetlistColumns: TableColumn<ShowSetlistRow>[] = [
  { accessorKey: 'name', header: '演出' },
  { accessorKey: 'series', header: '系列' },
  { accessorKey: 'startDate', header: '日期' },
  { accessorKey: 'shows', header: '场次' },
  { accessorKey: 'sourceRows', header: '源行数' },
  { id: 'status', header: '状态' },
  { accessorKey: 'resolution', header: '归属方式' },
  { accessorKey: 'sources', header: '来源' },
]

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
const downloads = [
  { label: '目录 SQLite', href: '/data/catalog.sqlite' },
  { label: '表结构 schema.sql', href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/data/schema.sql' },
  { label: '增量 SQL', href: 'https://github.com/RJiazhen/miku-concert-stats/tree/main/data/increments' },
  { label: '版本合并清单', href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/data/song-variants.json' },
  { label: '歌单合并清单', href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/data/setlist-merges.json' },
  { label: '场次歌单来源', href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/data/performance-setlists.json' },
  { label: '待确认清单', href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/docs/reports/setlist-review.md' },
  { label: '中文歌名', href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/data/song-titles.zh-CN.json' },
]

/** Song counts for one list, used in the year view header. */
const editionSongCount = computed(() => {
  if (!catalog.value || !selectedEdition.value) return 0
  const [seriesId, number] = selectedEdition.value.key.split(':')
  const listIds = catalog.value.performances
    .filter((row) => row.series_id === Number(seriesId) && row.series_number === Number(number) && row.song_list_id !== null)
    .map((row) => row.song_list_id as number)
  return countedSongIds(catalog.value, [...new Set(listIds)], variants).length
})

useHead({ title: '原始数据' })
</script>

<template>
  <main class="space-y-6">
    <header class="space-y-3">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Raw Data</p>
      <h1 class="text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">原始数据</h1>
      <p class="max-w-3xl text-sm text-muted">
        每一行都来自 VocaDB 公共 API，并附上可核验的链接。
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
        同一系列年度的多个演出并排对照；它们各自独立，不是一场演出。
      </p>
      <UCard>
        <div class="flex flex-wrap items-end gap-3">
          <FilterField label="系列年度">
            <USelectMenu
              :model-value="editionModel"
              :items="editionItems"
              by="value"
              search-input
              placeholder="选择系列年度"
              size="sm"
              class="w-72"
              @update:model-value="selectEdition"
            />
          </FilterField>
          <FilterField label="显示范围">
            <USelect v-model="sideIndex" :items="sideOptions" size="sm" class="w-72" />
          </FilterField>
          <p class="pb-2 text-xs text-muted">{{ editionSongCount }} 首（合并版本后去重）</p>
        </div>
      </UCard>
      <UAlert v-if="splitNote" color="warning" variant="subtle" icon="i-lucide-info" :description="splitNote" />
      <AlbumSetlistAlert :sources="albumSources" />
      <USkeleton v-if="pending" class="h-64 w-full rounded-xl" />
      <UEmpty
        v-else-if="!display"
        icon="i-lucide-list-x"
        title="这个系列年度没有歌单"
        description="VocaDB 上没有记录歌单，或这个演出没有关联歌单。"
      />
      <SetlistTable v-else-if="display" :display="display" />
    </section>

    <section v-else-if="tab === 'shows'" class="space-y-4">
      <TableSection
        title="场次歌单"
        :count="`${showSetlists.length} 个演出`"
        note="每个演出派生出的场次歌单，点演出席名可进入该演出的歌单页。"
        :fill="false"
        :data="showSetlists"
        :columns="showSetlistColumns"
        empty-icon="i-lucide-list-x"
        empty-title="没有场次歌单"
        empty-description="目录里还没有派生的场次数据。"
      >
        <template #name-cell="{ row }">
          <NuxtLink :to="`/shows/${row.original.performanceId}`" class="text-primary">{{ row.original.name }}</NuxtLink>
          <span v-if="row.original.pendingReview" class="ml-1 text-warning">· 待复核</span>
          <span v-if="row.original.conflict" class="ml-1 text-error">· 冲突</span>
        </template>
        <template #series-cell="{ row }">
          <span class="text-muted">{{ row.original.series }}</span>
        </template>
        <template #startDate-cell="{ row }">
          <span class="text-muted">{{ row.original.startDate ?? '日期未知' }}</span>
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
              {{ table.rows.length }} 行
              <template v-if="table.rows.length > pageSize">· 显示前 {{ Math.min(limitOf(table.id), table.rows.length) }}</template>
            </span>
          </div>
        </template>
        <p v-if="table.rows.length === 0" class="text-sm text-muted">这张表没有数据。</p>
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
          <UButton color="neutral" variant="outline" size="xs" @click="showMore(table.id)">显示更多</UButton>
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
          <h2 class="text-base font-semibold text-highlighted">未解析的备注与长度不一致的演出</h2>
        </template>
        <p class="text-sm text-muted">{{ uncertainLines.length }} 行备注无法确定到具体演出，{{ mismatchedShows.length }} 个演出的歌单长度与该歌单的常见长度不一致。</p>
        <div v-if="mismatchedShows.length > 0" class="mt-3 space-y-1 text-sm">
          <p v-for="show in mismatchedShows.slice(0, 10)" :key="show.performanceId" class="text-muted">
            <NuxtLink :to="`/shows/${show.performanceId}`" class="text-primary">演出 {{ show.performanceId }}</NuxtLink>
            · 歌单 {{ show.songListId }} · {{ show.reasons.map(formatRotationReason).join('；') }}
          </p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">疑似重复但未合并</h2>
        </template>
        <p class="text-sm text-muted">
          去掉括号与版本后缀后同名的歌曲。确认是同一首歌后，写入
          <ULink to="https://github.com/RJiazhen/miku-concert-stats/blob/main/data/song-variants.json" target="_blank" class="text-primary">版本合并清单</ULink>。
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
                  aria-label="在 VocaDB 查看"
                >
                  <UIcon name="i-lucide-external-link" class="size-3" />
                </ULink>
              </template>
            </span>
          </li>
        </ul>
        <p v-if="duplicateCandidates.length === 0" class="mt-2 text-sm text-muted">没有候选。</p>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">缺数据的记录</h2>
        </template>
        <div class="space-y-2 text-sm text-muted">
          <p>没有投稿链接的歌曲：{{ songsWithoutVideo.length }} 首</p>
          <p>没有歌单或开始日期的演出：{{ incompletePerformances.length }} 个</p>
          <p>
            用专辑曲目代替歌单的演出：{{ albumFallbackPerformances.length }} 个（{{ albumFallbackLists }} 张专辑）。
            这些曲目不是 VocaDB 上该演出的歌单，演出页与系列年度索引会标注来源。
          </p>
          <p>没有公布时间的歌单：{{ listsWithoutAnnouncement.length }} 份（公开 API 没有该字段）</p>
          <p>未拆分的串烧：{{ catalog?.medleyQuarantine.length ?? 0 }} 行</p>
        </div>
      </UCard>
    </section>
  </main>
</template>
