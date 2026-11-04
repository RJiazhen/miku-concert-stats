<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useCatalog } from '~/composables/useCatalog.ts'
import { useSongVariants } from '~/composables/useSongVariants.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import { formatCharacters } from '~/composables/useCharacters.ts'
import { formatRotationReason, reviewRotations } from '~~/shared/rotation.ts'
import { variantVersionNote } from '~~/shared/song-variants.ts'
import { shortPerformanceName } from '~~/shared/performance-name.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { latestSnapshot } from '~~/shared/stats.ts'
import {
  nextAppearanceSort,
  sortAppearances,
  type AppearanceSort,
  type AppearanceSortKey,
} from '~~/shared/appearance-sort.ts'
import type { Platform } from '~~/shared/types.ts'

const route = useRoute()
const { catalog, error, pending, load } = useCatalog()
const variants = useSongVariants()
const { songById } = useSongLookup()
const { localizePlace } = usePlaceNames()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const songId = computed(() => Number(route.params.id))
const canonicalId = computed(() => variants.canonicalSongId(songId.value))
const song = computed(() => songById(canonicalId.value))

/** Merged variant ids, sorted. */
const variantIds = computed(() => variants.variantSongIdsOf(canonicalId.value))

/** Every song id in the group, canonical first. */
const groupIds = computed(() => variants.groupSongIds(canonicalId.value))

/** Variant entries with their names. */
const variantRows = computed(() =>
  variantIds.value.map((id) => {
    const entry = variants.entries.get(id)
    return {
      id,
      name: songById(id)?.name ?? String(id),
      kind: entry?.kind ?? '',
      note: entry?.note ?? '',
    }
  }),
)

/** Performances that played any version of this song. */
const appearances = computed(() => {
  if (!catalog.value) return []
  const ids = new Set(groupIds.value)
  const review = reviewRotations(catalog.value)
  const lineByKey = new Map(review.lines.map((line) => [`${line.songListId}:${line.position}`, line]))
  const canonicalName = song.value?.name ?? ''
  const showVersion = variantIds.value.length > 0
  const rows: {
    key: string
    seriesId: number
    seriesName: string
    seriesNumber: number | null
    performanceId: number
    performanceName: string
    date: string | null
    role: string
    versionNote: string
    /** Plain text of the 备注 cell, used by the column sort. */
    noteText: string
    uncertain: boolean
    /** 备注 lines from the rotation parser, already localized for display and sorting. */
    reasons: string[]
  }[] = []
  for (const link of catalog.value.setlistItemSongs) {
    if (!ids.has(link.song_id)) continue
    if (link.role !== 'listed') continue
    const line = lineByKey.get(`${link.song_list_id}:${link.position}`)
    for (const performance of catalog.value.performances) {
      if (performance.song_list_id !== link.song_list_id) continue
      if (line && !line.performanceIds.includes(performance.id)) continue
      const series = catalog.value.series.find((row) => row.id === performance.series_id)
      const seriesName = series?.name ?? String(performance.series_id)
      const entry = variants.entries.get(link.song_id)
      const versionName = songById(link.song_id)?.name ?? String(link.song_id)
      // The canonical version is the page's default, so only variants need a note.
      const versionNote = entry && showVersion ? variantVersionNote(canonicalName, versionName, entry.kind) : ''
      const reasons = (line?.reasons ?? []).map(formatRotationReason)
      rows.push({
        key: `${performance.id}:${link.song_id}:${link.position}`,
        seriesId: performance.series_id,
        seriesName,
        seriesNumber: performance.series_number,
        performanceId: performance.id,
        performanceName: localizePlace(shortPerformanceName(performance.name, seriesName, performance.series_number)),
        date: performance.start_date,
        role: performance.role,
        versionNote,
        noteText: [versionNote === '' ? '' : `版本：${versionNote}`, ...reasons].filter((part) => part !== '').join('；'),
        uncertain: line?.uncertain ?? false,
        reasons,
      })
    }
  }
  rows.sort((left, right) => (left.date ?? '').localeCompare(right.date ?? '') || left.performanceId - right.performanceId)
  return rows
})

/** Active column of the 出场记录 table; date ascending is the order the table always had. */
const appearanceSort = ref<AppearanceSort>({ key: 'date', direction: 'asc' })

/** Columns of the 出场记录 table, in display order. */
const appearanceColumns: readonly { key: AppearanceSortKey; label: string }[] = [
  { key: 'date', label: '日期' },
  { key: 'series', label: '系列' },
  { key: 'venue', label: '场次' },
  { key: 'note', label: '备注' },
]

/** Appearances in the order the active header asks for. */
const sortedAppearances = computed(() => sortAppearances(appearances.value, appearanceSort.value))

/** Applies a header click: a new column starts ascending, the active column flips. */
const toggleAppearanceSort = (key: AppearanceSortKey): void => {
  appearanceSort.value = nextAppearanceSort(appearanceSort.value, key)
}

/** Sort indicator icon for a header, matching the ranking table on the home page. */
const appearanceSortIcon = (key: AppearanceSortKey): string => {
  if (appearanceSort.value.key !== key) return 'i-lucide-arrow-up-down'
  return appearanceSort.value.direction === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow'
}

/** `aria-sort` value announced for a header cell. */
const appearanceAriaSort = (key: AppearanceSortKey): 'ascending' | 'descending' | 'none' => {
  if (appearanceSort.value.key !== key) return 'none'
  return appearanceSort.value.direction === 'asc' ? 'ascending' : 'descending'
}

/** Distinct editions the song appears in, for the header count. */
const editionCount = computed(() => {
  const keys = new Set(appearances.value.map((row) => `${row.seriesName}:${row.seriesNumber}`))
  return keys.size
})

/** PVs for any version of the song, grouped by platform. */
const videos = computed(() => {
  if (!catalog.value) return []
  const ids = new Set(groupIds.value)
  return catalog.value.videos
    .filter((row) => ids.has(row.song_id))
    .sort((left, right) => left.platform.localeCompare(right.platform) || left.vocadb_pv_id - right.vocadb_pv_id)
})

/** Latest observed view count for a PV, or null when no snapshot exists. */
const latestViews = (platform: Platform, platformVideoId: string): number | null => {
  if (!catalog.value) return null
  const snapshot = latestSnapshot(catalog.value.snapshots, platform, platformVideoId)
  return snapshot ? snapshot.view_count : null
}

/** Formats a view count. */
const viewsText = (count: number | null): string => (count === null ? '无快照' : count.toLocaleString('zh-Hans'))

const hasSnapshots = computed(() => (catalog.value?.snapshots.length ?? 0) > 0)

/** 演出角色 for the canonical song. */
const characters = computed(() => (song.value ? formatCharacters(song.value.artist_string) : '—'))
</script>

<template>
  <main class="space-y-6">
    <p v-if="pending" class="text-sm text-muted">正在浏览器中加载目录…</p>
    <UAlert v-else-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UEmpty
      v-else-if="catalog && !song"
      icon="i-lucide-music"
      title="找不到这首歌"
      description="这个 id 不在已提交的目录里。"
    />

    <template v-else-if="song">
      <UBreadcrumb
        :items="[
          { label: '排行', to: '/' },
          { label: '歌曲' },
          { label: song.name },
        ]"
      />

      <header class="space-y-3">
        <h1 class="text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
          <SongTitle :song-id="canonicalId" :original="song.name" />
        </h1>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <UBadge color="primary" variant="subtle">{{ song.song_type }}</UBadge>
          <UBadge v-if="variantIds.length > 0" color="secondary" variant="subtle">含 {{ variantIds.length }} 个版本</UBadge>
          <span class="text-muted">{{ song.artist_string ?? '艺人未记录' }}</span>
          <ULink :to="song.source_url" target="_blank" class="text-primary">VocaDB</ULink>
        </div>
        <p class="text-sm text-muted" v-if="song.publish_date">投稿日期 {{ song.publish_date }}</p>
      </header>

      <UCard>
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">合并的版本</h2>
        </template>
        <p v-if="variantRows.length === 0" class="text-sm text-muted">这首歌没有合并其他版本。</p>
        <ul v-else class="space-y-2 text-sm">
          <li v-for="row in variantRows" :key="row.id" class="flex flex-wrap items-baseline gap-2">
            <UBadge color="secondary" variant="subtle" size="sm">{{ row.kind }}</UBadge>
            <ULink :to="`https://vocadb.net/S/${row.id}`" target="_blank" class="text-highlighted">{{ row.name }}</ULink>
            <span v-if="row.note" class="text-xs text-muted">{{ row.note }}</span>
          </li>
        </ul>
        <p class="mt-3 text-xs text-muted">
          合并清单见
          <ULink to="https://github.com/RJiazhen/miku-concert-stats/blob/main/data/song-variants.json" target="_blank" class="text-primary">
            data/song-variants.json
          </ULink>。演出角色：{{ characters }}
        </p>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="text-base font-semibold text-highlighted">出场记录</h2>
            <span class="text-xs text-muted">{{ appearances.length }} 场 · {{ editionCount }} 个年版</span>
          </div>
        </template>
        <p v-if="appearances.length === 0" class="text-sm text-muted">没有在已收录的歌单里出现。</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th
                  v-for="column in appearanceColumns"
                  :key="column.key"
                  scope="col"
                  :aria-sort="appearanceAriaSort(column.key)"
                  class="px-2 py-1 font-medium"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    class="-mx-2"
                    :label="column.label"
                    :trailing-icon="appearanceSortIcon(column.key)"
                    :aria-label="`按${column.label}排序`"
                    @click="toggleAppearanceSort(column.key)"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in sortedAppearances" :key="row.key" class="border-t border-default/40">
                <td class="px-2 py-1.5 font-mono text-muted">{{ row.date ?? '—' }}</td>
                <td class="px-2 py-1.5 text-muted">
                  <NuxtLink v-if="row.seriesNumber !== null" :to="`/editions/${row.seriesId}/${row.seriesNumber}`" class="text-primary">
                    {{ row.seriesName }} {{ row.seriesNumber }}
                  </NuxtLink>
                  <template v-else>{{ row.seriesName }}</template>
                </td>
                <td class="px-2 py-1.5">
                  <NuxtLink :to="`/shows/${row.performanceId}`" class="text-primary">{{ row.performanceName || '—' }}</NuxtLink>
                </td>
                <td class="px-2 py-1.5 text-xs">
                  <span v-if="row.versionNote" class="text-muted">版本：{{ row.versionNote }}</span>
                  <span v-if="row.versionNote && row.reasons.length" class="text-muted">；</span>
                  <span v-if="row.reasons.length" class="text-warning">{{ row.reasons.join('；') }}</span>
                  <span v-if="!row.versionNote && row.reasons.length === 0" class="text-muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="text-base font-semibold text-highlighted">投稿与播放量</h2>
            <span v-if="!hasSnapshots" class="text-xs text-muted">当前没有播放量快照，只显示投稿链接</span>
          </div>
        </template>
        <p v-if="videos.length === 0" class="text-sm text-muted">VocaDB 上没有登记投稿链接。</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th class="px-2 py-1.5 font-medium">平台</th>
                <th class="px-2 py-1.5 font-medium">标题</th>
                <th class="px-2 py-1.5 font-medium">类型</th>
                <th class="px-2 py-1.5 font-medium">日期</th>
                <th v-if="hasSnapshots" class="px-2 py-1.5 font-medium">最新播放量</th>
                <th class="px-2 py-1.5 font-medium">链接</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="video in videos" :key="video.vocadb_pv_id" class="border-t border-default/40">
                <td class="px-2 py-1.5 text-muted">{{ video.platform }}</td>
                <td class="px-2 py-1.5 text-muted">{{ video.title ?? '—' }}</td>
                <td class="px-2 py-1.5 text-muted">{{ video.pv_type ?? '—' }}</td>
                <td class="px-2 py-1.5 font-mono text-muted">{{ video.publish_date ?? '—' }}</td>
                <td v-if="hasSnapshots" class="px-2 py-1.5 tabular-nums">{{ viewsText(latestViews(video.platform, video.platform_video_id)) }}</td>
                <td class="px-2 py-1.5">
                  <ULink :to="video.url" target="_blank" class="text-primary">打开</ULink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </template>
  </main>
</template>
