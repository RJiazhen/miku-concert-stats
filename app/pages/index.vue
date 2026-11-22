<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useCatalog } from '~/composables/useCatalog.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useLocale } from '~/composables/useLocale.ts'
import {
  HOMEPAGE_FEATURE_MODULES,
  buildRecentConcerts,
  buildRecentlyUpdatedSummary,
  buildRelatedConcertLinks,
  buildSiteWideStats,
  buildUpcomingConcerts,
  formatSourceTimestamp,
  type ClassifiedWebsiteKind,
  type RecentConcert,
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
const updated = computed(() => (catalog.value ? buildRecentlyUpdatedSummary(catalog.value) : null))
const upcomingConcerts = computed(() => (catalog.value ? buildUpcomingConcerts(catalog.value, now) : []))
const recentConcerts = computed(() => (catalog.value ? buildRecentConcerts(catalog.value, undefined, now) : []))
const relatedLinks = computed(() => (catalog.value ? buildRelatedConcertLinks(catalog.value) : { websites: [], bilibiliRecordings: [] }))

type ConcertSection = {
  id: 'upcoming' | 'recent'
  headingId: string
  titleKey: MessageKey
  descKey: MessageKey
  emptyKey: MessageKey
  concerts: RecentConcert[]
}

/** Homepage concert sections: upcoming first, then at most four already-started concerts. */
const concertSections = computed((): ConcertSection[] => [
  {
    id: 'upcoming',
    headingId: 'home-upcoming-heading',
    titleKey: 'home.upcomingTitle',
    descKey: 'home.upcomingDesc',
    emptyKey: 'home.upcomingEmpty',
    concerts: upcomingConcerts.value,
  },
  {
    id: 'recent',
    headingId: 'home-recent-heading',
    titleKey: 'home.recentTitle',
    descKey: 'home.recentDesc',
    emptyKey: 'home.recentEmpty',
    concerts: recentConcerts.value,
  },
])

/** Newest retrieval batches first; a short list keeps the summary readable. */
const retrievalBatches = computed(() => updated.value?.retrievalBatches.slice(0, 4) ?? [])
/** Newest source-access batches first. */
const accessBatches = computed(() => updated.value?.accessBatches.slice(0, 4) ?? [])

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

const concertYearRange = computed((): string | null => {
  const current = stats.value
  if (current === null || current.firstConcertDate === null || current.lastConcertDate === null) return null
  if (current.firstConcertDate === current.lastConcertDate) return current.firstConcertDate
  return `${current.firstConcertDate} – ${current.lastConcertDate}`
})

const concertHref = (performanceId: number): string => `/shows/${performanceId}`

const concertNameOf = (performanceId: number): string => {
  const row = upcomingConcerts.value.find((item) => item.id === performanceId)
    ?? recentConcerts.value.find((item) => item.id === performanceId)
    ?? catalog.value?.performances.find((item) => item.id === performanceId)
  if (!row) return String(performanceId)
  if ('seriesId' in row) return concertLabel(row)
  return localizePlace(localizePerformanceSeries(row.name, seriesNameOf(row.series_id), row.series_number))
}

useHead({ title: computed(() => t('home.title')) })
</script>

<template>
  <main class="space-y-10">
    <section class="pt-4 sm:pt-8">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Hatsune Miku Concert Statistics</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-5xl">
        {{ t('home.heading1') }}<br class="sm:hidden"><span v-if="headingJoinSpace" class="hidden sm:inline">{{ " " }}</span>{{ t('home.heading2') }}
      </h1>
      <p class="mt-4 max-w-3xl text-sm leading-6 text-muted sm:text-base">
        {{ t('home.intro') }}
      </p>
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
      <section
        v-for="block in concertSections"
        :key="block.id"
        :aria-labelledby="block.headingId"
      >
        <h2 :id="block.headingId" class="text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
          {{ t(block.titleKey) }}
        </h2>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          {{ t(block.descKey) }}
        </p>
        <p v-if="block.concerts.length === 0" class="mt-4 text-sm text-muted">
          {{ t(block.emptyKey) }}
        </p>
        <ul v-else class="mt-4 grid gap-3 sm:grid-cols-2">
          <li v-for="concert in block.concerts" :key="concert.id">
            <UCard class="h-full">
              <div class="flex flex-col gap-3">
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
                <div>
                  <UButton
                    :to="concert.href"
                    color="primary"
                    variant="link"
                    size="xs"
                    trailing-icon="i-lucide-arrow-right"
                  >
                    {{ t('home.viewConcert') }}
                  </UButton>
                </div>
              </div>
            </UCard>
          </li>
        </ul>
      </section>

      <div class="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="home-stats-heading">
          <h2 id="home-stats-heading" class="text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
            {{ t('home.statsTitle') }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-muted">
            {{ t('home.statsDesc') }}
          </p>
          <ul v-if="stats" class="mt-4 grid grid-cols-2 gap-3">
            <li class="rounded-xl bg-default/60 p-3 ring-1 ring-default">
              <p class="text-xs text-muted">{{ t('home.statSeries') }}</p>
              <p class="mt-1 text-2xl font-semibold tabular-nums text-highlighted">{{ stats.series }}</p>
            </li>
            <li class="rounded-xl bg-default/60 p-3 ring-1 ring-default">
              <p class="text-xs text-muted">{{ t('home.statPerformances') }}</p>
              <p class="mt-1 text-2xl font-semibold tabular-nums text-highlighted">{{ stats.performances }}</p>
            </li>
            <li class="rounded-xl bg-default/60 p-3 ring-1 ring-default">
              <p class="text-xs text-muted">{{ t('home.statShows') }}</p>
              <p class="mt-1 text-2xl font-semibold tabular-nums text-highlighted">{{ stats.shows }}</p>
            </li>
            <li class="rounded-xl bg-default/60 p-3 ring-1 ring-default">
              <p class="text-xs text-muted">{{ t('home.statSongs') }}</p>
              <p class="mt-1 text-2xl font-semibold tabular-nums text-highlighted">{{ stats.songs }}</p>
            </li>
          </ul>
          <dl v-if="stats" class="mt-4 space-y-2 text-sm">
            <div class="flex flex-wrap gap-x-2">
              <dt class="text-muted">{{ t('home.statConcertDateRange') }}</dt>
              <dd class="tabular-nums text-highlighted">{{ concertYearRange ?? '—' }}</dd>
            </div>
            <div class="flex flex-wrap gap-x-2">
              <dt class="text-muted">{{ t('home.statSetlists') }}</dt>
              <dd class="tabular-nums text-highlighted">{{ stats.performancesWithSetlist }}</dd>
            </div>
            <div class="flex flex-wrap gap-x-2">
              <dt class="text-muted">{{ t('home.statCancelled') }}</dt>
              <dd class="tabular-nums text-highlighted">{{ stats.cancelledPerformances }}</dd>
            </div>
            <div class="flex flex-wrap gap-x-2">
              <dt class="text-muted">{{ t('home.statBroadcast') }}</dt>
              <dd class="tabular-nums text-highlighted">{{ stats.broadcastPerformances }}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="home-updated-heading">
          <h2 id="home-updated-heading" class="text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
            {{ t('home.updatedTitle') }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-muted">
            {{ t('home.updatedDesc') }}
          </p>
          <div v-if="updated && (updated.latestRetrievedAt || updated.latestAccessedAt)" class="mt-4 space-y-5">
            <div v-if="updated.latestRetrievedAt">
              <h3 class="text-sm font-medium text-default">{{ t('home.latestRetrieved') }}</h3>
              <ol class="mt-2 space-y-3">
                <li v-for="batch in retrievalBatches" :key="batch.retrievedAt" class="rounded-xl bg-default/60 p-3 ring-1 ring-default">
                  <p class="text-sm font-medium tabular-nums text-highlighted">
                    {{ t('home.retrievedAt', { stamp: formatSourceTimestamp(batch.retrievedAt) }) }}
                  </p>
                  <p class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                    <span v-if="batch.series">{{ t('home.retrievedSeries', { n: batch.series }) }}</span>
                    <span v-if="batch.performances">{{ t('home.retrievedPerformances', { n: batch.performances }) }}</span>
                    <span v-if="batch.songs">{{ t('home.retrievedSongs', { n: batch.songs }) }}</span>
                    <span v-if="batch.songLists">{{ t('home.retrievedSongLists', { n: batch.songLists }) }}</span>
                  </p>
                </li>
              </ol>
            </div>
            <div v-if="updated.latestAccessedAt">
              <h3 class="text-sm font-medium text-default">{{ t('home.latestAccessed') }}</h3>
              <ol class="mt-2 space-y-3">
                <li v-for="batch in accessBatches" :key="batch.accessedAt" class="rounded-xl bg-default/60 p-3 ring-1 ring-default">
                  <p class="text-sm font-medium tabular-nums text-highlighted">
                    {{ t('home.accessedAt', { stamp: formatSourceTimestamp(batch.accessedAt) }) }}
                  </p>
                  <p class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                    <span v-if="batch.setlistSources">{{ t('home.accessedSetlistSources', { n: batch.setlistSources }) }}</span>
                    <span v-if="batch.performanceStatus">{{ t('home.accessedStatus', { n: batch.performanceStatus }) }}</span>
                  </p>
                </li>
              </ol>
            </div>
          </div>
          <p v-else class="mt-4 text-sm text-muted">
            {{ t('home.updatedEmpty') }}
          </p>
        </section>
      </div>

      <section aria-labelledby="home-features-heading">
        <h2 id="home-features-heading" class="text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
          {{ t('home.featuresTitle') }}
        </h2>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          {{ t('home.featuresDesc') }}
        </p>
        <ul class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <li v-for="module in HOMEPAGE_FEATURE_MODULES" :key="module.id">
            <NuxtLink :to="module.to" class="block h-full text-inherit no-underline">
              <UCard class="h-full transition-colors hover:ring-primary/40">
                <div class="flex items-start gap-3">
                  <UIcon :name="module.icon" class="mt-0.5 size-5 shrink-0 text-primary" />
                  <div class="min-w-0">
                    <h3 class="text-base font-semibold text-highlighted">
                      {{ t(module.titleKey) }}
                    </h3>
                    <p class="mt-1 text-sm leading-6 text-muted">
                      {{ t(module.descKey) }}
                    </p>
                  </div>
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
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          {{ t('home.linksDesc') }}
        </p>
        <div class="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 class="text-sm font-medium text-default">{{ t('home.officialWebsitesTitle') }}</h3>
            <p class="mt-1 text-sm leading-6 text-muted">
              {{ t('home.officialWebsitesDesc') }}
            </p>
            <ul v-if="relatedLinks.websites.length > 0" class="mt-3 space-y-3">
              <li v-for="link in relatedLinks.websites" :key="`${link.performanceId}-${link.url}`">
                <p class="text-sm">
                  <NuxtLink :to="concertHref(link.performanceId)" class="text-highlighted no-underline hover:text-primary hover:underline">
                    {{ concertNameOf(link.performanceId) }}
                  </NuxtLink>
                </p>
                <p>
                  <ULink
                    :to="link.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm text-primary"
                  >
                    {{ link.url }}
                  </ULink>
                </p>
                <p class="mt-0.5 text-xs text-muted">
                  {{ websiteKindLabel(link.kind) }}
                  <template v-if="link.sourceDescription">
                    · {{ t('home.linkSource', { description: link.sourceDescription }) }}
                  </template>
                </p>
              </li>
            </ul>
            <p v-else class="mt-3 text-sm text-muted">
              {{ t('home.officialEmpty') }}
            </p>
          </div>
          <div>
            <h3 class="text-sm font-medium text-default">{{ t('home.bilibiliRecordingsTitle') }}</h3>
            <p class="mt-1 text-sm leading-6 text-muted">
              {{ t('home.bilibiliRecordingsDesc') }}
            </p>
            <ul v-if="relatedLinks.bilibiliRecordings.length > 0" class="mt-3 space-y-3">
              <li v-for="link in relatedLinks.bilibiliRecordings" :key="`${link.performanceId}-${link.url}`">
                <p class="text-sm">
                  <NuxtLink :to="concertHref(link.performanceId)" class="text-highlighted no-underline hover:text-primary hover:underline">
                    {{ concertNameOf(link.performanceId) }}
                  </NuxtLink>
                </p>
                <p>
                  <ULink
                    :to="link.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm text-primary"
                  >
                    {{ link.url }}
                  </ULink>
                </p>
                <p v-if="link.sourceLabel" class="mt-0.5 text-xs text-muted">
                  {{ t('home.linkSource', { description: link.sourceLabel }) }}
                </p>
              </li>
            </ul>
            <p v-else class="mt-3 text-sm text-muted">
              {{ t('home.bilibiliEmpty') }}
            </p>
          </div>
        </div>
      </section>
    </template>
  </main>
</template>
