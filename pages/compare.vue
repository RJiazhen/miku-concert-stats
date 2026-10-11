<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCatalog } from '../composables/useCatalog.ts'
import { compareBy } from '../shared/stats.ts'
import type { CompareGrouping, Platform } from '../shared/types.ts'
import { BANDS } from '../shared/bands.ts'

const { catalog, error, pending, load } = useCatalog()

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
  <main>
    <p class="lede">
      同一组里的歌曲按歌曲去重。年份用场次开始日期的公历年，年版用系列编号。比较的是当前快照，不是演出当时的播放量。
    </p>
    <p v-if="pending" class="status">正在浏览器中加载目录…</p>
    <p v-else-if="error" class="status">{{ error }}</p>
    <ClientOnly>
      <section v-if="catalog" class="panel">
        <div class="controls">
          <label>
            平台
            <select v-model="platform">
              <option value="youtube">YouTube</option>
              <option value="niconico">niconico</option>
              <option value="bilibili">哔哩哔哩</option>
            </select>
          </label>
          <label>
            分组
            <select v-model="grouping">
              <option value="series">系列</option>
              <option value="edition">年版</option>
              <option value="year">公历年</option>
            </select>
          </label>
        </div>
        <div class="scroll">
          <table>
            <thead>
              <tr>
                <th>分组</th>
                <th>歌曲数</th>
                <th v-for="band in BANDS" :key="band.id">{{ band.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.key">
                <td>{{ row.label }}</td>
                <td>{{ row.songCount }}</td>
                <td v-for="band in row.bands" :key="band.id">{{ band.count }}（{{ percent(band.ratio) }}）</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </ClientOnly>
  </main>
</template>
