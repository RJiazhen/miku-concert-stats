<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCatalog } from '~/composables/useCatalog.ts'
import { compareBy } from '~~/shared/stats.ts'
import { BANDS } from '~~/shared/bands.ts'
import type { CompareGrouping, Platform } from '~~/shared/types.ts'

// Playback comparisons need snapshots; the section stays out of the navigation until they exist.
definePageMeta({ middleware: 'retired' })

const { catalog, error, load } = useCatalog()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const platform = ref<Platform>('youtube')
const grouping = ref<CompareGrouping>('series')

const rows = computed(() => (catalog.value ? compareBy(catalog.value, platform.value, grouping.value) : []))

/** Formats a share for the comparison table. */
const percent = (ratio: number | null): string => (ratio === null ? '—' : `${(ratio * 100).toFixed(1)}%`)
</script>

<template>
  <main class="space-y-4">
    <p class="max-w-3xl text-sm text-muted">
      同一组里的歌曲按歌曲去重。年份用演出开始日期的公历年，系列年度用系列编号。比较的是当前快照，不是演出当时的播放量。
    </p>
    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UCard v-else>
      <div class="flex flex-wrap items-end gap-3">
        <label class="grid gap-1 text-xs text-muted">
          平台
          <USelect
            v-model="platform"
            :items="[{ label: 'YouTube', value: 'youtube' }, { label: 'niconico', value: 'niconico' }, { label: '哔哩哔哩', value: 'bilibili' }]"
            size="sm"
            class="w-32"
          />
        </label>
        <label class="grid gap-1 text-xs text-muted">
          分组
          <USelect
            v-model="grouping"
            :items="[{ label: '系列', value: 'series' }, { label: '系列年度', value: 'edition' }, { label: '公历年', value: 'year' }]"
            size="sm"
            class="w-32"
          />
        </label>
      </div>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th class="px-2 py-1.5 font-medium">分组</th>
              <th class="px-2 py-1.5 font-medium">歌曲数</th>
              <th v-for="band in BANDS" :key="band.id" class="px-2 py-1.5 font-medium">{{ band.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.key" class="border-t border-default/40">
              <td class="px-2 py-1.5">{{ row.label }}</td>
              <td class="px-2 py-1.5 tabular-nums text-muted">{{ row.songCount }}</td>
              <td v-for="band in row.bands" :key="band.id" class="px-2 py-1.5 text-muted">{{ band.count }}（{{ percent(band.ratio) }}）</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </main>
</template>
