<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
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
} from '~~/shared/tour-setlists.ts'
import {
  parseTours,
  performanceIdFromTourHash,
  tourPath,
} from '~~/shared/tours.ts'
import type { PerformanceRow } from '~~/shared/types.ts'
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

/** City tabs for setlist switching. */
const setlistTabs = computed(() =>
  buildTourSetlistTabs(
    stopEntries.value.map((entry) => ({
      performanceId: entry.performance.id,
      cityLabel: entry.cityTabLabel,
      startDate: entry.performance.start_date,
      hasSetlist: entry.hasSetlist,
    })),
  ),
)

/** Active setlist/stop performance id (string for UTabs). */
const activeStopId = ref<string>('')

/** Ensures the active tab points at a valid setlist stop. */
const syncActiveStop = (): void => {
  const tabs = setlistTabs.value.tabs
  if (tabs.length === 0) {
    activeStopId.value = stopEntries.value[0] ? String(stopEntries.value[0].performance.id) : ''
    return
  }
  const hashId = performanceIdFromTourHash(route.hash)
  if (hashId !== null && tabs.some((tab) => tab.performanceId === hashId)) {
    activeStopId.value = String(hashId)
    return
  }
  if (tabs.some((tab) => tab.value === activeStopId.value)) return
  activeStopId.value = tabs[0]?.value ?? ''
}

watch([stopEntries, () => route.hash], syncActiveStop, { immediate: true })

/** Active stop entry for facts + setlist. */
const activeEntry = computed(
  () =>
    stopEntries.value.find((entry) => String(entry.performance.id) === activeStopId.value) ??
    stopEntries.value[0] ??
    null,
)

/** Scrolls the active stop into view after hash / tab changes. */
const scrollToActiveStop = async (): Promise<void> => {
  await nextTick()
  const id = activeEntry.value?.performance.id
  if (id === undefined) return
  document.getElementById(`p-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

watch(activeStopId, (value, previous) => {
  if (!value || value === previous) return
  const nextHash = `#p-${value}`
  if (route.hash !== nextHash) {
    void navigateTo({ path: tourPath(tourId.value), hash: nextHash }, { replace: true })
  }
  void scrollToActiveStop()
})

onMounted(() => {
  if (route.hash) void scrollToActiveStop()
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

/** Selects a stop from the overview list and updates the hash. */
const selectStop = (performanceId: number): void => {
  activeStopId.value = String(performanceId)
  const path = tourPath(tourId.value)
  void navigateTo({ path, hash: `#p-${performanceId}` }, { replace: true })
}

useHead({ title: computed(() => tour.value?.name || t('tour.notFound')) })
</script>

<template>
  <main class="space-y-6">
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

      <header class="space-y-3">
        <div class="space-y-2">
          <h1 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">{{ tour.name }}</h1>
          <p v-if="dateSpan" class="text-sm text-muted">{{ dateSpan }}</p>
          <p class="text-sm text-muted">
            {{ t('tour.pageSummary', { performances: stopEntries.length, shows: totalShows }) }}
            <template v-if="distinctSongCount > 0">
              · {{ t('tour.songCount', { n: distinctSongCount }) }}
            </template>
          </p>
          <p v-if="seriesView && series" class="text-xs text-muted">
            <NuxtLink :to="`/series/${series.id}`" class="text-primary hover:underline">
              {{ t('tour.seriesLabel', { name: seriesView.primary }) }}
            </NuxtLink>
          </p>
          <div v-if="tour.sourceUrl" class="flex flex-wrap gap-2 text-xs">
            <UButton
              :to="tour.sourceUrl"
              target="_blank"
              color="neutral"
              variant="outline"
              size="xs"
              icon="i-lucide-external-link"
            >
              {{ t('tour.officialSource') }}
            </UButton>
          </div>
        </div>
        <img
          v-if="poster"
          :src="poster.src"
          :alt="poster.sourceLabel || tour.name"
          class="max-h-80 w-full max-w-md object-contain object-left"
          loading="lazy"
        >
      </header>

      <section v-if="stopEntries.length > 0" class="space-y-2">
        <h2 class="text-base font-semibold text-highlighted">{{ t('tour.stopsHeading') }}</h2>
        <ul class="divide-y divide-default/40">
          <li
            v-for="entry in stopEntries"
            :key="entry.performance.id"
            class="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div class="min-w-0 space-y-1">
              <button
                type="button"
                class="text-left text-primary hover:underline"
                @click="selectStop(entry.performance.id)"
              >
                {{ entry.label }}
              </button>
              <p class="text-xs text-muted">
                {{ entry.dates }}
                <template v-if="entry.venue">· {{ entry.venue }}</template>
                {{ t('tour.showCountLine', { n: entry.showCount }) }}
                <template v-if="!entry.hasSetlist">{{ t('series.noSetlistLine') }}</template>
              </p>
            </div>
          </li>
        </ul>
      </section>

      <template v-if="activeEntry">
        <TourStopFacts
          v-if="catalog"
          :catalog="catalog"
          :performance="activeEntry.performance"
          :label="activeEntry.label"
          :city-name="activeEntry.cityName"
          :status-note="activeEntry.statusNote"
        />

        <section class="space-y-3">
          <h2 class="text-base font-semibold text-highlighted">{{ t('tour.setlistHeading') }}</h2>
          <UAlert
            v-if="setlistTabs.tabs.length === 0"
            color="warning"
            variant="subtle"
            icon="i-lucide-info"
            :title="t('tour.noSetlistStops')"
          />
          <template v-else>
            <UTabs
              v-if="setlistTabs.useTabs"
              v-model="activeStopId"
              :items="setlistTabs.tabs"
              class="w-full"
              :content="false"
            />
            <ShowSetlistSection
              v-if="catalog && activeEntry.hasSetlist"
              :catalog="catalog"
              :performance-id="activeEntry.performance.id"
            />
          </template>
        </section>
      </template>
    </template>
  </main>
</template>
