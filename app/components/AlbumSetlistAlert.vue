<script setup lang="ts">
import { albumMediumLabel, type AlbumSetlistSource } from '~~/shared/album-setlists.ts'

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
        {{ source.notice }}
        <ULink :to="source.url" target="_blank" class="text-primary">
          在 VocaDB 查看这张{{ albumMediumLabel(source.medium) }}
        </ULink>
      </template>
    </UAlert>
  </div>
</template>
