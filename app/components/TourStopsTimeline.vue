<script setup lang="ts">
import { computed } from 'vue'

export type TourTimelineStop = {
  performanceId: number
  /** Localized city (or fallback) shown on the node. */
  cityLabel: string
  /** Compact date label (prefer short `M/D`). */
  dates: string
  /** Optional venue line (unused in the snake; kept for callers). */
  venue: string | null
  showCount: number
  hasSetlist: boolean
  /** Soft status marker when cancelled / postponed / upcoming. */
  status: 'cancelled' | 'postponed' | 'upcoming' | null
}

const props = defineProps<{
  stops: readonly TourTimelineStop[]
  modelValue: string
  /** Stops per snake row before turning. */
  columns?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/** Default columns for the serpentine path (`--tour-snake-cols` can override in CSS). */
const columns = computed(() => Math.max(2, props.columns ?? 4))

/** Rows of stops; odd rows are reversed for a left→right→left snake. */
const rows = computed(() => {
  const cols = columns.value
  const result: { stops: TourTimelineStop[]; reversed: boolean }[] = []
  for (let index = 0; index < props.stops.length; index += cols) {
    const chunk = props.stops.slice(index, index + cols)
    const reversed = result.length % 2 === 1
    result.push({ stops: chunk, reversed })
  }
  return result
})

/** Selects one stop node. */
const selectStop = (performanceId: number): void => {
  emit('update:modelValue', String(performanceId))
}
</script>

<template>
  <div
    class="tour-snake flex flex-col gap-y-[var(--tour-snake-row-gap,0.75rem)]"
    role="list"
  >
    <div
      v-for="(row, rowIndex) in rows"
      :key="rowIndex"
      class="tour-snake-row flex items-center gap-x-[var(--tour-snake-gap,0.5rem)]"
      :class="row.reversed ? 'flex-row-reverse' : 'flex-row'"
    >
      <template v-for="(stop, stopIndex) in row.stops" :key="stop.performanceId">
        <button
          type="button"
          role="listitem"
          class="tour-snake-node group relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-1 py-1.5 text-center transition-colors"
          :class="
            String(stop.performanceId) === modelValue
              ? 'text-primary'
              : 'text-muted hover:text-highlighted'
          "
          :aria-current="String(stop.performanceId) === modelValue ? 'true' : undefined"
          @click="selectStop(stop.performanceId)"
        >
          <span
            class="tour-snake-dot size-2.5 shrink-0 rounded-full border-2 transition-colors"
            :class="
              String(stop.performanceId) === modelValue
                ? 'border-primary bg-primary'
                : stop.status === 'cancelled'
                  ? 'border-error bg-transparent'
                  : 'border-muted-foreground/50 bg-transparent group-hover:border-primary'
            "
          />
          <span class="max-w-full truncate text-xs font-medium leading-tight text-highlighted">
            {{ stop.cityLabel }}
          </span>
          <span class="truncate text-[0.65rem] leading-tight text-muted tabular-nums">
            {{ stop.dates }}
          </span>
        </button>
        <span
          v-if="stopIndex < row.stops.length - 1"
          class="tour-snake-rail h-px min-w-[0.75rem] flex-1 bg-default/60"
          aria-hidden="true"
        />
      </template>
      <!-- Pad incomplete rows so the turn stays on the outer edge. -->
      <template v-if="row.stops.length < columns">
        <template v-for="pad in columns - row.stops.length" :key="`pad-${pad}`">
          <span class="tour-snake-rail h-px min-w-[0.75rem] flex-1 bg-transparent" aria-hidden="true" />
          <span class="min-w-0 flex-1" aria-hidden="true" />
        </template>
      </template>
    </div>
  </div>
</template>
