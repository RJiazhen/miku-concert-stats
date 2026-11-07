<script setup lang="ts">
import { computed } from 'vue'
import { useSongAliases } from '~/composables/useSongAliases.ts'
import { useSongLanguage } from '~/composables/useSongLanguage.ts'
import { formatSongTitle } from '~~/shared/song-titles.ts'

const props = withDefaults(defineProps<{
  songId: number
  original: string
  /** Clip long titles with an ellipsis instead of growing the container. */
  truncate?: boolean
}>(), { truncate: false })

const { language, translationFor } = useSongLanguage()
const { jaTitle } = useSongAliases()

/** The registered Japanese alias wins over the name the caller passed in. */
const view = computed(() => formatSongTitle(jaTitle(props.songId, props.original), translationFor(props.songId), language.value))
</script>

<template>
  <span :class="truncate ? 'song-title flex min-w-0 max-w-full flex-col' : 'song-title inline-flex flex-col'">
    <span :class="truncate ? 'truncate' : undefined">{{ view.primary }}</span>
    <span
      v-if="view.originalNote"
      :class="['song-original text-xs font-normal text-muted', truncate ? 'truncate' : undefined]"
    >{{ view.originalNote }}</span>
  </span>
</template>
