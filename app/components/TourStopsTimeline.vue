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

/** Default columns for the serpentine path. */
const columns = computed(() => Math.max(2, props.columns ?? 4))

/** One snake row with layout metadata for the connector rail. */
type SnakeRow = {
  stops: TourTimelineStop[]
  reversed: boolean
  /** Inline style for the continuous rail through this row’s dots. */
  railStyle: Record<string, string>
}

/**
 * Builds serpentine rows and a rail from the first filled stop’s center
 * to the last (odd rows run right→left).
 */
const rows = computed((): SnakeRow[] => {
  const cols = columns.value
  const result: SnakeRow[] = []
  for (let index = 0; index < props.stops.length; index += cols) {
    const chunk = props.stops.slice(index, index + cols)
    const reversed = result.length % 2 === 1
    const count = chunk.length
    const halfCell = 50 / cols
    const span = count <= 1 ? 0 : ((count - 1) / cols) * 100
    const railStyle: Record<string, string> =
      span === 0
        ? { display: 'none' }
        : reversed
          ? { right: `${halfCell}%`, width: `${span}%` }
          : { left: `${halfCell}%`, width: `${span}%` }
    result.push({ stops: chunk, reversed, railStyle })
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
      class="tour-snake-row relative flex items-start"
      :class="row.reversed ? 'flex-row-reverse' : 'flex-row'"
    >
      <div
        class="tour-snake-rail-track pointer-events-none absolute top-[9px] h-0.5"
        :style="row.railStyle"
        aria-hidden="true"
      />

      <button
        v-for="stop in row.stops"
        :key="stop.performanceId"
        type="button"
        role="listitem"
        class="tour-snake-node group relative z-[1] flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-1 py-1 text-center transition-colors"
        :class="
          String(stop.performanceId) === modelValue
            ? 'text-primary'
            : 'text-muted hover:text-highlighted'
        "
        :aria-current="String(stop.performanceId) === modelValue ? 'true' : undefined"
        @click="selectStop(stop.performanceId)"
      >
        <span
          class="tour-snake-dot size-2.5 shrink-0 rounded-full border-2 bg-default transition-colors"
          :class="
            String(stop.performanceId) === modelValue
              ? 'border-primary bg-primary'
              : stop.status === 'cancelled'
                ? 'border-error'
                : 'border-muted group-hover:border-primary'
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
        v-for="pad in Math.max(0, columns - row.stops.length)"
        :key="`pad-${pad}`"
        class="min-w-0 flex-1"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<style scoped>
/*
 * Theme utilities like `bg-muted-foreground` are not defined here and compile
 * to transparent. Paint the rail with an explicit readable stroke.
 */
.tour-snake-rail-track {
  background-color: color-mix(in oklab, var(--ui-text-muted, #9ca3af) 65%, transparent);
}
</style>
