<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { FEEDBACK_DESCRIPTION_MAX, FEEDBACK_URL_MAX, isHttpUrl, type FeedbackKind } from '~~/shared/feedback.ts'
import { useFloatingButtonCollapse } from '~/composables/useFloatingButtonCollapse.ts'
import { useLocale } from '~/composables/useLocale.ts'

/** Response body of `POST /api/feedback`. */
type FeedbackResponse = { ok: true; id: string }

const { kind, description, sourceUrl, clearDraft } = useFeedbackDraft()
const { t } = useLocale()

const open = ref(false)
const pending = ref(false)
const errorMessage = ref('')
const successId = ref('')

/** Radio options for the kind of feedback; the error report stays first as the default. */
const kindItems = computed<{ label: string; value: FeedbackKind }[]>(() => [
  { label: t('feedback.kindError'), value: 'error' },
  { label: t('feedback.kindFeature'), value: 'feature' },
])

/**
 * Labels and hints that follow the selected kind. Only the wording changes: switching the radio
 * leaves the typed description and link untouched, and both kinds still submit the same fields.
 */
const kindCopy = computed(() => {
  if (kind.value === 'feature') {
    return {
      description: t('feedback.featureDescription'),
      placeholder: t('feedback.featureDescriptionPlaceholder'),
      source: t('feedback.featureSource'),
      sourceHelp: t('feedback.featureSourceHelp'),
    }
  }
  return {
    description: t('feedback.errorDescription'),
    placeholder: t('feedback.errorDescriptionPlaceholder'),
    source: t('feedback.errorSource'),
    sourceHelp: t('feedback.errorSourceHelp'),
  }
})

// Read-only page context, re-collected every time the modal opens.
const pageUrl = ref('')
const pageTitle = ref('')

/** Muted, still selectable styling for the read-only page context (readonly, never disabled). */
const readonlyFieldUi = { base: 'bg-elevated/50 text-muted ring-default/50' }

let closeTimer: ReturnType<typeof setTimeout> | undefined

/** Whether the description field may autofocus; false on touch devices so the soft keyboard stays closed. */
const autofocusDescription = ref(false)

/** Enables autofocus only for a precise pointer, keeping the modal fully visible on phones. */
const detectPrecisePointer = (): void => {
  autofocusDescription.value = window.matchMedia('(pointer: fine)').matches
}
onMounted(detectPrecisePointer)

/** Whether the viewport is narrower than 40rem (640px), the only width where the button may collapse. */
const collapsed = useFloatingButtonCollapse()

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
  return t('feedback.failed')
}

/** Sends the report, keeps the draft on failure and clears it only on success. */
const submit = async (): Promise<void> => {
  if (pending.value) return
  const trimmedDescription = description.value.trim()
  if (trimmedDescription === '') {
    errorMessage.value = t(kind.value === 'feature' ? 'feedback.featureNeedDescription' : 'feedback.errorNeedDescription')
    return
  }
  const trimmedSource = sourceUrl.value.trim()
  if (trimmedSource !== '' && !isHttpUrl(trimmedSource)) {
    errorMessage.value = t(kind.value === 'feature' ? 'feedback.featureInvalidSource' : 'feedback.errorInvalidSource')
    return
  }

  pending.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<FeedbackResponse>('/api/feedback', {
      method: 'POST',
      body: {
        kind: kind.value,
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
    class="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 rounded-full shadow-lg shadow-black/25 transition-[gap,padding] duration-200 motion-reduce:transition-none sm:right-6"
    :class="collapsed ? 'max-sm:gap-0 max-sm:px-2.5' : ''"
    color="primary"
    variant="solid"
    size="lg"
    :aria-label="t('feedback.button')"
    aria-haspopup="dialog"
    :aria-expanded="open"
    @click="openModal"
  >
    <UIcon name="i-lucide-message-square-text" class="size-5" />
    <span
      class="overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 motion-reduce:transition-none"
      :class="collapsed ? 'max-w-0 opacity-0 sm:max-w-24 sm:opacity-100' : 'max-w-24'"
    >{{ t('feedback.button') }}</span>
  </UButton>

  <UModal
    v-model:open="open"
    :title="t('feedback.title')"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="successId"
          color="success"
          variant="subtle"
          icon="i-lucide-circle-check"
          :title="t('feedback.successTitle')"
          :description="t('feedback.successDesc', { id: successId })"
        />

        <template v-else>
          <URadioGroup
            v-model="kind"
            :items="kindItems"
            :legend="t('feedback.kind')"
            orientation="horizontal"
            size="sm"
          />

          <div class="space-y-3">
            <UFormField :label="t('feedback.pageUrl')">
              <UInput
                :model-value="pageUrl"
                readonly
                class="w-full cursor-default font-mono text-xs"
                :ui="readonlyFieldUi"
              />
            </UFormField>

            <UFormField :label="t('feedback.pageTitle')">
              <UInput :model-value="pageTitle" readonly class="w-full cursor-default" :ui="readonlyFieldUi" />
            </UFormField>
          </div>

          <UFormField :label="kindCopy.description" required :hint="`${description.length}/${FEEDBACK_DESCRIPTION_MAX}`">
            <UTextarea
              v-model="description"
              :rows="4"
              :maxlength="FEEDBACK_DESCRIPTION_MAX"
              :placeholder="kindCopy.placeholder"
              class="w-full"
              :autofocus="autofocusDescription"
            />
          </UFormField>

          <UFormField
            :label="kindCopy.source"
            :help="kindCopy.sourceHelp"
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
        <UButton v-if="successId" color="primary" variant="soft" :label="t('feedback.close')" @click="closeModal" />
        <template v-else>
          <UButton color="neutral" variant="ghost" :label="t('feedback.cancel')" @click="closeModal" />
          <UButton color="primary" :label="t('feedback.submit')" :loading="pending" :disabled="pending" @click="submit" />
        </template>
      </div>
    </template>
  </UModal>
</template>
