<script setup lang="ts">
import { computed } from 'vue'
import { useSongTitle } from '~/composables/useSongTitle.ts'

const props = defineProps<{
  songId: number
  /** Catalog name the caller has, used when the catalog has not loaded. */
  original: string
  /** `songs.name_en`, another spelling the query may hit. */
  nameEn?: string | null
  /** Query the row matched, so the secondary line can say which alias hit. */
  query: string
}>()

const { titleHit } = useSongTitle()

/** Segment of the secondary line, flagged when it is the matched query text. */
type Segment = {
  text: string
  match: boolean
}

const view = computed(() => titleHit(props.songId, props.original, props.query))

/** Splits the secondary line so the query text it matched can be highlighted. */
const segments = computed<Segment[]>(() => {
  const secondary = view.value.secondary
  if (secondary === null) return []
  const needle = props.query.trim()
  if (needle === '') return [{ text: secondary, match: false }]
  const start = secondary.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase())
  if (start < 0) return [{ text: secondary, match: false }]
  const end = start + needle.length
  return [
    { text: secondary.slice(0, start), match: false },
    { text: secondary.slice(start, end), match: true },
    { text: secondary.slice(end), match: false },
  ].filter((segment) => segment.text !== '')
})
</script>

<template>
  <span class="flex min-w-0 flex-col">
    <span class="truncate">{{ view.primary }}</span>
    <span v-if="view.secondary" class="truncate text-xs font-normal text-muted">
      <template v-for="(segment, index) in segments" :key="index">
        <mark v-if="segment.match" class="rounded-sm bg-primary/15 px-0.5 font-medium text-highlighted">{{ segment.text }}</mark>
        <template v-else>{{ segment.text }}</template>
      </template>
    </span>
  </span>
</template>
