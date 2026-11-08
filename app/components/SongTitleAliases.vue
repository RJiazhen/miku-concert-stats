<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** Other names of the active language, primary excluded. */
  aliases: readonly string[]
  /** Names shown inline before the rest collapse behind `+N`. */
  limit?: number
}>(), { limit: 3 })

/** Names shown inline plus the names revealed by the counter button. */
const split = computed(() => ({
  visible: props.aliases.slice(0, props.limit),
  hidden: props.aliases.slice(props.limit),
}))
</script>

<template>
  <div class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
    <span class="shrink-0">其他名称</span>
    <template v-for="(alias, index) in split.visible" :key="alias">
      <span v-if="index > 0" aria-hidden="true">·</span>
      <span class="min-w-0 break-words">{{ alias }}</span>
    </template>
    <UTooltip v-if="split.hidden.length > 0" :content="{ side: 'top' }">
      <UButton
        color="neutral"
        variant="subtle"
        size="xs"
        class="shrink-0 rounded border px-1 py-0.5 text-[11px] font-normal"
        :label="`+${split.hidden.length}`"
      />
      <template #content>
        <ul class="flex max-w-60 flex-col gap-0.5 text-xs">
          <li v-for="alias in split.hidden" :key="alias" class="break-words">{{ alias }}</li>
        </ul>
      </template>
    </UTooltip>
  </div>
</template>
