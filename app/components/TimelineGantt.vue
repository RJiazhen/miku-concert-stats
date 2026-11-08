<script setup lang="ts">
import { computed, ref } from 'vue'

/** One gantt row: a continuous span of years plus a clickable key. */
export type TimelineGanttRow = {
  key: string
  label: string
  color: string
  first: number
  last: number
  /** Count printed in the detail strip, usually 演出数. */
  count: number
}

const props = withDefaults(defineProps<{
  years: number[]
  /**
   * Year slots the drawing width is sized for; defaults to `years.length`. Pass the unfiltered span so
   * a filtered chart keeps the full width and stretches its strips instead of shrinking the drawing.
   */
  span?: number
  rows?: TimelineGanttRow[]
  height?: number
  emptyText?: string
}>(), {
  span: 0,
  rows: () => [],
  height: 0,
  emptyText: '当前筛选下没有数据。',
})

const emit = defineEmits<{
  /** A row strip was activated; the parent decides where to go. */
  select: [payload: { key: string }]
}>()

const MIN_WIDTH = 720
const ROW_HEIGHT = 28
const MARGIN = { top: 8, right: 20, bottom: 28, left: 128 }

/** Index of the row under the cursor or keyboard focus. */
const hovered = ref<string | null>(null)

/** Year slots behind the drawing width, so a narrower filtered axis keeps the same drawing width. */
const slots = computed(() => Math.max(props.years.length, props.span))

/** Drawing width of the band scale; one band is 42 units wide before the filter narrows the axis. */
const width = computed(() => Math.max(MIN_WIDTH, slots.value * 42 + MARGIN.left + MARGIN.right))
const plotWidth = computed(() => width.value - MARGIN.left - MARGIN.right)
const band = computed(() => plotWidth.value / Math.max(1, props.years.length))
const chartHeight = computed(() => (props.height > 0 ? props.height : MARGIN.top + Math.max(1, props.rows.length) * ROW_HEIGHT + MARGIN.bottom))

/** Left edge of a year band. */
const xOfIndex = (index: number): number => MARGIN.left + band.value * index

/** Whether a year is printed on the axis; dense axes skip every other label. */
const labelEvery = computed(() => (props.years.length > 26 ? 2 : 1))

/** One drawn strip, already positioned in SVG coordinates. */
type Strip = {
  row: TimelineGanttRow
  x: number
  y: number
  width: number
}

/** Every drawn strip, in row order. */
const strips = computed<Strip[]>(() => {
  const firstIndex = new Map(props.years.map((year, index) => [year, index]))
  return props.rows.flatMap((row, rowIndex) => {
    const start = firstIndex.get(row.first)
    const end = firstIndex.get(row.last)
    if (start === undefined || end === undefined) return []
    return [{
      row,
      x: xOfIndex(start) + 2,
      y: MARGIN.top + rowIndex * ROW_HEIGHT + 6,
      width: Math.max(4, (end - start + 1) * band.value - 4),
    }]
  })
})

/** Year label of the hovered row, or null. */
const hoveredRow = computed(() => props.rows.find((row) => row.key === hovered.value) ?? null)
</script>

<template>
  <div>
    <div class="mb-2 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <template v-if="hoveredRow !== null">
        <span class="font-medium text-highlighted">{{ hoveredRow.label }}</span>
        <span>{{ hoveredRow.first }}–{{ hoveredRow.last }}</span>
        <span>{{ hoveredRow.count }} 个演出</span>
      </template>
      <span v-else>悬停查看系列跨度 · 点击条带进入系列页</span>
    </div>

    <p v-if="rows.length === 0 || years.length === 0" class="py-10 text-center text-sm text-muted">{{ emptyText }}</p>
    <div v-else class="-mx-1 overflow-x-auto px-1">
      <svg
        :width="width"
        :height="chartHeight"
        :viewBox="`0 0 ${width} ${chartHeight}`"
        class="block"
        role="img"
        aria-label="系列活跃年份甘特图"
        @mouseleave="hovered = null"
      >
        <g v-for="(year, index) in years" :key="`grid:${year}`">
          <line
            :x1="xOfIndex(index)"
            :x2="xOfIndex(index)"
            :y1="MARGIN.top"
            :y2="chartHeight - MARGIN.bottom"
            stroke="var(--ui-border)"
            stroke-width="1"
            stroke-dasharray="3 4"
          />
        </g>

        <g
          v-for="strip in strips"
          :key="strip.row.key"
          class="cursor-pointer outline-none"
          role="button"
          tabindex="0"
          :aria-label="`${strip.row.label} ${strip.row.first}–${strip.row.last}`"
          @click="emit('select', { key: strip.row.key })"
          @keydown.enter.prevent="emit('select', { key: strip.row.key })"
          @focus="hovered = strip.row.key"
          @mouseenter="hovered = strip.row.key"
        >
          <rect
            :x="strip.x"
            :y="strip.y"
            :width="strip.width"
            :height="ROW_HEIGHT - 12"
            :fill="strip.row.color"
            fill-opacity="0.85"
            rx="4"
          />
          <title>{{ strip.row.label }} · {{ strip.row.first }}–{{ strip.row.last }} · {{ strip.row.count }} 个演出</title>
        </g>

        <g v-for="strip in strips" :key="`label:${strip.row.key}`">
          <text
            :x="MARGIN.left - 8"
            :y="strip.y + (ROW_HEIGHT - 12) / 2 + 3"
            text-anchor="end"
            font-size="10"
            :fill="hovered === strip.row.key ? 'var(--ui-text-highlighted)' : 'var(--ui-text-muted)'"
          >
            {{ strip.row.label }}
            <title>{{ strip.row.label }}</title>
          </text>
        </g>

        <g v-for="(year, index) in years" :key="`label:${year}`">
          <text
            v-if="index % labelEvery === 0"
            :x="xOfIndex(index) + band / 2"
            :y="chartHeight - 10"
            text-anchor="middle"
            font-size="10"
            fill="var(--ui-text-muted)"
          >
            {{ year }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>
