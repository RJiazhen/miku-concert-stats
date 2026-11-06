<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
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

/** One table row: a grouping label plus the count and share of each playback band. */
type CompareRow = {
  key: string
  label: string
  songCount: number
  /** Band id to its printed `count（share）` text. */
  bandText: Record<string, string>
}

/** Rows flattened into the cell text the table prints. */
const tableRows = computed<CompareRow[]>(() =>
  rows.value.map((row) => ({
    key: row.key,
    label: row.label,
    songCount: row.songCount,
    bandText: Object.fromEntries(row.bands.map((band) => [band.id, `${band.count}（${percent(band.ratio)}）`])),
  })),
)

/** One column per playback band, after the grouping and the song count. */
const columns = computed<TableColumn<CompareRow>[]>(() => [
  { accessorKey: 'label', header: '分组' },
  { accessorKey: 'songCount', header: '歌曲数' },
  ...BANDS.map((band) => ({
    id: band.id,
    header: band.label,
    enableSorting: false,
    accessorFn: (row: CompareRow) => row.bandText[band.id] ?? '—',
  })),
])
</script>

<template>
  <main class="space-y-4">
    <p class="max-w-3xl text-sm text-muted">
      同一组里的歌曲按歌曲去重。年份用演出开始日期的公历年，系列年度用系列编号。比较的是当前快照，不是演出当时的播放量。
    </p>
    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UCard v-else>
      <div class="flex flex-wrap items-end gap-3">
        <FilterField label="平台">
          <USelect
            v-model="platform"
            :items="[{ label: 'YouTube', value: 'youtube' }, { label: 'niconico', value: 'niconico' }, { label: '哔哩哔哩', value: 'bilibili' }]"
            size="sm"
            class="w-32"
          />
        </FilterField>
        <FilterField label="分组">
          <USelect
            v-model="grouping"
            :items="[{ label: '系列', value: 'series' }, { label: '系列年度', value: 'edition' }, { label: '公历年', value: 'year' }]"
            size="sm"
            class="w-32"
          />
        </FilterField>
      </div>
    </UCard>

    <TableSection
      title="播放量分组"
      :count="`${tableRows.length} 组`"
      :fill="false"
      :data="tableRows"
      :columns="columns"
      empty-icon="i-lucide-chart-no-axes-column"
      empty-title="没有可比对的播放量"
      empty-description="当前平台还没有可用的快照。"
    >
      <template #label-cell="{ row }">
        <span class="text-highlighted">{{ row.original.label }}</span>
      </template>
      <template #songCount-cell="{ row }">
        <span class="tabular-nums text-muted">{{ row.original.songCount }}</span>
      </template>
    </TableSection>
  </main>
</template>
