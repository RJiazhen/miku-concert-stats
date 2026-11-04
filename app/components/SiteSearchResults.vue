<script setup lang="ts">
import type { LookupHit } from '~~/shared/lookup.ts'
import type { SongRow } from '~~/shared/types.ts'

defineProps<{
  query: string
  local: SongRow[]
  remote: LookupHit[]
  searching: boolean
  lookedUp: boolean
}>()

const emit = defineEmits<{ select: [songId: number] }>()
</script>

<template>
  <div class="max-h-[60vh] overflow-y-auto p-2 text-sm">
    <p v-if="query.trim() === ''" class="px-2 py-3 text-xs text-muted">输入歌名、版本或艺人，先在本地目录里找。</p>
    <template v-else-if="local.length > 0">
      <p class="px-2 py-1 text-[11px] tracking-wide text-muted uppercase">目录内 · {{ local.length }} 首</p>
      <button
        v-for="song in local"
        :key="song.id"
        type="button"
        class="flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-elevated"
        @click="emit('select', song.id)"
      >
        <SongTitle :song-id="song.id" :original="song.name_ja || song.name" />
        <span class="truncate text-xs text-muted">{{ song.artist_string }}</span>
      </button>
      <ULink :to="`/?q=${encodeURIComponent(query.trim())}`" class="block px-2 py-1.5 text-xs text-primary">
        在排行中查看全部结果
      </ULink>
    </template>
    <p v-else-if="searching" class="px-2 py-3 text-xs text-muted">正在向 VocaDB 检索…</p>
    <template v-else-if="remote.length > 0">
      <p class="px-2 py-1 text-[11px] tracking-wide text-muted uppercase">VocaDB 检索结果 · 未收录</p>
      <a
        v-for="hit in remote"
        :key="hit.id"
        :href="hit.url"
        target="_blank"
        rel="noopener noreferrer"
        class="block rounded-lg px-2 py-1.5 hover:bg-elevated"
      >
        <SongTitle :song-id="hit.id" :original="hit.name" />
        <span class="block truncate text-xs text-muted">{{ hit.artistString ?? '艺人未记录' }}</span>
      </a>
    </template>
    <p v-else-if="lookedUp" class="px-2 py-3 text-xs text-muted">没有找到，试试更短的歌名。</p>
    <p v-else class="px-2 py-3 text-xs text-muted">目录里没有这首歌。</p>
  </div>
</template>
