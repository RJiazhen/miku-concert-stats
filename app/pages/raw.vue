<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { MessageKey } from '~~/shared/i18n/index.ts'
import { useLocale } from '~/composables/useLocale.ts'
import {
  fetchDevRawDatasets,
  fetchDevRawPage,
  patchDevRawCell,
  type DevRawDatasetPage,
  type DevRawDatasetSummary,
} from '~/composables/useDevRaw.ts'

const { t } = useLocale()

useHead({ title: computed(() => t('raw.title')) })

const datasets = ref<DevRawDatasetSummary[]>([])
const selectedId = ref('')
const query = ref('')
const offset = ref(0)
const limit = ref(100)
const page = ref<DevRawDatasetPage | null>(null)
const pending = ref(false)
const error = ref<string | null>(null)
const saveError = ref<string | null>(null)
const savingKey = ref<string | null>(null)
const filter = ref('')
/** Checked columns for the open dataset; missing keys mean visible (default on). */
const columnChecked = ref<Record<string, boolean>>({})

/** Resolves a message key, or null when the catalog has no such entry. */
const messageOrNull = (key: string): string | null => {
  const text = t(key as MessageKey)
  return text === key ? null : text
}

/** Localized dataset title. */
const datasetLabel = (dataset: DevRawDatasetSummary): string => {
  return messageOrNull(`raw.ds.${dataset.id}`) ?? dataset.label
}

/** Human-readable column header; falls back to the raw field name. */
const columnLabel = (column: string): string => {
  return messageOrNull(`raw.col.${column}`) ?? column
}

/**
 * Tooltip for a column header: localized comment plus the technical field name.
 * Falls back to only the field-name line when no comment exists.
 */
const columnTooltip = (column: string): string => {
  const hint = messageOrNull(`raw.hint.${column}`)
  const field = t('raw.fieldName', { name: column })
  return hint ? `${hint} ${field}` : field
}

/** Localized warning for the open dataset, preferring dataset-specific copy. */
const pageWarning = computed((): string | null => {
  if (!page.value?.derived) return null
  return messageOrNull(`raw.warn.${page.value.id}`) ?? t('raw.warn.derived')
})

/** Localized long description for the open dataset. */
const pageDescription = computed((): string | null => {
  if (!page.value) return null
  return messageOrNull(`raw.desc.${page.value.id}`)
})

/** On-disk file note for the open dataset. */
const pageFilesNote = computed((): string | null => {
  const files = page.value?.files
  if (!files || files.length === 0) return null
  return t('raw.filesOnDisk', { files: files.join(', ') })
})

/** Loads the sidebar dataset list once on mount. */
const loadDatasets = async (): Promise<void> => {
  pending.value = true
  error.value = null
  try {
    datasets.value = await fetchDevRawDatasets()
    if (!selectedId.value && datasets.value[0]) selectedId.value = datasets.value[0].id
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    pending.value = false
  }
}

/** Loads the current dataset page for the search box and pagination. */
const loadPage = async (): Promise<void> => {
  if (!selectedId.value) {
    page.value = null
    return
  }
  pending.value = true
  error.value = null
  try {
    page.value = await fetchDevRawPage(selectedId.value, {
      q: query.value,
      offset: offset.value,
      limit: limit.value,
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    page.value = null
  } finally {
    pending.value = false
  }
}

onMounted(async () => {
  await loadDatasets()
  await loadPage()
})

watch(selectedId, async () => {
  offset.value = 0
  await loadPage()
})

watch(query, async () => {
  offset.value = 0
  await loadPage()
})

/** Checks every column when the open dataset changes (or first loads). */
watch(
  () => page.value?.id,
  () => {
    if (!page.value) {
      columnChecked.value = {}
      return
    }
    columnChecked.value = Object.fromEntries(page.value.columns.map((column) => [column, true]))
  },
)

/** Datasets matching the sidebar filter box (id, API label, or localized label). */
const visibleDatasets = computed(() => {
  const needle = filter.value.trim().toLowerCase()
  if (!needle) return datasets.value
  return datasets.value.filter((dataset) => {
    return (
      dataset.id.toLowerCase().includes(needle)
      || dataset.label.toLowerCase().includes(needle)
      || datasetLabel(dataset).toLowerCase().includes(needle)
    )
  })
})

/** Columns currently checked for display in the data table. */
const visibleColumns = computed(() => {
  if (!page.value) return []
  return page.value.columns.filter((column) => columnChecked.value[column] !== false)
})

/**
 * Updates one column checkbox.
 * `UCheckbox` may emit `true` / `false` / `"indeterminate"`; only `true` keeps the column visible.
 */
const setColumnChecked = (column: string, value: boolean | 'indeterminate'): void => {
  columnChecked.value = { ...columnChecked.value, [column]: value === true }
}

/** Whether a column can be edited for the open dataset. */
const isEditable = (column: string): boolean => {
  return page.value?.editable.includes(column) ?? false
}

/** Saves one cell on blur / Enter; empty string clears nullable overlays. */
const saveCell = async (rowKey: string, field: string, event: Event): Promise<void> => {
  if (!page.value || !isEditable(field)) return
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  const next = target.value
  const row = page.value.rows.find((entry) => entry.key === rowKey)
  const previous = row?.cells[field] ?? null
  const normalized = next === '' ? null : next
  if ((previous ?? null) === normalized) return
  savingKey.value = `${rowKey}:${field}`
  saveError.value = null
  try {
    const updated = await patchDevRawCell(page.value.id, rowKey, field, normalized)
    if (row) row.cells = updated.cells
    else await loadPage()
    if (updated.rebuiltCatalog) {
      const summary = datasets.value.find((dataset) => dataset.id === page.value?.id)
      if (summary) summary.rowCount = page.value?.total ?? summary.rowCount
    }
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : String(err)
    target.value = previous ?? ''
  } finally {
    savingKey.value = null
  }
}

/** Moves pagination forward by one page. */
const nextPage = async (): Promise<void> => {
  if (!page.value) return
  if (offset.value + limit.value >= page.value.total) return
  offset.value += limit.value
  await loadPage()
}

/** Moves pagination backward by one page. */
const prevPage = async (): Promise<void> => {
  if (offset.value === 0) return
  offset.value = Math.max(0, offset.value - limit.value)
  await loadPage()
}
</script>

<template>
  <main class="space-y-4">
    <header class="space-y-2">
      <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">{{ t('raw.devOnly') }}</p>
      <h1 class="text-3xl font-semibold tracking-tight text-highlighted">{{ t('raw.title') }}</h1>
      <p class="max-w-3xl text-sm text-muted">
        {{ t('raw.description') }}
      </p>
    </header>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :description="error"
    />
    <UAlert
      v-if="saveError"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :description="saveError"
    />
    <UAlert
      v-if="pageWarning"
      color="warning"
      variant="subtle"
      icon="i-lucide-info"
      :description="pageWarning"
    />

    <div class="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside class="space-y-3 rounded-lg border border-default bg-elevated/40 p-3">
        <UInput v-model="filter" :placeholder="t('raw.filterDatasets')" icon="i-lucide-search" size="sm" />
        <div class="max-h-[70vh] space-y-1 overflow-y-auto">
          <button
            v-for="dataset in visibleDatasets"
            :key="dataset.id"
            type="button"
            class="flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm transition"
            :class="dataset.id === selectedId ? 'bg-primary/15 text-highlighted' : 'hover:bg-elevated text-muted'"
            @click="selectedId = dataset.id"
          >
            <span class="font-medium text-highlighted">{{ datasetLabel(dataset) }}</span>
            <span class="text-xs opacity-70">
              {{ t('raw.rows', { n: dataset.rowCount }) }}{{ dataset.derived ? ` · ${t('raw.derived')}` : '' }}
            </span>
          </button>
        </div>
      </aside>

      <section class="min-w-0 space-y-3">
        <div v-if="page" class="space-y-1 rounded-lg border border-default bg-elevated/30 px-3 py-2">
          <p class="text-sm font-medium text-highlighted">{{ messageOrNull(`raw.ds.${page.id}`) ?? page.label }}</p>
          <p v-if="pageDescription" class="text-sm text-muted">{{ pageDescription }}</p>
          <p v-if="pageFilesNote" class="font-mono text-[11px] text-muted">{{ pageFilesNote }}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UInput
            v-model="query"
            class="min-w-[220px] flex-1"
            :placeholder="t('raw.searchDataset')"
            icon="i-lucide-search"
            size="sm"
          />
          <UButton color="neutral" variant="outline" size="sm" :disabled="offset === 0 || pending" @click="prevPage">
            {{ t('raw.prev') }}
          </UButton>
          <span class="text-xs text-muted">
            {{
              page
                ? t('raw.range', {
                  from: page.offset + 1,
                  to: Math.min(page.offset + page.rows.length, page.total),
                  total: page.total,
                })
                : '—'
            }}
          </span>
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="!page || offset + limit >= page.total || pending"
            @click="nextPage"
          >
            {{ t('raw.next') }}
          </UButton>
          <span v-if="pending" class="text-xs text-muted">{{ t('raw.loading') }}</span>
        </div>

        <div
          v-if="page"
          class="flex flex-wrap gap-x-3 gap-y-1.5 rounded-lg border border-default bg-elevated/30 px-3 py-2"
        >
          <UCheckbox
            v-for="column in page.columns"
            :key="column"
            :model-value="columnChecked[column] !== false"
            :label="columnLabel(column)"
            size="sm"
            @update:model-value="setColumnChecked(column, $event)"
          />
        </div>

        <div v-if="page" class="overflow-auto rounded-lg border border-default">
          <table class="min-w-full border-collapse text-left text-xs">
            <thead class="sticky top-0 bg-elevated">
              <tr>
                <th
                  v-for="column in visibleColumns"
                  :key="column"
                  class="border-b border-default px-2 py-2 font-medium whitespace-nowrap text-muted"
                >
                  <UTooltip :text="columnTooltip(column)" :delay-duration="200">
                    <span class="inline-flex cursor-help items-center gap-0.5 border-b border-dotted border-muted">
                      {{ columnLabel(column) }}
                      <span v-if="isEditable(column)" class="text-primary">*</span>
                    </span>
                  </UTooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in page.rows" :key="row.key" class="odd:bg-elevated/30">
                <td
                  v-for="column in visibleColumns"
                  :key="column"
                  class="border-b border-default px-1 py-1 align-top"
                >
                  <textarea
                    v-if="isEditable(column) && (column === 'value' || (row.cells[column] ?? '').includes('\n'))"
                    class="min-h-16 w-56 min-w-[12rem] rounded border border-default bg-default px-1.5 py-1 font-mono text-[11px] text-highlighted"
                    :value="row.cells[column] ?? ''"
                    :disabled="savingKey === `${row.key}:${column}`"
                    @keydown.enter.exact.prevent="($event.target as HTMLTextAreaElement).blur()"
                    @blur="saveCell(row.key, column, $event)"
                  />
                  <input
                    v-else-if="isEditable(column)"
                    class="w-44 min-w-[8rem] rounded border border-default bg-default px-1.5 py-1 text-[11px] text-highlighted"
                    :value="row.cells[column] ?? ''"
                    :disabled="savingKey === `${row.key}:${column}`"
                    @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
                    @blur="saveCell(row.key, column, $event)"
                  >
                  <span v-else class="block max-w-[18rem] truncate px-1.5 py-1 text-highlighted" :title="row.cells[column] ?? ''">
                    {{ row.cells[column] ?? '—' }}
                  </span>
                </td>
              </tr>
              <tr v-if="page.rows.length === 0">
                <td :colspan="Math.max(visibleColumns.length, 1)" class="px-3 py-6 text-center text-muted">
                  {{ t('raw.empty') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs text-muted">
          {{ t('raw.editableHint') }}
        </p>
      </section>
    </div>
  </main>
</template>
