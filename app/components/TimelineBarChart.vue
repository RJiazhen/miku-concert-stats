<script setup lang="ts">
import { computed, ref } from 'vue'

/** One series drawn as bars or as a line; `values` is aligned with `years`. */
export type TimelineSeries = {
  key: string
  label: string
  color: string
  values: number[]
}

/** How the right-hand axis prints its ticks. */
export type TimelineRightFormat = 'number' | 'percent'

const props = withDefaults(defineProps<{
  /** Continuous axis years; every series provides one value per year. */
  years: number[]
  bars?: TimelineSeries[]
  /** Stack the bars instead of placing them side by side. */
  stacked?: boolean
  /** Lines scaled to the left axis, alongside the bars. */
  lines?: TimelineSeries[]
  /** Lines with their own right-hand axis, e.g. a ratio next to counts. */
  rightLines?: TimelineSeries[]
  /** Label of the left axis, printed in the hover detail. */
  unit?: string
  /** Label of the right axis. */
  rightUnit?: string
  rightFormat?: TimelineRightFormat
  height?: number
  emptyText?: string
}>(), {
  bars: () => [],
  stacked: false,
  lines: () => [],
  rightLines: () => [],
  unit: '',
  rightUnit: '',
  rightFormat: 'number',
  height: 260,
  emptyText: '当前筛选下没有数据。',
})

const emit = defineEmits<{
  /** A bar or point was activated; the parent decides where to go. */
  select: [payload: { year: number; key: string }]
}>()

/** Narrowest drawing width; the wrapper scrolls horizontally below it. */
const MIN_WIDTH = 720
const MARGIN = { top: 16, right: 56, bottom: 32, left: 48 }

/** Index of the year under the cursor or keyboard focus. */
const hovered = ref<number | null>(null)

/** Widest drawing width of one band, so dense years stay readable. */
const width = computed(() => Math.max(MIN_WIDTH, props.years.length * 42 + MARGIN.left + MARGIN.right))
const plotWidth = computed(() => width.value - MARGIN.left - MARGIN.right)
const plotHeight = computed(() => props.height - MARGIN.top - MARGIN.bottom)
const band = computed(() => plotWidth.value / Math.max(1, props.years.length))

/** Rounds a maximum up to the next 1 / 2 / 5 of its magnitude, so axis ticks are whole numbers. */
const niceMax = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

/** Highest bar total, on the left axis. */
const barMax = computed(() => {
  const totals = props.years.map((_, index) => {
    if (!props.stacked) return Math.max(0, ...props.bars.map((series) => series.values[index] ?? 0))
    return props.bars.reduce((sum, series) => sum + (series.values[index] ?? 0), 0)
  })
  return niceMax(Math.max(0, ...totals))
})

/** Highest left-axis line value; falls back to the bar axis when no left line exists. */
const leftMax = computed(() => {
  const values = props.lines.flatMap((series) => series.values)
  return values.length === 0 ? barMax.value : niceMax(Math.max(barMax.value, ...values))
})

/** Highest right-axis line value. */
const rightMax = computed(() => {
  const values = props.rightLines.flatMap((series) => series.values)
  return niceMax(values.length === 0 ? 1 : Math.max(...values))
})

/** Tick values on the left axis. */
const leftTicks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * leftMax.value))

/** Tick values on the right axis. */
const rightTicks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * rightMax.value))

/** Center x of one year band. */
const xOf = (index: number): number => MARGIN.left + band.value * (index + 0.5)

/** y of a value on a given axis maximum. */
const yOf = (value: number, max: number): number => MARGIN.top + plotHeight.value * (1 - value / max)

/** Printed value of a right-axis number. */
const formatRight = (value: number): string => {
  if (props.rightFormat === 'percent') return `${Math.round(value * 100)}%`
  return String(Math.round(value * 100) / 100)
}

/** One drawn bar segment, already positioned in SVG coordinates. */
type BarRect = {
  key: string
  seriesKey: string
  label: string
  color: string
  index: number
  x: number
  y: number
  width: number
  height: number
  value: number
}

/** Bar segments of every series and year, stacked from the baseline up. */
const barRects = computed<BarRect[]>(() => {
  const rects: BarRect[] = []
  const groupedWidth = (band.value * 0.72) / Math.max(1, props.bars.length)
  props.years.forEach((year, index) => {
    let cumulative = 0
    props.bars.forEach((series, seriesIndex) => {
      const value = series.values[index] ?? 0
      if (value <= 0) return
      if (props.stacked) {
        const bottom = cumulative
        cumulative += value
        const y = yOf(cumulative, barMax.value)
        const height = Math.max(1, yOf(bottom, barMax.value) - y)
        rects.push({
          key: `${series.key}:${year}`,
          seriesKey: series.key,
          label: series.label,
          color: series.color,
          index,
          x: MARGIN.left + band.value * index + band.value * 0.2,
          y,
          width: band.value * 0.6,
          height,
          value,
        })
        return
      }
      const height = Math.max(1, yOf(0, barMax.value) - yOf(value, barMax.value))
      rects.push({
        key: `${series.key}:${year}`,
        seriesKey: series.key,
        label: series.label,
        color: series.color,
        index,
        x: MARGIN.left + band.value * index + band.value * 0.14 + groupedWidth * seriesIndex,
        y: yOf(value, barMax.value),
        width: groupedWidth * 0.88,
        height,
        value,
      })
    })
  })
  return rects
})

/** One drawn line point. */
type LinePoint = {
  key: string
  seriesKey: string
  label: string
  color: string
  index: number
  x: number
  y: number
  value: number
}

/** Points of the left-axis lines. */
const leftPoints = computed<LinePoint[]>(() =>
  props.lines.flatMap((series) =>
    props.years.flatMap((year, index) => {
      const value = series.values[index]
      if (value === undefined) return []
      return [{ key: `${series.key}:${year}`, seriesKey: series.key, label: series.label, color: series.color, index, x: xOf(index), y: yOf(value, leftMax.value), value }]
    }),
  ),
)

/** Points of the right-axis lines. */
const rightPoints = computed<LinePoint[]>(() =>
  props.rightLines.flatMap((series) =>
    props.years.flatMap((year, index) => {
      const value = series.values[index]
      if (value === undefined) return []
      return [{ key: `${series.key}:${year}`, seriesKey: series.key, label: series.label, color: series.color, index, x: xOf(index), y: yOf(value, rightMax.value), value }]
    }),
  ),
)

/** SVG `points` attribute of one series' left line. */
const leftPolyline = (series: TimelineSeries): string =>
  props.years.map((_, index) => `${xOf(index)},${yOf(series.values[index] ?? 0, leftMax.value)}`).join(' ')

/** SVG `points` attribute of one series' right line. */
const rightPolyline = (series: TimelineSeries): string =>
  props.years.map((_, index) => `${xOf(index)},${yOf(series.values[index] ?? 0, rightMax.value)}`).join(' ')

/** Legend entries of every series on the chart. */
const legend = computed(() => [
  ...props.bars.map((series) => ({ key: `bar:${series.key}`, label: series.label, color: series.color })),
  ...props.lines.map((series) => ({ key: `line:${series.key}`, label: series.label, color: series.color })),
  ...props.rightLines.map((series) => ({ key: `right:${series.key}`, label: series.label, color: series.color })),
])

/** Year currently under the cursor, or null. */
const hoveredYear = computed(() => (hovered.value === null ? null : props.years[hovered.value] ?? null))

/** One series value at the hovered year, for the detail strip. */
type HoverValue = { key: string; label: string; color: string; value: string }

/** Every value shown in the detail strip at the hovered year. */
const hoverValues = computed<HoverValue[]>(() => {
  const index = hovered.value
  if (index === null) return []
  return [
    ...props.bars.map((series) => ({ key: `bar:${series.key}`, label: series.label, color: series.color, value: String(series.values[index] ?? 0) })),
    ...props.lines.map((series) => ({ key: `line:${series.key}`, label: series.label, color: series.color, value: String(series.values[index] ?? 0) })),
    ...props.rightLines.map((series) => ({ key: `right:${series.key}`, label: series.label, color: series.color, value: formatRight(series.values[index] ?? 0) })),
  ]
})

/** Whether to print every year on the x axis. */
const labelEvery = computed(() => (props.years.length > 26 ? 2 : 1))

/** Selects one year and emits it for the parent's detail list. */
const selectYear = (year: number, key: string): void => {
  emit('select', { year, key })
}
</script>

<template>
  <div>
    <div v-if="legend.length > 0" class="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span v-for="item in legend" :key="item.key" class="inline-flex items-center gap-1.5">
        <span class="inline-block size-2.5 rounded-sm" :style="{ backgroundColor: item.color }" />
        {{ item.label }}
      </span>
    </div>

    <div class="mb-2 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <template v-if="hoveredYear !== null">
        <span class="font-medium text-highlighted">{{ hoveredYear }} 年</span>
        <span v-for="item in hoverValues" :key="item.key">
          {{ item.label }}
          <span class="font-mono text-highlighted">{{ item.value }}</span>
        </span>
      </template>
      <span v-else>悬停查看某年明细 · 点击柱或点打开该年列表</span>
    </div>

    <p v-if="years.length === 0" class="py-10 text-center text-sm text-muted">{{ emptyText }}</p>
    <div v-else class="-mx-1 overflow-x-auto px-1">
      <svg
        :width="width"
        :height="height"
        :viewBox="`0 0 ${width} ${height}`"
        class="block"
        role="img"
        :aria-label="`年度图表，纵轴 ${unit || '数值'}`"
        @mouseleave="hovered = null"
      >
        <g v-for="(tick, tickIndex) in leftTicks" :key="`tick:${tickIndex}`">
          <line
            :x1="MARGIN.left"
            :x2="width - MARGIN.right"
            :y1="yOf(tick, leftMax)"
            :y2="yOf(tick, leftMax)"
            stroke="var(--ui-border)"
            stroke-width="1"
            stroke-dasharray="3 4"
          />
          <text
            :x="MARGIN.left - 6"
            :y="yOf(tick, leftMax) + 3"
            text-anchor="end"
            font-size="10"
            fill="var(--ui-text-muted)"
          >
            {{ Math.round(tick) }}
          </text>
        </g>

        <g v-if="rightLines.length > 0">
          <text
            v-for="(tick, tickIndex) in rightTicks"
            :key="`right-tick:${tickIndex}`"
            :x="width - MARGIN.right + 6"
            :y="yOf(tick, rightMax) + 3"
            text-anchor="start"
            font-size="10"
            fill="var(--ui-text-muted)"
          >
            {{ formatRight(tick) }}
          </text>
        </g>

        <rect
          v-for="(_, index) in years"
          :key="`band:${index}`"
          :x="MARGIN.left + band * index"
          :y="MARGIN.top"
          :width="band"
          :height="plotHeight"
          fill="transparent"
          @mouseenter="hovered = index"
        />

        <g
          v-for="rect in barRects"
          :key="rect.key"
          class="cursor-pointer outline-none"
          role="button"
          tabindex="0"
          :aria-label="`${years[rect.index]} 年 ${rect.label} ${rect.value}`"
          @click="selectYear(years[rect.index] ?? 0, rect.seriesKey)"
          @keydown.enter.prevent="selectYear(years[rect.index] ?? 0, rect.seriesKey)"
          @focus="hovered = rect.index"
          @mouseenter="hovered = rect.index"
        >
          <rect :x="rect.x" :y="rect.y" :width="rect.width" :height="rect.height" :fill="rect.color" rx="1.5" />
          <title>{{ years[rect.index] }} 年 · {{ rect.label }}：{{ rect.value }}</title>
        </g>

        <g v-for="series in lines" :key="`line:${series.key}`">
          <polyline :points="leftPolyline(series)" fill="none" :stroke="series.color" stroke-width="2" stroke-linejoin="round" />
        </g>
        <g v-for="series in rightLines" :key="`right-line:${series.key}`">
          <polyline
            :points="rightPolyline(series)"
            fill="none"
            :stroke="series.color"
            stroke-width="2"
            stroke-dasharray="5 3"
            stroke-linejoin="round"
          />
        </g>

        <g
          v-for="point in [...leftPoints, ...rightPoints]"
          :key="`point:${point.key}`"
          class="cursor-pointer outline-none"
          role="button"
          tabindex="0"
          :aria-label="`${years[point.index]} 年 ${point.label} ${point.value}`"
          @click="selectYear(years[point.index] ?? 0, point.seriesKey)"
          @keydown.enter.prevent="selectYear(years[point.index] ?? 0, point.seriesKey)"
          @focus="hovered = point.index"
          @mouseenter="hovered = point.index"
        >
          <circle :cx="point.x" :cy="point.y" r="8" fill="transparent" />
          <circle :cx="point.x" :cy="point.y" r="2.5" :fill="point.color" />
          <title>{{ years[point.index] }} 年 · {{ point.label }}：{{ point.value }}</title>
        </g>

        <g v-for="(year, index) in years" :key="`label:${year}`">
          <text
            v-if="index % labelEvery === 0"
            :x="xOf(index)"
            :y="height - 12"
            text-anchor="middle"
            font-size="10"
            :fill="hovered === index ? 'var(--ui-text-highlighted)' : 'var(--ui-text-muted)'"
          >
            {{ year }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>
