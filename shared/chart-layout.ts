import type { ComputedRef, InjectionKey } from 'vue'

/** Layout a parent chart card provides to the plot inside it. */
export type ChartLayout = {
  /** When true, the drawing width equals the container even if that is under the usual minimum. */
  fitToContainer: boolean
}

/** Injection key for the chart card layout. */
export const chartLayoutKey: InjectionKey<ComputedRef<ChartLayout>> = Symbol('chartLayout')

/**
 * Width of a year-banded SVG.
 * The usual drawing keeps a 720px / per-year floor and may overflow the column;
 * a fitted layout uses only the measured container width so fullscreen can avoid
 * horizontal scrolling.
 */
export const chartDrawingWidth = ({
  fitToContainer,
  elementWidth,
  minWidth,
  slotPixels,
}: {
  fitToContainer: boolean
  elementWidth: number
  minWidth: number
  slotPixels: number
}): number => {
  if (fitToContainer && elementWidth > 0) return elementWidth
  return Math.max(minWidth, slotPixels, elementWidth)
}

/** Overflow classes for the SVG wrapper: no horizontal scroll when fitted. */
export const chartOverflowClass = (fitToContainer: boolean): string =>
  fitToContainer ? '-mx-1 overflow-x-hidden px-1' : '-mx-1 overflow-x-auto px-1'
