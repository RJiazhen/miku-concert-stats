<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useCatalog } from '~/composables/useCatalog.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useLocale } from '~/composables/useLocale.ts'
import {
  HOMEPAGE_FEATURE_MODULES,
  buildRecentConcerts,
  buildRelatedConcertLinks,
  buildSiteWideStats,
  buildUpcomingConcerts,
  type ClassifiedWebsiteKind,
  type ClassifiedWebsiteLink,
  type RecentConcert,
  websiteHostLabel,
} from '~~/shared/homepage.ts'
import type { PerformanceStatusValue } from '~~/shared/types.ts'
import type { MessageKey } from '~~/shared/i18n/index.ts'

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
const recentConcerts = computed(() => (catalog.value ? buildRecentConcerts(catalog.value, undefined, now) : []))
const relatedWebsiteLinks = computed(() => (catalog.value ? buildRelatedConcertLinks(catalog.value).websites : []))

type ConcertSection = {
  id: 'upcoming' | 'recent'
  headingId: string
  titleKey: MessageKey
  emptyKey: MessageKey
  concerts: RecentConcert[]
}

type StatTile = {
  id: string
  labelKey: MessageKey
  icon: string
  value: string
}

/** Homepage concert sections: Recent first, then Upcoming, in document and visual order. */
const concertSections = computed((): ConcertSection[] => [
  {
    id: 'recent',
    headingId: 'home-recent-heading',
    titleKey: 'home.recentTitle',
    emptyKey: 'home.recentEmpty',
    concerts: recentConcerts.value,
  },
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
    { id: 'songs', labelKey: 'home.statSongs', icon: 'i-lucide-music', value: String(current.songs) },
    { id: 'shows', labelKey: 'home.statShows', icon: 'i-lucide-mic-vocal', value: String(current.shows) },
    { id: 'performances', labelKey: 'home.statPerformances', icon: 'i-lucide-ticket', value: String(current.performances) },
    { id: 'series', labelKey: 'home.statSeries', icon: 'i-lucide-layers', value: String(current.series) },
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

const websiteKindLabel = (kind: ClassifiedWebsiteKind): string =>
  kind === 'official-website' ? t('home.officialWebsite') : t('home.websiteUnconfirmed')

const concertHref = (performanceId: number): string => `/shows/${performanceId}`

const concertNameOf = (performanceId: number): string => {
  const row = upcomingConcerts.value.find((item) => item.id === performanceId)
    ?? recentConcerts.value.find((item) => item.id === performanceId)
    ?? catalog.value?.performances.find((item) => item.id === performanceId)
  if (!row) return String(performanceId)
  if ('seriesId' in row) return concertLabel(row)
  return localizePlace(localizePerformanceSeries(row.name, seriesNameOf(row.series_id), row.series_number))
}

const externalWebsiteLabel = (link: ClassifiedWebsiteLink): string =>
  [concertNameOf(link.performanceId), websiteKindLabel(link.kind), websiteHostLabel(link.url), t('home.externalLink')].join(' · ')

useHead({ title: computed(() => t('home.title')) })
</script>

<template>
  <main class="space-y-10">
    <section class="pt-4 sm:pt-8">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Hatsune Miku Concert Statistics</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-5xl">
        {{ t('home.heading1') }}<br class="sm:hidden"><span v-if="headingJoinSpace" class="hidden sm:inline">{{ " " }}</span>{{ t('home.heading2') }}
      </h1>
    </section>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('common.catalogError')"
      :description="error"
    />

    <PageSkeleton v-else-if="pending && !catalog" />

    <template v-else-if="catalog">
      <section :aria-label="t('home.statsTitle')">
        <ul v-if="statTiles.length > 0" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <li
            v-for="tile in statTiles"
            :key="tile.id"
            class="rounded-xl bg-default/60 p-3 ring-1 ring-default"
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

      <section aria-labelledby="home-links-heading">
        <h2 id="home-links-heading" class="text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
          {{ t('home.linksTitle') }}
        </h2>
        <ul v-if="relatedWebsiteLinks.length > 0" class="mt-4 grid gap-3 sm:grid-cols-2">
          <li
            v-for="link in relatedWebsiteLinks"
            :key="`${link.performanceId}-${link.url}`"
            class="rounded-xl bg-default/60 p-3 ring-1 ring-default"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <NuxtLink
                :to="concertHref(link.performanceId)"
                class="min-w-0 text-sm font-semibold text-highlighted no-underline hover:text-primary hover:underline"
              >
                {{ concertNameOf(link.performanceId) }}
              </NuxtLink>
              <UBadge
                :color="link.kind === 'official-website' ? 'primary' : 'neutral'"
                variant="subtle"
                size="sm"
                class="shrink-0"
              >
                {{ websiteKindLabel(link.kind) }}
              </UBadge>
            </div>
            <ULink
              :to="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-2 inline-flex min-w-0 max-w-full items-center gap-1 text-sm text-primary"
              :aria-label="externalWebsiteLabel(link)"
            >
              <UIcon name="i-lucide-external-link" class="size-3.5 shrink-0" aria-hidden="true" />
              <span class="truncate">{{ websiteHostLabel(link.url) }}</span>
            </ULink>
          </li>
        </ul>
        <p v-else class="mt-4 text-sm text-muted">
          {{ t('home.officialEmpty') }}
        </p>
      </section>
    </template>
  </main>
</template>
