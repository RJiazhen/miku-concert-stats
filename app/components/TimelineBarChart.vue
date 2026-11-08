<script setup lang="ts">
import { computed, ref } from 'vue'

/** One series drawn as bars or as a line; `values` is aligned with `years`. */
export type TimelineSeries = {
  key: string
  label: string
  color: string
  values: number[]
  /**
   * Names folded into a merged bucket, e.g. the members of 其他. Printed when the legend entry is
   * hovered or focused, so one colour can stand for several roles without hiding them.
   */
  legendDetail?: string
  /**
   * Per-year members of a merged bar segment, aligned with `values`. A stacked segment keeps one
   * colour, but hovering it still names every role it stands for.
   */
  details?: readonly string[]
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

/** One axis: its top value and the tick values drawn along it. */
type Axis = {
  max: number
  ticks: number[]
}

/**
 * Fits a maximum into a readable axis instead of the coarse 1 / 2 / 5 ceiling.
 * The step comes from `value / divisions` rounded to 1 / 2 / 2.5 / 5 / 10 of its magnitude,
 * then repeats until it covers the data, so 247 tops out at 250 rather than 500
 * and the bars keep most of the plot height in every counting mode.
 */
const buildAxis = (value: number, divisions = 5): Axis => {
  if (!Number.isFinite(value) || value <= 0) return { max: 1, ticks: [0, 0.5, 1] }
  const rough = value / divisions
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10) * magnitude
  const max = step * Math.ceil(value / step - 1e-9)
  const ticks: number[] = []
  for (let tick = 0; tick <= max + step / 2; tick += step) ticks.push(Number(tick.toFixed(6)))
  return { max, ticks }
}

/** Highest bar total, before the axis rounds it. */
const barPeak = computed(() => {
  const totals = props.years.map((_, index) => {
    if (!props.stacked) return Math.max(0, ...props.bars.map((series) => series.values[index] ?? 0))
    return props.bars.reduce((sum, series) => sum + (series.values[index] ?? 0), 0)
  })
  return Math.max(0, ...totals)
})

/** Left axis of the bars alone, so a bar keeps its own scale when lines share the axis. */
const barAxis = computed(() => buildAxis(barPeak.value))

/** Highest bar value, used to place the bar segments. */
const barMax = computed(() => barAxis.value.max)

/** Left axis shared by the bars and the left-axis lines. */
const leftAxis = computed(() => {
  const values = props.lines.flatMap((series) => series.values)
  return values.length === 0 ? barAxis.value : buildAxis(Math.max(barPeak.value, ...values))
})

/** Highest left-axis value, for the grid lines and the left-axis lines. */
const leftMax = computed(() => leftAxis.value.max)

/** Right axis of the right-axis lines. */
const rightAxis = computed(() => {
  const values = props.rightLines.flatMap((series) => series.values)
  return buildAxis(values.length === 0 ? 1 : Math.max(...values))
})

/** Highest right-axis value. */
const rightMax = computed(() => rightAxis.value.max)

/** Tick values on the left axis. */
const leftTicks = computed(() => leftAxis.value.ticks)

/** Tick values on the right axis. */
const rightTicks = computed(() => rightAxis.value.ticks)

/** Printed tick label: whole numbers stay whole, fractional steps keep at most two decimals. */
const formatTick = (value: number): string =>
  Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)

/** Center x of one year band. */
const xOf = (index: number): number => MARGIN.left + band.value * (index + 0.5)

/** y of a value on a given axis maximum. */
const yOf = (value: number, max: number): number => MARGIN.top + plotHeight.value * (1 - value / max)

/** Printed value of a right-axis number. */
const formatRight = (value: number): string => {
  if (props.rightFormat === 'percent') return `${Math.round(value * 100)}%`
  return String(Math.round(value * 100) / 100)
}

/** Printed value of a bar: whole numbers stay whole, split chorus weights keep two decimals. */
const formatBar = (value: number): string =>
  Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)

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
  /** Members of a merged segment of this year, or null when the segment is one role. */
  detail: string | null
}

/** Members folded into one merged segment of a year, or null when the segment stands for one role. */
const detailOf = (series: TimelineSeries, index: number): string | null => {
  const detail = series.details?.[index]
  return detail === undefined || detail.trim() === '' ? null : detail
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
          detail: detailOf(series, index),
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
        detail: detailOf(series, index),
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

/** Points of the left-axis lines, back to front so earlier legend entries end up on top. */
const leftPoints = computed<LinePoint[]>(() =>
  [...props.lines].reverse().flatMap((series) =>
    props.years.flatMap((year, index) => {
      const value = series.values[index]
      if (value === undefined) return []
      return [{ key: `${series.key}:${year}`, seriesKey: series.key, label: series.label, color: series.color, index, x: xOf(index), y: yOf(value, leftMax.value), value }]
    }),
  ),
)

/** Points of the right-axis lines, back to front so earlier legend entries end up on top. */
const rightPoints = computed<LinePoint[]>(() =>
  [...props.rightLines].reverse().flatMap((series) =>
    props.years.flatMap((year, index) => {
      const value = series.values[index]
      if (value === undefined) return []
      return [{ key: `${series.key}:${year}`, seriesKey: series.key, label: series.label, color: series.color, index, x: xOf(index), y: yOf(value, rightMax.value), value }]
    }),
  ),
)

/** Left-axis lines drawn back to front, so the first legend entry is painted last and stays on top. */
const leftDrawOrder = computed(() => [...props.lines].reverse())

/** Right-axis lines drawn back to front, matching `rightPoints`. */
const rightDrawOrder = computed(() => [...props.rightLines].reverse())

/** SVG `points` attribute of one series' left line. */
const leftPolyline = (series: TimelineSeries): string =>
  props.years.map((_, index) => `${xOf(index)},${yOf(series.values[index] ?? 0, leftMax.value)}`).join(' ')

/** SVG `points` attribute of one series' right line. */
const rightPolyline = (series: TimelineSeries): string =>
  props.years.map((_, index) => `${xOf(index)},${yOf(series.values[index] ?? 0, rightMax.value)}`).join(' ')

/** One legend row; a key drawn as both bars and a line shows two markers in one entry. */
type LegendEntry = {
  key: string
  label: string
  color: string
  bar: boolean
  line: boolean
  /** Names behind a merged bucket, printed on hover; null when the entry is a single role. */
  detail: string | null
}

/** Legend rows merged by series key, so one role drawn as bars and a line is listed only once. */
const legend = computed<LegendEntry[]>(() => {
  const entries = new Map<string, LegendEntry>()
  /** Adds one series to the legend, merging it with an entry of the same key. */
  const add = (series: TimelineSeries, kind: 'bar' | 'line'): void => {
    const known = entries.get(series.key)
    const detail = series.legendDetail === undefined || series.legendDetail.trim() === '' ? null : series.legendDetail
    if (known === undefined) {
      entries.set(series.key, { key: series.key, label: series.label, color: series.color, bar: kind === 'bar', line: kind === 'line', detail })
      return
    }
    if (kind === 'bar') known.bar = true
    else known.line = true
    if (known.detail === null) known.detail = detail
  }
  for (const series of props.bars) add(series, 'bar')
  for (const series of props.lines) add(series, 'line')
  for (const series of props.rightLines) add(series, 'line')
  return [...entries.values()]
})

/** Legend entry under the cursor or keyboard focus. */
const hoveredLegendKey = ref<string | null>(null)

/** Detail text of the hovered legend entry; empty when it is a single role or nothing is hovered. */
const hoveredLegendDetail = computed(() => {
  if (hoveredLegendKey.value === null) return ''
  return legend.value.find((entry) => entry.key === hoveredLegendKey.value)?.detail ?? ''
})

/** Shows the members of a merged legend entry. */
const focusLegend = (key: string): void => {
  hoveredLegendKey.value = key
}

/** Clears the legend detail when the cursor leaves an entry. */
const blurLegend = (): void => {
  hoveredLegendKey.value = null
}

/** Year currently under the cursor, or null. */
const hoveredYear = computed(() => (hovered.value === null ? null : props.years[hovered.value] ?? null))

/** One series value at the hovered year, for the detail strip. */
type HoverValue = {
  key: string
  label: string
  color: string
  value: string
  /** Members behind a merged bar segment of this year, or null when the segment is one role. */
  detail: string | null
}

/**
 * Every value shown in the detail strip at the hovered year.
 * A key drawn as bars and a line prints one row with both numbers, each tagged with its axis unit.
 */
const hoverValues = computed<HoverValue[]>(() => {
  const index = hovered.value
  if (index === null) return []
  const rows = new Map<string, { label: string; color: string; bar: string | null; line: string | null; detail: string | null }>()
  /** Records one number under one series key, either as the bar or as the line value. */
  const add = (series: TimelineSeries, part: 'bar' | 'line', text: string): void => {
    const row = rows.get(series.key) ?? { label: series.label, color: series.color, bar: null, line: null, detail: null }
    row[part] = text
    if (part === 'bar') row.detail = detailOf(series, index)
    rows.set(series.key, row)
  }
  for (const series of props.bars) add(series, 'bar', formatBar(series.values[index] ?? 0))
  for (const series of props.lines) add(series, 'line', String(series.values[index] ?? 0))
  for (const series of props.rightLines) add(series, 'line', formatRight(series.values[index] ?? 0))
  /** Joins the bar and line numbers of one row, skipping an axis without a unit label. */
  const valueOf = (row: { bar: string | null; line: string | null }): string => {
    const parts: string[] = []
    if (row.bar !== null) parts.push(props.unit === '' ? row.bar : `${row.bar} ${props.unit}`)
    if (row.line !== null) parts.push(props.rightUnit === '' ? row.line : `${row.line} ${props.rightUnit}`)
    return parts.join(' · ')
  }
  return [...rows].map(([key, row]) => ({
    key,
    label: row.label,
    color: row.color,
    value: row.bar === null || row.line === null ? row.bar ?? row.line ?? '0' : valueOf(row),
    detail: row.detail,
  }))
})

/** Titles of the merged segments at the hovered year, printed under the detail strip. */
const hoverDetails = computed<{ key: string; label: string; detail: string }[]>(() => {
  const index = hovered.value
  if (index === null) return []
  return props.bars.flatMap((series) => {
    const detail = detailOf(series, index)
    return detail === null ? [] : [{ key: series.key, label: series.label, detail }]
  })
})

/** Title of one bar segment, naming the roles a merged segment stands for. */
const barTitle = (rect: BarRect): string => {
  const base = `${props.years[rect.index] ?? ''} 年 · ${rect.label}：${formatBar(rect.value)}`
  return rect.detail === null ? base : `${base}（${rect.detail}）`
}

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
      <span
        v-for="item in legend"
        :key="item.key"
        class="inline-flex items-center gap-1.5"
        :class="item.detail === null ? '' : 'cursor-help'"
        :title="item.detail ?? undefined"
        :tabindex="item.detail === null ? undefined : 0"
        @mouseenter="focusLegend(item.key)"
        @mouseleave="blurLegend"
        @focus="focusLegend(item.key)"
        @blur="blurLegend"
      >
        <span class="inline-flex items-center gap-0.5">
          <span v-if="item.bar" class="inline-block size-2.5 rounded-sm" :style="{ backgroundColor: item.color }" />
          <span v-if="item.line" class="inline-block h-0.5 w-3 rounded-full" :style="{ backgroundColor: item.color }" />
        </span>
        {{ item.label }}
      </span>
    </div>

    <p v-if="hoveredLegendDetail !== ''" class="-mt-0.5 mb-1 text-xs leading-relaxed text-highlighted">
      {{ hoveredLegendDetail }}
    </p>

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

    <div v-if="hoveredYear !== null && hoverDetails.length > 0" class="-mt-1.5 mb-2 space-y-0.5 text-xs leading-relaxed text-muted">
      <p v-for="item in hoverDetails" :key="`detail:${item.key}`">
        <span class="text-highlighted">{{ item.label }}</span>：{{ item.detail }}
      </p>
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
            {{ formatTick(tick) }}
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
          class="cursor-pointer"
          :x="MARGIN.left + band * index"
          :y="MARGIN.top"
          :width="band"
          :height="plotHeight"
          fill="transparent"
          @mouseenter="hovered = index"
          @click="selectYear(years[index] ?? 0, '')"
        />

        <g
          v-for="rect in barRects"
          :key="rect.key"
          class="cursor-pointer outline-none"
          role="button"
          tabindex="0"
          :aria-label="`${years[rect.index]} 年 ${rect.label} ${formatBar(rect.value)}${rect.detail === null ? '' : `，${rect.detail}`}`"
          @click="selectYear(years[rect.index] ?? 0, rect.seriesKey)"
          @keydown.enter.prevent="selectYear(years[rect.index] ?? 0, rect.seriesKey)"
          @focus="hovered = rect.index"
          @mouseenter="hovered = rect.index"
        >
          <rect :x="rect.x" :y="rect.y" :width="rect.width" :height="rect.height" :fill="rect.color" rx="1.5" />
          <title>{{ barTitle(rect) }}</title>
        </g>

        <g v-for="series in leftDrawOrder" :key="`line:${series.key}`">
          <polyline :points="leftPolyline(series)" fill="none" :stroke="series.color" stroke-width="2" stroke-linejoin="round" />
        </g>
        <g v-for="series in rightDrawOrder" :key="`right-line:${series.key}`">
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
