<script setup lang="ts">
import type { SearchRow } from '~/composables/useSearchHits.ts'

withDefaults(defineProps<{
  /** Localized row shared by the header panel and the results page. */
  row: SearchRow
  /** Query the row matched, so a song row can show the alias that hit. */
  query?: string
}>(), {
  query: '',
})

const emit = defineEmits<{
  /** The visitor opened this row; the header panel uses it to close itself. */
  select: []
}>()

/** Reports the click after the link has already started navigating. */
const select = (): void => {
  emit('select')
}
</script>

<template>
  <NuxtLink
    :to="row.to"
    class="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm no-underline hover:bg-elevated/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    @click="select"
  >
    <UIcon :name="row.icon" class="mt-0.5 size-4 shrink-0 text-muted" />
    <span class="min-w-0 flex-1">
      <SongSearchResultTitle
        v-if="row.song"
        :song-id="row.song.id"
        :original="row.song.original"
        :name-en="row.song.nameEn"
        :query="query"
      />
      <span v-else class="block truncate text-highlighted">{{ row.title }}</span>
      <span v-if="row.meta" class="block truncate text-xs text-muted">{{ row.meta }}</span>
    </span>
    <span v-if="row.badges?.length" class="flex shrink-0 items-center gap-1">
      <UBadge
        v-for="label in row.badges"
        :key="label"
        color="neutral"
        variant="subtle"
        size="sm"
      >{{ label }}</UBadge>
    </span>
    <span v-if="row.trailing" class="ml-auto shrink-0 text-xs text-muted">{{ row.trailing }}</span>
  </NuxtLink>
</template>
