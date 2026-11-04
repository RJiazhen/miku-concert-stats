<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { FEEDBACK_STATUS_LABEL, type FeedbackRecord, type FeedbackStatus } from '~~/shared/feedback.ts'

// Hidden ops page: no layout, no nav entry, no link from any public component. Reachable only by
// typing the URL, and only useful to someone already signed in to the Cloudflare Access app.
definePageMeta({
  layout: false,
})

useHead({
  title: '反馈收件箱',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

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

/** Fixed Chinese copy per failure kind. No password field is ever offered: auth is Cloudflare Access. */
const ERROR_COPY: Record<Exclude<ErrorKind, ''>, string> = {
  access:
    '需要 Cloudflare Access 登录。这个页面只对通过 Cloudflare 账号登录的维护者开放：请先完成 Cloudflare Access 登录，然后刷新本页。这里没有密码输入框。如果已登录仍看到这条提示，说明 Worker 的 ACCESS_TEAM_DOMAIN / ACCESS_AUD 尚未配置，或登录账号不在允许列表里。',
  storage:
    '反馈存储暂不可用：Worker 可能没有 FEEDBACK 绑定（本地 nuxt dev 一定会这样），或 KV 读取失败。请稍后重试。',
  generic: '加载失败，请稍后重试。',
}

const pending = ref(false)
const errorKind = ref<ErrorKind>('')
const items = ref<FeedbackRecord[]>([])
const busyId = ref('')
const filter = ref<InboxFilter>('all')

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

/** Counts per filter, derived from the loaded page so no second request is needed. */
const counts = computed<Record<InboxFilter, number>>(() => {
  const resolved = items.value.filter((item) => item.status === 'resolved').length
  return { all: items.value.length, open: items.value.length - resolved, resolved }
})

/** Records matching the active filter; the API already sorts newest first. */
const visibleItems = computed<FeedbackRecord[]>(() => {
  if (filter.value === 'all') return items.value
  return items.value.filter((item) => item.status === filter.value)
})

/** Loads the inbox. A 401 means Access is missing, so the page explains that instead of a form. */
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

onMounted(loadInbox)
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <div class="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <header class="space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h1 class="text-xl font-semibold tracking-tight">
            反馈收件箱
          </h1>
          <UButton size="sm" color="neutral" variant="soft" :loading="pending" @click="loadInbox">
            刷新
          </UButton>
        </div>
        <!-- Deliberately unlisted: never add this route to a nav, footer, or other public component. -->
        <p class="text-sm text-muted">
          未挂在站点导航里，只能直接输入 URL。页面本身不校验密码：能读到数据，说明当前浏览器已经通过
          Cloudflare Access 登录，Worker 在每个管理接口上自行校验 Access 身份，校验失败一律 401 且不返回任何反馈数据。
        </p>
        <p class="text-xs text-muted">
          只读追加日志：不提供删除或归档，避免误删丢证据。每条记录在提交 180 天后由
          FEEDBACK_TTL_SECONDS 自动过期；KV 里也不保留可回收的归档副本。
        </p>
      </header>

      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="按状态筛选">
        <UButton
          v-for="option in FILTERS"
          :key="option.value"
          size="sm"
          color="neutral"
          :variant="filter === option.value ? 'solid' : 'soft'"
          @click="filter = option.value"
        >
          {{ option.label }} {{ counts[option.value] }}
        </UButton>
      </div>

      <p v-if="errorKind" class="text-sm text-error">
        {{ ERROR_COPY[errorKind] }}
      </p>

      <p v-else-if="pending && items.length === 0" class="text-sm text-muted">
        正在加载…
      </p>

      <p v-else-if="items.length === 0" class="text-sm text-muted">
        暂无反馈。
      </p>

      <p v-else-if="visibleItems.length === 0" class="text-sm text-muted">
        没有符合当前筛选的反馈。
      </p>

      <ul class="space-y-3">
        <li
          v-for="item in visibleItems"
          :key="item.id"
          class="rounded-xl border border-default/70 bg-elevated/40 p-4 shadow-sm"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span
                  class="rounded-full px-2 py-0.5 font-medium"
                  :class="item.status === 'resolved'
                    ? 'bg-success/15 text-success'
                    : 'bg-warning/15 text-warning'"
                >
                  {{ FEEDBACK_STATUS_LABEL[item.status] }}
                </span>
                <time :datetime="item.receivedAt">{{ item.receivedAt }}</time>
                <span v-if="item.viewport">视口 {{ item.viewport }}</span>
                <span v-if="item.catalogVersion">目录 {{ item.catalogVersion }}</span>
              </div>
              <p class="whitespace-pre-wrap text-sm leading-relaxed">
                {{ item.description }}
              </p>
              <p v-if="item.pageUrl" class="truncate text-xs text-muted">
                <a :href="item.pageUrl" class="text-primary" target="_blank" rel="noreferrer">
                  {{ item.pageTitle || item.pageUrl }}
                </a>
              </p>
              <p v-if="item.sourceUrl" class="truncate text-xs text-muted">
                数据来源：
                <a :href="item.sourceUrl" class="text-primary" target="_blank" rel="noreferrer">
                  {{ item.sourceUrl }}
                </a>
              </p>
            </div>
            <UButton
              size="sm"
              color="neutral"
              variant="soft"
              :loading="busyId === item.id"
              @click="toggleStatus(item)"
            >
              {{ item.status === 'resolved' ? '标为未解决' : '标为已解决' }}
            </UButton>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
