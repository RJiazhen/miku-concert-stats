<script setup lang="ts" generic="T extends object">
import { computed, nextTick, onMounted, onUnmounted, toRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { TableColumn } from '@nuxt/ui'
import { useRankingScrollHandoff } from '~/composables/useRankingScrollHandoff.ts'
import { useRankingTableHeight } from '~/composables/useRankingTableHeight.ts'
import { useLocale } from '~/composables/useLocale.ts'

/** One active sort, matching the `v-model:sorting` shape of `UTable`. */
type Sorting = { id: string; desc: boolean }[]

const props = withDefaults(defineProps<{
  /** Section heading; the header row is skipped when this and `count` are both empty. */
  title?: string
  /**
   * Optional fragment id on the visible section `h2`, so in-site links can
   * scroll to this heading. When set, the heading also gets `scroll-mt-24`,
   * the same sticky-header clearance as the timeline charts.
   */
  headingId?: string
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
  /**
   * Renders only the rows in view, so a long table re-renders a few rows instead of all of them.
   * Needs the bounded height that `fill` gives the table; otherwise leave it off.
   */
  virtualize?: boolean | Record<string, unknown>
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
  virtualize: false,
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
useRankingScrollHandoff(tableAnchor, toRef(props, 'fill'))
const route = useRoute()

/** Whether the heading row has anything to print. */
const hasHeader = computed(() => props.title !== '' || props.count !== null)

/** Current fragment, including same-document hash changes that have not yet reached the router. */
const currentHash = (): string => route.hash || window.location.hash

/**
 * Scrolls this heading into view when the URL hash matches its fragment id.
 * Vue Router and native hash scrolling can ignore `scroll-margin` or animate
 * with the page's smooth `scroll-behavior`, so the offset is applied here
 * immediately using the heading's `scroll-mt-24` (the same sticky-header
 * clearance as the timeline charts).
 */
const scrollToHeading = (): void => {
  const id = props.headingId
  if (!id || currentHash() !== `#${id}`) return
  const heading = document.getElementById(id)
  if (!heading) return
  const margin = Number.parseFloat(getComputedStyle(heading).scrollMarginTop)
  const clearance = Number.isFinite(margin) ? margin : 96
  const top = window.scrollY + heading.getBoundingClientRect().top - clearance
  const root = document.documentElement
  const previousBehavior = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto'
  window.scrollTo({ top: Math.max(0, top), behavior: 'auto' })
  root.style.scrollBehavior = previousBehavior
}

/** Runs after layout and after Vue Router's own hash scroll. */
const scheduleScrollToHeading = (): void => {
  void nextTick(() => {
    scrollToHeading()
    requestAnimationFrame(() => {
      scrollToHeading()
      window.setTimeout(scrollToHeading, 50)
      window.setTimeout(scrollToHeading, 200)
    })
  })
}

onMounted(() => {
  scheduleScrollToHeading()
  window.addEventListener('hashchange', scheduleScrollToHeading)
  window.addEventListener('popstate', scheduleScrollToHeading)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', scheduleScrollToHeading)
  window.removeEventListener('popstate', scheduleScrollToHeading)
})

watch(
  () => [props.headingId, props.loading, route.hash] as const,
  () => {
    scheduleScrollToHeading()
  },
)

</script>

<template>
  <section
    class="space-y-3"
    :aria-labelledby="hasHeader && headingId ? headingId : undefined"
  >
    <div v-if="hasHeader || $slots.actions" class="flex flex-wrap items-baseline justify-between gap-2">
      <h2
        v-if="hasHeader"
        :id="headingId || undefined"
        class="text-lg font-semibold text-highlighted"
        :class="headingId ? 'scroll-mt-24' : undefined"
      >
        {{ title }}
        <!-- The row count only means something once the catalog is read, so it waits for the table. -->
        <span v-if="count !== null && !loading" class="ml-1 text-sm font-normal text-muted">{{ count }}</span>
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
      :virtualize="virtualize"
      :meta="meta"
      class="ranking-scroll"
      :style="fill ? tableStyle : undefined"
      :ui="{ th: 'px-3 py-2.5', td: 'px-3 py-2.5', ...ui }"
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
