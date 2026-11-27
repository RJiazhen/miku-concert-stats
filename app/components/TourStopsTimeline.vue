<script setup lang="ts">
import { computed } from 'vue'
import { useElementWidth } from '~/composables/useElementWidth.ts'

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
  /** Soft upper bound on columns (still capped by width and stop count). */
  maxColumns?: number
  /** Minimum cell width in CSS pixels used to pick the column count. */
  minCellPx?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/** Default minimum width per stop cell before the snake adds another column. */
const DEFAULT_MIN_CELL_PX = 76

const { widthAnchor, elementWidth } = useElementWidth()

/**
 * Columns from the measured container width: as many min-width cells as fit,
 * capped by stop count and optional maxColumns. Falls back to 3 before measure.
 */
const columns = computed(() => {
  const count = props.stops.length
  if (count === 0) return 1
  const minCell = Math.max(48, props.minCellPx ?? DEFAULT_MIN_CELL_PX)
  const width = elementWidth.value
  const byWidth = width > 0 ? Math.max(1, Math.floor(width / minCell)) : 3
  const capped = props.maxColumns !== undefined ? Math.min(byWidth, Math.max(1, props.maxColumns)) : byWidth
  return Math.min(count, capped)
})

/** Stop plus its 1-based tour order. */
type OrderedStop = TourTimelineStop & { order: number }

/** One gapped stroke between adjacent stop centers. */
type RailSegment = {
  style: Record<string, string>
}

/** One snake row with layout metadata for rails and U-turns. */
type SnakeRow = {
  stops: OrderedStop[]
  reversed: boolean
  /** Gapped horizontal strokes between this row’s nodes. */
  segments: RailSegment[]
  /** Column index (0 = left) for the U-turn into the next row. */
  turnCol: number | null
}

/**
 * Builds serpentine rows, order indexes, gapped rail segments, and turn stubs
 * (odd rows run right→left). Horizontal and vertical strokes both stop short
 * of the numbered dots — one connector language.
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
    const cell = 100 / cols
    /** Visual column for chunk slot `slot` (pads push incomplete RTL stops right). */
    const colOf = (slot: number): number => (reversed ? cols - 1 - slot : slot)
    const segments: RailSegment[] = []
    for (let slot = 0; slot < count - 1; slot += 1) {
      const leftCol = Math.min(colOf(slot), colOf(slot + 1))
      const startCenter = (leftCol + 0.5) * cell
      segments.push({
        style: {
          left: `calc(${startCenter}% + var(--tour-snake-rail-inset))`,
          width: `calc(${cell}% - (2 * var(--tour-snake-rail-inset)))`,
        },
      })
    }
    const isLastRow = index + cols >= total
    const turnCol = isLastRow || count === 0 ? null : colOf(count - 1)
    result.push({ stops: chunk, reversed, segments, turnCol })
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
  <!-- Fills the parent section; column count tracks measured width. -->
  <div
    ref="widthAnchor"
    class="tour-snake flex w-full flex-col gap-y-[var(--tour-snake-row-gap,1.25rem)]"
    role="list"
  >
    <div
      v-for="(row, rowIndex) in rows"
      :key="rowIndex"
      class="tour-snake-row relative flex w-full items-start"
      :class="row.reversed ? 'flex-row-reverse' : 'flex-row'"
    >
      <div
        v-for="(segment, segmentIndex) in row.segments"
        :key="`rail-${segmentIndex}`"
        class="tour-snake-rail-track pointer-events-none absolute top-[11px] h-0.5"
        :style="segment.style"
        aria-hidden="true"
      />

      <!-- U-turn stub: same gap-before-dot language as the horizontal segments. -->
      <div
        v-if="row.turnCol !== null"
        class="tour-snake-turn pointer-events-none absolute"
        :style="{ left: `${(row.turnCol * 100) / columns}%`, width: `${100 / columns}%` }"
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
        class="min-w-0 flex-1"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<style scoped>
/*
 * Theme utilities like `bg-muted-foreground` are not defined here and compile
 * to transparent. Horizontal and vertical strokes share one gapped style.
 */
.tour-snake {
  --tour-snake-rail-inset: 0.85rem;
  --tour-snake-rail: color-mix(in oklab, var(--ui-text-muted, #9ca3af) 70%, transparent);
}

.tour-snake-rail-track {
  background-color: var(--tour-snake-rail);
}

.tour-snake-turn {
  /* Start below the current dot; end above the next row’s dot. */
  top: calc(11px + var(--tour-snake-rail-inset));
  height: calc(
    100% + var(--tour-snake-row-gap, 1.25rem) - (2 * var(--tour-snake-rail-inset))
  );
}

.tour-snake-turn::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  margin-left: -1px;
  background-color: var(--tour-snake-rail);
  border-radius: 1px;
}
</style>
