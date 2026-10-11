<script setup lang="ts">
import { computed } from 'vue'
import { useSongLanguage } from '../composables/useSongLanguage.ts'
import { formatSongTitle } from '../shared/song-titles.ts'

const props = defineProps<{
  songId: number
  original: string
}>()

const { language, translationFor } = useSongLanguage()

const view = computed(() => formatSongTitle(props.original, translationFor(props.songId), language.value))
</script>

<template>
  <span class="song-title">{{ view.primary }}<span v-if="view.originalNote" class="song-original"> ({{ view.originalNote }})</span></span>
</template>
