<script setup lang="ts" generic="T extends object">
import { computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useRankingTableHeight } from '~/composables/useRankingTableHeight.ts'
import { useLocale } from '~/composables/useLocale.ts'

/** One active sort, matching the `v-model:sorting` shape of `UTable`. */
type Sorting = { id: string; desc: boolean }[]

const props = withDefaults(defineProps<{
  /** Section heading; the header row is skipped when this and `count` are both empty. */
  title?: string
  /** Text right after the title, usually a row count, e.g. `42 首`. */
  count?: string | number | null
  /** One-line explanation printed under the heading. */
  note?: string | null
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  /** Fills the viewport below the heading and keeps the header sticky, like the song ranking. */
  fill?: boolean
  sticky?: boolean
  /** Per-column `meta`, e.g. a `rowspan` rule for merged cells. */
  meta?: Record<string, unknown>
  /** Extra `ui` overrides merged over the shared table look. */
  ui?: Record<string, unknown>
  emptyIcon?: string
  emptyTitle?: string
  emptyDescription?: string
}>(), {
  title: '',
  count: null,
  note: null,
  loading: false,
  fill: true,
  sticky: true,
  meta: undefined,
  ui: undefined,
  emptyIcon: 'i-lucide-search-x',
  emptyTitle: undefined,
  emptyDescription: undefined,
})

const { t } = useLocale()

/** Sort state owned by the caller; without a binding the table keeps its own order. */
const sorting = defineModel<Sorting>('sorting', { default: () => [] })

const { tableAnchor, tableStyle } = useRankingTableHeight()

/** Whether the heading row has anything to print. */
const hasHeader = computed(() => props.title !== '' || props.count !== null)

</script>

<template>
  <section class="space-y-3">
    <div v-if="hasHeader || $slots.actions" class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 v-if="hasHeader" class="text-lg font-semibold text-highlighted">
        {{ title }}
        <span v-if="count !== null" class="ml-1 text-sm font-normal text-muted">{{ count }}</span>
      </h2>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <p v-if="note" class="text-xs text-muted">{{ note }}</p>
    <slot name="note" />

    <USkeleton v-if="loading" class="h-72 w-full rounded-xl" />
    <UTable
      v-else
      ref="tableAnchor"
      v-model:sorting="sorting"
      :data="data"
      :columns="columns"
      :sticky="sticky"
      :meta="meta"
      class="ranking-scroll"
      :style="fill ? tableStyle : undefined"
      :ui="{ th: 'px-1.5 py-2.5', td: 'px-1.5 py-2.5', ...ui }"
    >
      <template #empty>
        <slot name="empty">
          <UEmpty
            :icon="emptyIcon"
            :title="emptyTitle ?? t('common.noData')"
            :description="emptyDescription"
            variant="naked"
          />
        </slot>
      </template>
      <template
        v-for="(_, name) in $slots"
        :key="name"
        #[name]="slotProps"
      >
        <slot :name="name" v-bind="slotProps ?? {}" />
      </template>
    </UTable>
  </section>
</template>
