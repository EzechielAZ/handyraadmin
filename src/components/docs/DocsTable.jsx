/**
 * Table docs : sticky header, tri, sélection, loading skeleton,
 * empty state intégré, clic ligne pour ouvrir le drawer.
 *
 * Colonnes : [{ id, header, accessor, cell, sortable, width, align }]
 *   - `accessor` : string (clé row) ou fn(row) → valeur
 *   - `cell`     : ({ row, value, index }) → ReactNode
 *   - `align`    : 'left' | 'center' | 'right'
 */

import { useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { DocsEmptyState } from './DocsEmptyState'
import styles from './DocsTable.module.css'

const getValue = (row, col) => {
  if (!col?.accessor) return undefined
  return typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]
}

const SortIcon = ({ active, order }) => {
  if (!active) return <ChevronsUpDown size={11} className={styles.sortIconIdle} />
  return order === 'asc'
    ? <ChevronUp size={11} className={styles.sortIconActive} />
    : <ChevronDown size={11} className={styles.sortIconActive} />
}

export const DocsTable = ({
  columns,
  data = [],
  rowKey = 'id',
  onRowClick,
  loading = false,
  sorting,             // { field, order } — order: 'asc' | 'desc'
  onSort,              // (field, nextOrder) => void
  empty,               // ReactNode custom pour l'empty state
  emptyTitle = 'Aucun élément',
  emptyDescription,
  emptyAction,
  stickyHeader = true,
  compact = false,
  className,
}) => {
  const keyOf = useMemo(
    () => (typeof rowKey === 'function' ? rowKey : (row) => row?.[rowKey]),
    [rowKey],
  )

  const handleSort = (col) => {
    if (!col.sortable || !onSort) return
    const isActive = sorting?.field === col.id
    const next = !isActive ? 'asc' : sorting.order === 'asc' ? 'desc' : 'asc'
    onSort(col.id, next)
  }

  if (!loading && data.length === 0) {
    return empty || (
      <DocsEmptyState
        icon="Package"
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  return (
    <div className={`${styles.wrap} ${className || ''}`}>
      <table className={`${styles.table} ${compact ? styles.compact : ''}`}>
        <thead className={stickyHeader ? styles.sticky : ''}>
          <tr>
            {columns.map((col) => {
              const isActive = sorting?.field === col.id
              return (
                <th
                  key={col.id}
                  className={[
                    col.sortable && styles.sortable,
                    col.align && styles[`align${col.align[0].toUpperCase()}${col.align.slice(1)}`],
                  ].filter(Boolean).join(' ')}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col) : undefined}
                  scope="col"
                >
                  <span className={styles.thInner}>
                    {col.header}
                    {col.sortable && (
                      <SortIcon active={isActive} order={sorting?.order} />
                    )}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {loading && data.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className={styles.skeletonRow}>
                  {columns.map((col) => (
                    <td key={col.id}>
                      <span className={styles.skeleton} />
                    </td>
                  ))}
                </tr>
              ))
            : data.map((row, index) => {
                const key = keyOf(row) ?? index
                return (
                  <tr
                    key={key}
                    className={[onRowClick && styles.clickable].filter(Boolean).join(' ')}
                    onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onRowClick(row, index)
                            }
                          }
                        : undefined
                    }
                  >
                    {columns.map((col) => {
                      const value = getValue(row, col)
                      const alignClass = col.align
                        ? styles[`align${col.align[0].toUpperCase()}${col.align.slice(1)}`]
                        : ''
                      return (
                        <td key={col.id} className={alignClass}>
                          {col.cell ? col.cell({ row, value, index }) : value ?? '—'}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
        </tbody>
      </table>
    </div>
  )
}

export default DocsTable