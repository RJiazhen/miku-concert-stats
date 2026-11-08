<script setup lang="ts">
import { computed } from 'vue'
import { splitCharacterChips } from '~~/shared/character-chips.ts'
import { useCharacterNames } from '~/composables/useCharacterNames.ts'

const props = withDefaults(defineProps<{
  /** Base character names, in display order. */
  names: readonly string[]
  /** Chips shown inline before the rest collapse behind `+N`. */
  limit?: number
  /** `xs` for table cells, `sm` for page headers. */
  size?: 'xs' | 'sm'
  /** `false` keeps every chip on one line and clips the overflow, used by fixed-width cells. */
  wrap?: boolean
  /** Text shown when no character matched, e.g. an em dash. */
  empty?: string
}>(), { limit: 3, size: 'xs', wrap: true, empty: '—' })

const { localizeCharacter } = useCharacterNames()

/** Chips shown inline plus the canonical names revealed by the counter button. */
const split = computed(() => splitCharacterChips(props.names, props.limit))
</script>

<template>
  <span v-if="names.length === 0" class="text-muted">{{ empty }}</span>
  <div
    v-else
    class="flex items-center gap-1"
    :class="wrap ? 'flex-wrap' : 'flex-nowrap overflow-hidden'"
  >
    <CharacterChip
      v-for="name in split.visible"
      :key="name"
      :name="name"
      :label="localizeCharacter(name)"
      :size="size"
    />
    <UTooltip
      v-if="split.hidden.length > 0"
      :content="{ side: 'top' }"
    >
      <UButton
        color="neutral"
        variant="subtle"
        size="xs"
        class="shrink-0 rounded border px-1 py-0.5 text-[11px] font-normal"
        :label="`+${split.hidden.length}`"
      />
      <template #content>
        <div class="flex max-w-60 flex-wrap items-center gap-1">
          <CharacterChip
            v-for="name in split.hidden"
            :key="name"
            :name="name"
            :label="localizeCharacter(name)"
            :size="size"
          />
        </div>
      </template>
    </UTooltip>
  </div>
</template>
