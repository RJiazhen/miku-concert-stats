<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCatalog } from '~/composables/useCatalog.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { useSetlistMerges } from '~/composables/useSetlistMerges.ts'
import { useSongLookup } from '~/composables/useSongLookup.ts'
import { setlistSourceTag, setlistSourceUrl } from '~~/shared/album-setlists.ts'
import {
  SEVERITY_LABELS,
  buildSetlistDiffReport,
  pairDifferences,
  renderSetlistDiffMarkdown,
  type SetlistPair,
  type SetlistPairSeverity,
} from '~~/shared/setlist-diff.ts'

const { catalog, error, pending, load } = useCatalog()
const merges = useSetlistMerges()
const { songName } = useSongLookup()
const { localizeSeries } = useSeriesTitles()
const toast = useToast()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const report = computed(() => (catalog.value ? buildSetlistDiffReport(catalog.value, merges) : null))

const severity = ref<'all' | SetlistPairSeverity>('all')
const mergedFilter = ref<'all' | 'merged' | 'unmerged'>('all')
const scope = ref<'edition' | 'adjacent'>('edition')

const severityItems = [
  { label: '全部分级', value: 'all' },
  ...(Object.keys(SEVERITY_LABELS) as SetlistPairSeverity[]).map((key) => ({ label: SEVERITY_LABELS[key], value: key })),
]
const mergedItems = [
  { label: '全部', value: 'all' },
  { label: '已合并', value: 'merged' },
  { label: '未合并', value: 'unmerged' },
]
const scopeItems = [
  { label: '同一年版', value: 'edition' },
  { label: '相邻年版', value: 'adjacent' },
]

const basePairs = computed<SetlistPair[]>(() => {
  if (!report.value) return []
  return scope.value === 'edition' ? report.value.editions : report.value.adjacentEditions
})

const pairs = computed(() => {
  return basePairs.value.filter((pair) => {
    if (severity.value !== 'all' && pair.severity !== severity.value) return false
    if (mergedFilter.value === 'merged' && !pair.merged) return false
    if (mergedFilter.value === 'unmerged' && pair.merged) return false
    return true
  })
})

/** Song ids only on one side of a pair. */
const differencesOf = (pair: SetlistPair) => (catalog.value ? pairDifferences(catalog.value, pair) : { onlyLeft: [], onlyRight: [] })

/** Badge colour for a severity. */
const severityColor = (value: SetlistPairSeverity): 'error' | 'warning' | 'secondary' | 'neutral' | 'success' => {
  if (value === 'segment-differs') return 'error'
  if (value === 'count-differs') return 'warning'
  if (value === 'probably-different-program') return 'secondary'
  if (value === 'order-only') return 'neutral'
  return 'success'
}

/** Copies the committed Markdown report. */
const copyMarkdown = async (): Promise<void> => {
  if (!catalog.value || !report.value) return
  try {
    await navigator.clipboard.writeText(renderSetlistDiffMarkdown(catalog.value, report.value))
    toast.add({ title: '已复制 Markdown 报告', color: 'success', icon: 'i-lucide-clipboard-check' })
  } catch {
    toast.add({ title: '复制失败，请手动选择文本', color: 'error', icon: 'i-lucide-circle-alert' })
  }
}
</script>

<template>
  <main class="space-y-6">
    <header class="space-y-3">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Review</p>
      <h1 class="text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">歌单差异核验</h1>
      <p class="max-w-3xl text-sm leading-relaxed text-muted">
        同一系列不同场之间，曲目数量与正片/安可段的编排差异。分级越高越值得优先核对；
        每一行都附上 VocaDB 歌单链接与差异曲目，方便逐条确认。
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton to="https://github.com/RJiazhen/miku-concert-stats/blob/main/docs/reports/setlist-differences.md" target="_blank" color="neutral" variant="outline" size="xs" icon="i-lucide-file-text">
          Markdown 报告
        </UButton>
        <UButton to="https://github.com/RJiazhen/miku-concert-stats/blob/main/docs/reports/setlist-differences.csv" target="_blank" color="neutral" variant="outline" size="xs" icon="i-lucide-table">
          CSV
        </UButton>
        <UButton color="neutral" variant="outline" size="xs" icon="i-lucide-clipboard" @click="copyMarkdown">复制为 Markdown</UButton>
      </div>
    </header>

    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />

    <UCard>
      <div class="flex flex-wrap items-end gap-3">
        <label class="grid gap-1 text-xs text-muted">
          范围
          <USelect v-model="scope" :items="scopeItems" size="sm" class="w-32" />
        </label>
        <label class="grid gap-1 text-xs text-muted">
          分级
          <USelect v-model="severity" :items="severityItems" size="sm" class="w-48" />
        </label>
        <label class="grid gap-1 text-xs text-muted">
          合并状态
          <USelect v-model="mergedFilter" :items="mergedItems" size="sm" class="w-32" />
        </label>
        <p class="pb-2 text-xs text-muted">
          共 {{ pairs.length }} / {{ basePairs.length }} 对
          <template v-if="report">· 同一年版 {{ report.pairCount }} 对，其中 {{ report.mergedPairCount }} 对已合并</template>
        </p>
      </div>
    </UCard>

    <USkeleton v-if="pending" class="h-64 w-full rounded-xl" />
    <UEmpty v-else-if="pairs.length === 0" icon="i-lucide-check-check" title="没有符合条件的组合" description="换一个分级或合并状态看看。" />

    <div v-else class="space-y-3">
      <UCard v-for="pair in pairs" :key="`${pair.scope}-${pair.leftId}-${pair.rightId}`">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-semibold text-highlighted" :title="pair.seriesName">{{ localizeSeries(pair.seriesName) }} {{ pair.seriesNumber }}</span>
          <UBadge :color="severityColor(pair.severity)" variant="subtle" size="sm">{{ SEVERITY_LABELS[pair.severity] }}</UBadge>
          <UBadge :color="pair.merged ? 'primary' : 'neutral'" variant="outline" size="sm">{{ pair.merged ? '已合并' : '未合并' }}</UBadge>
          <UBadge v-if="setlistSourceTag(pair.leftId)" color="info" variant="subtle" size="sm">{{ setlistSourceTag(pair.leftId) }}</UBadge>
          <ULink
            :to="setlistSourceUrl(pair.leftId)"
            target="_blank"
            class="ml-auto font-mono text-xs text-primary"
          >{{ pair.leftId }}</ULink>
          <UIcon name="i-lucide-arrow-right" class="size-3 text-dimmed" />
          <ULink
            :to="setlistSourceUrl(pair.rightId)"
            target="_blank"
            class="font-mono text-xs text-primary"
          >{{ pair.rightId }}</ULink>
          <UBadge v-if="setlistSourceTag(pair.rightId)" color="info" variant="subtle" size="sm">{{ setlistSourceTag(pair.rightId) }}</UBadge>
        </div>

        <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
          <div>
            <dt class="text-muted">行数</dt>
            <dd class="text-highlighted">{{ pair.left.itemCount }} → {{ pair.right.itemCount }}（{{ pair.countDelta > 0 ? '+' : '' }}{{ pair.countDelta }}）</dd>
          </div>
          <div>
            <dt class="text-muted">正片 / 安可</dt>
            <dd class="text-highlighted">
              {{ pair.left.mainCount }}/{{ pair.left.encoreCount }} → {{ pair.right.mainCount }}/{{ pair.right.encoreCount }}
              （安可 {{ pair.encoreDelta > 0 ? '+' : '' }}{{ pair.encoreDelta }}）
            </dd>
          </div>
          <div>
            <dt class="text-muted">共有 / 仅左 / 仅右</dt>
            <dd class="text-highlighted">{{ pair.shared }} / {{ pair.onlyLeft }} / {{ pair.onlyRight }}</dd>
          </div>
          <div>
            <dt class="text-muted">LCS</dt>
            <dd class="text-highlighted">{{ pair.lcsRatio.toFixed(2) }}</dd>
          </div>
        </dl>

        <p class="mt-3 text-xs text-muted">{{ pair.suggestion }}</p>

        <div class="mt-2 space-y-1 text-xs">
          <p v-if="differencesOf(pair).onlyLeft.length > 0" class="text-muted">
            <span class="text-highlighted">仅 A：</span>
            <template v-for="(songId, index) in differencesOf(pair).onlyLeft" :key="songId">
              <span v-if="index > 0"> / </span>
              <ULink :to="`https://vocadb.net/S/${songId}`" target="_blank" class="text-primary">{{ songName(songId) }}</ULink>
            </template>
          </p>
          <p v-if="differencesOf(pair).onlyRight.length > 0" class="text-muted">
            <span class="text-highlighted">仅 B：</span>
            <template v-for="(songId, index) in differencesOf(pair).onlyRight" :key="songId">
              <span v-if="index > 0"> / </span>
              <ULink :to="`https://vocadb.net/S/${songId}`" target="_blank" class="text-primary">{{ songName(songId) }}</ULink>
            </template>
          </p>
        </div>
      </UCard>
    </div>
  </main>
</template>
