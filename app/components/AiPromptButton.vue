<script setup lang="ts">
import { useAiPrompt } from '~/composables/useAiPrompt.ts'
import { useLocale } from '~/composables/useLocale.ts'

const { t } = useLocale()
const { copyPrompt: writePrompt } = useAiPrompt()

/** How long the button and the inline hint keep their transient state. */
const CONFIRM_MS = 6000

/** Inline feedback shown beside the button instead of a page-level notification. */
type CopyHint = 'copied' | 'failed'

/** The hint currently shown next to the button; `null` restores the idle label. */
const hint = ref<CopyHint | null>(null)

let resetTimer: ReturnType<typeof setTimeout> | undefined

/** Cancels a pending reset so a repeated click restarts the full hint duration. */
const stopReset = (): void => {
  if (resetTimer === undefined) return
  clearTimeout(resetTimer)
  resetTimer = undefined
}

/** Shows a hint beside the button, then restores the idle state. */
const showHint = (value: CopyHint): void => {
  hint.value = value
  stopReset()
  resetTimer = setTimeout(() => {
    hint.value = null
    resetTimer = undefined
  }, CONFIRM_MS)
}

/** Copies the demo prompt and reports the outcome inline, next to the button. */
const copyPrompt = async (): Promise<void> => {
  showHint((await writePrompt()) ? 'copied' : 'failed')
}

onBeforeUnmount(stopReset)
</script>

<template>
  <div class="relative flex items-center justify-center">
    <UTooltip :text="hint === 'copied' ? t('ai.copiedHint') : t('ai.copyPrompt')">
      <!-- Icon-only: `tabler:ai` is the AI mark itself, so no text label is needed. -->
      <!-- 28px square button (same as `size="sm"`) with a 28px glyph box; `justify-center`
           centers it horizontally, since the base theme only centers vertically. -->
      <UButton
        :icon="hint === 'copied' ? 'i-lucide-check' : 'i-tabler:ai'"
        :color="hint === 'copied' ? 'success' : 'neutral'"
        :variant="hint === 'copied' ? 'soft' : 'ghost'"
        :ui="{ base: 'size-7 justify-center p-0', leadingIcon: 'size-7' }"
        size="sm"
        :aria-label="hint === 'copied' ? t('ai.copiedPrompt') : t('ai.copyPrompt')"
        @click="copyPrompt"
      />
    </UTooltip>

    <!-- Absolutely positioned so the hint never widens the header row. -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <p
        v-if="hint"
        role="status"
        aria-live="polite"
        class="absolute top-full right-0 z-50 mt-6 w-max max-w-64 rounded-md border bg-elevated px-2.5 py-1.5 text-xs shadow-lg"
        :class="hint === 'failed'
          ? 'border-error/40 text-error'
          : 'border-success/40 text-success'"
      >
        {{ hint === 'failed' ? t('ai.failedHint') : t('ai.tryIt') }}
      </p>
    </Transition>
  </div>
</template>
