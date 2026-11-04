<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCatalog } from '~/composables/useCatalog.ts'
import { useSongVariants } from '~/composables/useSongVariants.ts'
import { useSetlistMerges } from '~/composables/useSetlistMerges.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import { buildSetlistDisplay, displaySides } from '~~/shared/edition-setlists.ts'
import { reviewRotations } from '~~/shared/rotation.ts'
import { countedSongIds } from '~~/shared/stats.ts'

const { catalog, error, pending, load } = useCatalog()
const variants = useSongVariants()
const merges = useSetlistMerges()
const { songName } = useSongLookup()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const review = computed(() => (catalog.value ? reviewRotations(catalog.value) : null))

type Tab = 'edition' | 'tables' | 'quality'
const tab = ref<Tab>('edition')
const tabs: { value: Tab; label: string }[] = [
  { value: 'edition', label: '按年版歌单' },
  { value: 'tables', label: '数据表' },
  { value: 'quality', label: '质量报告' },
]

/** Switches the raw-data view. */
const setTab = (value: Tab): void => {
  tab.value = value
}

/** Cell content with an optional source link. */
type Cell = { text: string; href?: string }

/** One data table on the raw page. */
type RawTable = { id: string; label: string; headers: string[]; rows: Cell[][] }

/** Row limit before the "show more" button. */
const PAGE = 100
const shown = ref<Record<string, number>>({})

/** Visible row count for a table. */
const limitOf = (id: string): number => shown.value[id] ?? PAGE

/** Reveals another page of rows. */
const showMore = (id: string): void => {
  shown.value = { ...shown.value, [id]: limitOf(id) + PAGE }
}

/** Builds the year-edition view of the merged setlist. */
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

/** Chosen edition; empty means "the newest one". */
const chosenEditionKey = ref('')
const sideIndex = ref(0)

/** Options for the searchable edition menu. */
const editionItems = computed<EditionItem[]>(() => editions.value.map((row) => ({ label: row.label, value: row.key })))

/** Newest edition, used until the visitor picks another one. */
const defaultEditionKey = computed(() => editions.value[editions.value.length - 1]?.key ?? '')

const editionKey = computed(() => chosenEditionKey.value || defaultEditionKey.value)
const selectedEdition = computed(() => editions.value.find((row) => row.key === editionKey.value) ?? null)

/** Displayed menu value, derived from the active edition. */
const editionModel = computed<EditionItem | undefined>(() => editionItems.value.find((item) => item.value === editionKey.value))

/** Stores the visitor's edition choice. */
const selectEdition = (item: EditionItem | undefined): void => {
  chosenEditionKey.value = item?.value ?? ''
}

/** Song lists of the selected edition, split into merged groups and standalone lists. */
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
  return '这场歌单的长度与同组其他场次不一致，因此单独显示，不与它们合并。'
})

const display = computed(() => {
  if (!catalog.value || !review.value) return null
  const side = sides.value[sideIndex.value]
  if (!side || side.length === 0) return null
  return buildSetlistDisplay(catalog.value, review.value, side)
})

/** Data tables mirroring the SQLite rows, each with a source link. */
const tables = computed<RawTable[]>(() => {
  if (!catalog.value) return []
  const songsById = new Map(catalog.value.songs.map((song) => [song.id, song]))
  const performancesById = new Map(catalog.value.performances.map((row) => [row.id, row]))
  const seriesById = new Map(catalog.value.series.map((row) => [row.id, row]))
  const songNameOf = (id: number): string => songsById.get(id)?.name ?? String(id)

  const tables: RawTable[] = [
    {
      id: 'series',
      label: '系列',
      headers: ['id', '名称', 'VocaDB'],
      rows: catalog.value.series.map((row) => [
        { text: String(row.id) },
        { text: row.name },
        { text: row.source_url, href: row.source_url },
      ]),
    },
    {
      id: 'performances',
      label: '演出',
      headers: ['id', '系列', '名称', '场馆', '开始', '结束', '角色', '歌单', 'VocaDB'],
      rows: catalog.value.performances.map((row) => [
        { text: String(row.id) },
        { text: seriesById.get(row.series_id)?.name ?? String(row.series_id) },
        { text: row.name },
        { text: row.venue_name ?? '—' },
        { text: row.start_date ?? '—' },
        { text: row.end_date ?? '—' },
        { text: row.role },
        { text: row.song_list_id === null ? '—' : String(row.song_list_id) },
        { text: row.source_url, href: row.source_url },
      ]),
    },
    {
      id: 'premieres',
      label: '年版首演',
      headers: ['系列', '年版', '首演日', '场次', '规则'],
      rows: catalog.value.premieres.map((row) => [
        { text: seriesById.get(row.series_id)?.name ?? String(row.series_id) },
        { text: String(row.series_number) },
        { text: row.premiere_date },
        {
          text: performancesById.get(row.premiere_performance_id)?.name ?? String(row.premiere_performance_id),
          href: `https://vocadb.net/E/${row.premiere_performance_id}`,
        },
        { text: row.rule },
      ]),
    },
    {
      id: 'songLists',
      label: '歌单',
      headers: ['id', '名称', '公布时间', 'VocaDB'],
      rows: catalog.value.songLists.map((row) => [
        { text: String(row.id) },
        { text: row.name },
        { text: row.announced_at ?? '—' },
        { text: row.source_url, href: row.source_url },
      ]),
    },
    {
      id: 'setlistItems',
      label: '歌单行',
      headers: ['歌单', '序号', '歌曲', '备注', 'VocaDB'],
      rows: catalog.value.setlistItems.map((row) => [
        { text: String(row.song_list_id) },
        { text: String(row.position) },
        { text: songNameOf(row.listed_song_id), href: `https://vocadb.net/S/${row.listed_song_id}` },
        { text: row.notes ?? '' },
        { text: 'VocaDB', href: `https://vocadb.net/S/${row.listed_song_id}` },
      ]),
    },
    {
      id: 'setlistItemSongs',
      label: '歌单行对应歌曲',
      headers: ['歌单', '序号', '歌曲', '角色', 'VocaDB'],
      rows: catalog.value.setlistItemSongs.map((row) => [
        { text: String(row.song_list_id) },
        { text: String(row.position) },
        { text: songNameOf(row.song_id) },
        { text: row.role },
        { text: 'VocaDB', href: `https://vocadb.net/S/${row.song_id}` },
      ]),
    },
    {
      id: 'songs',
      label: '歌曲',
      headers: ['id', '名称', '日文名', '艺人', '类型', '投稿日期', 'VocaDB'],
      rows: catalog.value.songs.map((row) => [
        { text: String(row.id) },
        { text: row.name },
        { text: row.name_ja ?? '—' },
        { text: row.artist_string ?? '—' },
        { text: row.song_type },
        { text: row.publish_date ?? '—' },
        { text: row.source_url, href: row.source_url },
      ]),
    },
    {
      id: 'videos',
      label: '投稿链接',
      headers: ['PV id', '歌曲', '平台', '标题', '类型', '日期', '链接'],
      rows: catalog.value.videos.map((row) => [
        { text: String(row.vocadb_pv_id) },
        { text: songNameOf(row.song_id), href: `https://vocadb.net/S/${row.song_id}` },
        { text: row.platform },
        { text: row.title ?? '—' },
        { text: row.pv_type ?? '—' },
        { text: row.publish_date ?? '—' },
        { text: row.url, href: row.url },
      ]),
    },
    {
      id: 'snapshots',
      label: '播放量快照',
      headers: ['平台', '视频', '采集时间', '播放量', '来源'],
      rows: catalog.value.snapshots.map((row) => [
        { text: row.platform },
        { text: row.platform_video_id },
        { text: row.collected_at },
        { text: row.view_count.toLocaleString('zh-Hans') },
        { text: row.source_url, href: row.source_url },
      ]),
    },
    {
      id: 'medley',
      label: '串烧隔离',
      headers: ['歌单', '序号', '原曲', '原因'],
      rows: catalog.value.medleyQuarantine.map((row) => [
        { text: String(row.song_list_id) },
        { text: String(row.position) },
        { text: songNameOf(row.listed_song_id), href: `https://vocadb.net/S/${row.listed_song_id}` },
        { text: row.reason },
      ]),
    },
    {
      id: 'sources',
      label: '来源',
      headers: ['id', '名称', '许可', '说明'],
      rows: catalog.value.sources.map((row) => [
        { text: row.id },
        { text: row.name, href: row.url },
        { text: row.license, href: row.license },
        { text: row.notes },
      ]),
    },
    {
      id: 'formulas',
      label: '换算公式',
      headers: ['id', '状态', '版本', '原因'],
      rows: catalog.value.formulas.map((row) => [
        { text: row.id },
        { text: row.status },
        { text: row.version ?? '—' },
        { text: row.reason },
      ]),
    },
  ]

  // The variant table keys on the variant id, which is not stored on the entry.
  const variantRows: Cell[][] = []
  for (const [variantId, entry] of variants.entries) {
    variantRows.push([
      { text: String(variantId), href: `https://vocadb.net/S/${variantId}` },
      { text: songName(entry.canonical), href: `https://vocadb.net/S/${entry.canonical}` },
      { text: entry.kind },
      { text: entry.note ?? '' },
      { text: songName(variantId) },
    ])
  }
  tables.push({ id: 'variants', label: '版本合并', headers: ['变体 id', '并入', '类型', '说明', '变体名'], rows: variantRows })
  return tables
})

/** Songs that have no PV link at all. */
const songsWithoutVideo = computed(() => {
  if (!catalog.value) return []
  const withVideo = new Set(catalog.value.videos.map((row) => row.song_id))
  return catalog.value.songs.filter((song) => !withVideo.has(song.id))
})

/** Performances that cannot contribute a setlist. */
const incompletePerformances = computed(() => {
  if (!catalog.value) return []
  return catalog.value.performances.filter((row) => row.song_list_id === null || row.start_date === null)
})

/** Setlists without an announcement time. */
const listsWithoutAnnouncement = computed(() => {
  if (!catalog.value) return []
  return catalog.value.songLists.filter((row) => row.announced_at === null)
})

/** Rotation lines the parser could not assign exactly. */
const uncertainLines = computed(() => review.value?.lines.filter((line) => line.uncertain) ?? [])

/** Shows whose parsed setlist length differs from the list's usual length. */
const mismatchedShows = computed(() => review.value?.shows ?? [])

/** Normalized title used to propose duplicate song entries. */
const normalizeTitle = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/-\s*[^-]*\b(remix|mix|ver\.?|version|edit|edition)\b[^-]*-\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Songs that share a normalized title but are not merged yet. */
const duplicateCandidates = computed(() => {
  if (!catalog.value) return []
  const merged = new Set<number>(variants.entries.keys())
  const forCanonical = new Set<number>([...variants.entries.values()].map((entry) => entry.canonical))
  const buckets = new Map<string, { id: number; name: string }[]>()
  for (const song of catalog.value.songs) {
    if (merged.has(song.id)) continue
    const key = normalizeTitle(song.name)
    const list = buckets.get(key) ?? []
    list.push({ id: song.id, name: song.name })
    buckets.set(key, list)
  }
  return [...buckets.entries()]
    .filter(([, list]) => list.length > 1 && list.some((song) => !forCanonical.has(song.id)))
    .map(([key, list]) => ({ key, songs: list }))
})

/** Counts shown at the top of the quality view. */
const qualitySummary = computed(() => {
  if (!catalog.value) return []
  return [
    { label: '歌曲', value: catalog.value.songs.length },
    { label: '演出', value: catalog.value.performances.length },
    { label: '歌单', value: catalog.value.songLists.length },
    { label: '投稿链接', value: catalog.value.videos.length },
    { label: '播放量快照', value: catalog.value.snapshots.length },
    { label: '已合并版本', value: variants.size },
    { label: '已合并歌单组', value: merges.groups.size },
  ]
})

/** Download links for the raw files. */
const downloads = [
  { label: '目录 SQLite', href: '/data/catalog.sqlite' },
  { label: '表结构 schema.sql', href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/data/schema.sql' },
  { label: '增量 SQL', href: 'https://github.com/RJiazhen/miku-concert-stats/tree/main/data/increments' },
  { label: '版本合并清单', href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/data/song-variants.json' },
  { label: '歌单合并清单', href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/data/setlist-merges.json' },
  { label: '中文歌名', href: 'https://github.com/RJiazhen/miku-concert-stats/blob/main/data/song-titles.zh-CN.json' },
  { label: '差异核验报告', href: '/report' },
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
</script>

<template>
  <main class="space-y-6">
    <header class="space-y-3">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Raw Data</p>
      <h1 class="text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">原始数据</h1>
      <p class="max-w-3xl text-sm leading-relaxed text-muted">
        这里的每一行都来自 VocaDB 公共 API，并附上可核验的链接。歌单里同一槽位的替换曲目会合并成一行，
        末尾「场次」列说明这首曲子属于哪一场；每一场都演的曲目不写场次。
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

    <div class="flex flex-wrap gap-1">
      <UButton
        v-for="item in tabs"
        :key="item.value"
        :variant="tab === item.value ? 'solid' : 'outline'"
        color="neutral"
        size="sm"
        :label="item.label"
        @click="setTab(item.value)"
      />
    </div>

    <section v-if="tab === 'edition'" class="space-y-4">
      <UCard>
        <div class="flex flex-wrap items-end gap-3">
          <label class="grid gap-1 text-xs text-muted">
            年版
            <USelectMenu
              :model-value="editionModel"
              :items="editionItems"
              by="value"
              search-input
              placeholder="选择年版"
              size="sm"
              class="w-72"
              @update:model-value="selectEdition"
            />
          </label>
          <label class="grid gap-1 text-xs text-muted">
            显示范围
            <USelect v-model="sideIndex" :items="sideOptions" size="sm" class="w-72" />
          </label>
          <p class="pb-2 text-xs text-muted">{{ editionSongCount }} 首（合并版本后去重）</p>
        </div>
      </UCard>
      <UAlert v-if="splitNote" color="warning" variant="subtle" icon="i-lucide-info" :description="splitNote" />
      <USkeleton v-if="pending" class="h-64 w-full rounded-xl" />
      <UEmpty
        v-else-if="!display"
        icon="i-lucide-list-x"
        title="这个年版没有歌单"
        description="VocaDB 上没有记录歌单，或这场演出没有关联歌单。"
      />
      <SetlistTable v-else-if="display && review" :display="display" :review="review" />
    </section>

    <section v-else-if="tab === 'tables'" class="space-y-4">
      <UCard v-for="table in tables" :key="table.id">
        <template #header>
          <div class="flex items-baseline justify-between gap-2">
            <h2 class="text-base font-semibold text-highlighted">{{ table.label }}</h2>
            <span class="text-xs text-muted">
              {{ table.rows.length }} 行
              <template v-if="table.rows.length > PAGE">· 显示前 {{ Math.min(limitOf(table.id), table.rows.length) }}</template>
            </span>
          </div>
        </template>
        <p v-if="table.rows.length === 0" class="text-sm text-muted">这张表没有数据。</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th v-for="header in table.headers" :key="header" class="px-2 py-1.5 font-medium whitespace-nowrap">{{ header }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in table.rows.slice(0, limitOf(table.id))" :key="index" class="border-t border-default/40">
                <td v-for="(cell, cellIndex) in row" :key="cellIndex" class="px-2 py-1.5 align-top">
                  <ULink v-if="cell.href" :to="cell.href" target="_blank" class="break-all text-primary">{{ cell.text }}</ULink>
                  <span v-else class="break-words text-muted">{{ cell.text }}</span>
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
          <h2 class="text-base font-semibold text-highlighted">歌单差异核验</h2>
        </template>
        <p class="text-sm text-muted">
          同一系列不同场之间曲目数量或正片/安可段编排不一致时，会在核验页逐条列出，并附上 VocaDB 歌单链接与差异曲目。
        </p>
        <UButton to="/report" class="mt-3" size="sm" trailing-icon="i-lucide-arrow-right">打开核验报告</UButton>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">未解析的备注与长度不一致的场次</h2>
        </template>
        <p class="text-sm text-muted">{{ uncertainLines.length }} 行备注无法确定到具体场次，{{ mismatchedShows.length }} 场歌单长度与该歌单的常见长度不一致。</p>
        <div v-if="mismatchedShows.length > 0" class="mt-3 space-y-1 text-sm">
          <p v-for="show in mismatchedShows.slice(0, 10)" :key="show.performanceId" class="text-muted">
            <NuxtLink :to="`/shows/${show.performanceId}`" class="text-primary">场次 {{ show.performanceId }}</NuxtLink>
            · 歌单 {{ show.songListId }} · {{ show.reasons.join('；') }}
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
                <ULink :to="`https://vocadb.net/S/${song.id}`" target="_blank" class="text-primary">{{ song.id }} {{ song.name }}</ULink>
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
          <p>没有歌单或开始日期的演出：{{ incompletePerformances.length }} 场</p>
          <p>没有公布时间的歌单：{{ listsWithoutAnnouncement.length }} 份（公开 API 没有该字段）</p>
          <p>未拆分的串烧：{{ catalog?.medleyQuarantine.length ?? 0 }} 行</p>
        </div>
      </UCard>
    </section>
  </main>
</template>
