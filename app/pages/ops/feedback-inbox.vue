<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  FEEDBACK_STATUS_LABEL,
  type FeedbackRecord,
  type FeedbackStatus,
} from '~~/shared/feedback.ts'

definePageMeta({
  layout: false,
})

useHead({
  title: '反馈收件箱',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

/** Local storage key for the inbox token on this browser only. */
const TOKEN_KEY = 'miku-feedback-inbox-token'

type ListResponse = { count: number; items: FeedbackRecord[] }
type StatusResponse = { ok: true; item: FeedbackRecord }

const token = ref('')
const pending = ref(false)
const error = ref('')
const items = ref<FeedbackRecord[]>([])
const busyId = ref('')

/** Loads a remembered token once on the client. */
const restoreToken = (): void => {
  if (!import.meta.client) return
  token.value = window.localStorage.getItem(TOKEN_KEY) ?? ''
}

restoreToken()

watch(token, (value) => {
  if (!import.meta.client) return
  if (value.trim() === '') window.localStorage.removeItem(TOKEN_KEY)
  else window.localStorage.setItem(TOKEN_KEY, value.trim())
})

/** Newest first is already returned by the API; keep a local copy for toggles. */
const rows = computed(() => items.value)

/** Fetches the inbox for the current token. */
const loadInbox = async (): Promise<void> => {
  error.value = ''
  const secret = token.value.trim()
  if (secret === '') {
    error.value = '请先填写 FEEDBACK_TOKEN'
    items.value = []
    return
  }
  pending.value = true
  try {
    const response = await $fetch<ListResponse>('/api/feedback/list', {
      query: { token: secret, limit: 200 },
    })
    items.value = response.items
  } catch (caught) {
    items.value = []
    error.value = caught instanceof Error ? caught.message : '加载失败'
  } finally {
    pending.value = false
  }
}

/** Sets one item to open or resolved and refreshes that row in the list. */
const setStatus = async (item: FeedbackRecord, status: FeedbackStatus): Promise<void> => {
  const secret = token.value.trim()
  if (secret === '') {
    error.value = '请先填写 FEEDBACK_TOKEN'
    return
  }
  busyId.value = item.id
  error.value = ''
  try {
    const response = await $fetch<StatusResponse>('/api/feedback/status', {
      method: 'POST',
      body: {
        token: secret,
        id: item.id,
        receivedAt: item.receivedAt,
        status,
      },
    })
    items.value = items.value.map((row) => (row.id === item.id ? response.item : row))
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '更新状态失败'
  } finally {
    busyId.value = ''
  }
}

/** Toggles between open and resolved for one row. */
const toggleStatus = async (item: FeedbackRecord): Promise<void> => {
  await setStatus(item, item.status === 'resolved' ? 'open' : 'resolved')
}
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <div class="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <header class="space-y-2">
        <h1 class="text-xl font-semibold tracking-tight">
          反馈收件箱
        </h1>
        <p class="text-sm text-muted">
          未挂在站点导航里。用直接 URL 打开，并用 FEEDBACK_TOKEN 登录。Cloudflare 账号登录仍按 issue #10 后续接入。
        </p>
      </header>

      <form class="flex flex-wrap items-end gap-3" @submit.prevent="loadInbox">
        <label class="min-w-56 flex-1 space-y-1 text-sm">
          <span class="text-muted">FEEDBACK_TOKEN</span>
          <UInput v-model="token" type="password" autocomplete="off" class="w-full" />
        </label>
        <UButton type="submit" :loading="pending" color="primary">
          加载
        </UButton>
      </form>

      <p v-if="error" class="text-sm text-error">
        {{ error }}
      </p>

      <p v-else-if="!pending && rows.length === 0" class="text-sm text-muted">
        暂无反馈，或尚未加载。
      </p>

      <ul class="space-y-3">
        <li
          v-for="item in rows"
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
              </div>
              <p class="whitespace-pre-wrap text-sm leading-relaxed">
                {{ item.description }}
              </p>
              <p v-if="item.pageUrl" class="truncate text-xs text-muted">
                <a :href="item.pageUrl" class="text-primary" target="_blank" rel="noreferrer">
                  {{ item.pageTitle || item.pageUrl }}
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
