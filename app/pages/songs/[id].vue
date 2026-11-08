<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { TableColumn } from '@nuxt/ui'
import { useCatalog } from '~/composables/useCatalog.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { useSongVariants } from '~/composables/useSongVariants.ts'
import { useSongNotes } from '~/composables/useSongNotes.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import { songCharacters } from '~/composables/useCharacters.ts'
import { useSortableHeader } from '~/composables/useSortableHeader.ts'
import { displayArtistString } from '~~/shared/credit.ts'
import { producerNamesFor } from '~~/shared/producer-options.ts'
import { producerPath } from '~~/shared/producers.ts'
import { reviewRotations } from '~~/shared/rotation.ts'
import { derivedItemSongIds } from '~~/shared/performance-setlists.ts'
import { formatShowCoverage, showCoverage } from '~~/shared/show-coverage.ts'
import { variantKindLabel, variantVersionNote } from '~~/shared/song-variants.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSongTitle } from '~/composables/useSongTitle.ts'
import { useLocale } from '~/composables/useLocale.ts'
import { songCategoryLabel } from '~~/shared/repertoire.ts'
import { fromVocaDB, isVocaloidSong } from '~~/shared/repertoire.ts'
import {
  compareAppearances,
} from '~~/shared/appearance-sort.ts'

const route = useRoute()
const { catalog, error, pending, load } = useCatalog()
const variants = useSongVariants()
const { noteFor } = useSongNotes()
const { songById, songHref, vocadbSongUrl } = useSongLookup()
const { localizePlace } = usePlaceNames()
const { localizeSeries, localizePerformanceSeries } = useSeriesTitles()
const { titleView } = useSongTitle()
const { locale, t } = useLocale()
const sortableHeader = useSortableHeader()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const songId = computed(() => Number(route.params.id))
const canonicalId = computed(() => variants.canonicalSongId(songId.value))
const song = computed(() => songById(canonicalId.value))

/** Title in the current language plus the other names of that language. */
const title = computed(() => {
  const current = song.value
  if (!current) return null
  return titleView(canonicalId.value, current.name)
})

/** Title in the current language, matching the `<h1>`; the breadcrumb never shows aliases. */
const breadcrumbSongLabel = computed(() => {
  const view = title.value
  if (!view) return ''
  return view.originalNames.length === 0 ? view.primary : `${view.primary} (${view.originalNames.join(' · ')})`
})

/** Other names under the `<h1>`; empty hides the line, so a song without aliases adds no blank row. */
const titleAliases = computed(() => title.value?.aliases ?? [])

/** One part of the 备注 cell, in display order. */
type NotePart = {
  text: string
  /** Parser warnings stay yellow; facts and original note text stay muted. */
  warning: boolean
}

/**
 * Builds the 备注 parts of one appearance row: the version note, then — only when the song
 * missed some 場次 of the 演出 — how many of them it played. A null coverage (full or
 * single-場次 演出) contributes no part, so a row without a version note leaves the cell
 * empty and the table prints `—`.
 */
const appearanceNoteParts = (versionNote: string, coverage: string | null): NotePart[] => {
  const parts: NotePart[] = []
  if (versionNote !== '') parts.push({ text: t('song.versionNote', { note: versionNote }), warning: false })
  if (coverage !== null) parts.push({ text: coverage, warning: false })
  return parts
}

/** Merged variant ids, sorted. */
const variantIds = computed(() => variants.variantSongIdsOf(canonicalId.value))

/** Checked note for this song, shown right under the header; null hides the alert. */
const songNote = computed(() => noteFor(canonicalId.value))

/** Every song id in the group, canonical first. */
const groupIds = computed(() => variants.groupSongIds(canonicalId.value))

/** 演出角色 of a credit line, as the chips the header and the variant card print. */
const characterNamesOf = (credits: Parameters<typeof songCharacters>[0]): string[] => songCharacters(credits)

/** Variant entries with the facts the 其他版本 card needs to describe each merged song. */
const variantRows = computed(() => {
  const canonicalCharacters = songCharacters(song.value ?? null)
  return variantIds.value.map((id) => {
    const entry = variants.entries.get(id)
    const variantSong = songById(id)
    // A variant without its own cast is sung by the same characters as the original.
    const ownCharacters = songCharacters(variantSong ?? null)
    const characters = ownCharacters.length > 0 ? ownCharacters : canonicalCharacters
    // The song entry's structured roster wins; `artist_string` is only the fallback.
    const producerNames = variantSong ? producerNamesFor(variantSong) : []
    return {
      id,
      name: variantSong?.name ?? String(id),
      /** Chinese kind label; the raw `kind` token stays in the lookup file. */
      kindLabel: entry ? variantKindLabel(entry.kind, locale.value) : t('variant.other'),
      /** 制作人 names, each linked to its producer page. */
      producerNames,
      /** 演出角色 of the variant; an empty list hides that half of the line. */
      characters,
    }
  })
})

/** One row of the 出场记录 table. */
type AppearanceRow = {
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
  /** 备注 cell parts in display order, also concatenated into `noteText`. */
  noteParts: NotePart[]
}

/** Performances that played any version of this song. */
const appearances = computed(() => {
  if (!catalog.value) return []
  const ids = new Set(groupIds.value)
  const review = reviewRotations(catalog.value)
  const lineByKey = new Map(review.lines.map((line) => [`${line.songListId}:${line.position}`, line]))
  const coverageByPerformance = showCoverage(catalog.value, review, groupIds.value, locale.value)
  const canonicalName = song.value?.name ?? ''
  const showVersion = variantIds.value.length > 0

  /** 版本 note of one song id of the group; empty for the canonical version. */
  const versionNoteOf = (songId: number): string => {
    const entry = variants.entries.get(songId)
    if (!entry || !showVersion) return ''
    const variantSong = songById(songId)
    // A cover is sung by the variant's own cast, not the canonical song's.
    const performers = entry.kind === 'cover' ? songCharacters(variantSong ?? null) : []
    return variantVersionNote(canonicalName, variantSong?.name ?? String(songId), entry.kind, performers, locale.value)
  }

  const rows: AppearanceRow[] = []
  for (const link of catalog.value.setlistItemSongs) {
    if (!ids.has(link.song_id)) continue
    if (link.role !== 'listed') continue
    const line = lineByKey.get(`${link.song_list_id}:${link.position}`)
    for (const performance of catalog.value.performances) {
      if (performance.song_list_id !== link.song_list_id) continue
      if (line && !line.performanceIds.includes(performance.id)) continue
      const series = catalog.value.series.find((row) => row.id === performance.series_id)
      const seriesName = series?.name ?? String(performance.series_id)
      const coverage = formatShowCoverage(coverageByPerformance.get(performance.id) ?? null, [], locale.value)
      const noteParts = appearanceNoteParts(versionNoteOf(link.song_id), coverage)
      rows.push({
        key: `${performance.id}:${link.song_id}:${link.position}`,
        seriesId: performance.series_id,
        seriesName,
        seriesLabel: localizeSeries(seriesName),
        seriesNumber: performance.series_number,
        performanceId: performance.id,
        performanceName: localizePlace(localizePerformanceSeries(performance.name, seriesName, performance.series_number)),
        date: performance.start_date,
        role: performance.role,
        noteText: noteParts.map((part) => part.text).join(t('setlist.join')),
        noteParts,
      })
    }
  }
  // A repertoire song registered from a wiki table never appears in the VocaDB source layer, so
  // the derived 場次 layer is the only place its 出场记录 can come from.
  const covered = new Set(rows.map((row) => row.performanceId))
  for (const item of catalog.value.performanceShowSetlistItems) {
    const matched = derivedItemSongIds(catalog.value, item).find((songId) => ids.has(songId))
    if (matched === undefined) continue
    if (covered.has(item.performance_id)) continue
    const performance = catalog.value.performances.find((row) => row.id === item.performance_id)
    if (!performance) continue
    const show = catalog.value.performanceShowSetlists.find((row) => row.show_key === item.show_key)
    const series = catalog.value.series.find((row) => row.id === performance.series_id)
    const seriesName = series?.name ?? String(performance.series_id)
    const coverage = formatShowCoverage(coverageByPerformance.get(performance.id) ?? null, [], locale.value)
    const noteParts = appearanceNoteParts(versionNoteOf(matched), coverage)
    rows.push({
      key: `${performance.id}:${matched}:${item.show_key}`,
      seriesId: performance.series_id,
      seriesName,
      seriesLabel: localizeSeries(seriesName),
      seriesNumber: performance.series_number,
      performanceId: performance.id,
      performanceName: localizePlace(localizePerformanceSeries(performance.name, seriesName, performance.series_number)),
      date: show?.date ?? performance.start_date,
      role: performance.role,
      noteText: noteParts.map((part) => part.text).join(t('setlist.join')),
      noteParts,
    })
    covered.add(performance.id)
  }
  rows.sort((left, right) => (left.date ?? '').localeCompare(right.date ?? '') || left.performanceId - right.performanceId)
  return rows
})

/** Sort state of the 出场记录 table; date ascending is the order the table always had. */
const appearanceSorting = ref([{ id: 'date', desc: false }])

/** Columns of the 出场记录 table; every one sorts through the shared appearance comparator. */
const appearanceColumns = computed<TableColumn<AppearanceRow>[]>(() => [
  {
    accessorKey: 'date',
    header: sortableHeader(t('col.date')),
    enableSorting: true,
    sortingFn: (left, right) => compareAppearances(left.original, right.original, 'date'),
  },
  {
    accessorKey: 'seriesLabel',
    header: sortableHeader(t('col.series')),
    enableSorting: true,
    sortingFn: (left, right) => compareAppearances(left.original, right.original, 'series'),
  },
  {
    accessorKey: 'performanceName',
    header: sortableHeader(t('col.performance')),
    enableSorting: true,
    sortingFn: (left, right) => compareAppearances(left.original, right.original, 'venue'),
  },
  {
    accessorKey: 'noteText',
    header: sortableHeader(t('col.note')),
    enableSorting: true,
    sortingFn: (left, right) => compareAppearances(left.original, right.original, 'note'),
  },
])

/** Columns of the 相关投稿 table. */
const videoColumns = computed<TableColumn<VideoRow>[]>(() => {
  const list: TableColumn<VideoRow>[] = [
    { accessorKey: 'platform', header: t('col.platform') },
    { accessorKey: 'title', header: t('col.title') },
    { accessorKey: 'pvType', header: t('col.pvType') },
    { accessorKey: 'publishDate', header: t('col.date') },
  ]
  list.push({ id: 'url', header: t('col.link') })
  return list
})

/** Distinct series the song appears in, for the header count. */
const seriesCount = computed(() => {
  const ids = new Set(appearances.value.map((row) => row.seriesId))
  return ids.size
})

/** One row of the 相关投稿 table. */
type VideoRow = {
  key: number
  platform: string
  title: string
  pvType: string
  publishDate: string
  url: string
}

/** PVs for any version of the song, grouped by platform. */
const videos = computed(() => {
  if (!catalog.value) return []
  const ids = new Set(groupIds.value)
  return catalog.value.videos
    .filter((row) => ids.has(row.song_id))
    .sort((left, right) => left.platform.localeCompare(right.platform) || left.vocadb_pv_id - right.vocadb_pv_id)
})

/** Rows of the 相关投稿 table, one per platform video. */
const videoRows = computed<VideoRow[]>(() =>
  videos.value.map((video) => ({
    key: video.vocadb_pv_id,
    platform: video.platform,
    title: video.title ?? '—',
    pvType: video.pv_type ?? '—',
    publishDate: video.publish_date ?? '—',
    url: video.url,
  })),
)

/** 演出角色 for the canonical song, printed as chips in the header. */
const characters = computed(() => characterNamesOf(song.value ?? null))

/** Muted facts under the title: 投稿日期 and 演出角色 of the canonical song. */
/** Whether the catalog registered this song from a wiki setlist rather than VocaDB. */
const outsideVocaDB = computed(() => {
  const current = song.value
  return current !== null && !fromVocaDB(current)
})

/** Category badge of a non-VOCALOID piece, e.g. `古典・管弦乐曲`; null for an ordinary song. */
const categoryLabel = computed(() => {
  const current = song.value
  if (current === null || current.category === 'vocaloid') return null
  return songCategoryLabel(current.category, locale.value)
})

const headerFacts = computed(() => {
  const facts: string[] = []
  if (song.value?.publish_date) facts.push(t('song.publishedAt', { date: song.value.publish_date }))
  return facts.join(' · ')
})

/** Whether the header prints the 演出角色 chip line; a non-VOCALOID piece has none by definition. */
const showsCharacterLine = computed(() => (!outsideVocaDB.value || isVocaloidSong(song.value)) && characters.value.length > 0)

useHead({ title: computed(() => title.value?.primary ?? t('song.breadcrumb')) })
</script>

<template>
  <main class="space-y-6">
    <PageSkeleton v-if="pending" />
    <UAlert v-else-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UEmpty
      v-else-if="catalog && !song"
      icon="i-lucide-music"
      :title="t('song.notFound')"
      :description="t('common.notFoundId')"
    />

    <template v-else-if="song">
      <UBreadcrumb
        :items="[
          { label: t('song.breadcrumb') },
          { label: breadcrumbSongLabel },
        ]"
      />

      <header class="space-y-3">
        <h1 class="text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
          <SongTitle :song-id="canonicalId" :original="song.name" />
        </h1>
        <SongTitleAliases v-if="titleAliases.length > 0" :aliases="titleAliases" />
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <UBadge v-if="categoryLabel" color="neutral" variant="subtle">{{ categoryLabel }}</UBadge>
          <template v-else>
            <UBadge color="primary" variant="subtle">{{ song.song_type }}</UBadge>
            <UBadge v-if="variantIds.length > 0" color="secondary" variant="subtle">{{ t('common.versions', { n: groupIds.length }) }}</UBadge>
          </template>
          <span class="text-muted">
            {{ outsideVocaDB && !isVocaloidSong(song) ? t('song.composer', { name: displayArtistString(song.artist_string) ?? t('common.notRecorded') }) : displayArtistString(song.artist_string) ?? t('common.notRecorded') }}
          </span>
          <UButton :to="song.source_url" target="_blank" color="neutral" variant="outline" size="xs" icon="i-lucide-external-link">
            {{ outsideVocaDB ? t('song.wiki') : 'VocaDB' }}
          </UButton>
        </div>
        <p v-if="headerFacts" class="text-sm text-muted">{{ headerFacts }}</p>
        <div v-if="showsCharacterLine" class="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{{ t('song.performedBy') }}</span>
          <CharacterChips :names="characters" size="sm" />
        </div>
      </header>

      <UAlert
        v-if="songNote"
        color="neutral"
        variant="subtle"
        icon="i-lucide-info"
        :title="t('song.playVersion')"
        :description="songNote"
      />

      <UCard v-if="variantRows.length > 0">
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">{{ t('song.otherVersions') }}</h2>
        </template>
        <ul class="space-y-3 text-sm">
          <li v-for="row in variantRows" :key="row.id" class="space-y-1">
            <div class="flex flex-wrap items-baseline gap-2">
              <UBadge color="secondary" variant="subtle" size="sm">{{ row.kindLabel }}</UBadge>
              <ULink :to="songHref(row.id)" class="text-highlighted">{{ row.name }}</ULink>
              <ULink
                v-if="vocadbSongUrl(row.id)"
                :to="vocadbSongUrl(row.id) ?? ''"
                target="_blank"
                class="text-dimmed hover:text-primary"
                aria-label="VocaDB"
              >
                <UIcon name="i-lucide-external-link" class="size-3" />
              </ULink>
            </div>
            <p v-if="row.producerNames.length > 0" class="text-xs text-muted">
              <template v-if="row.producerNames.length > 0">
                {{ t('song.producer') }}
                <template v-for="(name, nameIndex) in row.producerNames" :key="name">
                  <span v-if="nameIndex > 0">{{ t('setlist.join') }}</span>
                  <NuxtLink :to="producerPath(name)" class="text-muted no-underline hover:text-primary">{{ name }}</NuxtLink>
                </template>
              </template>
            </p>
            <div v-if="row.characters.length > 0" class="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>{{ t('song.performedBy') }}</span>
              <CharacterChips :names="row.characters" />
            </div>
          </li>
        </ul>
      </UCard>

      <TableSection
        :title="t('song.appearances')"
        :count="t('song.appearancesCount', { performances: appearances.length, series: seriesCount })"
        :fill="false"
        v-model:sorting="appearanceSorting"
        :data="appearances"
        :columns="appearanceColumns"
        empty-icon="i-lucide-calendar-x"
        :empty-title="t('song.noAppearances')"
        :empty-description="t('song.noAppearancesDesc')"
      >
        <template #date-cell="{ row }">
          <span class="font-mono text-muted">{{ row.original.date ?? '—' }}</span>
        </template>
        <template #seriesLabel-cell="{ row }">
          <NuxtLink
            :to="`/series/${row.original.seriesId}`"
            class="text-primary"
            :title="row.original.seriesName"
          >
            {{ row.original.seriesLabel }}
          </NuxtLink>
        </template>
        <template #performanceName-cell="{ row }">
          <NuxtLink :to="`/shows/${row.original.performanceId}`" class="text-primary">{{ row.original.performanceName || '—' }}</NuxtLink>
        </template>
        <template #noteText-cell="{ row }">
          <span class="text-xs">
            <template v-for="(part, partIndex) in row.original.noteParts" :key="`${part.warning ? 'w' : 'm'}:${part.text}`">
              <span v-if="partIndex > 0" class="text-muted">{{ t('setlist.join') }}</span>
              <span :class="part.warning ? 'text-warning' : 'text-muted'">{{ part.text }}</span>
            </template>
            <span v-if="row.original.noteParts.length === 0" class="text-muted">—</span>
          </span>
        </template>
      </TableSection>

      <TableSection
        :title="t('song.videos')"
        :fill="false"
        :data="videoRows"
        :columns="videoColumns"
        empty-icon="i-lucide-video-off"
        :empty-title="t('song.noVideos')"
        :empty-description="outsideVocaDB ? t('song.noVideosOutside') : t('song.noVideosVocadb')"
      >
        <template #platform-cell="{ row }">
          <span class="text-muted">{{ row.original.platform }}</span>
        </template>
        <template #title-cell="{ row }">
          <span class="text-muted">{{ row.original.title }}</span>
        </template>
        <template #pvType-cell="{ row }">
          <span class="text-muted">{{ row.original.pvType }}</span>
        </template>
        <template #publishDate-cell="{ row }">
          <span class="font-mono text-muted">{{ row.original.publishDate }}</span>
        </template>
        <template #url-cell="{ row }">
          <ULink :to="row.original.url" target="_blank" class="text-primary">{{ t('common.open') }}</ULink>
        </template>
      </TableSection>
    </template>
  </main>
</template>
