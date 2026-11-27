<script setup lang="ts">
import { computed } from 'vue'
import { useLocale } from '~/composables/useLocale.ts'

export type TourTimelineStop = {
  performanceId: number
  /** Localized city (or fallback) shown as the timeline title. */
  cityLabel: string
  /** Compact date label. */
  dates: string
  /** Optional venue line. */
  venue: string | null
  showCount: number
  hasSetlist: boolean
  /** Soft status marker when cancelled / postponed / upcoming. */
  status: 'cancelled' | 'postponed' | 'upcoming' | null
}

const props = defineProps<{
  stops: readonly TourTimelineStop[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useLocale()

/** Nuxt UI timeline items derived from tour stops. */
const items = computed(() =>
  props.stops.map((stop) => {
    const bits = [
      stop.venue,
      stop.showCount > 0 ? t('tour.timelineShowCount', { n: stop.showCount }) : null,
      stop.hasSetlist ? null : t('tour.timelineNoSetlist'),
    ].filter((part): part is string => part !== null && part !== '')
    return {
      value: String(stop.performanceId),
      date: stop.dates,
      title: stop.cityLabel,
      description: bits.join(' · ') || undefined,
      icon:
        stop.status === 'cancelled'
          ? 'i-lucide-circle-x'
          : stop.status === 'postponed' || stop.status === 'upcoming'
            ? 'i-lucide-circle-alert'
            : 'i-lucide-map-pin',
    }
  }),
)

/**
 * Selects a stop from the timeline.
 * Nuxt UI emits `(event, item)`; we only need the item value.
 */
const onSelect = (_event: Event, item: { value?: string | number }): void => {
  if (item.value === undefined) return
  emit('update:modelValue', String(item.value))
}
</script>

<template>
  <UTimeline
    :model-value="modelValue"
    :items="items"
    size="sm"
    color="primary"
    orientation="vertical"
    class="tour-stops-timeline max-w-xl"
    :ui="{
      item: 'cursor-pointer',
      title: 'text-sm font-medium text-highlighted',
      description: 'text-xs text-muted',
      date: 'text-xs text-muted tabular-nums',
    }"
    @select="onSelect"
    @update:model-value="(value) => emit('update:modelValue', String(value ?? ''))"
  />
</template>
