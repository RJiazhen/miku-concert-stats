<script setup lang="ts">
/**
 * Placeholder for a detail page whose body needs the catalog.
 * The page header and its tables cannot render before the browser has read the sqlite file, so the
 * first paint (server render and hydration) shows a title bar, a subtitle bar, and a table block
 * instead of an empty page.
 */
</script>

<template>
  <div class="space-y-3" aria-hidden="true">
    <USkeleton class="h-7 w-2/5" />
    <USkeleton class="h-4 w-3/5" />
    <USkeleton class="h-64 w-full rounded-xl" />
  </div>
</template>
