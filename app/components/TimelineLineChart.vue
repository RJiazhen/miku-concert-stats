<script setup lang="ts">
import { computed, ref } from 'vue'

/** One line series; `values` is aligned with `years`. */
export type TimelineLineSeries = {
  key: string
  label: string
  color: string
  values: number[]
  /** Print this series as a dashed line, e.g. the 未识别 bucket. */
  dashed?: boolean
}

const props = withDefaults(defineProps<{
  years: number[]
  series?: TimelineLineSeries[]
  /** Label of the vertical axis, shown in the hover detail. */
  unit?: string
  height?: number
  emptyText?: string
}>(), {
  series: () => [],
  unit: '',
  height: 280,
  emptyText: '当前筛选下没有数据。',
})

const emit = defineEmits<{
  /** A data point was activated; the parent decides where to go. */
  select: [payload: { year: number; key: string }]
}>()

const MIN_WIDTH = 720
const MARGIN = { top: 16, right: 20, bottom: 32, left: 48 }

/** Index of the year under the cursor or keyboard focus. */
const hovered = ref<number | null>(null)

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

/** Highest value of any series. */
const maxValue = computed(() => niceMax(Math.max(0, ...props.series.flatMap((entry) => entry.values))))

/** Value of each tick on the vertical axis. */
const ticks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * maxValue.value))

/** Center x of one year band. */
const xOf = (index: number): number => MARGIN.left + band.value * (index + 0.5)

/** y of one value. */
const yOf = (value: number): number => MARGIN.top + plotHeight.value * (1 - value / maxValue.value)

/** SVG `points` attribute of one series. */
const polyline = (entry: TimelineLineSeries): string =>
  props.years.map((_, index) => `${xOf(index)},${yOf(entry.values[index] ?? 0)}`).join(' ')

/** One drawn point. */
type Point = {
  key: string
  seriesKey: string
  label: string
  color: string
  index: number
  x: number
  y: number
  value: number
  dashed: boolean
}

/** Every point of every series. */
const points = computed<Point[]>(() =>
  props.series.flatMap((entry) =>
    props.years.flatMap((year, index) => {
      const value = entry.values[index]
      if (value === undefined) return []
      return [{
        key: `${entry.key}:${year}`,
        seriesKey: entry.key,
        label: entry.label,
        color: entry.color,
        index,
        x: xOf(index),
        y: yOf(value),
        value,
        dashed: entry.dashed === true,
      }]
    }),
  ),
)

/** Year currently under the cursor, or null. */
const hoveredYear = computed(() => (hovered.value === null ? null : props.years[hovered.value] ?? null))

/** Series values printed in the detail strip at the hovered year. */
const hoverValues = computed(() => {
  const index = hovered.value
  if (index === null) return []
  return props.series.map((entry) => ({ key: entry.key, label: entry.label, color: entry.color, value: entry.values[index] ?? 0 }))
})

/** Whether to print every year on the x axis. */
const labelEvery = computed(() => (props.years.length > 26 ? 2 : 1))
</script>

<template>
  <div>
    <div class="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span v-for="entry in series" :key="entry.key" class="inline-flex items-center gap-1.5">
        <span class="inline-block h-0.5 w-3 rounded-full" :style="{ backgroundColor: entry.color }" />
        {{ entry.label }}
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
      <span v-else>悬停查看某年明细 · 点击数据点选择该年</span>
    </div>

    <p v-if="years.length === 0" class="py-10 text-center text-sm text-muted">{{ emptyText }}</p>
    <div v-else class="-mx-1 overflow-x-auto px-1">
      <svg
        :width="width"
        :height="height"
        :viewBox="`0 0 ${width} ${height}`"
        class="block"
        role="img"
        :aria-label="`年度折线图，纵轴 ${unit || '数值'}`"
        @mouseleave="hovered = null"
      >
        <g v-for="(tick, tickIndex) in ticks" :key="`tick:${tickIndex}`">
          <line
            :x1="MARGIN.left"
            :x2="width - MARGIN.right"
            :y1="yOf(tick)"
            :y2="yOf(tick)"
            stroke="var(--ui-border)"
            stroke-width="1"
            stroke-dasharray="3 4"
          />
          <text
            :x="MARGIN.left - 6"
            :y="yOf(tick) + 3"
            text-anchor="end"
            font-size="10"
            fill="var(--ui-text-muted)"
          >
            {{ Math.round(tick) }}
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

        <g v-for="entry in series" :key="`line:${entry.key}`">
          <polyline
            :points="polyline(entry)"
            fill="none"
            :stroke="entry.color"
            :stroke-width="entry.dashed ? 1.5 : 2"
            :stroke-dasharray="entry.dashed ? '5 3' : undefined"
            stroke-linejoin="round"
          />
        </g>

        <g
          v-for="point in points"
          :key="`point:${point.key}`"
          class="cursor-pointer outline-none"
          role="button"
          tabindex="0"
          :aria-label="`${years[point.index]} 年 ${point.label} ${point.value}`"
          @click="emit('select', { year: years[point.index] ?? 0, key: point.seriesKey })"
          @keydown.enter.prevent="emit('select', { year: years[point.index] ?? 0, key: point.seriesKey })"
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
