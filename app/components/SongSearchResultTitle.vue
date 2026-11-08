<script setup lang="ts">
import { computed } from 'vue'
import { useSongAliases } from '~/composables/useSongAliases.ts'
import { useSongLanguage } from '~/composables/useSongLanguage.ts'
import { matchSongTitle } from '~~/shared/song-titles.ts'

const props = defineProps<{
  songId: number
  /** Catalog name the caller has, used when no registered Japanese title exists. */
  original: string
  /** `songs.name_en`, shown under the original title. */
  nameEn?: string | null
  /** Query the row matched, so the secondary line can say which alias hit. */
  query: string
}>()

const { language, translationFor, chineseTitle, chineseAliases } = useSongLanguage()
const { jaTitle, aliasOthers } = useSongAliases()

/** Segment of the secondary line, flagged when it is the matched query text. */
type Segment = {
  text: string
  match: boolean
}

const view = computed(() => {
  const songId = props.songId
  return matchSongTitle(props.query, jaTitle(songId, props.original), translationFor(songId), language.value, {
    zhTitle: chineseTitle(songId),
    zhAliases: chineseAliases(songId),
    originalAliases: aliasOthers(songId),
    nameEn: props.nameEn ?? null,
  })
})

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
