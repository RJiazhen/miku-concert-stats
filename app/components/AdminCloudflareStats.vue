<script setup lang="ts">
/**
 * Cloudflare Web Analytics aggregate block for `/admin/analytics`.
 *
 * This is the beacon-collected view (`rumPageloadEventsAdaptiveGroups`, scoped to `requestHost`).
 * It has no visitor identity, so it is rendered as a comparison to the first-party numbers.
 */
import { computed } from 'vue'
import type { AdminAnalyticsBreakdown, AdminAnalyticsConfigured, AdminAnalyticsDay } from '~~/shared/admin.ts'

const props = defineProps<{ overview: AdminAnalyticsConfigured }>()

/** Breakdown aliases the block renders side by side. */
type BreakdownKind = 'devices' | 'browsers' | 'countries'

/** Device type strings Cloudflare reports, mapped to short Chinese labels. */
const DEVICE_LABELS: Record<string, string> = {
  desktop: '桌面',
  mobile: '移动',
  tablet: '平板',
  other: '其他',
}

const numberFormat = new Intl.NumberFormat('zh-CN')

/** Formats an integer with thousands separators. */
const formatNumber = (value: number): string => numberFormat.format(value)

/** Every UTC day in the window, oldest first. */
const daily = computed<AdminAnalyticsDay[]>(() => props.overview.daily)

/** Chart rows: short `MM-DD` labels plus one numeric series per metric. */
const trendData = computed(() =>
  daily.value.map((day) => ({
    day: day.date.slice(5),
    pageviews: day.pageviews,
    visits: day.visits,
  })),
)

/** Series shown in the trend chart, in legend order. */
const trendCategories = [
  { key: 'pageviews', label: '页面浏览量' },
  { key: 'visits', label: '访问次数' },
]

/** True when at least one day produced beacon rows. */
const hasDaily = computed(() => daily.value.some((day) => day.pageviews > 0))

/** Busiest day in the window, or null when the window is empty. */
const peakDay = computed<AdminAnalyticsDay | null>(() => {
  if (!hasDaily.value) return null
  return daily.value.reduce((best, day) => (day.pageviews > best.pageviews ? day : best))
})

/** Page views per visit; visits are Cloudflare's session estimate, not unique visitors. */
const pageviewsPerVisit = computed(() => {
  if (props.overview.visits <= 0) return '—'
  return (props.overview.pageviews / props.overview.visits).toFixed(1)
})

/** Bar width for one row, as its share of all page views in the window. */
const sharePercent = (pageviews: number): number => {
  const total = props.overview.pageviews
  if (total <= 0) return 0
  return Math.min(100, Math.round((pageviews / total) * 100))
}

/** Sampling label: Cloudflare reports an interval of 1 when it did not sample. */
const sampleLabel = computed(() => {
  const interval = props.overview.sampleInterval
  return interval === null || interval === undefined ? '未报告' : `1 / ${formatNumber(interval)}`
})

/** Human label for a breakdown slice; an empty dimension value falls back to 未知. */
const sliceLabel = (kind: BreakdownKind, label: string): string => {
  const trimmed = label.trim()
  if (trimmed === '') return '未知'
  return kind === 'devices' ? (DEVICE_LABELS[trimmed.toLowerCase()] ?? trimmed) : trimmed
}

/** The three breakdown cards, in render order. */
const breakdownCards = computed<
  { key: BreakdownKind; title: string; icon: string; rows: AdminAnalyticsBreakdown[] }[]
>(() => [
  { key: 'devices', title: '设备类型', icon: 'i-lucide-monitor-smartphone', rows: props.overview.devices },
  { key: 'browsers', title: '浏览器', icon: 'i-lucide-compass', rows: props.overview.browsers },
  { key: 'countries', title: '国家 / 地区', icon: 'i-lucide-globe', rows: props.overview.countries },
])
</script>

<template>
  <section class="space-y-3">
    <h2 class="flex items-center gap-2 text-base font-semibold text-highlighted">
      <UIcon name="i-lucide-cloud" class="size-4 text-primary" />
      Cloudflare 官方聚合（对照）
    </h2>
    <p class="text-xs text-muted">
      beacon 记录的账户级聚合，按 <code class="rounded bg-elevated px-1 py-0.5">requestHost = {{ overview.host }}</code>
      过滤。它没有访客 ID，只有页面浏览与 Cloudflare 估算的访问会话，因此保留在这里和第一方数据对照。
    </p>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <UCard variant="subtle">
        <p class="flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-eye" class="size-3.5" />
          页面浏览量
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
          {{ formatNumber(overview.pageviews) }}
        </p>
        <p class="mt-1 text-[11px] text-muted">beacon 记录的页面加载，仅本站 host。</p>
      </UCard>
      <UCard variant="subtle">
        <p class="flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-user-round-check" class="size-3.5" />
          访问次数
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
          {{ formatNumber(overview.visits) }}
        </p>
        <p class="mt-1 text-[11px] text-muted">Cloudflare 估算的访问会话数（sum.visits）。</p>
      </UCard>
      <UCard variant="subtle">
        <p class="flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-layers" class="size-3.5" />
          每次访问页数
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
          {{ pageviewsPerVisit }}
        </p>
        <p class="mt-1 text-[11px] text-muted">页面浏览量 ÷ 访问次数。</p>
      </UCard>
      <UCard variant="subtle">
        <p class="flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-gauge" class="size-3.5" />
          数据采样
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
          {{ sampleLabel }}
        </p>
        <p class="mt-1 text-[11px] text-muted">Cloudflare 按流量自动选择采样比例。</p>
      </UCard>
    </div>

    <UCard variant="subtle">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
            <UIcon name="i-lucide-chart-column" class="size-4 text-primary" />
            每日趋势
          </h3>
          <p class="mt-1 text-xs text-muted">
            按 UTC 日历日汇总，由 Nuxt UI 的 <code class="rounded bg-elevated px-1 py-0.5">UChart</code>
            渲染（TanStack Charts）；缺少记录的日期按 0 补齐。
          </p>
        </div>
        <p v-if="peakDay" class="text-xs text-muted">
          单日最高
          <span class="font-semibold tabular-nums text-highlighted">{{ formatNumber(peakDay.pageviews) }}</span>
          次（{{ peakDay.date }}）
        </p>
      </div>

      <p
        v-if="!hasDaily"
        class="mt-4 rounded-xl border border-dashed border-default py-12 text-center text-xs text-muted"
      >
        区间内没有记录。
      </p>
      <UChart
        v-else
        class="mt-4"
        type="bar"
        :data="trendData"
        index="day"
        :categories="trendCategories"
        :height="220"
        :format="formatNumber"
        y-axis
        grid
      />
    </UCard>

    <UCard variant="subtle">
      <h3 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
        <UIcon name="i-lucide-chart-line" class="size-4 text-primary" />
        热门路径
      </h3>
      <p class="mt-1 text-xs text-muted">
        按浏览量排序的前 20 条路径，只来自 {{ overview.host }}。beacon 不记录查询串，所以同一页面的不同参数会合并成一条。
      </p>

      <UEmpty
        v-if="overview.topPaths.length === 0"
        icon="i-lucide-chart-line"
        title="区间内没有记录"
        description="beacon 配置完成并产生访问后，这里才会出现数据。"
        variant="naked"
        class="mt-4 rounded-xl border border-dashed border-default py-12"
      />

      <ul v-else class="mt-4 space-y-3">
        <li v-for="row in overview.topPaths" :key="row.path || '/'">
          <div class="flex items-center justify-between gap-3 text-xs">
            <span class="truncate font-mono text-default" :title="row.path || '/'">
              {{ row.path || '/' }}
            </span>
            <span class="shrink-0 tabular-nums text-muted">
              {{ formatNumber(row.pageviews) }} 次浏览 · {{ formatNumber(row.visits) }} 次访问
            </span>
          </div>
          <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-elevated">
            <div
              class="h-full rounded-full bg-primary"
              :style="{ width: `${sharePercent(row.pageviews)}%` }"
            />
          </div>
        </li>
      </ul>
    </UCard>

    <div class="grid gap-3 md:grid-cols-3">
      <UCard v-for="card in breakdownCards" :key="card.key" variant="subtle">
        <h3 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
          <UIcon :name="card.icon" class="size-4 text-primary" />
          {{ card.title }}
        </h3>
        <p v-if="card.rows.length === 0" class="mt-4 text-xs text-muted">
          区间内没有记录。
        </p>
        <ul v-else class="mt-3 space-y-2.5">
          <li v-for="row in card.rows" :key="row.label">
            <div class="flex items-center justify-between gap-2 text-xs">
              <span class="truncate text-default" :title="sliceLabel(card.key, row.label)">
                {{ sliceLabel(card.key, row.label) }}
              </span>
              <span class="shrink-0 tabular-nums text-muted">
                {{ formatNumber(row.pageviews) }}
              </span>
            </div>
            <div class="mt-1 h-1 overflow-hidden rounded-full bg-elevated">
              <div
                class="h-full rounded-full bg-primary/70"
                :style="{ width: `${sharePercent(row.pageviews)}%` }"
              />
            </div>
          </li>
        </ul>
      </UCard>
    </div>

    <UCard variant="subtle">
      <h3 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
        <UIcon name="i-lucide-info" class="size-4 text-primary" />
        数据口径
      </h3>
      <ul class="mt-3 list-disc space-y-1.5 ps-5 text-xs leading-relaxed text-muted">
        <li>
          数据集：<code class="rounded bg-elevated px-1 py-0.5">rumPageloadEventsAdaptiveGroups</code>，
          账户级筛选之外再加 <code class="rounded bg-elevated px-1 py-0.5">requestHost = {{ overview.host }}</code>。
        </li>
        <li>时间范围按 UTC 日历日计算，包含今天。</li>
        <li>
          <code class="rounded bg-elevated px-1 py-0.5">sum.visits</code> 是 Cloudflare 估算的访问会话数，
          不是独立访客：同一访客隔一段时间再来会重复计入。
        </li>
        <li>采样比例来自 <code class="rounded bg-elevated px-1 py-0.5">avg.sampleInterval</code>，数字是估算值。</li>
      </ul>
    </UCard>
  </section>
</template>
