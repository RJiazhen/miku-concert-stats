<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import toursFile from '~~/data/tours.json'
import { buildCityIndex, cityLabel, matchCity } from '~~/shared/cities.ts'
import { posterForTour } from '~~/shared/homepage-carousel.ts'
import { performanceDateLabel, performanceStatusOf } from '~~/shared/performance-date-label.ts'
import { setlistPerformanceIds, showCountsByPerformance } from '~~/shared/performance-setlists.ts'
import { reviewRotations } from '~~/shared/rotation.ts'
import {
  buildTourSetlistTabs,
  compareTourStops,
  tourSetlistGroupForPerformance,
} from '~~/shared/tour-setlists.ts'
import {
  parseTours,
  performanceIdFromTourHash,
  tourPath,
} from '~~/shared/tours.ts'
import type { PerformanceRow } from '~~/shared/types.ts'
import type { TourTimelineStop } from '~/components/TourStopsTimeline.vue'
import { placeNames, usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useCatalog } from '~/composables/useCatalog.ts'
import { useLocale } from '~/composables/useLocale.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { useVenueNames } from '~/composables/useVenueNames.ts'

const route = useRoute()
const { catalog, error, pending, load } = useCatalog()
const { localizePlace } = usePlaceNames()
const { locale, t } = useLocale()
const { localizeVenue } = useVenueNames()
const { localizePerformanceSeries, seriesTitle } = useSeriesTitles()

/** Parsed once: city matcher only depends on the static place list. */
const cityIndex = buildCityIndex(placeNames)
/** Parsed once: tour registry is static build-time data. */
const tours = parseTours(toursFile)

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const tourId = computed(() => String(route.params.id ?? ''))
const tour = computed(() => tours.byId.get(tourId.value) ?? null)

/** Series behind this tour. */
const series = computed(() => {
  const current = tour.value
  if (!catalog.value || !current) return null
  return catalog.value.series.find((row) => row.id === current.seriesId) ?? null
})

const seriesView = computed(() => (series.value ? seriesTitle(series.value.name) : null))

const review = computed(() => (catalog.value ? reviewRotations(catalog.value) : null))

/** 场次 count per 演出. */
const showCounts = computed(() => {
  if (!catalog.value || !review.value) return new Map<number, number>()
  return showCountsByPerformance(catalog.value, review.value)
})

/** 演出 ids that have a setlist. */
const setlistIds = computed(() => (catalog.value ? setlistPerformanceIds(catalog.value) : new Set<number>()))

/** Tour poster when the registry has one. */
const poster = computed(() => (tour.value ? posterForTour(tour.value.id) : null))

/** Whether the lightweight poster lightbox is open. */
const posterLightboxOpen = ref(false)

/** Opens the poster lightbox (click the expanded view or Escape to close). */
const openPosterLightbox = (): void => {
  posterLightboxOpen.value = true
}

/** Closes the poster lightbox. */
const closePosterLightbox = (): void => {
  posterLightboxOpen.value = false
}

/** Dismisses the lightbox when Escape is pressed. */
const onPosterLightboxKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape' || !posterLightboxOpen.value) return
  closePosterLightbox()
}

watch(posterLightboxOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => {
  document.addEventListener('keydown', onPosterLightboxKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onPosterLightboxKeydown)
  document.body.style.overflow = ''
})

/** Localized city label for one 演出. */
const cityNameOf = (performance: PerformanceRow): string | null => {
  const match = matchCity(performance, cityIndex)
  if (match === null) return null
  if (locale.value === 'en') return localizePlace(match.original)
  return cityLabel(cityIndex, match.city, locale.value)
}

/** Chronological stops of this tour that exist in the catalog. */
const stops = computed(() => {
  const current = tour.value
  if (!catalog.value || !current) return []
  const byId = new Map(catalog.value.performances.map((row) => [row.id, row]))
  return current.performanceIds
    .map((id) => byId.get(id))
    .filter((row): row is PerformanceRow => row !== undefined)
    .sort(compareTourStops)
})

/** One overview / tab row per stop. */
const stopEntries = computed(() =>
  stops.value.map((performance) => {
    const status = performanceStatusOf(catalog.value?.performanceStatus ?? [], performance.id)
    const city = cityNameOf(performance)
    return {
      performance,
      label: localizePlace(
        localizePerformanceSeries(performance.name, series.value?.name ?? '', performance.series_number),
      ),
      cityName: city,
      cityTabLabel: city ?? t('tour.unknownCity'),
      dates: performanceDateLabel(performance.start_date, t, {
        endDate: performance.end_date,
        status,
      }),
      venue: localizeVenue(performance.venue_name),
      showCount: showCounts.value.get(performance.id) ?? 0,
      hasSetlist: setlistIds.value.has(performance.id),
      statusNote: catalog.value?.performanceStatus.find((row) => row.performance_id === performance.id) ?? null,
    }
  }),
)

/** Compact `M/D` (or range) for snake nodes. */
const shortStopDate = (startDate: string | null, endDate: string | null): string => {
  if (startDate === null || startDate.length < 10) return '—'
  const start = `${Number(startDate.slice(5, 7))}/${Number(startDate.slice(8, 10))}`
  if (endDate === null || endDate === '' || endDate === startDate || endDate.length < 10) return start
  const end = `${Number(endDate.slice(5, 7))}/${Number(endDate.slice(8, 10))}`
  return `${start}–${end}`
}

/** Compact snake timeline model for the stop rail. */
const timelineStops = computed<TourTimelineStop[]>(() =>
  stopEntries.value.map((entry) => ({
    performanceId: entry.performance.id,
    cityLabel: entry.cityTabLabel,
    dates: shortStopDate(entry.performance.start_date, entry.performance.end_date),
    venue: entry.venue,
    showCount: entry.showCount,
    hasSetlist: entry.hasSetlist,
    status: entry.statusNote?.status ?? null,
  })),
)

/** Total 场次 across the tour. */
const totalShows = computed(() => stopEntries.value.reduce((sum, entry) => sum + entry.showCount, 0))

/** Distinct song ids performed on any stop of this tour. */
const distinctSongCount = computed(() => {
  if (!catalog.value) return 0
  const ids = new Set(stops.value.map((row) => row.id))
  const songs = new Set<number>()
  for (const item of catalog.value.performanceShowSetlistItems) {
    if (!ids.has(item.performance_id)) continue
    if (item.song_id !== null) songs.add(item.song_id)
  }
  return songs.size
})

/** Date span across all dated stops. */
const dateSpan = computed(() => {
  const dates = stopEntries.value
    .map((entry) => entry.performance.start_date)
    .filter((value): value is string => value !== null && value !== '')
    .sort()
  if (dates.length === 0) return null
  const first = dates[0]!
  const lastStop = stopEntries.value[stopEntries.value.length - 1]
  const last = lastStop?.performance.end_date?.trim() || lastStop?.performance.start_date || dates[dates.length - 1]!
  if (first === last) return performanceDateLabel(first, t)
  return `${performanceDateLabel(first, t)} – ${performanceDateLabel(last, t)}`
})

/** One muted summary line under the title. */
const summaryLine = computed(() => {
  const parts = [
    dateSpan.value,
    t('tour.pageSummary', { performances: stopEntries.value.length, shows: totalShows.value }),
    distinctSongCount.value > 0 ? t('tour.songCount', { n: distinctSongCount.value }) : null,
  ]
  return parts.filter((part): part is string => part !== null && part !== '').join(' · ')
})

/** Programme groups / city tabs for setlist switching. */
const setlistView = computed(() => {
  if (!catalog.value) return { groups: [], tabs: [], useTabs: false }
  return buildTourSetlistTabs(
    catalog.value,
    stopEntries.value.map((entry) => ({
      performanceId: entry.performance.id,
      cityLabel: entry.cityTabLabel,
      startDate: entry.performance.start_date,
      hasSetlist: entry.hasSetlist,
    })),
  )
})

/** Active stop performance id (timeline / hash). */
const activeStopId = ref<string>('')

/** Ensures the active stop points at a known tour stop. */
const syncActiveStop = (): void => {
  if (stopEntries.value.length === 0) {
    activeStopId.value = ''
    return
  }
  const hashId = performanceIdFromTourHash(route.hash)
  if (hashId !== null && stopEntries.value.some((entry) => entry.performance.id === hashId)) {
    activeStopId.value = String(hashId)
    return
  }
  if (stopEntries.value.some((entry) => String(entry.performance.id) === activeStopId.value)) return
  const firstGroup = setlistView.value.tabs[0]
  activeStopId.value = firstGroup
    ? String(firstGroup.performanceId)
    : String(stopEntries.value[0]?.performance.id ?? '')
}

watch([stopEntries, setlistView, () => route.hash], syncActiveStop, { immediate: true })

/** Active stop entry for status / hash. */
const activeEntry = computed(
  () =>
    stopEntries.value.find((entry) => String(entry.performance.id) === activeStopId.value) ??
    stopEntries.value[0] ??
    null,
)

/** Programme group for the active stop (shared setlist). */
const activeSetlistGroup = computed(() => {
  const entry = activeEntry.value
  if (entry === null) return setlistView.value.groups[0] ?? null
  return (
    tourSetlistGroupForPerformance(setlistView.value.groups, entry.performance.id) ??
    setlistView.value.groups[0] ??
    null
  )
})

/** Performance id fed to `ShowSetlistSection` (representative of the active programme). */
const setlistPerformanceId = computed(() => activeSetlistGroup.value?.representativeId ?? null)

/**
 * Tab model for distinct programmes. Writing switches to that group's representative stop.
 */
const activeGroupValue = computed({
  get: () => activeSetlistGroup.value?.fingerprint ?? '',
  set: (fingerprint: string) => {
    const group = setlistView.value.groups.find((entry) => entry.fingerprint === fingerprint)
    if (group !== undefined) selectStop(group.representativeId)
  },
})

/**
 * Applies a stop selection from timeline or tabs and keeps the hash in sync.
 * Does not scroll — setlist switches should leave the viewport where it is.
 */
const selectStop = (performanceId: string | number): void => {
  const value = String(performanceId)
  if (!value) return
  activeStopId.value = value
  const nextHash = `#p-${value}`
  if (route.hash !== nextHash) {
    void navigateTo({ path: tourPath(tourId.value), hash: nextHash }, { replace: true })
  }
}

watch(activeStopId, (value, previous) => {
  if (!value || value === previous) return
  const nextHash = `#p-${value}`
  if (route.hash !== nextHash) {
    void navigateTo({ path: tourPath(tourId.value), hash: nextHash }, { replace: true })
  }
})

/** Breadcrumb: series → tour. */
const breadcrumb = computed(() => {
  const current = tour.value
  if (!current) return []
  const items: { label: string; to?: string }[] = []
  if (seriesView.value !== null && series.value) {
    items.push({ label: seriesView.value.primary, to: `/series/${series.value.id}` })
  }
  items.push({ label: current.name, to: tourPath(current.id) })
  return items
})

useHead({ title: computed(() => tour.value?.name || t('tour.notFound')) })
</script>

<template>
  <main class="space-y-8">
    <PageSkeleton v-if="pending" />
    <UAlert v-else-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UEmpty
      v-else-if="catalog && !tour"
      icon="i-lucide-calendar-x"
      :title="t('tour.notFound')"
      :description="t('common.notFoundId')"
    />

    <template v-else-if="tour">
      <UBreadcrumb :items="breadcrumb" />

      <!--
        Wide: title/links + snake under them (left), poster spans right — less vertical gap.
        Narrow: title → poster → snake (DOM order keeps poster before the timeline).
      -->
      <header
        class="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)] md:items-start md:gap-x-10 md:gap-y-4"
      >
        <div class="min-w-0 space-y-3 md:col-start-1 md:row-start-1">
          <h1 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">{{ tour.name }}</h1>
          <p v-if="summaryLine" class="text-sm text-muted">{{ summaryLine }}</p>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <NuxtLink
              v-if="seriesView && series"
              :to="`/series/${series.id}`"
              class="text-primary hover:underline"
            >
              {{ seriesView.primary }}
            </NuxtLink>
            <UButton
              v-if="tour.sourceUrl"
              :to="tour.sourceUrl"
              target="_blank"
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-external-link"
              class="-ms-1.5"
            >
              {{ t('tour.officialSource') }}
            </UButton>
          </div>
        </div>

        <aside
          v-if="poster"
          class="md:col-start-2 md:row-span-2 md:row-start-1 md:sticky md:top-20"
        >
          <button
            type="button"
            class="tour-poster-trigger block w-full cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            :aria-label="t('tour.posterExpand')"
            @click="openPosterLightbox"
          >
            <img
              :src="poster.src"
              :alt="poster.sourceLabel || tour.name"
              class="tour-poster max-h-72 w-full object-contain object-top md:max-h-[28rem]"
              loading="lazy"
            >
          </button>
        </aside>

        <section
          v-if="timelineStops.length > 0"
          class="min-w-0 md:col-start-1 md:row-start-2"
        >
          <h2 class="sr-only">{{ t('tour.stopsHeading') }}</h2>
          <TourStopsTimeline
            :model-value="activeStopId"
            :stops="timelineStops"
            :active-performance-ids="activeSetlistGroup?.performanceIds ?? []"
            @update:model-value="(value) => selectStop(value)"
          />
        </section>
      </header>

      <!-- Lightweight poster lightbox: translucent scrim, click anywhere to dismiss. -->
      <Teleport to="body">
        <button
          v-if="poster && posterLightboxOpen"
          type="button"
          class="tour-poster-lightbox fixed inset-0 z-50 flex cursor-default items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] sm:p-8"
          :aria-label="t('tour.posterDismiss')"
          @click="closePosterLightbox"
        >
          <img
            :src="poster.src"
            :alt="poster.sourceLabel || tour.name"
            class="max-h-[min(92dvh,100%)] max-w-full object-contain"
            draggable="false"
          >
        </button>
      </Teleport>

      <section id="tour-setlist" class="space-y-4">
        <h2 class="sr-only">{{ t('tour.setlistHeading') }}</h2>

        <UAlert
          v-if="activeEntry?.statusNote"
          :color="activeEntry.statusNote.status === 'cancelled' ? 'error' : 'warning'"
          variant="subtle"
          icon="i-lucide-calendar-x"
          :title="
            activeEntry.statusNote.status === 'cancelled'
              ? t('show.cancelled')
              : activeEntry.statusNote.status === 'postponed'
                ? t('show.postponed')
                : t('show.upcoming')
          "
          :description="activeEntry.statusNote.note ?? undefined"
        />

        <UAlert
          v-if="setlistView.tabs.length === 0"
          color="warning"
          variant="subtle"
          icon="i-lucide-info"
          :title="t('tour.noSetlistStops')"
        />
        <ShowSetlistSection
          v-else-if="catalog && setlistPerformanceId !== null"
          :catalog="catalog"
          :performance-id="setlistPerformanceId"
        >
          <template v-if="setlistView.useTabs" #before-table>
            <UTabs
              v-model="activeGroupValue"
              :items="setlistView.tabs"
              class="w-full"
              :content="false"
            />
          </template>
        </ShowSetlistSection>
      </section>
    </template>
  </main>
</template>
