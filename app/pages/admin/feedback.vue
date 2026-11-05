<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  FEEDBACK_STATUS_LABEL,
  isHttpUrl,
  type FeedbackRecord,
  type FeedbackStatus,
} from '~~/shared/feedback.ts'

definePageMeta({
  layout: 'admin',
})

useHead({ title: '反馈收件箱' })

type ListResponse = { count: number; items: FeedbackRecord[] }
type StatusResponse = { ok: true; item: FeedbackRecord }

/** Which subset of the loaded page the list shows; counts come from that same page. */
type InboxFilter = 'all' | FeedbackStatus

/** Coarse reason for a failed request; the API never returns a useful/safe detail. */
type ErrorKind = '' | 'access' | 'storage' | 'generic'

/** Filter buttons; "all" is the default so an unfamiliar visitor sees everything at once. */
const FILTERS: { value: InboxFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'open', label: '未解决' },
  { value: 'resolved', label: '已解决' },
]

/** Fixed Chinese copy per failure kind. Auth is Cloudflare Access; there is no password field. */
const ERROR_COPY: Record<Exclude<ErrorKind, ''>, string> = {
  access:
    '需要有效的 Cloudflare Access 登录。请刷新页面重新走一次 Access 登录；如果已登录仍看到这条提示，说明登录账号不在 Access 策略的允许列表里。',
  storage:
    '反馈存储暂不可用：Worker 可能没有 FEEDBACK 绑定（本地 nuxt dev 一定会这样），或 KV 读取失败。请稍后重试。',
  generic: '加载失败，请稍后重试。',
}

const { session, loaded: sessionLoaded, load: loadSession } = useAdminSession()
const pending = ref(false)
const errorKind = ref<ErrorKind>('')
const items = ref<FeedbackRecord[]>([])
const busyId = ref('')
const filter = ref<InboxFilter>('all')
const query = ref('')

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
  if (status === 503) return 'storage'
  return 'generic'
}

/** Formats an ISO timestamp for humans; unparseable legacy values are shown verbatim. */
const formatTime = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

/** Counts per filter, derived from the loaded page so no second request is needed. */
const counts = computed<Record<InboxFilter, number>>(() => {
  const resolved = items.value.filter((item) => item.status === 'resolved').length
  return { all: items.value.length, open: items.value.length - resolved, resolved }
})

/** Free-text filter across the description, page metadata, and the reported source link. */
const searchedItems = computed<FeedbackRecord[]>(() => {
  const term = query.value.trim().toLowerCase()
  if (term === '') return items.value
  return items.value.filter((item) => {
    return [item.description, item.pageTitle, item.pageUrl, item.sourceUrl].some((value) => {
      return value !== null && value.toLowerCase().includes(term)
    })
  })
})

/** Records matching the active status filter; the API already sorts newest first. */
const visibleItems = computed<FeedbackRecord[]>(() => {
  if (filter.value === 'all') return searchedItems.value
  return searchedItems.value.filter((item) => item.status === filter.value)
})

/** True when the inbox cannot be read here: no Access app at all, or local dev without a token. */
const unavailable = computed(() => {
  return sessionLoaded.value && (!session.value.configured || session.value.environment === 'development')
})

/** Local dev loads the real [vars] but cannot complete the Access flow on localhost. */
const developmentMode = computed(() => session.value.environment === 'development')

/** Loads the inbox. A 401 means Access is missing or expired, so the page explains that. */
const loadInbox = async (): Promise<void> => {
  pending.value = true
  errorKind.value = ''
  try {
    const response = await $fetch<ListResponse>('/api/feedback/list', { query: { limit: 200 } })
    items.value = response.items
  } catch (caught) {
    items.value = []
    errorKind.value = errorKindOf(caught)
  } finally {
    pending.value = false
  }
}

/** Sets one item to open or resolved and replaces that row with the server's copy. */
const setStatus = async (item: FeedbackRecord, status: FeedbackStatus): Promise<void> => {
  busyId.value = item.id
  errorKind.value = ''
  try {
    const response = await $fetch<StatusResponse>('/api/feedback/status', {
      method: 'POST',
      body: { id: item.id, receivedAt: item.receivedAt, status },
    })
    items.value = items.value.map((row) => (row.id === item.id ? response.item : row))
  } catch (caught) {
    errorKind.value = errorKindOf(caught)
  } finally {
    busyId.value = ''
  }
}

/** Flips one row between open and resolved. */
const toggleStatus = async (item: FeedbackRecord): Promise<void> => {
  await setStatus(item, item.status === 'resolved' ? 'open' : 'resolved')
}

/** Refreshes the session and the inbox without a full page reload. */
const refresh = async (): Promise<void> => {
  await loadSession(true)
  if (!session.value.configured || developmentMode.value) return
  await loadInbox()
}

onMounted(async () => {
  await loadSession()
  if (!session.value.configured || developmentMode.value) return
  await loadInbox()
})
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="text-xs font-medium tracking-wider text-primary uppercase">Feedback inbox</p>
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          反馈收件箱
        </h1>
        <p class="max-w-2xl text-sm leading-relaxed text-muted">
          站点访客通过右下角的「报告错误」提交的记录。收件箱只追加不删除，记录在提交 180 天后由
          KV TTL 自动过期；状态修改会重写同一条记录。
        </p>
      </div>
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
    </header>

    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-2xl border border-default bg-elevated/40 p-4">
        <p class="flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-inbox" class="size-3.5" />
          全部
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
          {{ counts.all }}
        </p>
      </div>
      <div class="rounded-2xl border border-default bg-elevated/40 p-4">
        <p class="flex items-center gap-1.5 text-xs text-warning">
          <UIcon name="i-lucide-circle-alert" class="size-3.5" />
          未解决
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
          {{ counts.open }}
        </p>
      </div>
      <div class="rounded-2xl border border-default bg-elevated/40 p-4">
        <p class="flex items-center gap-1.5 text-xs text-success">
          <UIcon name="i-lucide-circle-check" class="size-3.5" />
          已解决
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
          {{ counts.resolved }}
        </p>
      </div>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="按状态筛选">
        <UButton
          v-for="option in FILTERS"
          :key="option.value"
          size="sm"
          color="neutral"
          :variant="filter === option.value ? 'solid' : 'soft'"
          @click="filter = option.value"
        >
          {{ option.label }}
          <span class="ms-1 tabular-nums opacity-70">{{ counts[option.value] }}</span>
        </UButton>
      </div>
      <UInput
        v-model="query"
        icon="i-lucide-search"
        placeholder="搜索描述、页面或来源链接"
        size="sm"
        class="w-full sm:max-w-xs"
        :ui="{ base: 'rounded-full' }"
      />
    </div>

    <div
      v-if="unavailable"
      class="rounded-2xl border border-default bg-elevated/30 p-6 text-sm text-muted"
    >
      <p class="flex items-center gap-2 font-medium text-highlighted">
        <UIcon name="i-lucide-lock" class="size-4 text-warning" />
        {{ developmentMode ? '本地开发不读取真实反馈' : '当前环境没有 Cloudflare Access 配置' }}
      </p>
      <p class="mt-2 leading-relaxed">
        <template v-if="developmentMode">
          本地 <code class="rounded bg-elevated px-1 py-0.5">nuxt dev</code> 没有可供 127.0.0.1 使用的 Access 应用，
          Worker 也不会把 FEEDBACK 绑定放进请求上下文，因此这里不发起读取请求。部署后访问线上域名的
          <code class="rounded bg-elevated px-1 py-0.5">/admin</code> 并完成 Cloudflare 登录即可看到真实数据。
        </template>
        <template v-else>
          反馈收件箱通过 Cloudflare Access 身份读取 KV，当前 Worker 的 ACCESS_TEAM_DOMAIN / ACCESS_AUD
          为空，因此不会发起请求。请在
          <NuxtLink to="/admin/system" class="text-primary">系统状态</NuxtLink>
          核对配置。
        </template>
      </p>
    </div>

    <p v-else-if="errorKind" class="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
      {{ ERROR_COPY[errorKind] }}
    </p>

    <div v-else-if="pending && items.length === 0" class="space-y-3">
      <USkeleton v-for="index in 3" :key="index" class="h-28 w-full rounded-2xl" />
    </div>

    <div
      v-else-if="items.length === 0"
      class="rounded-2xl border border-dashed border-default bg-elevated/20 px-6 py-14 text-center"
    >
      <UIcon name="i-lucide-inbox" class="mx-auto size-8 text-muted" />
      <p class="mt-3 text-sm font-medium text-highlighted">
        暂无反馈
      </p>
      <p class="mt-1 text-xs text-muted">
        收到的错误报告会按时间倒序出现在这里。
      </p>
    </div>

    <div
      v-else-if="visibleItems.length === 0"
      class="rounded-2xl border border-dashed border-default bg-elevated/20 px-6 py-12 text-center"
    >
      <UIcon name="i-lucide-search-x" class="mx-auto size-8 text-muted" />
      <p class="mt-3 text-sm font-medium text-highlighted">
        没有符合当前条件的反馈
      </p>
      <p class="mt-1 text-xs text-muted">
        换一个关键词，或切换到「全部」。
      </p>
    </div>

    <ul v-else class="space-y-3">
      <li
        v-for="item in visibleItems"
        :key="item.id"
        class="relative overflow-hidden rounded-2xl border border-default bg-elevated/30 p-4 transition-colors hover:border-primary/40"
      >
        <span
          class="absolute inset-y-0 left-0 w-0.5"
          :class="item.status === 'resolved' ? 'bg-success' : 'bg-warning'"
        />
        <div class="flex flex-wrap items-start justify-between gap-3 ps-2">
          <div class="min-w-0 flex-1 space-y-2">
            <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
              <UBadge
                :color="item.status === 'resolved' ? 'success' : 'warning'"
                variant="subtle"
                size="sm"
              >
                {{ FEEDBACK_STATUS_LABEL[item.status] }}
              </UBadge>
              <time :datetime="item.receivedAt">{{ formatTime(item.receivedAt) }}</time>
              <span v-if="item.viewport" class="rounded-full bg-elevated px-2 py-0.5">
                视口 {{ item.viewport }}
              </span>
              <span v-if="item.catalogVersion" class="rounded-full bg-elevated px-2 py-0.5">
                目录 {{ item.catalogVersion }}
              </span>
            </div>
            <p class="whitespace-pre-wrap text-sm leading-relaxed text-default">
              {{ item.description }}
            </p>
            <div class="space-y-1 text-xs text-muted">
              <p v-if="item.pageTitle || item.pageUrl" class="truncate">
                <UIcon name="i-lucide-monitor" class="me-1 inline size-3.5 align-[-2px]" />
                <a
                  v-if="item.pageUrl && isHttpUrl(item.pageUrl)"
                  :href="item.pageUrl"
                  class="text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ item.pageTitle || item.pageUrl }}
                </a>
                <span v-else>{{ item.pageTitle || item.pageUrl }}</span>
              </p>
              <p v-if="item.sourceUrl" class="truncate">
                <UIcon name="i-lucide-link" class="me-1 inline size-3.5 align-[-2px]" />
                数据来源：
                <a
                  v-if="isHttpUrl(item.sourceUrl)"
                  :href="item.sourceUrl"
                  class="text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ item.sourceUrl }}
                </a>
                <span v-else>{{ item.sourceUrl }}</span>
              </p>
            </div>
          </div>
          <UButton
            size="sm"
            color="neutral"
            :variant="item.status === 'resolved' ? 'soft' : 'solid'"
            :icon="item.status === 'resolved' ? 'i-lucide-rotate-ccw' : 'i-lucide-check'"
            :loading="busyId === item.id"
            @click="toggleStatus(item)"
          >
            {{ item.status === 'resolved' ? '标为未解决' : '标为已解决' }}
          </UButton>
        </div>
      </li>
    </ul>
  </div>
</template>
