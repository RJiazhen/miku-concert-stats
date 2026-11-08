import { h } from 'vue'
import SortableHeader from '~/components/SortableHeader.vue'

/** Minimal column shape the header renderer needs; avoids TanStack's generics. */
type SortableColumn = {
  getIsSorted: () => false | 'asc' | 'desc'
  toggleSorting: (desc?: boolean) => void
}

/** How one header renders beyond its label. */
export type SortableHeaderOptions = {
  /** Full name behind an abbreviated label, shown as a tooltip on hover and focus. */
  tooltip?: string
}

/**
 * Returns a header renderer that prints the shared sortable button, so every table
 * in the site sorts through the same control as the song ranking.
 *
 * Use it as `header: sortableHeader('名次')` inside a column definition; pass
 * `{ tooltip }` when the column prints a short label for a narrow column.
 */
export const useSortableHeader = (): ((
  label: string,
  options?: SortableHeaderOptions,
) => (props: { column: SortableColumn }) => ReturnType<typeof h>) => {
  return (label: string, options: SortableHeaderOptions = {}) =>
    (props: { column: SortableColumn }) => h(SortableHeader, { label, column: props.column, tooltip: options.tooltip })
}
