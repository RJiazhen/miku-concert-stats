<script setup lang="ts">
defineProps<{
  /** Small label above the control, matching the filter bar typography. */
  label: string
}>()
</script>

<template>
  <UFormField
    :label="label"
    size="sm"
    class="text-xs"
    :ui="{ label: 'text-xs text-muted', container: 'mt-1' }"
  >
    <slot />
  </UFormField>
</template>
