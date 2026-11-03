<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useCatalog } from '~/composables/useCatalog.ts'
import { FORMULA_ID, MAX_MEDIAN_APE, MAX_STRATUM_APE, MIN_ABSOLUTE_R, MIN_HOLDOUT, MIN_TRAIN, STRATUM_MIN } from '~~/shared/correlation.ts'

// The conversion formula is unpublished until the sample gates pass.
definePageMeta({ middleware: 'retired' })

const { catalog, error, load } = useCatalog()

/** Starts the browser catalog load after hydration. */
const startLoad = (): void => {
  void load()
}
onMounted(startLoad)

const formula = computed(() => catalog.value?.formulas.find((row) => row.id === FORMULA_ID) ?? null)
const separatePlatforms = computed(() => formula.value?.status !== 'published')
</script>

<template>
  <main class="space-y-4">
    <p class="max-w-3xl text-sm text-muted">
      只有同一首歌在 niconico 和 YouTube 上都有快照时才进入配对。训练和留出集都过门槛后才发布换算公式；否则两个平台继续分开显示。
    </p>
    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="error" />
    <UCard v-else>
      <h2 class="text-lg font-semibold text-highlighted">{{ separatePlatforms ? '继续分平台展示' : '已发布单一指标' }}</h2>
      <p class="mt-2 text-sm text-muted">状态：{{ formula?.status ?? '未评估' }}。版本：{{ formula?.version ?? '无' }}。</p>
      <p class="mt-1 text-sm text-muted">{{ formula?.reason }}</p>
      <p class="mt-3 text-xs text-muted">
        门槛：训练至少 {{ MIN_TRAIN }} 对，留出至少 {{ MIN_HOLDOUT }} 对，两侧 |r| ≥ {{ MIN_ABSOLUTE_R }}，中位绝对百分比误差 ≤ {{ MAX_MEDIAN_APE * 100 }}%。
        留出层样本不少于 {{ STRATUM_MIN }} 时，该层误差 ≤ {{ MAX_STRATUM_APE * 100 }}%。
      </p>
      <p v-if="formula?.scope" class="mt-1 text-xs text-muted">{{ formula.scope }}</p>
      <p class="mt-1 text-xs text-muted">里程碑 {{ catalog?.milestones.length ?? 0 }} 条。没有可引用的达成时间就不会写入。</p>
      <pre v-if="formula?.formula_json" class="mt-3 overflow-x-auto rounded-lg bg-elevated/40 p-3 text-xs">{{ formula.formula_json }}</pre>
    </UCard>
  </main>
</template>
