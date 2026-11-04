<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useCatalog } from '~/composables/useCatalog.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { useSongVariants } from '~/composables/useSongVariants.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import { formatCharacters, songCharacters } from '~/composables/useCharacters.ts'
import { formatRotationReason, reviewRotations } from '~~/shared/rotation.ts'
import { formatShowCoverage, showCoverage } from '~~/shared/show-coverage.ts'
import { variantVersionNote } from '~~/shared/song-variants.ts'
import { shortPerformanceName } from '~~/shared/performance-name.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSongLanguage } from '~/composables/useSongLanguage.ts'
import { formatSongTitle } from '~~/shared/song-titles.ts'
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
const { localizeSeries } = useSeriesTitles()
const { language, translationFor } = useSongLanguage()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const songId = computed(() => Number(route.params.id))
const canonicalId = computed(() => variants.canonicalSongId(songId.value))
const song = computed(() => songById(canonicalId.value))

/** Title in the current language, matching the `<h1>` above it. */
const breadcrumbSongLabel = computed(() => {
  const current = song.value
  if (!current) return ''
  const view = formatSongTitle(current.name, translationFor(canonicalId.value), language.value)
  return view.originalNote ? `${view.primary} (${view.originalNote})` : view.primary
})

/** One part of the 备注 cell, in display order. */
type NotePart = {
  text: string
  /** Parser warnings stay yellow; facts and original note text stay muted. */
  warning: boolean
}

/**
 * Builds the 备注 parts of one appearance row: variant note, 演出 coverage,
 * rotation warnings, then the parser's muted context text.
 */
const appearanceNoteParts = (
  versionNote: string,
  coverage: string | null,
  reasons: readonly string[],
  info: readonly string[],
): NotePart[] => {
  const parts: NotePart[] = []
  if (versionNote !== '') parts.push({ text: `版本：${versionNote}`, warning: false })
  if (coverage !== null) parts.push({ text: coverage, warning: false })
  for (const reason of reasons) parts.push({ text: formatRotationReason(reason), warning: true })
  for (const text of info) parts.push({ text, warning: false })
  return parts
}

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
  const coverageByPerformance = showCoverage(catalog.value, review, groupIds.value)
  const canonicalName = song.value?.name ?? ''
  const showVersion = variantIds.value.length > 0
  const rows: {
    key: string
    seriesId: number
    seriesName: string
    /** `seriesName` in the site language, kept separate so the sort and series-year key stay on the catalog name. */
    seriesLabel: string
    seriesNumber: number | null
    performanceId: number
    performanceName: string
    date: string | null
    role: string
    /** Plain text of the 备注 cell, used by the column sort. */
    noteText: string
    uncertain: boolean
    /** 备注 cell parts in display order, also concatenated into `noteText`. */
    noteParts: NotePart[]
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
      const variantSong = songById(link.song_id)
      const versionName = variantSong?.name ?? String(link.song_id)
      // A cover is sung by the variant's own cast, not the canonical song's.
      const performers = entry?.kind === 'cover' ? songCharacters(variantSong?.artist_string ?? null) : []
      // The canonical version is the page's default, so only variants need a note.
      const versionNote = entry && showVersion ? variantVersionNote(canonicalName, versionName, entry.kind, performers) : ''
      const coverage = formatShowCoverage(coverageByPerformance.get(performance.id) ?? null, line?.reasons ?? [])
      const noteParts = appearanceNoteParts(versionNote, coverage, line?.reasons ?? [], line?.info ?? [])
      rows.push({
        key: `${performance.id}:${link.song_id}:${link.position}`,
        seriesId: performance.series_id,
        seriesName,
        seriesLabel: localizeSeries(seriesName),
        seriesNumber: performance.series_number,
        performanceId: performance.id,
        performanceName: localizePlace(shortPerformanceName(performance.name, seriesName, performance.series_number)),
        date: performance.start_date,
        role: performance.role,
        noteText: noteParts.map((part) => part.text).join('；'),
        uncertain: line?.uncertain ?? false,
        noteParts,
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
  { key: 'venue', label: '演出' },
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

/** Distinct series the song appears in, for the header count. */
const seriesCount = computed(() => {
  const ids = new Set(appearances.value.map((row) => row.seriesId))
  return ids.size
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
          { label: '歌曲' },
          { label: breadcrumbSongLabel },
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
            <span class="text-xs text-muted">{{ appearances.length }} 个演出 · {{ seriesCount }} 个系列</span>
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
                  <NuxtLink
                    :to="`/series/${row.seriesId}`"
                    class="text-primary"
                    :title="row.seriesName"
                  >
                    {{ row.seriesLabel }}
                  </NuxtLink>
                  <template v-if="row.seriesNumber !== null"> {{ row.seriesNumber }}</template>
                </td>
                <td class="px-2 py-1.5">
                  <NuxtLink :to="`/shows/${row.performanceId}`" class="text-primary">{{ row.performanceName || '—' }}</NuxtLink>
                </td>
                <td class="px-2 py-1.5 text-xs">
                  <template v-for="(part, partIndex) in row.noteParts" :key="`${part.warning ? 'w' : 'm'}:${part.text}`">
                    <span v-if="partIndex > 0" class="text-muted">；</span>
                    <span :class="part.warning ? 'text-warning' : 'text-muted'">{{ part.text }}</span>
                  </template>
                  <span v-if="row.noteParts.length === 0" class="text-muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="text-base font-semibold text-highlighted">相关投稿</h2>
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
