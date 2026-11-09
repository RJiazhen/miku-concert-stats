<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { AdminAnalytics } from '~~/shared/admin.ts'

definePageMeta({
  layout: 'admin',
})

useHead({ title: '访问统计' })

/** Windows the page offers; the API accepts the same two values. */
type RangeDays = 7 | 30

/** Coarse reason for a failed request; the API never returns a useful/safe detail. */
type ErrorKind = '' | 'access' | 'upstream' | 'generic'

const RANGES: { value: RangeDays; label: string }[] = [
  { value: 7, label: '近 7 天' },
  { value: 30, label: '近 30 天' },
]

/** Fixed Chinese copy per failure kind. */
const ERROR_COPY: Record<Exclude<ErrorKind, ''>, string> = {
  access: '需要有效的 Cloudflare Access 登录。请刷新页面重新走一次 Access 登录。',
  upstream: 'Cloudflare GraphQL Analytics 暂时不可用：接口返回了错误或响应格式不符。请稍后重试，并确认 API token 仍有 Account Analytics 读取权限。',
  generic: '加载失败，请稍后重试。',
}

const numberFormat = new Intl.NumberFormat('zh-CN')

const { session, loaded: sessionLoaded, load: loadSession } = useAdminSession()
const pending = ref(false)
const errorKind = ref<ErrorKind>('')
const days = ref<RangeDays>(7)
const data = ref<AdminAnalytics | null>(null)

/** Formats an integer with thousands separators. */
const formatNumber = (value: number): string => numberFormat.format(value)

/** HTTP status of a failed `$fetch`, or 0 when the rejection is not an HTTP response. */
const statusCodeOf = (error: unknown): number => {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const code = (error as { statusCode?: unknown }).statusCode
    if (typeof code === 'number') return code
  }
  return 0
}

/** Maps a failed request to the copy the page shows; never surfaces the server's message. */
const errorKindOf = (error: unknown): ErrorKind => {
  const status = statusCodeOf(error)
  if (status === 401 || status === 403) return 'access'
  if (status === 502 || status === 503) return 'upstream'
  return 'generic'
}

/** Local dev cannot complete the Access flow on 127.0.0.1, so it never queries Analytics. */
const developmentMode = computed(() => session.value.environment === 'development')

/** True when the Worker has no ACCESS_TEAM_DOMAIN / ACCESS_AUD, so no admin API can answer. */
const accessMissing = computed(() => sessionLoaded.value && !session.value.configured)

/** Only a resolved maintainer identity may ask for the numbers. */
const canQuery = computed(() => {
  return session.value.configured && session.value.identity !== null && !developmentMode.value
})

/** The configured payload, or null while unconfigured / loading / failed. */
const overview = computed(() => (data.value?.configured === true ? data.value : null))

/** Bar width for one path, as its share of all page views in the window. */
const sharePercent = (pageviews: number): number => {
  const total = overview.value?.pageviews ?? 0
  if (total <= 0) return 0
  return Math.min(100, Math.round((pageviews / total) * 100))
}

/** Sampling label: Cloudflare reports an interval of 1 when it did not sample. */
const sampleLabel = computed(() => {
  const interval = overview.value?.sampleInterval
  return interval === null || interval === undefined ? '未报告' : `1 / ${formatNumber(interval)}`
})

/** Loads the current window. An empty identity or local dev short-circuits without a request. */
const loadAnalytics = async (): Promise<void> => {
  if (!canQuery.value) return
  pending.value = true
  errorKind.value = ''
  try {
    data.value = await $fetch<AdminAnalytics>('/api/admin/analytics', { query: { days: days.value } })
  } catch (caught) {
    data.value = null
    errorKind.value = errorKindOf(caught)
  } finally {
    pending.value = false
  }
}

/** Switches the window and reloads in one go; clearing the payload shows the loading state. */
const selectRange = async (value: RangeDays): Promise<void> => {
  if (days.value === value) return
  days.value = value
  data.value = null
  await loadAnalytics()
}

/** Refreshes the session, then the numbers, so an expired token gets a fresh chance. */
const refresh = async (): Promise<void> => {
  await loadSession(true)
  await loadAnalytics()
}

onMounted(async () => {
  await loadSession()
  await loadAnalytics()
})
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="text-xs font-medium tracking-wider text-primary uppercase">Web Analytics</p>
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          访问统计
        </h1>
        <p class="max-w-2xl text-sm leading-relaxed text-muted">
          Cloudflare Web Analytics 的 JS beacon 收集的聚合数据：页面浏览量、访问次数与热门路径。
          查询由 Worker 在服务端完成，只返回聚合数字，不返回任何访客级信息。
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UBadge v-if="overview" color="neutral" variant="subtle" size="sm">
          {{ overview.from }} – {{ overview.to }}
        </UBadge>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="soft"
          size="sm"
          :loading="pending"
          @click="refresh"
        >
          刷新
        </UButton>
      </div>
    </header>

    <div v-if="canQuery" class="flex flex-wrap items-center gap-2" role="group" aria-label="选择时间范围">
      <UButton
        v-for="option in RANGES"
        :key="option.value"
        size="sm"
        color="neutral"
        :variant="days === option.value ? 'solid' : 'soft'"
        @click="selectRange(option.value)"
      >
        {{ option.label }}
      </UButton>
    </div>

    <UAlert
      v-if="accessMissing"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="当前环境没有 Cloudflare Access 配置"
      description="ACCESS_TEAM_DOMAIN / ACCESS_AUD 为空时所有管理接口 fail closed，访问统计也不会发起查询。请先在 wrangler.toml 补齐 Access 配置。"
    />

    <UAlert
      v-else-if="developmentMode"
      color="neutral"
      variant="subtle"
      icon="i-lucide-laptop"
      title="本地开发不读取 Cloudflare Web Analytics"
      description="127.0.0.1 不是 Cloudflare Access 的 destination，没有可用的维护者身份，因此这里不发起 GraphQL 查询。部署后登录线上 /admin 即可看到真实数据。"
    />

    <UAlert
      v-else-if="errorKind"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :description="ERROR_COPY[errorKind]"
    />

    <div v-else-if="pending && data === null" class="grid gap-3 sm:grid-cols-3">
      <USkeleton v-for="index in 3" :key="index" class="h-28 rounded-xl" />
    </div>

    <template v-else-if="data && !data.configured">
      <UAlert
        color="warning"
        variant="subtle"
        icon="i-lucide-plug-zap"
        title="Cloudflare Web Analytics 尚未配置"
      >
        <template #description>
          服务端缺少
          <code class="rounded bg-elevated px-1 py-0.5">CF_ANALYTICS_API_TOKEN</code>
          或
          <code class="rounded bg-elevated px-1 py-0.5">CF_ACCOUNT_TAG</code>，
          因此不会查询 Cloudflare。用
          <code class="rounded bg-elevated px-1 py-0.5">pnpm exec wrangler secret put CF_ANALYTICS_API_TOKEN</code>
          写入 Account Analytics 只读 token，把 account tag 填进
          <code class="rounded bg-elevated px-1 py-0.5">wrangler.toml</code> 的
          <code class="rounded bg-elevated px-1 py-0.5">[vars] CF_ACCOUNT_TAG</code>
          后重新部署。页面上的 beacon 另由
          <code class="rounded bg-elevated px-1 py-0.5">NUXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN</code>
          控制，两者互不影响。
        </template>
      </UAlert>

      <UCard variant="subtle">
        <h2 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
          <UIcon name="i-lucide-key-round" class="size-4 text-primary" />
          需要设置的两项
        </h2>
        <dl class="mt-4 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt class="font-mono text-highlighted">CF_ANALYTICS_API_TOKEN</dt>
            <dd class="mt-0.5 text-muted">
              账户级 API token，权限只需要 Account &gt; Account Analytics &gt; Read。用
              <code class="rounded bg-elevated px-1 py-0.5">wrangler secret put</code> 保存，不要写进仓库。
            </dd>
          </div>
          <div>
            <dt class="font-mono text-highlighted">CF_ACCOUNT_TAG</dt>
            <dd class="mt-0.5 text-muted">
              Cloudflare 控制台首页右侧的 Account ID（32 位十六进制），写进
              <code class="rounded bg-elevated px-1 py-0.5">wrangler.toml</code> 的
              <code class="rounded bg-elevated px-1 py-0.5">[vars]</code>。
            </dd>
          </div>
        </dl>
      </UCard>
    </template>

    <template v-else-if="overview">
      <div class="grid gap-3 sm:grid-cols-3">
        <UCard variant="subtle">
          <p class="flex items-center gap-1.5 text-xs text-muted">
            <UIcon name="i-lucide-eye" class="size-3.5" />
            页面浏览量
          </p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
            {{ formatNumber(overview.pageviews) }}
          </p>
          <p class="mt-1 text-[11px] text-muted">beacon 记录的全部页面加载。</p>
        </UCard>
        <UCard variant="subtle">
          <p class="flex items-center gap-1.5 text-xs text-muted">
            <UIcon name="i-lucide-user-round-check" class="size-3.5" />
            访问次数
          </p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
            {{ formatNumber(overview.visits) }}
          </p>
          <p class="mt-1 text-[11px] text-muted">从站外进入的访问（sum.visits）。</p>
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
        <h2 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
          <UIcon name="i-lucide-chart-line" class="size-4 text-primary" />
          热门路径
        </h2>
        <p class="mt-1 text-xs text-muted">
          按浏览量排序的前 20 条路径。beacon 不记录查询串，所以同一页面的不同参数会合并成一条。
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

      <UCard variant="subtle">
        <h2 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
          <UIcon name="i-lucide-info" class="size-4 text-primary" />
          数据口径
        </h2>
        <ul class="mt-3 list-disc space-y-1.5 ps-5 text-xs leading-relaxed text-muted">
          <li>数据集：<code class="rounded bg-elevated px-1 py-0.5">rumPageloadEventsAdaptiveGroups</code>，账户级筛选。</li>
          <li>时间范围按 UTC 日历日计算，包含今天。</li>
          <li>站点只发 beacon，不记录 IP、Cookie 或站内自建埋点；这里没有任何访客级明细。</li>
          <li>账户里如果有多个 Web Analytics 站点，会合并统计。</li>
        </ul>
      </UCard>
    </template>
  </div>
</template>
