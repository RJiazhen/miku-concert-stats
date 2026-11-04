<script setup lang="ts">
import type { AlbumSetlistSource } from '~~/shared/album-setlists.ts'

const props = defineProps<{
  sources: AlbumSetlistSource[]
}>()
</script>

<template>
  <div v-if="props.sources.length > 0" class="space-y-2">
    <UAlert
      v-for="source in props.sources"
      :key="source.songListId"
      color="info"
      variant="subtle"
      icon="i-lucide-disc"
      title="歌单来自专辑曲目"
    >
      <template #description>
        {{ source.notice.before }}<ULink :to="source.url" target="_blank" class="text-primary">{{ source.name }}</ULink>{{ source.notice.after }}
      </template>
    </UAlert>
  </div>
</template>
