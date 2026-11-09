<script setup lang="ts">
import { computed } from 'vue'
import { splitCharacterChips } from '~~/shared/character-chips.ts'
import { useCharacterNames } from '~/composables/useCharacterNames.ts'

const props = withDefaults(defineProps<{
  /** Base character names, in display order. */
  names: readonly string[]
  /** Chips kept inline while folded, i.e. on tablet widths. */
  limit?: number
  /**
   * `tablet` collapses the names past `limit` into `+N` only on tablet widths (`md`..`lg`), so
   * cramped tables stay readable; `never` prints them all and drops the counter, for page headers
   * and cards that have room to wrap at every width.
   */
  fold?: 'tablet' | 'never'
  /** `xs` for table cells, `sm` for page headers. */
  size?: 'xs' | 'sm'
  /** Text shown when no character matched, e.g. an em dash. */
  empty?: string
}>(), { limit: 3, fold: 'tablet', size: 'xs', empty: '—' })

const { localizeCharacter } = useCharacterNames()

/** Chips shown inline plus the names the counter would hold back while folded. */
const split = computed(() => splitCharacterChips(props.names, props.limit))

/** Names hidden on tablet only; phone and desktop print every chip and drop the counter. */
const folded = computed(() => new Set(props.fold === 'never' ? [] : split.value.hidden))

/** `+N` count, zero when this surface never folds. */
const hiddenCount = computed(() => props.fold === 'never' ? 0 : split.value.hidden.length)
</script>

<template>
  <span v-if="names.length === 0" class="text-muted">{{ empty }}</span>
  <div
    v-else
    class="flex flex-wrap items-center gap-1"
  >
    <CharacterChip
      v-for="name in names"
      :key="name"
      :name="name"
      :label="localizeCharacter(name)"
      :size="size"
      :class="folded.has(name) ? 'md:hidden lg:inline' : ''"
    />
    <UTooltip
      v-if="hiddenCount > 0"
      :content="{ side: 'top' }"
    >
      <UButton
        color="neutral"
        variant="subtle"
        size="xs"
        class="shrink-0 rounded border px-1 py-0.5 text-[11px] font-normal max-md:hidden lg:hidden"
        :label="`+${hiddenCount}`"
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
