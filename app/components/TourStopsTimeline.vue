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

/**
 * Columns for the serpentine path, capped by stop count so a short tour
 * does not reserve empty trailing cells (keeps narrow-screen centering tight).
 */
const columns = computed(() => {
  const requested = Math.max(1, props.columns ?? 4)
  const count = props.stops.length
  if (count === 0) return requested
  return Math.min(requested, count)
})

/** Stop plus its 1-based tour order. */
type OrderedStop = TourTimelineStop & { order: number }

/** One snake row with layout metadata for rails and U-turns. */
type SnakeRow = {
  stops: OrderedStop[]
  reversed: boolean
  /** Inline style for the continuous rail through this row’s dots. */
  railStyle: Record<string, string>
  /** Side where the path turns down into the next row. */
  turnSide: 'left' | 'right' | null
}

/**
 * Builds serpentine rows, order indexes, directional rails, and turn stubs
 * (odd rows run right→left).
 */
const rows = computed((): SnakeRow[] => {
  const cols = columns.value
  const total = props.stops.length
  const result: SnakeRow[] = []
  for (let index = 0; index < total; index += cols) {
    const chunk = props.stops.slice(index, index + cols).map((stop, offset) => ({
      ...stop,
      order: index + offset + 1,
    }))
    const reversed = result.length % 2 === 1
    const count = chunk.length
    const halfCell = 50 / cols
    const span = count <= 1 ? 0 : ((count - 1) / cols) * 100
    // Pull the tip back so the travel chevron sits in the gap, not under the last dot.
    const tipInset = span === 0 ? 0 : (0.28 / cols) * 100
    const railStyle: Record<string, string> =
      span === 0
        ? { display: 'none' }
        : reversed
          ? { right: `${halfCell + tipInset}%`, width: `${Math.max(0, span - tipInset)}%` }
          : { left: `${halfCell}%`, width: `${Math.max(0, span - tipInset)}%` }
    const isLastRow = index + cols >= total
    const turnSide: SnakeRow['turnSide'] = isLastRow ? null : reversed ? 'left' : 'right'
    result.push({ stops: chunk, reversed, railStyle, turnSide })
  }
  return result
})

/** Selects one stop node. */
const selectStop = (performanceId: number): void => {
  emit('update:modelValue', String(performanceId))
}

/** Accessible label including stop order. */
const stopAriaLabel = (stop: OrderedStop): string =>
  `${stop.order}. ${stop.cityLabel}, ${stop.dates}`
</script>

<template>
  <!--
    Packed to content width: centered on narrow viewports, page-left on md+.
    Fixed cell width keeps incomplete rows on the snake grid.
  -->
  <div
    class="tour-snake mx-auto flex w-fit max-w-full flex-col gap-y-[var(--tour-snake-row-gap,1.25rem)] md:mx-0"
    role="list"
  >
    <div
      v-for="(row, rowIndex) in rows"
      :key="rowIndex"
      class="tour-snake-row relative flex w-full items-start"
      :class="row.reversed ? 'flex-row-reverse' : 'flex-row'"
    >
      <div
        class="tour-snake-rail-track pointer-events-none absolute top-[11px] h-0.5"
        :class="row.reversed ? 'tour-snake-rail-track--rtl' : 'tour-snake-rail-track--ltr'"
        :style="row.railStyle"
        aria-hidden="true"
      />

      <!-- U-turn stub into the next row (same side as the last filled stop). -->
      <div
        v-if="row.turnSide"
        class="tour-snake-turn pointer-events-none absolute top-[11px]"
        :class="row.turnSide === 'right' ? 'tour-snake-turn--right' : 'tour-snake-turn--left'"
        :style="{ width: `${100 / columns}%` }"
        aria-hidden="true"
      />

      <button
        v-for="stop in row.stops"
        :key="stop.performanceId"
        type="button"
        role="listitem"
        class="tour-snake-node group relative z-[1] flex w-[4.75rem] shrink-0 flex-col items-center gap-1 rounded-md px-1 py-1 text-center transition-colors sm:w-[5.5rem] md:w-24"
        :class="
          String(stop.performanceId) === modelValue
            ? 'text-primary'
            : 'text-muted hover:text-highlighted'
        "
        :aria-label="stopAriaLabel(stop)"
        :aria-current="String(stop.performanceId) === modelValue ? 'true' : undefined"
        @click="selectStop(stop.performanceId)"
      >
        <span
          class="tour-snake-dot flex size-5 shrink-0 items-center justify-center rounded-full border-2 text-[0.625rem] font-semibold leading-none tabular-nums transition-colors"
          :class="
            String(stop.performanceId) === modelValue
              ? 'border-primary bg-primary text-inverted'
              : stop.status === 'cancelled'
                ? 'border-error text-error'
                : 'border-muted bg-default text-muted group-hover:border-primary group-hover:text-primary'
          "
        >
          {{ stop.order }}
        </span>
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
        class="tour-snake-node w-[4.75rem] shrink-0 sm:w-[5.5rem] md:w-24"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<style scoped>
/*
 * Theme utilities like `bg-muted-foreground` are not defined here and compile
 * to transparent. Paint rails with an explicit stroke; chevron marks travel.
 */
.tour-snake-rail-track {
  --tour-snake-rail: color-mix(in oklab, var(--ui-text-muted, #9ca3af) 75%, transparent);
  --tour-snake-chevron: color-mix(in oklab, var(--ui-text-muted, #9ca3af) 90%, transparent);
  background-color: var(--tour-snake-rail);
}

.tour-snake-rail-track::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 4px 0 4px 6px;
  border-color: transparent transparent transparent var(--tour-snake-chevron);
  transform: translateY(-50%);
}

.tour-snake-rail-track--ltr::after {
  right: -1px;
}

.tour-snake-rail-track--rtl::after {
  left: -1px;
  border-width: 4px 6px 4px 0;
  border-color: transparent var(--tour-snake-chevron) transparent transparent;
}

.tour-snake-turn {
  height: calc(100% + var(--tour-snake-row-gap, 1.25rem));
}

.tour-snake-turn::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  margin-left: -1px;
  background-color: color-mix(in oklab, var(--ui-text-muted, #9ca3af) 70%, transparent);
  border-radius: 1px;
}

.tour-snake-turn--right {
  right: 0;
}

.tour-snake-turn--left {
  left: 0;
}
</style>
