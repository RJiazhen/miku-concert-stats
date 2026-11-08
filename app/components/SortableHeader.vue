<script setup lang="ts">
import { computed } from 'vue'

/** Minimal column shape the header needs; avoids importing TanStack's generics. */
type SortableColumn = {
  getIsSorted: () => false | 'asc' | 'desc'
  toggleSorting: (desc?: boolean) => void
}

const props = defineProps<{
  /** Header text, e.g. `名次`. */
  label: string
  /** TanStack column that owns the sort state. */
  column: SortableColumn
  /** Full name of an abbreviated label, shown on hover and keyboard focus. */
  tooltip?: string
}>()

/** Arrow shown after the label: up-down when inactive, direction when sorted. */
const icon = computed(() => {
  const sorted = props.column.getIsSorted()
  if (sorted === 'asc') return 'i-lucide-arrow-up-narrow-wide'
  if (sorted === 'desc') return 'i-lucide-arrow-down-wide-narrow'
  return 'i-lucide-arrow-up-down'
})

/** Applies the default table behaviour: a new column starts ascending, the active one flips. */
const toggle = (): void => {
  props.column.toggleSorting(props.column.getIsSorted() === 'asc')
}
</script>

<template>
  <!-- Plain button: a header keeps the table's own background. `UTooltip` disables itself when text is empty. -->
  <UTooltip :text="tooltip" :delay-duration="150">
    <button
      type="button"
      class="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-start font-medium text-default hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
      @click="toggle"
    >
      {{ label }}
      <UIcon :name="icon" class="size-3 shrink-0" />
    </button>
  </UTooltip>
</template>
