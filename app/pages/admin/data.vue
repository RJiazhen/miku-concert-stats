<script setup lang="ts">
import { computed, onMounted } from 'vue'

definePageMeta({
  layout: 'admin',
})

useHead({ title: '数据概览' })

/** One headline number in the metrics grid. */
type Metric = {
  label: string
  value: number
  icon: string
  hint: string
}

/** Chinese labels for the three video platforms kept in the catalog. */
const PLATFORM_LABEL: Record<string, string> = {
  niconico: 'niconico',
  youtube: 'YouTube',
  bilibili: 'bilibili',
}

const { catalog, error, pending, load } = useCatalog()
const numberFormat = new Intl.NumberFormat('zh-CN')

/** Formats an integer with thousands separators for display. */
const formatNumber = (value: number): string => numberFormat.format(value)

/** Formats an ISO date as a calendar day; blank values stay blank. */
const formatDate = (iso: string | null): string => {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(date)
}

/** Largest ISO timestamp in a list, or an empty string when every entry is null. */
const latestIso = (values: (string | null)[]): string => {
  return values.reduce<string>((latest, value) => {
    return value !== null && value > latest ? value : latest
  }, '')
}

/** Headline catalog sizes, computed in the browser from the same sqlite file the public site uses. */
const metrics = computed<Metric[]>(() => {
  const current = catalog.value
  if (!current) return []
  return [
    { label: '歌曲', value: current.songs.length, icon: 'i-lucide-music', hint: '去重后的曲目' },
    { label: '演出', value: current.performances.length, icon: 'i-lucide-calendar-days', hint: '系列城市场次' },
    { label: '系列', value: current.series.length, icon: 'i-lucide-layers', hint: '演唱会系列' },
    { label: '歌单', value: current.songLists.length, icon: 'i-lucide-list-music', hint: '含专辑替代表单' },
    { label: '视频', value: current.videos.length, icon: 'i-lucide-video', hint: 'PV 与转载' },
  ]
})

/** Song-list split between event setlists and release tracklists used as a fallback. */
const songListSplit = computed(() => {
  const current = catalog.value
  if (!current) return []
  const album = current.songLists.filter((list) => list.source === 'album').length
  const vocadb = current.songLists.length - album
  const total = Math.max(current.songLists.length, 1)
  return [
    { label: '演出歌单', count: vocadb, percent: Math.round((vocadb / total) * 100), color: 'bg-primary' },
    { label: '专辑歌单', count: album, percent: Math.round((album / total) * 100), color: 'bg-secondary' },
  ]
})

/** Video count per platform with a percentage for the distribution bar. */
const platformSplit = computed(() => {
  const current = catalog.value
  if (!current) return []
  const counts = new Map<string, number>()
  for (const video of current.videos) {
    counts.set(video.platform, (counts.get(video.platform) ?? 0) + 1)
  }
  const total = Math.max(current.videos.length, 1)
  return [...counts.entries()].map(([platform, count]) => ({
    label: PLATFORM_LABEL[platform] ?? platform,
    count,
    percent: Math.round((count / total) * 100),
    color: platform === 'youtube' ? 'bg-error' : platform === 'bilibili' ? 'bg-info' : 'bg-success',
  }))
})

/** Latest observed coverage dates, shown so a stale catalog is obvious at a glance. */
const freshness = computed(() => {
  const current = catalog.value
  if (!current) return []
  return [
    { label: '最新歌曲抓取', value: formatDate(latestIso(current.songs.map((row) => row.retrieved_at))) },
    { label: '最新演出抓取', value: formatDate(latestIso(current.performances.map((row) => row.retrieved_at))) },
    { label: '串烧隔离条目', value: formatNumber(current.medleyQuarantine.length) },
  ]
})

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="space-y-6">
    <header class="space-y-1">
      <p class="text-xs font-medium tracking-wider text-primary uppercase">Catalog</p>
      <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
        数据概览
      </h1>
      <p class="max-w-2xl text-sm leading-relaxed text-muted">
        后台直接读取公开站点使用的 <code class="rounded bg-elevated px-1 py-0.5">catalog.sqlite</code>，
        统计只反映当前部署的目录内容，不访问 KV，也不写入任何数据。
      </p>
    </header>

    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />

    <div v-else-if="pending && !catalog" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <USkeleton v-for="index in 6" :key="index" class="h-28 rounded-xl" />
    </div>

    <template v-else-if="catalog">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <UCard
          v-for="metric in metrics"
          :key="metric.label"
          variant="subtle"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-muted">{{ metric.label }}</p>
            <span class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UIcon :name="metric.icon" class="size-4" />
            </span>
          </div>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
            {{ formatNumber(metric.value) }}
          </p>
          <p class="mt-1 text-[11px] text-muted">{{ metric.hint }}</p>
        </UCard>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <UCard variant="subtle">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
            <UIcon name="i-lucide-list-music" class="size-4 text-primary" />
            歌单来源
          </h2>
          <p class="mt-1 text-xs text-muted">
            演出歌单来自 VocaDB 活动；没有歌单的场次使用人工核对的专辑曲目表。
          </p>
          <div class="mt-4 space-y-3">
            <div v-for="row in songListSplit" :key="row.label">
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted">{{ row.label }}</span>
                <span class="tabular-nums text-highlighted">{{ formatNumber(row.count) }} · {{ row.percent }}%</span>
              </div>
              <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-elevated">
                <div class="h-full rounded-full" :class="row.color" :style="{ width: `${row.percent}%` }" />
              </div>
            </div>
          </div>
        </UCard>

        <UCard variant="subtle">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
            <UIcon name="i-lucide-video" class="size-4 text-primary" />
            视频平台
          </h2>
          <p class="mt-1 text-xs text-muted">
            保留 niconico、YouTube 与 bilibili 三个平台的 PV 与转载，播放量按平台分别累计。
          </p>
          <div class="mt-4 space-y-3">
            <div v-for="row in platformSplit" :key="row.label">
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted">{{ row.label }}</span>
                <span class="tabular-nums text-highlighted">{{ formatNumber(row.count) }} · {{ row.percent }}%</span>
              </div>
              <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-elevated">
                <div class="h-full rounded-full" :class="row.color" :style="{ width: `${row.percent}%` }" />
              </div>
            </div>
          </div>
        </UCard>

        <UCard variant="subtle">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
            <UIcon name="i-lucide-clock" class="size-4 text-primary" />
            数据新鲜度
          </h2>
          <dl class="mt-4 grid gap-3 sm:grid-cols-2">
            <div v-for="row in freshness" :key="row.label">
              <dt class="text-xs text-muted">{{ row.label }}</dt>
              <dd class="mt-0.5 text-sm font-medium text-highlighted">{{ row.value }}</dd>
            </div>
          </dl>
        </UCard>

        <UCard variant="subtle">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
            <UIcon name="i-lucide-scale" class="size-4 text-primary" />
            来源与许可
          </h2>
          <ul class="mt-4 space-y-3">
            <li v-for="source in catalog.sources" :key="source.id" class="text-xs">
              <a :href="source.url" class="font-medium text-primary hover:underline" target="_blank" rel="noreferrer">
                {{ source.name }}
              </a>
              <p class="mt-0.5 text-muted">{{ source.license }} · {{ source.notes }}</p>
            </li>
          </ul>
        </UCard>
      </div>
    </template>
  </div>
</template>
