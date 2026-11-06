<script setup lang="ts">
import { displayArtistString } from '~~/shared/credit.ts'
import { producerRoleLabels, type ProducerLookupHit, type ProducerRole } from '~~/shared/producers.ts'
import type { SongRow } from '~~/shared/types.ts'

defineProps<{
  query: string
  local: SongRow[]
  producers: ProducerLookupHit[]
}>()

const emit = defineEmits<{
  select: [songId: number]
  selectProducer: [name: string]
}>()

/** Chinese role labels of one producer hit, as the badges the result line prints. */
const roleLabels = (roles: readonly ProducerRole[]): string[] => {
  const labels = roles.map((role) => producerRoleLabels[role])
  return labels.length === 0 ? ['制作'] : labels
}
</script>

<template>
  <div class="max-h-[60vh] overflow-y-auto p-2 text-sm">
    <p v-if="query.trim() === ''" class="px-2 py-3 text-xs text-muted">输入歌名、歌手或制作人。</p>
    <template v-else-if="producers.length > 0 || local.length > 0">
      <template v-if="producers.length > 0">
        <p class="px-2 py-1 text-[11px] tracking-wide text-muted uppercase">制作人 {{ producers.length }} 位</p>
        <UButton
          v-for="producer in producers"
          :key="producer.name"
          color="neutral"
          variant="ghost"
          class="w-full justify-start gap-2 rounded-lg px-2 py-1.5 text-left"
          @click="emit('selectProducer', producer.name)"
        >
          <span class="truncate text-highlighted">{{ producer.name }}</span>
          <span class="ml-auto flex shrink-0 items-center gap-1">
            <UBadge v-for="label in roleLabels(producer.roles)" :key="label" color="neutral" variant="subtle" size="sm">{{ label }}</UBadge>
            <span class="text-xs text-muted">{{ producer.songCount }} 首</span>
          </span>
        </UButton>
      </template>
      <template v-if="local.length > 0">
        <p class="px-2 py-1 text-[11px] tracking-wide text-muted uppercase">{{ local.length }} 首</p>
        <UButton
          v-for="song in local"
          :key="song.id"
          color="neutral"
          variant="ghost"
          class="w-full justify-start gap-2 rounded-lg px-2 py-1.5 text-left"
          @click="emit('select', song.id)"
        >
          <SongTitle :song-id="song.id" :original="song.name_ja || song.name" />
          <span class="truncate text-xs text-muted">{{ displayArtistString(song.artist_string) ?? '未记录' }}</span>
        </UButton>
        <ULink :to="`/?q=${encodeURIComponent(query.trim())}`" class="block px-2 py-1.5 text-xs text-primary">
          在排行中查看全部结果
        </ULink>
      </template>
    </template>
    <p v-else class="px-2 py-3 text-xs text-muted">没有找到，试试更短的歌名或制作人名。</p>
  </div>
</template>
