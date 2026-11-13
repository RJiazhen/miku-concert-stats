<script setup lang="ts">
defineProps<{
  /** Chart heading, e.g. 场次数年度变化. */
  title: string
  /** One-line explanation of the counting rule under the heading. */
  note?: string
}>()
</script>

<template>
  <UCard :ui="{ body: 'space-y-2 sm:p-4' }">
    <template #header>
      <h2 class="text-base font-semibold text-highlighted">{{ title }}</h2>
      <p v-if="note" class="mt-1 text-xs leading-relaxed text-muted">{{ note }}</p>
      <div v-if="$slots.actions" class="mt-2 flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </template>
    <slot />
    <slot name="footer" />
  </UCard>
</template>
