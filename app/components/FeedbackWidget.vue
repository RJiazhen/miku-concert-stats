<script setup lang="ts">
import { ref } from 'vue'
import { FEEDBACK_DESCRIPTION_MAX, FEEDBACK_URL_MAX, isHttpUrl } from '~~/shared/feedback.ts'

/** Response body of `POST /api/feedback`. */
type FeedbackResponse = { ok: true; id: string }

const { description, sourceUrl, clearDraft } = useFeedbackDraft()

const open = ref(false)
const pending = ref(false)
const errorMessage = ref('')
const successId = ref('')

// Read-only page context, re-collected every time the modal opens.
const pageUrl = ref('')
const pageTitle = ref('')

/** Muted, still selectable styling for the read-only page context (readonly, never disabled). */
const readonlyFieldUi = { base: 'bg-elevated/50 text-muted ring-default/50' }

let closeTimer: ReturnType<typeof setTimeout> | undefined

/** Refreshes the page URL and title shown in the greyed-out fields. */
const collectContext = (): void => {
  if (!import.meta.client) return
  pageUrl.value = window.location.href
  pageTitle.value = document.title
}

/** Opens the modal with a fresh page snapshot, keeping any cached draft. */
const openModal = (): void => {
  if (closeTimer !== undefined) {
    clearTimeout(closeTimer)
    closeTimer = undefined
  }
  collectContext()
  errorMessage.value = ''
  successId.value = ''
  open.value = true
}

/** Closes the modal; the draft stays in localStorage until a submit succeeds. */
const closeModal = (): void => {
  open.value = false
}

/** Extracts the Chinese `message` from an h3 error response, with a safe fallback. */
const messageFromError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data
    if (typeof data === 'object' && data !== null && 'message' in data) {
      const message = (data as { message?: unknown }).message
      if (typeof message === 'string' && message.trim() !== '') return message
    }
  }
  return '提交失败，请稍后再试。已填写的内容仍保存在本地。'
}

/** Sends the report, keeps the draft on failure and clears it only on success. */
const submit = async (): Promise<void> => {
  if (pending.value) return
  const trimmedDescription = description.value.trim()
  if (trimmedDescription === '') {
    errorMessage.value = '请先填写问题描述'
    return
  }
  const trimmedSource = sourceUrl.value.trim()
  if (trimmedSource !== '' && !isHttpUrl(trimmedSource)) {
    errorMessage.value = '数据来源链接必须是 http:// 或 https:// 开头的网址'
    return
  }

  pending.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<FeedbackResponse>('/api/feedback', {
      method: 'POST',
      body: {
        description: trimmedDescription,
        sourceUrl: trimmedSource === '' ? null : trimmedSource,
        pageUrl: pageUrl.value || null,
        pageTitle: pageTitle.value || null,
      },
    })
    successId.value = response.id
    await clearDraft()
    closeTimer = setTimeout(() => {
      open.value = false
      closeTimer = undefined
    }, 2600)
  } catch (error) {
    errorMessage.value = messageFromError(error)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UButton
    class="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 rounded-full shadow-lg shadow-black/25 sm:right-6"
    color="primary"
    variant="solid"
    size="lg"
    aria-label="报告错误"
    aria-haspopup="dialog"
    :aria-expanded="open"
    @click="openModal"
  >
    <UIcon name="i-lucide-message-square-warning" class="size-5" />
    <span class="hidden sm:inline">报告错误</span>
  </UButton>

  <UModal
    v-model:open="open"
    title="报告错误"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="successId"
          color="success"
          variant="subtle"
          icon="i-lucide-circle-check"
          title="已收到，谢谢！"
          :description="`编号 ${successId}，稍后会自动关闭。`"
        />

        <template v-else>
          <div class="space-y-3">
            <UFormField label="页面链接">
              <UInput
                :model-value="pageUrl"
                readonly
                class="w-full cursor-default font-mono text-xs"
                :ui="readonlyFieldUi"
              />
            </UFormField>

            <UFormField label="页面标题">
              <UInput :model-value="pageTitle" readonly class="w-full cursor-default" :ui="readonlyFieldUi" />
            </UFormField>
          </div>

          <UFormField label="问题描述" required :hint="`${description.length}/${FEEDBACK_DESCRIPTION_MAX}`">
            <UTextarea
              v-model="description"
              :rows="4"
              :maxlength="FEEDBACK_DESCRIPTION_MAX"
              placeholder="哪个数据不对？期望是什么？"
              class="w-full"
              autofocus
            />
          </UFormField>

          <UFormField
            label="正确的数据来源（可选）"
            help="如果知道正确数据的出处，把网页地址贴在这里，例如 VocaDB 的链接。"
          >
            <UInput
              v-model="sourceUrl"
              type="url"
              inputmode="url"
              :maxlength="FEEDBACK_URL_MAX"
              placeholder="https://vocadb.net/..."
              class="w-full"
            />
          </UFormField>

          <UAlert v-if="errorMessage" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="errorMessage" />
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton v-if="successId" color="primary" variant="soft" label="关闭" @click="closeModal" />
        <template v-else>
          <UButton color="neutral" variant="ghost" label="取消" @click="closeModal" />
          <UButton color="primary" label="提交" :loading="pending" :disabled="pending" @click="submit" />
        </template>
      </div>
    </template>
  </UModal>
</template>
