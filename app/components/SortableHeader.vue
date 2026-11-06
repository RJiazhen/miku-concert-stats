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
  <UButton
    color="neutral"
    variant="ghost"
    size="xs"
    :label="label"
    :trailing-icon="icon"
    class="-mx-2"
    @click="toggle"
  />
</template>
