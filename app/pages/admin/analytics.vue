<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { AdminAnalytics, AdminVisitors } from '~~/shared/admin.ts'

definePageMeta({
  layout: 'admin',
})

useHead({ title: '访问统计' })

/** Windows the page offers; both APIs accept the same two values. */
type RangeDays = 7 | 30

/** Coarse reason for a failed request; the APIs never return a useful/safe detail. */
type ErrorKind = '' | 'access' | 'upstream' | 'generic'

const RANGES: { value: RangeDays; label: string }[] = [
  { value: 7, label: '近 7 天' },
  { value: 30, label: '近 30 天' },
]

/** Fixed Chinese copy per failure kind. */
const ERROR_COPY: Record<Exclude<ErrorKind, ''>, string> = {
  access: '需要有效的 Cloudflare Access 登录。请刷新页面重新走一次 Access 登录。',
  upstream: 'Cloudflare Analytics 暂时不可用：接口返回了错误或响应格式不符。请稍后重试，并确认 API token 仍有 Account Analytics 读取权限。',
  generic: '加载失败，请稍后重试。',
}

const { session, loaded: sessionLoaded, load: loadSession } = useAdminSession()
const pending = ref(false)
const days = ref<RangeDays>(7)
const visitors = ref<AdminVisitors | null>(null)
const analytics = ref<AdminAnalytics | null>(null)
const visitorsError = ref<ErrorKind>('')
const analyticsError = ref<ErrorKind>('')

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

/** First-party payload once configured, or null while loading / failed / unconfigured. */
const visitorOverview = computed(() => (visitors.value?.configured === true ? visitors.value : null))

/** Cloudflare aggregate payload once configured, or null while loading / failed / unconfigured. */
const cloudflareOverview = computed(() => (analytics.value?.configured === true ? analytics.value : null))

/** True when either API reported that the server settings are incomplete. */
const unconfigured = computed(() => {
  return visitors.value?.configured === false || analytics.value?.configured === false
})

/** True while nothing has arrived yet, so the page can show skeletons instead of empty sections. */
const firstLoad = computed(() => pending.value && visitors.value === null && analytics.value === null)

/** Loads both datasets in parallel; one failing source does not blank the other. */
const loadAnalytics = async (): Promise<void> => {
  if (!canQuery.value) return
  pending.value = true
  visitorsError.value = ''
  analyticsError.value = ''
  const [visitorResult, analyticsResult] = await Promise.allSettled([
    $fetch<AdminVisitors>('/api/admin/visitors', { query: { days: days.value } }),
    $fetch<AdminAnalytics>('/api/admin/analytics', { query: { days: days.value } }),
  ])
  if (visitorResult.status === 'fulfilled') visitors.value = visitorResult.value
  else {
    visitors.value = null
    visitorsError.value = errorKindOf(visitorResult.reason)
  }
  if (analyticsResult.status === 'fulfilled') analytics.value = analyticsResult.value
  else {
    analytics.value = null
    analyticsError.value = errorKindOf(analyticsResult.reason)
  }
  pending.value = false
}

/** Switches the window and reloads in one go; clearing payloads shows the loading state. */
const selectRange = async (value: RangeDays): Promise<void> => {
  if (days.value === value) return
  days.value = value
  visitors.value = null
  analytics.value = null
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
        <p class="text-xs font-medium tracking-wider text-primary uppercase">Analytics</p>
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          访问统计
        </h1>
        <p class="max-w-3xl text-sm leading-relaxed text-muted">
          上面的「访客统计」是站内第一方脚本的记录：每个浏览器一个随机访客 ID，因此独立访客、新访客与回访访客都是真实去重计数。
          下面的「Cloudflare 官方聚合」是对照用的 beacon 数据，没有访客身份。两者都只统计
          <code class="rounded bg-elevated px-1 py-0.5">requestHost = CF_ANALYTICS_HOST</code> 这一个 host，账户里其它站点不会混入。
        </p>
      </div>
      <div class="flex items-center gap-2">
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
      title="本地开发不读取线上统计"
      description="127.0.0.1 不是 Cloudflare Access 的 destination，没有可用的维护者身份，因此这里不发起查询。部署后登录线上 /admin 即可看到真实数据。"
    />

    <template v-else>
      <UAlert
        v-if="unconfigured"
        color="warning"
        variant="subtle"
        icon="i-lucide-plug-zap"
        title="统计服务尚未配置完整"
      >
        <template #description>
          服务端缺少
          <code class="rounded bg-elevated px-1 py-0.5">CF_ANALYTICS_API_TOKEN</code>、
          <code class="rounded bg-elevated px-1 py-0.5">CF_ACCOUNT_TAG</code>
          或
          <code class="rounded bg-elevated px-1 py-0.5">CF_ANALYTICS_HOST</code>，
          因此不会查询 Cloudflare。用
          <code class="rounded bg-elevated px-1 py-0.5">pnpm exec wrangler secret put CF_ANALYTICS_API_TOKEN</code>
          写入 Account Analytics 只读 token，把 account tag 与站点 host 填进
          <code class="rounded bg-elevated px-1 py-0.5">wrangler.toml</code> 的
          <code class="rounded bg-elevated px-1 py-0.5">[vars] CF_ACCOUNT_TAG</code> /
          <code class="rounded bg-elevated px-1 py-0.5">CF_ANALYTICS_HOST</code>
          后重新部署。页面上的 beacon 另由
          <code class="rounded bg-elevated px-1 py-0.5">NUXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN</code>
          控制，两者互不影响。
        </template>
      </UAlert>

      <template v-else>
        <div v-if="firstLoad" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <USkeleton v-for="index in 4" :key="index" class="h-28 rounded-xl" />
        </div>

        <template v-else>
          <UAlert
            v-if="visitorsError"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :description="`第一方访客统计：${ERROR_COPY[visitorsError]}`"
          />
          <AdminVisitorStats v-else-if="visitorOverview" :overview="visitorOverview" />

          <UAlert
            v-if="analyticsError"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :description="`Cloudflare 官方聚合：${ERROR_COPY[analyticsError]}`"
          />
          <AdminCloudflareStats v-else-if="cloudflareOverview" :overview="cloudflareOverview" />
        </template>
      </template>
    </template>
  </div>
</template>
