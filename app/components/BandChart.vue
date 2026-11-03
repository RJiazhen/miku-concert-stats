<script setup lang="ts">
import type { BandSummary } from '~~/shared/stats.ts'

defineProps<{ bands: BandSummary[] }>()

/** Formats a share. Null means the song set was empty. */
const percent = (ratio: number | null): string => {
  if (ratio === null) return '—'
  return `${(ratio * 100).toFixed(1)}%`
}
</script>

<template>
  <div class="my-4 grid gap-2">
    <div v-for="band in bands" :key="band.id" class="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
      <span class="text-muted">{{ band.label }}</span>
      <div class="h-2 overflow-hidden rounded-full bg-elevated">
        <span
          class="block h-full rounded-full"
          :class="band.id === 'none' ? 'bg-error' : 'bg-primary'"
          :style="{ width: `${(band.ratio ?? 0) * 100}%` }"
        />
      </div>
      <strong class="font-medium tabular-nums">{{ band.count }} · {{ percent(band.ratio) }}</strong>
    </div>
  </div>
</template>
