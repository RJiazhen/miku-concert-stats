<script setup lang="ts">
import { computed } from 'vue'
import { albumIdFromSongListId, albumSetlistSources } from '~~/shared/album-setlists.ts'
import { catalogSchedules } from '~~/shared/performance-setlists.ts'
import { performanceDateLabel } from '~~/shared/performance-date-label.ts'
import { performanceHeaderFacts } from '~~/shared/performance-header.ts'
import { fromVocaDB } from '~~/shared/repertoire.ts'
import { showSourceButtons } from '~~/shared/show-source-buttons.ts'
import type { Catalog, PerformanceRow, PerformanceStatusRow } from '~~/shared/types.ts'
import { useLocale } from '~/composables/useLocale.ts'
import { useVenueNames } from '~/composables/useVenueNames.ts'

const props = defineProps<{
  catalog: Catalog
  performance: PerformanceRow
  /** Localized performance title already resolved by the parent. */
  label: string
  /** Localized city name, or null when unresolved. */
  cityName: string | null
  statusNote: PerformanceStatusRow | null
}>()

const { t } = useLocale()
const { localizeVenue } = useVenueNames()

/** 场次 of this 演出, using the day/night dates stored in the catalog. */
const shows = computed(() => catalogSchedules(props.catalog, t).get(props.performance.id) ?? [])

/** Date span, venue, and start time printed under the title. */
const headerFacts = computed(() => {
  const facts = performanceHeaderFacts(props.performance)
  return { ...facts, venue: localizeVenue(facts.venue) }
})

/** Derived setlist row for VocaDB / wiki URL resolution. */
const setlistRow = computed(
  () => props.catalog.performanceSetlists.find((row) => row.performance_id === props.performance.id) ?? null,
)

/** Album behind this performance's setlist when applicable. */
const albumSource = computed(() => {
  const listId = props.performance.song_list_id
  if (listId === null || listId === undefined) return null
  const fromWiki = props.catalog.performanceShowSetlistItems.some(
    (row) => row.performance_id === props.performance.id && row.evidence === 'wiki',
  )
  if (fromWiki) return null
  return albumSetlistSources(props.catalog, [listId])[0] ?? null
})

/** VocaDB song-list page, or null when rows are album/wiki. */
const vocaDBListUrl = computed(() => {
  const row = setlistRow.value
  if (!row || row.source_kind === 'wiki' || row.source_list_id === null) return null
  if (albumIdFromSongListId(row.source_list_id) !== null) return null
  return `https://vocadb.net/L/${row.source_list_id}`
})

/** Header source buttons for this stop. */
const sourceButtons = computed(() =>
  showSourceButtons({
    sourceUrl: props.performance.source_url,
    fromVocaDB: fromVocaDB(props.performance),
    vocaDBListUrl: vocaDBListUrl.value,
    albumUrl: albumSource.value?.url ?? null,
    setlistSources: props.catalog.performanceSetlistSources.filter(
      (row) => row.performance_id === props.performance.id,
    ),
  }),
)

/** One-line facts: date, city, venue, showtime. */
const headerLine = computed(() => {
  const facts = headerFacts.value
  const dateText = performanceDateLabel(props.performance.start_date, t, {
    endDate: props.performance.end_date,
    status: props.statusNote?.status,
  })
  const parts = [
    dateText,
    props.cityName,
    facts.venue,
    facts.showtime ? t('show.showtime', { time: facts.showtime }) : null,
  ]
  return parts.filter((part): part is string => part !== null && part !== '').join(' · ')
})

/** Compact `M/D 日场` label for multi-day runs. */
const shortShowLabel = (show: { date: string; half: 'day' | 'night' | null; label: string }): string => {
  if (show.date === '') return show.label
  const monthDay = `${Number(show.date.slice(5, 7))}/${Number(show.date.slice(8, 10))}`
  if (show.half === 'day') return `${monthDay} ${t('common.dayShow')}`
  if (show.half === 'night') return `${monthDay} ${t('common.nightShow')}`
  return monthDay
}

/** 场次 labels under the header. */
const showLabelsInHeader = computed<string[]>(() => {
  const facts = headerFacts.value
  const singleDay = facts.dates !== null && facts.dates === props.performance.start_date
  if (!singleDay) return shows.value.map(shortShowLabel)
  return shows.value.flatMap((show) => {
    if (show.half === 'day') return [t('common.dayShow')]
    if (show.half === 'night') return [t('common.nightShow')]
    return []
  })
})

/** Whether the catalog derived a 场次 layer for this 演出. */
const hasDerived = computed(
  () => props.catalog.performanceSetlists.some((row) => row.performance_id === props.performance.id),
)
</script>

<template>
  <section class="space-y-3" :id="`p-${performance.id}`">
    <header class="space-y-1">
      <h2 class="text-lg font-semibold tracking-tight text-highlighted">{{ label }}</h2>
      <p class="text-sm text-muted">{{ headerLine }}</p>
      <p v-if="showLabelsInHeader.length > 0" class="text-xs text-muted">
        {{ t('show.showsHeading', { n: shows.length }) }}
        <template v-for="(showLabel, index) in showLabelsInHeader" :key="index">
          <span v-if="index > 0"> · </span>
          <span class="text-highlighted">{{ showLabel }}</span>
        </template>
      </p>
      <div class="flex flex-wrap gap-2 text-xs">
        <UButton
          v-for="button in sourceButtons"
          :key="button.url"
          :to="button.url"
          :title="button.title"
          target="_blank"
          color="neutral"
          variant="outline"
          size="xs"
          icon="i-lucide-external-link"
        >
          {{ t(button.labelKey) }}
        </UButton>
      </div>
    </header>

    <UAlert
      v-if="statusNote"
      :color="statusNote.status === 'cancelled' ? 'error' : 'warning'"
      variant="subtle"
      icon="i-lucide-calendar-x"
      :title="
        statusNote.status === 'cancelled'
          ? t('show.cancelled')
          : statusNote.status === 'postponed'
            ? t('show.postponed')
            : t('show.upcoming')
      "
      :description="statusNote.note ?? undefined"
    >
      <template #actions>
        <UButton
          :to="statusNote.source_url"
          target="_blank"
          color="neutral"
          variant="outline"
          size="xs"
          icon="i-lucide-external-link"
        >
          {{ t('common.source') }}
        </UButton>
      </template>
    </UAlert>
    <UAlert
      v-if="performance.song_list_id === null && !statusNote && !hasDerived"
      color="warning"
      variant="subtle"
      icon="i-lucide-info"
      :title="t('show.noSetlist')"
    />
  </section>
</template>
