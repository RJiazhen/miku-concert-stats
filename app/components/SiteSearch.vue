<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useCatalog } from '~/composables/useCatalog.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { useSongAliases } from '~/composables/useSongAliases.ts'
import { useSongLanguage } from '~/composables/useSongLanguage.ts'
import {
  localPerformanceMatches,
  localPlaceMatches,
  localProducerMatches,
  localSeriesMatches,
  localSongMatches,
} from '~~/shared/lookup.ts'
import type { PerformanceRow, SeriesRow, SongRow } from '~~/shared/types.ts'
import { producerPath } from '~~/shared/producers.ts'

const { catalog, load } = useCatalog()
const { localizePlace } = usePlaceNames()
const { localizePerformanceSeries, localizeSeries } = useSeriesTitles()
const { aliasTitles } = useSongAliases()
const { chineseSpellings } = useSongLanguage()

/** Placeholder shared by the desktop input and the mobile panel. */
const placeholder = '搜索歌曲、系列、演出、地点或制作人'

/** Starts the browser catalog load after hydration so search works without visiting the ranking first. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const root = ref<HTMLElement | null>(null)
const query = ref('')
const open = ref(false)
const mobileOpen = ref(false)

/** Registered alternate titles (`data/song-aliases.json`) plus the Chinese title and its aliases, matched alongside the catalog names. */
const songSpellings = (row: SongRow): string[] => [...aliasTitles(row.id), ...chineseSpellings(row.id)]

/** Local song matches in the loaded catalog. */
const localHits = computed(() =>
  catalog.value ? localSongMatches(catalog.value, query.value, songSpellings) : [],
)

/** Producer-name matches, listed before the songs in the same panel. */
const producerHits = computed(() => (catalog.value ? localProducerMatches(catalog.value, query.value) : []))

/** Series names by id, so a 演出 hit can translate the series label inside its name. */
const seriesNames = computed(() => new Map((catalog.value?.series ?? []).map((row) => [row.id, row.name])))

/** Series names also match their Chinese title when one is recorded. */
const seriesSpellings = (row: SeriesRow): string[] => [localizeSeries(row.name)]

/** 演出 names also match their localized series label and place spelling. */
const performanceSpellings = (row: PerformanceRow): string[] => {
  const seriesName = seriesNames.value.get(row.series_id) ?? ''
  return [localizePlace(localizePerformanceSeries(row.name, seriesName, row.series_number))]
}

/** Venue names also match the localized place spelling. */
const placeSpellings = (venue: string): string[] => [localizePlace(venue)]

/** Series matches, shown before 演出 and places. */
const seriesHits = computed(() =>
  catalog.value ? localSeriesMatches(catalog.value, query.value, seriesSpellings) : [],
)

/** 演出-name matches in the loaded catalog. */
const performanceHits = computed(() =>
  catalog.value ? localPerformanceMatches(catalog.value, query.value, performanceSpellings) : [],
)

/** Place (venue) matches in the loaded catalog. */
const placeHits = computed(() => (catalog.value ? localPlaceMatches(catalog.value, query.value, placeSpellings) : []))

/** Whether the desktop result panel should be open. */
const panelOpen = computed(() => open.value && query.value.trim() !== '')

watch(query, () => {
  if (query.value.trim() !== '') open.value = true
})

/** Closes both panels and clears the query. */
const reset = (): void => {
  query.value = ''
  open.value = false
  mobileOpen.value = false
}

/** Opens one song's detail page. */
const openSong = async (songId: number): Promise<void> => {
  reset()
  await navigateTo(`/songs/${songId}`)
}

/** Opens one producer's detail page. */
const openProducer = async (name: string): Promise<void> => {
  reset()
  await navigateTo(producerPath(name))
}

/** Opens one series page. */
const openSeries = async (seriesId: number): Promise<void> => {
  reset()
  await navigateTo(`/series/${seriesId}`)
}

/** Opens one 演出 page. */
const openPerformance = async (performanceId: number): Promise<void> => {
  reset()
  await navigateTo(`/shows/${performanceId}`)
}

/** Opens the 演出 table filtered to one place. */
const openPlace = async (place: string): Promise<void> => {
  reset()
  await navigateTo({ path: '/series', query: { place } })
}

/** Enter opens the first hit, preferring a song, then a 演出, a series, and finally a place. */
const submit = (): void => {
  const song = localHits.value[0]
  if (song) {
    void openSong(song.id)
    return
  }
  const performance = performanceHits.value[0]
  if (performance) {
    void openPerformance(performance.performanceId)
    return
  }
  const series = seriesHits.value[0]
  if (series) {
    void openSeries(series.seriesId)
    return
  }
  const place = placeHits.value[0]
  if (place) void openPlace(place.name)
}

/** Closes the desktop panel when the click lands outside the search box. */
const onClickOutside = (event: MouseEvent): void => {
  if (root.value === null) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (!root.value.contains(target)) open.value = false
}

/** Listens for outside clicks while the component is mounted. */
const startListening = (): void => {
  document.addEventListener('mousedown', onClickOutside)
}
onMounted(startListening)

/** Removes the document listener when the header unmounts. */
const stopListening = (): void => {
  document.removeEventListener('mousedown', onClickOutside)
}
onUnmounted(stopListening)
</script>

<template>
  <div ref="root" class="relative">
    <!-- Desktop: always visible input with a floating result panel. -->
    <UInput
      v-model="query"
      icon="i-lucide-search"
      :placeholder="placeholder"
      size="sm"
      class="hidden w-56 md:block lg:w-72"
      autocomplete="off"
      aria-label="站内搜索"
      @focus="open = true"
      @keydown.enter.prevent="submit"
      @keydown.esc="open = false"
    />
    <div
      v-if="panelOpen"
      class="absolute top-full right-0 z-50 mt-2 w-96 rounded-xl bg-default shadow-xl ring ring-default"
    >
      <SiteSearchResults
        :query="query"
        :local="localHits"
        :producers="producerHits"
        :series="seriesHits"
        :performances="performanceHits"
        :places="placeHits"
        @select="openSong"
        @select-producer="openProducer"
        @select-series="openSeries"
        @select-performance="openPerformance"
        @select-place="openPlace"
      />
    </div>

    <!-- Narrow screens: a floating panel opened from the header button. -->
    <UButton
      icon="i-lucide-search"
      color="neutral"
      variant="ghost"
      size="sm"
      aria-label="站内搜索"
      class="md:hidden"
      @click="mobileOpen = true"
    />
    <div v-if="mobileOpen" class="fixed inset-0 z-50 bg-default/95 backdrop-blur md:hidden">
      <div class="mx-auto flex max-w-xl flex-col gap-3 p-4">
        <div class="flex items-center gap-2">
          <UInput
            v-model="query"
            icon="i-lucide-search"
            :placeholder="placeholder"
            size="md"
            class="flex-1"
            autocomplete="off"
            autofocus
            aria-label="站内搜索"
            @keydown.enter.prevent="submit"
          />
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" aria-label="关闭搜索" @click="reset" />
        </div>
        <div v-if="query.trim() !== ''" class="rounded-xl bg-default ring ring-default">
          <SiteSearchResults
            :query="query"
            :local="localHits"
            :producers="producerHits"
            :series="seriesHits"
            :performances="performanceHits"
            :places="placeHits"
            @select="openSong"
            @select-producer="openProducer"
            @select-series="openSeries"
            @select-performance="openPerformance"
            @select-place="openPlace"
          />
        </div>
      </div>
    </div>
  </div>
</template>
