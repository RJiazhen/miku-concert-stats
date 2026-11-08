<script setup lang="ts">
import { computed } from 'vue'
import { useSongTitle } from '~/composables/useSongTitle.ts'

const props = withDefaults(defineProps<{
  songId: number
  original: string
  /** Clip long titles with an ellipsis instead of growing the container. */
  truncate?: boolean
}>(), { truncate: false })

const { titleView } = useSongTitle()

/** Primary title plus the gray Japanese names under it. */
const view = computed(() => titleView(props.songId, props.original))
</script>

<template>
  <span :class="truncate ? 'song-title flex min-w-0 max-w-full flex-col' : 'song-title inline-flex flex-col'">
    <span :class="truncate ? 'truncate' : undefined">{{ view.primary }}</span>
    <span
      v-if="view.originalNames.length > 0"
      :class="['song-original text-xs font-normal text-muted', truncate ? 'truncate' : undefined]"
    >{{ view.originalNames.join(' · ') }}</span>
  </span>
</template>
