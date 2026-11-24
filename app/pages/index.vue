<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useCatalog } from '~/composables/useCatalog.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useLocale } from '~/composables/useLocale.ts'
import {
  HOMEPAGE_FEATURE_MODULES,
  HOMEPAGE_STAT_TILE_HREFS,
  buildSiteWideStats,
  buildUpcomingConcerts,
  type RecentConcert,
} from '~~/shared/homepage.ts'
import { buildRecentSetlistBannerSlides } from '~~/shared/homepage-carousel.ts'
import type { PerformanceStatusValue } from '~~/shared/types.ts'
import type { MessageKey } from '~~/shared/i18n/index.ts'

definePageMeta({ layout: 'home' })

const { catalog, error, pending, load } = useCatalog()
const { localizePerformanceSeries } = useSeriesTitles()
const { localizePlace } = usePlaceNames()
const { locale, t } = useLocale()

/** English and Korean site titles need a space on the desktop single-line heading; Chinese and Japanese do not. */
const headingJoinSpace = computed(() => locale.value === 'en' || locale.value === 'ko')


/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

/** Clock used to split upcoming vs already-started concerts for this page load. */
const now = new Date()

const stats = computed(() => (catalog.value ? buildSiteWideStats(catalog.value) : null))
const upcomingConcerts = computed(() => (catalog.value ? buildUpcomingConcerts(catalog.value, now) : []))
const carouselSlides = computed(() =>
  catalog.value ? buildRecentSetlistBannerSlides(catalog.value) : [],
)

type ConcertSection = {
  id: 'upcoming'
  headingId: string
  titleKey: MessageKey
  emptyKey: MessageKey
  concerts: RecentConcert[]
}

type StatTile = {
  id: keyof typeof HOMEPAGE_STAT_TILE_HREFS
  labelKey: MessageKey
  icon: string
  value: string
  to: (typeof HOMEPAGE_STAT_TILE_HREFS)[keyof typeof HOMEPAGE_STAT_TILE_HREFS]
}

/** Homepage concert sections: Recent first, then Upcoming, in document and visual order. */
const concertSections = computed((): ConcertSection[] => [
  {
    id: 'upcoming',
    headingId: 'home-upcoming-heading',
    titleKey: 'home.upcomingTitle',
    emptyKey: 'home.upcomingEmpty',
    concerts: upcomingConcerts.value,
  },
])

/** Compact tiles for the four core catalog counts already computed by `buildSiteWideStats`. */
const statTiles = computed((): StatTile[] => {
  const current = stats.value
  if (current === null) return []
  return [
    { id: 'songs', labelKey: 'home.statSongs', icon: 'i-lucide-music', value: String(current.songs), to: HOMEPAGE_STAT_TILE_HREFS.songs },
    { id: 'shows', labelKey: 'home.statShows', icon: 'i-lucide-mic-vocal', value: String(current.shows), to: HOMEPAGE_STAT_TILE_HREFS.shows },
    { id: 'performances', labelKey: 'home.statPerformances', icon: 'i-lucide-ticket', value: String(current.performances), to: HOMEPAGE_STAT_TILE_HREFS.performances },
    { id: 'series', labelKey: 'home.statSeries', icon: 'i-lucide-layers', value: String(current.series), to: HOMEPAGE_STAT_TILE_HREFS.series },
  ]
})

const seriesNameOf = (seriesId: number): string =>
  catalog.value?.series.find((row) => row.id === seriesId)?.name ?? ''

/** Localized concert name, then place names, matching the series index. */
const concertLabel = (row: RecentConcert): string =>
  localizePlace(localizePerformanceSeries(row.name, seriesNameOf(row.seriesId), row.seriesNumber))

const venueLabel = (row: RecentConcert): string | null => (row.venue ? localizePlace(row.venue) : null)

const statusLabel = (status: PerformanceStatusValue): string => {
  if (status === 'cancelled') return t('home.statusCancelled')
  if (status === 'postponed') return t('home.statusPostponed')
  return t('home.statusUpcoming')
}

useHead({ title: computed(() => t('home.title')) })
</script>

<template>
  <main>
    <h1 class="sr-only">{{ t('home.heading1') }}<template v-if="headingJoinSpace">{{ " " }}</template>{{ t('home.heading2') }}</h1>

    <div v-if="error" class="mx-auto max-w-body px-4 pt-8 sm:px-6">
      <UAlert
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="t('common.catalogError')"
        :description="error"
      />
    </div>

    <div v-else-if="pending && !catalog" class="mx-auto max-w-body px-4 pt-8 sm:px-6">
      <PageSkeleton />
    </div>

    <template v-else-if="catalog">
      <HomeSetlistCarousel :slides="carouselSlides" />

      <div class="mx-auto max-w-body space-y-10 px-4 pt-8 pb-10 sm:px-6">
      <section :aria-label="t('home.statsTitle')">
        <ul v-if="statTiles.length > 0" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <li v-for="tile in statTiles" :key="tile.id">
            <NuxtLink
              :to="tile.to"
              class="block rounded-xl bg-default/60 p-3 text-inherit no-underline ring-1 ring-default transition-colors hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div class="flex items-start gap-2">
                <UIcon :name="tile.icon" class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div class="min-w-0">
                  <p class="text-xs leading-4 text-muted">{{ t(tile.labelKey) }}</p>
                  <p class="mt-1 text-2xl font-semibold tabular-nums text-highlighted">
                    {{ tile.value }}
                  </p>
                </div>
              </div>
            </NuxtLink>
          </li>
        </ul>
      </section>


      <section
        v-for="block in concertSections"
        :key="block.id"
        :aria-labelledby="block.headingId"
      >
        <h2 :id="block.headingId" class="text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
          {{ t(block.titleKey) }}
        </h2>
        <p v-if="block.concerts.length === 0" class="mt-4 text-sm text-muted">
          {{ t(block.emptyKey) }}
        </p>
        <ul v-else class="mt-4 grid gap-3 sm:grid-cols-2">
          <li v-for="concert in block.concerts" :key="concert.id">
            <UCard class="h-full">
              <div class="flex flex-col gap-2">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <NuxtLink
                    :to="concert.href"
                    class="min-w-0 text-base font-semibold text-highlighted no-underline hover:text-primary hover:underline"
                  >
                    {{ concertLabel(concert) }}
                  </NuxtLink>
                  <UBadge
                    v-if="concert.status"
                    color="neutral"
                    variant="subtle"
                    size="sm"
                  >
                    {{ statusLabel(concert.status) }}
                  </UBadge>
                </div>
                <dl class="grid gap-1 text-sm text-muted">
                  <div class="flex flex-wrap gap-x-2">
                    <dt class="font-medium text-default">{{ t('home.concertDate') }}</dt>
                    <dd>{{ concert.dates ?? concert.startDate }}</dd>
                  </div>
                  <div v-if="venueLabel(concert)" class="flex flex-wrap gap-x-2">
                    <dt class="font-medium text-default">{{ t('home.venue') }}</dt>
                    <dd>{{ venueLabel(concert) }}</dd>
                  </div>
                </dl>
              </div>
            </UCard>
          </li>
        </ul>
      </section>

      <section aria-labelledby="home-features-heading">
        <h2 id="home-features-heading" class="text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
          {{ t('home.featuresTitle') }}
        </h2>
        <ul class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <li v-for="module in HOMEPAGE_FEATURE_MODULES" :key="module.id">
            <NuxtLink :to="module.to" class="block h-full text-inherit no-underline">
              <UCard class="h-full transition-colors hover:ring-primary/40">
                <div class="flex items-center gap-3">
                  <UIcon :name="module.icon" class="size-5 shrink-0 text-primary" aria-hidden="true" />
                  <h3 class="text-base font-semibold text-highlighted">
                    {{ t(module.titleKey) }}
                  </h3>
                </div>
              </UCard>
            </NuxtLink>
          </li>
        </ul>
      </section>
      </div>
    </template>
  </main>
</template>
