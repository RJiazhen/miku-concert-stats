<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useLocale } from '~/composables/useLocale.ts'
import {
  chartExportFilename,
  exportChartToJpeg,
  readExportBackground,
  triggerJpegDownload,
} from '~~/shared/chart-export.ts'
import {
  exitElementFullscreen,
  getScreenOrientation,
  readViewportSize,
  tryMobileLandscapePresentation,
  unlockOrientation,
} from '~~/shared/chart-fullscreen.ts'
import { chartLayoutKey, type ChartLayout } from '~~/shared/chart-layout.ts'

const props = withDefaults(defineProps<{
  /** Chart heading, e.g. 场次数年度变化. */
  title: string
  /** One-line explanation of the counting rule under the heading. */
  note?: string
  /** Active filter labels appended to the JPEG filename when non-empty. */
  exportFilters?: string[]
}>(), {
  exportFilters: () => [],
})

const { t } = useLocale()

/** Whether this card is shown in the viewport-filling dialog. */
const fullscreen = ref(false)

/** Close button, focused when the dialog opens. */
const closeButton = ref<{ $el?: unknown } | null>(null)

/** Plot wrapper used as the JPEG capture root (legend plus SVG, not hover hints alone). */
const plotRoot = ref<HTMLElement | null>(null)

/** Card or dialog surface whose background fills transparent JPEG areas. */
const exportSurface = ref<HTMLElement | null>(null)

/** Prevents a second download while the canvas is still encoding. */
const exportBusy = ref(false)

/** Measured viewport; used only to decide whether to request a landscape lock. */
const viewportWidth = ref(0)
const viewportHeight = ref(0)

/** True only when this session's orientation.lock() promise fulfilled. */
const nativeLockHeld = ref(false)

/** True only when this session entered browser fullscreen for the landscape lock. */
const documentFullscreenHeld = ref(false)

const layout = computed<ChartLayout>(() => ({ fitToContainer: fullscreen.value }))
provide(chartLayoutKey, layout)

/**
 * Shared look for icon-only chart chrome buttons: ghost (no border), centered icon,
 * and no focus/hover wash so the control stays visually quiet over the plot.
 */
const chartChromeButtonUi = {
  base: [
    'justify-center ring-0 shadow-none',
    'focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-transparent',
    'hover:bg-transparent active:bg-transparent',
  ].join(' '),
  leadingIcon: 'mx-auto',
} as const

/** Shared classes for the touch-safe chart chrome controls. */
const chartChromeButtonClass = 'min-h-11 min-w-11 shrink-0 p-0'

/**
 * Right padding reserved for the two chrome buttons (2×2.75rem + gap-1).
 * Applied to the chart's first content row (legend or gantt hint) so labels wrap clear of the overlay.
 */
const chartChromeClearanceClass = '[&>:first-child>:first-child]:pr-[5.75rem]'

/** Reads the current viewport, preferring visualViewport when the browser exposes it. */
const measureViewport = (): void => {
  const size = readViewportSize(window)
  if (viewportWidth.value !== size.width) viewportWidth.value = size.width
  if (viewportHeight.value !== size.height) viewportHeight.value = size.height
}

/**
 * Downloads this chart as a JPEG.
 * Propagation is stopped so the click cannot select a year or toggle fullscreen.
 */
const exportChart = async (event: Event): Promise<void> => {
  event.preventDefault()
  event.stopPropagation()
  if (exportBusy.value || plotRoot.value === null) return
  exportBusy.value = true
  try {
    const root = plotRoot.value
    const surface = exportSurface.value ?? root
    const blob = await exportChartToJpeg({
      root,
      title: props.title,
      background: readExportBackground(surface),
    })
    triggerJpegDownload(blob, chartExportFilename(props.title, props.exportFilters))
  } catch (error) {
    console.error(error)
  } finally {
    exportBusy.value = false
  }
}

/** Stops pointer events on the export control from reaching the chart. */
const stopExportPointer = (event: Event): void => {
  event.stopPropagation()
}

/** Opens the plot-only dialog and requests document fullscreen + landscape on compact portrait. */
const openFullscreen = (): void => {
  measureViewport()
  fullscreen.value = true
}

/** Returns the chart to the in-page card and releases fullscreen / orientation locks. */
const closeFullscreen = (): void => {
  unlockOrientation(getScreenOrientation(window), nativeLockHeld.value)
  nativeLockHeld.value = false
  const heldDocumentFullscreen = documentFullscreenHeld.value
  documentFullscreenHeld.value = false
  void exitElementFullscreen(heldDocumentFullscreen)
  fullscreen.value = false
}

/** Closes the dialog on Escape without affecting other page shortcuts when closed. */
const closeOnEscape = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape' || !fullscreen.value) return
  event.preventDefault()
  closeFullscreen()
}

/**
 * Clears the document-fullscreen flag when the user exits browser fullscreen
 * without going through the dialog close control.
 */
const onDocumentFullscreenChange = (): void => {
  if (!fullscreen.value || !documentFullscreenHeld.value) return
  const doc = document as Document & { webkitFullscreenElement?: Element | null }
  if (doc.fullscreenElement != null || doc.webkitFullscreenElement != null) return
  documentFullscreenHeld.value = false
  unlockOrientation(getScreenOrientation(window), nativeLockHeld.value)
  nativeLockHeld.value = false
  measureViewport()
}

onMounted(() => {
  window.addEventListener('keydown', closeOnEscape)
  window.addEventListener('resize', measureViewport)
  window.visualViewport?.addEventListener('resize', measureViewport)
  document.addEventListener('fullscreenchange', onDocumentFullscreenChange)
  document.addEventListener('webkitfullscreenchange', onDocumentFullscreenChange)
  measureViewport()
})

onUnmounted(() => {
  window.removeEventListener('keydown', closeOnEscape)
  window.removeEventListener('resize', measureViewport)
  window.visualViewport?.removeEventListener('resize', measureViewport)
  document.removeEventListener('fullscreenchange', onDocumentFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', onDocumentFullscreenChange)
  unlockOrientation(getScreenOrientation(window), nativeLockHeld.value)
  void exitElementFullscreen(documentFullscreenHeld.value)
  document.body.style.removeProperty('overflow')
})

watch(fullscreen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (!open) return
  void nextTick(async () => {
    measureViewport()
    const presentation = await tryMobileLandscapePresentation({
      element: exportSurface.value,
      orientation: getScreenOrientation(window),
      viewportWidth: viewportWidth.value,
      viewportHeight: viewportHeight.value,
    })
    documentFullscreenHeld.value = presentation.documentFullscreen
    nativeLockHeld.value = presentation.orientationLock
    measureViewport()
    const target = closeButton.value
    const element = target instanceof HTMLElement ? target : (target?.$el ?? null)
    if (element instanceof HTMLElement) element.focus()
  })
})
</script>

<template>
  <Teleport to="body" :disabled="!fullscreen">
    <div
      ref="exportSurface"
      data-chart-export-surface
      :class="fullscreen
        ? 'fixed inset-0 z-[70] flex flex-col bg-default pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]'
        : 'group/chart'"
      :role="fullscreen ? 'dialog' : undefined"
      :aria-modal="fullscreen ? 'true' : undefined"
      :aria-label="fullscreen ? t('chart.fullscreenDialog') : undefined"
    >
      <template v-if="!fullscreen">
        <UCard :ui="{ body: 'space-y-2 sm:p-4' }">
          <template #header>
            <div class="min-w-0">
              <h2 class="text-base font-semibold text-highlighted">{{ title }}</h2>
              <p v-if="note" class="mt-1 text-xs leading-relaxed text-muted">{{ note }}</p>
            </div>
            <div v-if="$slots.actions" class="mt-2 flex flex-wrap items-center gap-2">
              <slot name="actions" />
            </div>
          </template>
          <div>
            <div class="relative">
              <div
                ref="plotRoot"
                data-chart-export-root
                :class="chartChromeClearanceClass"
              >
                <slot />
              </div>
              <div
                data-chart-export-controls
                class="absolute top-0 right-0 z-10 flex items-center gap-1 md:opacity-0 md:pointer-events-none md:group-hover/chart:opacity-100 md:group-hover/chart:pointer-events-auto md:group-focus-within/chart:opacity-100 md:group-focus-within/chart:pointer-events-auto"
              >
                <UButton
                  icon="i-lucide-download"
                  color="neutral"
                  variant="ghost"
                  square
                  size="md"
                  :class="chartChromeButtonClass"
                  :ui="chartChromeButtonUi"
                  :aria-label="t('chart.downloadJpeg')"
                  :disabled="exportBusy"
                  data-chart-export-control="page"
                  @click="exportChart"
                  @pointerdown="stopExportPointer"
                  @mousedown="stopExportPointer"
                />
                <UButton
                  icon="i-lucide-maximize-2"
                  color="neutral"
                  variant="ghost"
                  square
                  size="md"
                  :class="chartChromeButtonClass"
                  :ui="chartChromeButtonUi"
                  :aria-label="t('chart.fullscreenOpen')"
                  :aria-expanded="false"
                  aria-haspopup="dialog"
                  @click="openFullscreen()"
                />
              </div>
            </div>
          </div>
          <div v-if="$slots.footer">
            <slot name="footer" />
          </div>
        </UCard>
      </template>
      <template v-else>
        <div
          data-chart-fullscreen-stage
          class="relative min-h-0 min-w-0 flex-1 overflow-hidden pl-3 pr-1 pt-1"
        >
          <div
            data-chart-fullscreen-toolbar
            class="absolute top-1 right-1 z-10 flex items-center gap-1"
          >
            <UButton
              icon="i-lucide-download"
              color="neutral"
              variant="ghost"
              square
              size="md"
              :class="chartChromeButtonClass"
              :ui="chartChromeButtonUi"
              :aria-label="t('chart.downloadJpeg')"
              :disabled="exportBusy"
              data-chart-export-control="fullscreen"
              @click="exportChart"
              @pointerdown="stopExportPointer"
              @mousedown="stopExportPointer"
            />
            <UButton
              ref="closeButton"
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              square
              size="md"
              :class="chartChromeButtonClass"
              :ui="chartChromeButtonUi"
              :aria-label="t('chart.fullscreenClose')"
              :aria-expanded="true"
              @click="closeFullscreen()"
            />
          </div>
          <div
            ref="plotRoot"
            data-chart-export-root
            data-chart-fullscreen-plot
            class="flex h-full w-full min-h-0 flex-col overflow-x-hidden overflow-y-auto"
            :class="chartChromeClearanceClass"
          >
            <slot />
          </div>
        </div>
      </template>
    </div>
  </Teleport>
</template>
