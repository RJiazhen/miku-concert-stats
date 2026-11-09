<script setup lang="ts">
/**
 * First-party visitor block for `/admin/analytics`.
 *
 * Every number here comes from `Analytics Engine` rows keyed by the random visitor id the browser
 * keeps in localStorage, so unique / new / returning visitors are true counts rather than sessions.
 */
import { computed } from 'vue'
import type {
  AdminVisitorsConfigured,
  AdminVisitorDay,
  AdminVisitorPath,
  AdminVisitorSlice,
} from '~~/shared/admin.ts'

const props = defineProps<{ overview: AdminVisitorsConfigured }>()

/** Country labels for the codes Cloudflare reports most often on this site. */
const COUNTRY_LABELS: Record<string, string> = {
  CN: '中国大陆',
  HK: '中国香港',
  TW: '中国台湾',
  MO: '中国澳门',
  JP: '日本',
  US: '美国',
  SG: '新加坡',
  KR: '韩国',
  GB: '英国',
  DE: '德国',
  CA: '加拿大',
  AU: '澳大利亚',
  MY: '马来西亚',
}

/** Device labels; the browser only sends the bucket, never the user agent. */
const DEVICE_LABELS: Record<string, string> = {
  desktop: '桌面',
  mobile: '移动',
  tablet: '平板',
  other: '其他',
}

const numberFormat = new Intl.NumberFormat('zh-CN')

/** Formats an integer with thousands separators. */
const formatNumber = (value: number): string => numberFormat.format(value)

/** Formats a ratio kept to one decimal as-is. */
const formatRatio = (value: number): string => value.toFixed(1)

/** True when the window has any visitor at all. */
const hasVisitors = computed(() => props.overview.visitors > 0)

/** Every UTC day in the window, oldest first. */
const daily = computed<AdminVisitorDay[]>(() => props.overview.daily)

/** Chart rows: short `MM-DD` labels plus one numeric series per metric. */
const trendData = computed(() =>
  daily.value.map((day) => ({
    day: day.date.slice(5),
    visitors: day.visitors,
    pageviews: day.pageviews,
  })),
)

/** Series shown in the trend chart, in legend order. */
const trendCategories = [
  { key: 'visitors', label: '独立访客' },
  { key: 'pageviews', label: '页面浏览量' },
]

/** Busiest day by distinct visitors. */
const peakDay = computed<AdminVisitorDay | null>(() => {
  if (!hasVisitors.value) return null
  return daily.value.reduce((best, day) => (day.visitors > best.visitors ? day : best))
})

/** Share of visitors, used for the path and breakdown bars. */
const visitorShare = (visitors: number): number => {
  if (props.overview.visitors <= 0) return 0
  return Math.min(100, Math.round((visitors / props.overview.visitors) * 100))
}

/** Friendly country label, falling back to the raw code. */
const countryLabel = (label: string): string => {
  const code = label.trim().toUpperCase()
  if (code === '' || code === 'UNKNOWN') return '未知'
  return COUNTRY_LABELS[code] ?? code
}

/** Friendly device label, falling back to the raw bucket. */
const deviceLabel = (label: string): string => DEVICE_LABELS[label.trim().toLowerCase()] ?? label

/** The two first-party breakdown cards, in render order. */
const breakdownCards = computed<
  { key: 'devices' | 'countries'; title: string; icon: string; rows: AdminVisitorSlice[] }[]
>(() => [
  {
    key: 'devices',
    title: '设备类型',
    icon: 'i-lucide-monitor-smartphone',
    rows: props.overview.devices,
  },
  { key: 'countries', title: '国家 / 地区', icon: 'i-lucide-globe', rows: props.overview.countries },
])

/** Maps a breakdown row to its display label. */
const labelOf = (key: 'devices' | 'countries', label: string): string => {
  return key === 'devices' ? deviceLabel(label) : countryLabel(label)
}

/** Page views per path row, shown next to the visitor count. */
const pathPageviews = (row: AdminVisitorPath): string => formatNumber(row.pageviews)
</script>

<template>
  <section class="space-y-3">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 class="flex items-center gap-2 text-base font-semibold text-highlighted">
          <UIcon name="i-lucide-user-round" class="size-4 text-primary" />
          访客统计（第一方）
        </h2>
        <p class="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
          站内脚本给每个浏览器生成一个随机访客 ID（localStorage），每次页面加载记一条事件，按
          <code class="rounded bg-elevated px-1 py-0.5">requestHost = {{ overview.host }}</code>
          写入 Cloudflare Analytics Engine。访问者、新访客与回访访客都是按访客 ID 去重的真实计数。
        </p>
      </div>
      <UBadge color="neutral" variant="subtle" size="sm">
        {{ overview.from }} – {{ overview.to }}
      </UBadge>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <UCard variant="subtle">
        <p class="flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-users" class="size-3.5" />
          独立访客
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
          {{ formatNumber(overview.visitors) }}
        </p>
        <p class="mt-1 text-[11px] text-muted">去重后的访客 ID 数。</p>
      </UCard>
      <UCard variant="subtle">
        <p class="flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-user-plus" class="size-3.5" />
          新访客
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
          {{ formatNumber(overview.newVisitors) }}
        </p>
        <p class="mt-1 text-[11px] text-muted">首次访问落在本区间内的访客。</p>
      </UCard>
      <UCard variant="subtle">
        <p class="flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-repeat" class="size-3.5" />
          回访访客
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
          {{ formatNumber(overview.returningVisitors) }}
        </p>
        <p class="mt-1 text-[11px] text-muted">区间内访问、但首次访问更早的访客。</p>
      </UCard>
      <UCard variant="subtle">
        <p class="flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-eye" class="size-3.5" />
          页面浏览量
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
          {{ formatNumber(overview.pageviews) }}
        </p>
        <p class="mt-1 text-[11px] text-muted">第一方脚本记录的页面加载。</p>
      </UCard>
      <UCard variant="subtle">
        <p class="flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-chart-no-axes-combined" class="size-3.5" />
          人均浏览
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
          {{ formatRatio(overview.pageviewsPerVisitor) }}
        </p>
        <p class="mt-1 text-[11px] text-muted">页面浏览量 ÷ 独立访客。</p>
      </UCard>
      <UCard variant="subtle">
        <p class="flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-clock" class="size-3.5" />
          访问会话
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
          {{ formatNumber(overview.sessions) }}
        </p>
        <p class="mt-1 text-[11px] text-muted">
          每标签页会话一个 ID；人均 {{ formatRatio(overview.visitsPerVisitor) }} 次。
        </p>
      </UCard>
    </div>

    <UCard variant="subtle">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
            <UIcon name="i-lucide-chart-column" class="size-4 text-primary" />
            每日独立访客
          </h3>
          <p class="mt-1 text-xs text-muted">
            按 UTC 日历日汇总，趋势图由 Nuxt UI 的 <code class="rounded bg-elevated px-1 py-0.5">UChart</code>
            渲染（TanStack Charts）；悬停可看当天两个指标。
          </p>
        </div>
        <p v-if="peakDay" class="text-xs text-muted">
          单日最高
          <span class="font-semibold tabular-nums text-highlighted">{{ formatNumber(peakDay.visitors) }}</span>
          位访客（{{ peakDay.date }}）
        </p>
      </div>

      <p
        v-if="!hasVisitors"
        class="mt-4 rounded-xl border border-dashed border-default py-12 text-center text-xs text-muted"
      >
        区间内还没有第一方记录。部署后打开公开页面即可开始收集。
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
        按浏览量排序的前 20 条路径，附带去重访客数。路径不含查询串。
      </p>

      <UEmpty
        v-if="overview.topPaths.length === 0"
        icon="i-lucide-chart-line"
        title="区间内没有记录"
        description="第一方脚本开始上报后，这里才会出现数据。"
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
              {{ formatNumber(row.visitors) }} 位访客 · {{ pathPageviews(row) }} 次浏览
            </span>
          </div>
          <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-elevated">
            <div
              class="h-full rounded-full bg-secondary"
              :style="{ width: `${visitorShare(row.visitors)}%` }"
            />
          </div>
        </li>
      </ul>
    </UCard>

    <div class="grid gap-3 md:grid-cols-2">
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
              <span class="truncate text-default" :title="labelOf(card.key, row.label)">
                {{ labelOf(card.key, row.label) }}
              </span>
              <span class="shrink-0 tabular-nums text-muted">
                {{ formatNumber(row.visitors) }} 位 · {{ formatNumber(row.pageviews) }} 次
              </span>
            </div>
            <div class="mt-1 h-1 overflow-hidden rounded-full bg-elevated">
              <div
                class="h-full rounded-full bg-secondary/70"
                :style="{ width: `${visitorShare(row.visitors)}%` }"
              />
            </div>
          </li>
        </ul>
      </UCard>
    </div>

    <UCard variant="subtle">
      <h3 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
        <UIcon name="i-lucide-shield-check" class="size-4 text-primary" />
        数据口径与隐私
      </h3>
      <ul class="mt-3 list-disc space-y-1.5 ps-5 text-xs leading-relaxed text-muted">
        <li>
          存储：Cloudflare Analytics Engine 数据集 <code class="rounded bg-elevated px-1 py-0.5">miku_pageviews</code>，
          每条事件含访客 ID、会话 ID、路径、来源 host、设备类别、国家代码（取自 Cloudflare 边缘）与时间。
        </li>
        <li>
          不记录 IP、Cookie、User-Agent 原文；访客 ID 是浏览器本地生成的随机 UUID，不是登录身份，
          清除站点数据后会被当作新访客。
        </li>
        <li>上报前检查 Do Not Track；<code class="rounded bg-elevated px-1 py-0.5">/admin</code> 页面不记录，避免把自己的维护访问算进访客。</li>
        <li>访客 ID 是采样索引；Cloudflare 自动采样时，独立访客与页面浏览量按采样间隔加权估算，数字可能有少量误差。</li>
        <li>上线前的访问没有第一方数据，也不会补录；Cloudflare Web Analytics 的历史数据只在下方对照区出现。</li>
      </ul>
    </UCard>
  </section>
</template>
