import { h } from 'vue'
import SortableHeader from '~/components/SortableHeader.vue'

/** Minimal column shape the header renderer needs; avoids importing TanStack's generics. */
type SortableColumn = {
  getIsSorted: () => false | 'asc' | 'desc'
  toggleSorting: (desc?: boolean) => void
}

/**
 * Returns a header renderer that prints the shared sortable `UButton`, so every table
 * in the site sorts through the same control as the song ranking.
 *
 * Use it as `header: sortableHeader('名次')` inside a column definition.
 */
export const useSortableHeader = (): ((label: string) => (props: { column: SortableColumn }) => ReturnType<typeof h>) => {
  return (label: string) => (props: { column: SortableColumn }) => h(SortableHeader, { label, column: props.column })
}
