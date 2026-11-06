<script setup lang="ts">
import { computed } from 'vue'
import { characterColor } from '~/composables/useCharacters.ts'

const props = withDefaults(defineProps<{
  /** Base character name, as stored in the catalog credits. */
  name: string
  /** `xs` for table cells, `sm` for page headers. */
  size?: 'xs' | 'sm'
}>(), { size: 'xs' })

/**
 * Inline style of the chip: the character's image colour as the border, with a faint tint of
 * the same colour behind the name so light and dark themes both keep the text readable.
 * Characters without a configured colour fall back to the default border, without a tint.
 */
const style = computed<Record<string, string>>(() => {
  const color = characterColor(props.name)
  const result: Record<string, string> = {}
  if (color === null) return result
  result.borderColor = color
  result.backgroundColor = `${color}1f`
  return result
})
</script>

<template>
  <span
    class="shrink-0 rounded border px-1 py-0.5 leading-tight"
    :class="size === 'sm' ? 'text-xs px-1.5' : 'text-[11px]'"
    :style="style"
  >
    {{ name }}
  </span>
</template>
