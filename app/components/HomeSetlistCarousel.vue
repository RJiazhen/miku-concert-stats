<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useLocale } from '~/composables/useLocale.ts'
import { useSeriesTitles } from '~/composables/useSeriesTitles.ts'
import { usePlaceNames } from '~/composables/usePlaceNames.ts'
import {
  SETLIST_BANNER_AUTOPLAY_MS,
  bannerAutoplayEnabled,
  bannerIncomingStartPercent,
  bannerSlideOffsetPercent,
  splitDuration,
  type HomepageSetlistSlide,
} from '~~/shared/homepage-carousel.ts'

const props = defineProps<{
  slides: HomepageSetlistSlide[]
}>()

const { t } = useLocale()
const { localizePerformanceSeries } = useSeriesTitles()
const { localizePlace } = usePlaceNames()

const current = ref(0)
const previous = ref<number | null>(null)
const direction = ref<1 | -1>(1)
const dragX = ref(0)
const dragging = ref(false)
const pointerStart = ref<{ x: number; y: number; axis: 'pending' | 'horizontal' | 'vertical' } | null>(null)

const mounted = ref(false)
const reducedMotion = ref(false)
const pointerHeld = ref(false)
const keyHeld = ref(false)
const pageHidden = ref(false)
const animate = ref(false)
const viewportEl = ref<HTMLElement | null>(null)

let animGeneration = 0
const heldPointers = new Set<number>()
const heldKeys = new Set<string>()
let lastPointerX = 0
let lastPointerY = 0
let havePointerSample = false

const slideCount = computed(() => props.slides.length)

/** Localizes a catalog 演出 name the same way other homepage cards do. */
const slideLabel = (slide: HomepageSetlistSlide): string =>
  localizePlace(localizePerformanceSeries(slide.name, slide.seriesName, slide.seriesNumber))

const venueLabel = (slide: HomepageSetlistSlide): string | null =>
  slide.venue ? localizePlace(slide.venue) : null

const autoplayOn = computed(() =>
  bannerAutoplayEnabled({
    mounted: mounted.value,
    slideCount: slideCount.value,
    reducedMotion: reducedMotion.value,
    pointerHeld: pointerHeld.value,
    keyHeld: keyHeld.value,
    pageHidden: pageHidden.value,
  }),
)

let autoplayTimer: ReturnType<typeof setTimeout> | null = null
let media: MediaQueryList | null = null

const clearAutoplay = (): void => {
  if (autoplayTimer !== null) {
    clearTimeout(autoplayTimer)
    autoplayTimer = null
  }
}

const scheduleAutoplay = (): void => {
  clearAutoplay()
  if (!autoplayOn.value) return
  autoplayTimer = setTimeout(() => {
    go(1)
  }, SETLIST_BANNER_AUTOPLAY_MS)
}

const settleSlide = (from: number, next: number, dir: 1 | -1, withMotion: boolean): void => {
  animate.value = withMotion
  direction.value = dir
  previous.value = from
  current.value = next
  dragX.value = 0
  dragging.value = false
  scheduleAutoplay()
}

const parkAndAnimate = async (from: number, next: number, dir: 1 | -1): Promise<void> => {
  const generation = ++animGeneration
  animate.value = false
  direction.value = dir
  previous.value = null
  current.value = from
  dragX.value = 0
  dragging.value = false
  await nextTick()
  if (generation !== animGeneration) return
  void viewportEl.value?.offsetWidth
  settleSlide(from, next, dir, true)
}

const goTo = (index: number, deltaHint?: number, fromDrag = false): void => {
  const count = slideCount.value
  if (count === 0) return
  const next = ((index % count) + count) % count
  if (next === current.value) {
    dragX.value = 0
    dragging.value = false
    scheduleAutoplay()
    return
  }
  const from = current.value
  const delta = deltaHint ?? (next > current.value ? 1 : -1)
  const dir: 1 | -1 = delta >= 0 ? 1 : -1
  if (reducedMotion.value) {
    animGeneration += 1
    settleSlide(from, next, dir, false)
    return
  }
  const incomingOffset = bannerSlideOffsetPercent(next, {
    current: current.value,
    previous: previous.value,
    direction: direction.value,
  })
  if (!fromDrag && incomingOffset !== bannerIncomingStartPercent(dir)) {
    void parkAndAnimate(from, next, dir)
    return
  }
  animGeneration += 1
  settleSlide(from, next, dir, true)
}

const go = (delta: number, fromDrag = false): void => {
  if (delta === 0) return
  goTo(current.value + delta, delta, fromDrag)
}

const isModifierKey = (key: string): boolean =>
  key === 'Shift' || key === 'Control' || key === 'Meta' || key === 'Alt'

const attachWindowKeyRelease = (): void => {
  window.addEventListener('keyup', onWindowKeyUp)
  window.addEventListener('blur', onWindowBlur)
}

const detachWindowKeyRelease = (): void => {
  window.removeEventListener('keyup', onWindowKeyUp)
  window.removeEventListener('blur', onWindowBlur)
}

const releaseHeldKeys = (): void => {
  if (heldKeys.size === 0) return
  heldKeys.clear()
  keyHeld.value = false
  detachWindowKeyRelease()
  scheduleAutoplay()
}

const onWindowKeyUp = (event: KeyboardEvent): void => {
  if (isModifierKey(event.key)) return
  heldKeys.delete(event.code || event.key)
  if (heldKeys.size === 0) {
    keyHeld.value = false
    detachWindowKeyRelease()
    scheduleAutoplay()
  }
}

const onWindowBlur = (): void => {
  releaseHeldKeys()
}

const onInteractKeyDown = (event: KeyboardEvent): void => {
  if (isModifierKey(event.key)) return
  const id = event.code || event.key
  const wasEmpty = heldKeys.size === 0
  heldKeys.add(id)
  keyHeld.value = true
  clearAutoplay()
  if (wasEmpty) attachWindowKeyRelease()
}

const onInteractKeyUp = (event: KeyboardEvent): void => {
  if (isModifierKey(event.key)) return
  onWindowKeyUp(event)
}

const attachWindowPointerRelease = (): void => {
  window.addEventListener('pointerup', onWindowPointerUp)
  window.addEventListener('pointercancel', onWindowPointerUp)
}

const detachWindowPointerRelease = (): void => {
  window.removeEventListener('pointerup', onWindowPointerUp)
  window.removeEventListener('pointercancel', onWindowPointerUp)
}

const releasePointer = (pointerId: number): void => {
  if (!heldPointers.has(pointerId) && heldPointers.size === 0) return
  heldPointers.delete(pointerId)
  if (heldPointers.size === 0) {
    pointerHeld.value = false
    detachWindowPointerRelease()
    scheduleAutoplay()
  }
}

const onWindowPointerUp = (event: PointerEvent): void => {
  releasePointer(event.pointerId)
}

const onInteractPointerDown = (event: PointerEvent): void => {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const wasEmpty = heldPointers.size === 0
  heldPointers.add(event.pointerId)
  pointerHeld.value = true
  clearAutoplay()
  havePointerSample = true
  lastPointerX = event.clientX
  lastPointerY = event.clientY
  if (wasEmpty) attachWindowPointerRelease()
}

const onInteractPointerMove = (event: PointerEvent): void => {
  if (pointerHeld.value || keyHeld.value) {
    havePointerSample = true
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    return
  }
  if (!havePointerSample) {
    havePointerSample = true
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    return
  }
  const dx = event.clientX - lastPointerX
  const dy = event.clientY - lastPointerY
  if (dx * dx + dy * dy < 4) return
  lastPointerX = event.clientX
  lastPointerY = event.clientY
  scheduleAutoplay()
}

const onInteractPointerUp = (event: PointerEvent): void => {
  releasePointer(event.pointerId)
}

const onKey = (event: KeyboardEvent): void => {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    go(-1)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    go(1)
  } else if (event.key === 'Home') {
    event.preventDefault()
    goTo(0, -1)
  } else if (event.key === 'End') {
    event.preventDefault()
    goTo(slideCount.value - 1, 1)
  }
}

const isControlTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false
  // The show-page link covers the poster so it can be clicked; swipe still starts there.
  if (target.closest('[data-carousel-slide-link]')) return false
  return target.closest('button, a, [data-carousel-control]') !== null
}

/** Set when a horizontal drag should not follow the show-page link. */
let ignoreSlideLinkClick = false

const onSlideLinkClick = (event: MouseEvent): void => {
  if (!ignoreSlideLinkClick) return
  event.preventDefault()
  event.stopPropagation()
  ignoreSlideLinkClick = false
}

const onPointerDown = (event: PointerEvent): void => {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (isControlTarget(event.target)) return
  pointerStart.value = { x: event.clientX, y: event.clientY, axis: 'pending' }
  dragX.value = 0
}

const onPointerMove = (event: PointerEvent): void => {
  const start = pointerStart.value
  if (start === null) return
  const dx = event.clientX - start.x
  const dy = event.clientY - start.y
  if (start.axis === 'pending') {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
    start.axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
    pointerStart.value = start
    if (start.axis === 'vertical') return
    dragging.value = true
    clearAutoplay()
    try {
      event.currentTarget instanceof HTMLElement && event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Capture is optional; tests and some pointers may not support it.
    }
  }
  if (start.axis !== 'horizontal') return
  if (event.cancelable) event.preventDefault()
  dragX.value = dx
}

const onPointerUp = (event: PointerEvent): void => {
  const start = pointerStart.value
  pointerStart.value = null
  if (start === null || start.axis !== 'horizontal') {
    dragging.value = false
    dragX.value = 0
    return
  }
  const dx = event.clientX - start.x
  const threshold = 48
  dragging.value = false
  ignoreSlideLinkClick = true
  if (Math.abs(dx) >= threshold) {
    go(dx < 0 ? 1 : -1, true)
  } else {
    dragX.value = 0
    scheduleAutoplay()
  }
}

const onPointerCancel = (): void => {
  pointerStart.value = null
  dragging.value = false
  dragX.value = 0
  ignoreSlideLinkClick = false
  scheduleAutoplay()
}

const durationLabel = (seconds: number): string => {
  const parts = splitDuration(seconds)
  if (parts.hours === 0) return t('home.estimatedSongDurationMinutes', { n: parts.minutes })
  if (parts.minutes === 0) return t('home.estimatedSongDurationHoursOnly', { hours: parts.hours })
  return t('home.estimatedSongDurationHours', { hours: parts.hours, minutes: parts.minutes })
}

const posterAlt = (slide: HomepageSetlistSlide): string =>
  t('home.carouselPosterAlt', { name: slideLabel(slide) })

const neighbor = (delta: 1 | -1): number | null => {
  const count = slideCount.value
  if (count < 2) return null
  return (current.value + delta + count) % count
}

/** Horizontal offset in percentages for a slide, plus any live drag in pixels. */
const slideStyle = (index: number): Record<string, string> => {
  let x = bannerSlideOffsetPercent(index, {
    current: current.value,
    previous: previous.value,
    direction: direction.value,
  })
  if (dragging.value && dragX.value < 0 && index === neighbor(1)) x = 100
  else if (dragging.value && dragX.value > 0 && index === neighbor(-1)) x = -100
  const drag =
    index === current.value ||
    (dragging.value && (index === neighbor(1) || index === neighbor(-1))) ||
    index === previous.value
      ? dragX.value
      : 0
  return {
    transform: `translateX(calc(${x}% + ${drag}px))`,
    zIndex: index === current.value ? '10' : index === previous.value ? '9' : '0',
  }
}

const syncReducedMotion = (): void => {
  reducedMotion.value = media?.matches ?? false
}

const syncPageHidden = (): void => {
  pageHidden.value = document.hidden
}

watch(autoplayOn, (enabled) => {
  if (enabled) scheduleAutoplay()
  else clearAutoplay()
})

watch(reducedMotion, (reduce) => {
  if (reduce) {
    animGeneration += 1
    animate.value = false
  } else if (!dragging.value) {
    animate.value = true
  }
})

watch(
  () => props.slides.length,
  () => {
    if (current.value >= slideCount.value) goTo(0)
  },
)

onMounted(() => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  syncReducedMotion()
  animate.value = !reducedMotion.value
  media.addEventListener('change', syncReducedMotion)
  syncPageHidden()
  document.addEventListener('visibilitychange', syncPageHidden)
  mounted.value = true
})

onUnmounted(() => {
  clearAutoplay()
  heldPointers.clear()
  heldKeys.clear()
  pointerHeld.value = false
  keyHeld.value = false
  detachWindowPointerRelease()
  detachWindowKeyRelease()
  media?.removeEventListener('change', syncReducedMotion)
  document.removeEventListener('visibilitychange', syncPageHidden)
})
</script>

<template>
  <section
    class="banner-root w-full max-w-full"
    :aria-label="t('home.carouselTitle')"
    @pointerdown.capture="onInteractPointerDown"
    @pointermove="onInteractPointerMove"
    @pointerup="onInteractPointerUp"
    @pointercancel="onInteractPointerUp"
    @keydown.capture="onInteractKeyDown"
    @keyup.capture="onInteractKeyUp"
  >
    <p v-if="slideCount === 0" class="mx-auto max-w-body px-4 text-sm text-muted sm:px-6">
      {{ t('home.carouselEmpty') }}
    </p>

    <div
      v-else
      class="relative w-full max-w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      ref="viewportEl"
      role="region"
      :aria-roledescription="t('home.carouselRole')"
      :aria-label="t('home.carouselTitle')"
      tabindex="0"
      style="touch-action: pan-y"
      @keydown="onKey"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <div class="relative min-h-[24rem] w-full sm:min-h-[28rem]">
        <article
          v-for="(slide, index) in slides"
          :key="slide.id"
          class="carousel-slide absolute inset-0 w-full will-change-transform"
          :class="{ 'is-motion': animate && !dragging && !reducedMotion }"
          :style="slideStyle(index)"
          :inert="index !== current"
          :aria-hidden="index === current ? undefined : 'true'"
          :aria-roledescription="t('home.carouselSlideRole')"
          :aria-label="t('home.carouselSlideLabel', { current: index + 1, total: slideCount, name: slideLabel(slide) })"
        >
          <div class="poster-stage absolute inset-0 -z-10 overflow-hidden">
            <div class="poster-frame">
              <img
                v-if="slide.poster"
                :src="slide.poster.src"
                :alt="posterAlt(slide)"
                class="poster-image object-cover object-top"
              >
              <div
                v-else
                class="poster-image bg-linear-to-br from-primary/30 via-default to-muted"
                aria-hidden="true"
              />
              <div class="poster-side-fade" aria-hidden="true" />
            </div>
            <div class="poster-readability-mask" aria-hidden="true" />
          </div>

          <div class="relative flex h-full min-h-[24rem] flex-col px-5 py-8 sm:min-h-[28rem] sm:px-12 sm:py-10">
            <NuxtLink
              :to="slide.href"
              data-carousel-slide-link
              class="banner-slide-link flex min-h-0 flex-1 flex-col justify-end gap-2 rounded-sm text-inherit no-underline focus-visible:outline-none focus-visible:ring-2"
              @click="onSlideLinkClick"
            >
              <h3 class="max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-balance decoration-current underline-offset-4 hover:underline sm:text-3xl">
                {{ slideLabel(slide) }}
              </h3>
              <span class="inline-flex items-center gap-1 text-sm font-medium">
                {{ t('home.viewConcert') }}
                <UIcon name="i-lucide-arrow-right" class="size-3.5 shrink-0" aria-hidden="true" />
              </span>
            </NuxtLink>
            <dl class="relative z-20 mt-4 flex flex-wrap items-center gap-2 text-sm">
              <div v-if="slide.dates" class="banner-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 backdrop-blur-sm">
                <dt class="sr-only">{{ t('home.concertDate') }}</dt>
                <dd class="inline-flex items-center gap-1.5">
                  <UIcon name="i-lucide-calendar" class="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{{ slide.dates }}</span>
                </dd>
              </div>
              <div v-if="slide.showtime" class="banner-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 backdrop-blur-sm">
                <dt class="sr-only">{{ t('home.concertTime') }}</dt>
                <dd class="inline-flex items-center gap-1.5">
                  <UIcon name="i-lucide-clock" class="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{{ slide.showtime }}</span>
                </dd>
              </div>
              <div v-if="venueLabel(slide)" class="banner-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 backdrop-blur-sm">
                <dt class="sr-only">{{ t('home.venue') }}</dt>
                <dd class="inline-flex items-center gap-1.5">
                  <UIcon name="i-lucide-map-pin" class="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{{ venueLabel(slide) }}</span>
                </dd>
              </div>
              <div v-if="slide.songCount !== null" class="banner-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 backdrop-blur-sm">
                <dt class="sr-only">{{ t('home.songCountLabel') }}</dt>
                <dd class="inline-flex items-center gap-1.5">
                  <UIcon name="i-lucide-music" class="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{{ t('home.songCount', { n: slide.songCount }) }}</span>
                </dd>
              </div>
              <div
                v-if="slide.estimatedSongDurationSeconds !== null"
                class="banner-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 backdrop-blur-sm"
                :title="t('home.estimatedSongDurationLabel')"
              >
                <dt class="sr-only">{{ t('home.estimatedSongDurationLabel') }}</dt>
                <dd class="inline-flex items-center gap-1.5">
                  <UIcon name="i-lucide-timer" class="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{{ durationLabel(slide.estimatedSongDurationSeconds) }}</span>
                </dd>
              </div>
            </dl>
          </div>
        </article>
      </div>

      <div
        v-if="slideCount > 1"
        data-carousel-arrows
        class="carousel-arrows absolute inset-y-0 left-0 right-0 z-30 items-center justify-between px-3 sm:px-4"
      >
        <button
          type="button"
          data-carousel-control
          class="inline-flex size-10 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/25 backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
          :aria-label="t('home.carouselPrev')"
          @click="go(-1)"
        >
          <UIcon name="i-lucide-chevron-left" class="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-carousel-control
          class="inline-flex size-10 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/25 backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
          :aria-label="t('home.carouselNext')"
          @click="go(1)"
        >
          <UIcon name="i-lucide-chevron-right" class="size-5" aria-hidden="true" />
        </button>
      </div>

      <div
        v-if="slideCount > 1"
        class="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-center justify-center gap-3 px-4 py-3"
      >
        <div
          class="pointer-events-auto flex flex-wrap items-center justify-center gap-2"
          role="tablist"
          :aria-label="t('home.carouselTitle')"
        >
          <button
            v-for="(slide, index) in slides"
            :key="slide.id"
            type="button"
            data-carousel-control
            class="carousel-dot h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none"
            :class="index === current ? 'carousel-dot-active w-6' : 'w-2.5'"
            role="tab"
            :aria-selected="index === current ? 'true' : 'false'"
            :aria-label="t('home.carouselGoToSlide', { current: index + 1, total: slideCount, name: slideLabel(slide) })"
            @click="goTo(index)"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/*
 * Banner cover knobs — edit the custom properties on .banner-root.
 * --home-banner-poster-max-width: max width of the cover IMAGE only (not the carousel).
 *   Examples: 900px, 1100px, 1400px, or 100% for no cap.
 * --home-banner-stage-bg: stage/page-matching background (dark #05070d, light --color-neutral-50).
 * --home-banner-side-fade-width: how far the left/right fades run inward from the image edges.
 * --home-banner-readability-mid / --home-banner-readability-end: tall bottom fade while the cover is full-bleed.
 * --home-banner-readability-mid-capped / --home-banner-readability-end-capped: shorter fade once the stage
 *   is wider than --home-banner-poster-max-width and side background appears.
 * --home-banner-ink / --home-banner-chip-bg / --home-banner-chip-ring: type and chips in each theme.
 */
.banner-root {
  --home-banner-poster-max-width: 1100px;
  --home-banner-stage-bg: #05070d;
  --home-banner-ink: #f4f4f5;
  --home-banner-side-fade-width: clamp(2.5rem, 12vw, 6rem);
  --home-banner-readability-mid: 42%;
  --home-banner-readability-end: 78%;
  --home-banner-readability-mid-capped: 26%;
  --home-banner-readability-end-capped: 48%;
  --home-banner-chip-bg: rgb(0 0 0 / 0.4);
  --home-banner-chip-ring: rgb(255 255 255 / 0.18);
  color: var(--home-banner-ink);
}

.poster-stage {
  background-color: var(--home-banner-stage-bg);
  container-type: inline-size;
  container-name: banner-stage;
}

.poster-frame {
  position: relative;
  width: 100%;
  max-width: var(--home-banner-poster-max-width);
  height: 100%;
  margin-inline: auto;
}

.poster-image {
  display: block;
  width: 100%;
  height: 100%;
}

.poster-side-fade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, var(--home-banner-stage-bg) 0%, transparent var(--home-banner-side-fade-width)),
    linear-gradient(to left, var(--home-banner-stage-bg) 0%, transparent var(--home-banner-side-fade-width));
}

.poster-readability-mask {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* 0 when the cover is full-bleed, 1 once the stage is wider than the image cap. */
  --home-banner-poster-is-capped: clamp(
    0,
    (100cqi - var(--home-banner-poster-max-width)) / 1px,
    1
  );
  --home-banner-readability-mid-used: calc(
    var(--home-banner-readability-mid)
    - var(--home-banner-poster-is-capped)
      * (var(--home-banner-readability-mid) - var(--home-banner-readability-mid-capped))
  );
  --home-banner-readability-end-used: calc(
    var(--home-banner-readability-end)
    - var(--home-banner-poster-is-capped)
      * (var(--home-banner-readability-end) - var(--home-banner-readability-end-capped))
  );
  background-image: linear-gradient(
    to top,
    color-mix(in oklab, var(--home-banner-stage-bg) 90%, transparent) 0%,
    color-mix(in oklab, var(--home-banner-stage-bg) 48%, transparent) var(--home-banner-readability-mid-used),
    transparent var(--home-banner-readability-end-used)
  );
}

.banner-chip {
  background-color: var(--home-banner-chip-bg);
  color: var(--home-banner-ink);
  box-shadow: 0 0 0 1px var(--home-banner-chip-ring);
}

.banner-slide-link:focus-visible {
  box-shadow: 0 0 0 2px var(--home-banner-ink);
}

.carousel-dot {
  background-color: color-mix(in oklab, var(--home-banner-ink) 45%, transparent);
}

.carousel-dot:hover {
  background-color: color-mix(in oklab, var(--home-banner-ink) 80%, transparent);
}

.carousel-dot-active {
  background-color: var(--home-banner-ink);
}

.carousel-dot:focus-visible {
  box-shadow: 0 0 0 2px var(--home-banner-ink);
}

.carousel-slide.is-motion {
  transition: transform 500ms cubic-bezier(0.33, 0, 0.2, 1);
}

.carousel-arrows {
  display: none;
}

@media (hover: hover) and (pointer: fine) {
  .carousel-arrows {
    display: flex;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }
  .carousel-arrows button {
    pointer-events: none;
  }
  .banner-root:hover .carousel-arrows,
  .banner-root:has(:focus-visible) .carousel-arrows {
    opacity: 1;
  }
  .banner-root:hover .carousel-arrows button,
  .banner-root:has(:focus-visible) .carousel-arrows button {
    pointer-events: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .carousel-slide.is-motion {
    transition: none;
  }
  .carousel-arrows {
    transition: none;
  }
}
</style>

<style>
/* Unscoped so light-theme variables attach to .banner-root, not only to html. */
html:not(.dark) .banner-root {
  --home-banner-stage-bg: var(--color-neutral-50);
  --home-banner-ink: var(--color-neutral-900);
  --home-banner-chip-bg: rgb(255 255 255 / 0.78);
  --home-banner-chip-ring: rgb(0 0 0 / 0.14);
}
</style>
