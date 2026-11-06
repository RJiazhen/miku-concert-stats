<script setup lang="ts">
import { displayArtistString } from '~~/shared/credit.ts'
import type { SongRow } from '~~/shared/types.ts'

defineProps<{
  query: string
  local: SongRow[]
}>()

const emit = defineEmits<{ select: [songId: number] }>()
</script>

<template>
  <div class="max-h-[60vh] overflow-y-auto p-2 text-sm">
    <p v-if="query.trim() === ''" class="px-2 py-3 text-xs text-muted">输入歌名、歌手或制作人。</p>
    <template v-else-if="local.length > 0">
      <p class="px-2 py-1 text-[11px] tracking-wide text-muted uppercase">{{ local.length }} 首</p>
      <button
        v-for="song in local"
        :key="song.id"
        type="button"
        class="flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-elevated"
        @click="emit('select', song.id)"
      >
        <SongTitle :song-id="song.id" :original="song.name_ja || song.name" />
        <span class="truncate text-xs text-muted">{{ displayArtistString(song.artist_string) ?? '未记录' }}</span>
      </button>
      <ULink :to="`/?q=${encodeURIComponent(query.trim())}`" class="block px-2 py-1.5 text-xs text-primary">
        在排行中查看全部结果
      </ULink>
    </template>
    <p v-else class="px-2 py-3 text-xs text-muted">没有找到，试试更短的歌名。</p>
  </div>
</template>
