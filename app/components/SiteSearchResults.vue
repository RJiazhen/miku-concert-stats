<script setup lang="ts">
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { displayArtistString } from '~~/shared/credit.ts'
import type { PerformanceLookupHit, PlaceLookupHit, SeriesLookupHit } from '~~/shared/lookup.ts'
import { producerRoleLabels, type ProducerLookupHit, type ProducerRole } from '~~/shared/producers.ts'
import type { SongRow } from '~~/shared/types.ts'

defineProps<{
  query: string
  local: SongRow[]
  producers: ProducerLookupHit[]
  series: SeriesLookupHit[]
  performances: PerformanceLookupHit[]
  places: PlaceLookupHit[]
}>()

const emit = defineEmits<{
  select: [songId: number]
  selectProducer: [name: string]
  selectSeries: [seriesId: number]
  selectPerformance: [performanceId: number]
  selectPlace: [place: string]
}>()

const { localizeSeries, localizePerformanceSeries } = useSeriesTitles()
const { localizePlace } = usePlaceNames()

/** Chinese role labels of one producer hit, as the badges the result line prints. */
const roleLabels = (roles: readonly ProducerRole[]): string[] => {
  const labels = roles.map((role) => producerRoleLabels[role])
  return labels.length === 0 ? ['制作'] : labels
}

/** Series name in the site's current language. */
const seriesLabel = (name: string): string => localizeSeries(name)

/** 演出 name with its series label and place in the site's current language. */
const performanceLabel = (hit: PerformanceLookupHit): string => {
  return localizePlace(localizePerformanceSeries(hit.name, hit.seriesName, hit.seriesNumber))
}

/** Date and venue under a 演出 hit, joined only when both are present. */
const performanceMeta = (hit: PerformanceLookupHit): string => {
  const venue = hit.venue === null ? '' : localizePlace(hit.venue)
  return [hit.startDate, venue].filter((part) => part !== null && part !== '').join(' · ')
}

/** Venue name in the site's current language. */
const placeLabel = (name: string): string => localizePlace(name)
</script>

<template>
  <div class="max-h-[60vh] overflow-y-auto p-2 text-sm">
    <template
      v-if="series.length > 0 || performances.length > 0 || places.length > 0 || producers.length > 0 || local.length > 0"
    >
      <template v-if="series.length > 0">
        <p class="px-2 py-1 text-[11px] tracking-wide text-muted uppercase">系列 {{ series.length }} 个</p>
        <UButton
          v-for="hit in series"
          :key="hit.seriesId"
          color="neutral"
          variant="ghost"
          class="w-full justify-start gap-2 rounded-lg px-2 py-1.5 text-left"
          @click="emit('selectSeries', hit.seriesId)"
        >
          <UIcon name="i-lucide-layers" class="size-4 shrink-0 text-muted" />
          <span class="truncate text-highlighted">{{ seriesLabel(hit.name) }}</span>
          <span class="ml-auto shrink-0 text-xs text-muted">{{ hit.performanceCount }} 个演出</span>
        </UButton>
      </template>
      <template v-if="performances.length > 0">
        <p class="px-2 py-1 text-[11px] tracking-wide text-muted uppercase">演出 {{ performances.length }} 个</p>
        <UButton
          v-for="hit in performances"
          :key="hit.performanceId"
          color="neutral"
          variant="ghost"
          class="w-full justify-start gap-2 rounded-lg px-2 py-1.5 text-left"
          @click="emit('selectPerformance', hit.performanceId)"
        >
          <UIcon name="i-lucide-calendar" class="size-4 shrink-0 text-muted" />
          <span class="min-w-0">
            <span class="block truncate text-highlighted">{{ performanceLabel(hit) }}</span>
            <span v-if="performanceMeta(hit)" class="block truncate text-xs text-muted">{{ performanceMeta(hit) }}</span>
          </span>
        </UButton>
      </template>
      <template v-if="places.length > 0">
        <p class="px-2 py-1 text-[11px] tracking-wide text-muted uppercase">地点 {{ places.length }} 个</p>
        <UButton
          v-for="place in places"
          :key="place.name"
          color="neutral"
          variant="ghost"
          class="w-full justify-start gap-2 rounded-lg px-2 py-1.5 text-left"
          @click="emit('selectPlace', place.name)"
        >
          <UIcon name="i-lucide-map-pin" class="size-4 shrink-0 text-muted" />
          <span class="truncate text-highlighted">{{ placeLabel(place.name) }}</span>
          <span class="ml-auto shrink-0 text-xs text-muted">{{ place.performanceCount }} 个演出</span>
        </UButton>
      </template>
      <template v-if="producers.length > 0">
        <p class="px-2 py-1 text-[11px] tracking-wide text-muted uppercase">制作人 {{ producers.length }} 位</p>
        <UButton
          v-for="producer in producers"
          :key="producer.name"
          color="neutral"
          variant="ghost"
          class="w-full justify-start gap-2 rounded-lg px-2 py-1.5 text-left"
          @click="emit('selectProducer', producer.name)"
        >
          <span class="truncate text-highlighted">{{ producer.name }}</span>
          <span class="ml-auto flex shrink-0 items-center gap-1">
            <UBadge v-for="label in roleLabels(producer.roles)" :key="label" color="neutral" variant="subtle" size="sm">{{ label }}</UBadge>
            <span class="text-xs text-muted">{{ producer.songCount }} 首</span>
          </span>
        </UButton>
      </template>
      <template v-if="local.length > 0">
        <p class="px-2 py-1 text-[11px] tracking-wide text-muted uppercase">{{ local.length }} 首</p>
        <UButton
          v-for="song in local"
          :key="song.id"
          color="neutral"
          variant="ghost"
          class="w-full justify-start gap-2 rounded-lg px-2 py-1.5 text-left"
          @click="emit('select', song.id)"
        >
          <SongSearchResultTitle :song-id="song.id" :original="song.name_ja || song.name" :name-en="song.name_en" :query="query" />
          <span class="truncate text-xs text-muted">{{ displayArtistString(song.artist_string) ?? '未记录' }}</span>
        </UButton>
        <ULink :to="`/?q=${encodeURIComponent(query.trim())}`" class="block px-2 py-1.5 text-xs text-primary">
          在排行中查看全部结果
        </ULink>
      </template>
    </template>
    <p v-else class="px-2 py-3 text-xs text-muted">没有找到，试试更短的名称。</p>
  </div>
</template>
