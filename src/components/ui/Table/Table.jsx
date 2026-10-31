import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, Search } from 'lucide-react'
import Input from '../Input/Input'
import Spinner from '../Spinner/Spinner'
import EmptyState from '../EmptyState/EmptyState'
import styles from './Table.module.css'

const resolveValue = (row, col) => {
  if (typeof col.accessor === 'function') {
    try { return col.accessor(row) } catch (e) { console.error('accessor error', col.id, e); return undefined }
  }
  if (typeof col.accessor === 'string') return row?.[col.accessor]
  if (typeof col.id === 'string') return row?.[col.id]
  return undefined
}

const normalizeColumn = (col, idx) => {
  const accessor = col.accessor
  const id = typeof col.id === 'string'
    ? col.id
    : (typeof accessor === 'string' ? accessor : `col_${idx}`)
  return {
    id,
    header:   col.header ?? col.Header ?? col.label ?? '',
    cell:     col.cell   ?? col.Cell   ?? null,
    accessor,
    width:    col.width,
    sortable: col.sortable !== false,
  }
}

const Table = ({
  columns = [],
  data = [],
  loading = false,
  pagination,
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  onRowClick,
  sortable = false,
  onSort,
  searchable = false,
  searchPlaceholder = 'Rechercher…',
  onSearch,
  emptyMessage = 'Aucune donnée disponible',
  rowKey = 'id',
  className = '',
}) => {
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const scrollRef = useRef(null)
  const [hScroll, setHScroll] = useState({
    visible: false, thumbWidth: 0, thumbLeft: 0, trackWidth: 0,
  })

  const cols = useMemo(() => columns.map((c, i) => normalizeColumn(c, i)), [columns])

  const page     = pagination?.currentPage ?? currentPage ?? 1
  const total    = pagination?.total ?? totalItems ?? data.length
  const size     = pagination?.pageSize ?? pageSize
  const pages    = pagination?.totalPages ?? (size ? Math.ceil(total / size) : 1)
  const changePage = pagination?.onPageChange ?? onPageChange

  /* ── Sync scrollbar custom avec scroll horizontal ── */
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const update = () => {
      const { scrollWidth, clientWidth, scrollLeft } = el
      const hasOverflow = scrollWidth > clientWidth + 1
      if (!hasOverflow) {
        setHScroll({ visible: false, thumbWidth: 0, thumbLeft: 0, trackWidth: 0 })
        return
      }
      const trackWidth = clientWidth
      const thumbWidth = Math.max((clientWidth / scrollWidth) * trackWidth, 40)
      const maxScrollLeft = scrollWidth - clientWidth
      const maxThumbLeft = trackWidth - thumbWidth
      const thumbLeft = maxScrollLeft > 0 ? (scrollLeft / maxScrollLeft) * maxThumbLeft : 0
      setHScroll({ visible: true, thumbWidth, thumbLeft, trackWidth })
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [data, cols])

  /* ── Drag du thumb ── */
  const onThumbMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const el = scrollRef.current
    if (!el) return

    const startX = e.clientX
    const startScrollLeft = el.scrollLeft
    const maxScrollLeft = el.scrollWidth - el.clientWidth
    const maxThumbLeft = hScroll.trackWidth - hScroll.thumbWidth
    const ratio = maxThumbLeft > 0 ? maxScrollLeft / maxThumbLeft : 1

    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'

    const onMove = (ev) => {
      el.scrollLeft = startScrollLeft + (ev.clientX - startX) * ratio
    }
    const onUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [hScroll])

  /* ── Click sur le track (hors thumb) → saut ── */
  const onTrackClick = useCallback((e) => {
    if (e.target !== e.currentTarget) return
    const el = scrollRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    el.scrollLeft = (el.scrollWidth - el.clientWidth) * percent
  }, [])

  const handleSort = (col) => {
    if (!sortable || !col.sortable) return
    const nextDir = sortCol === col.id && sortDir === 'asc' ? 'desc' : 'asc'
    setSortCol(col.id)
    setSortDir(nextDir)
    onSort?.(col.accessor ?? col.id, nextDir)
  }

  const handleSearch = (e) => {
    setSearch(e.target.value)
    onSearch?.(e.target.value)
  }

  if (loading && data.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loading}><Spinner size="lg" /></div>
      </div>
    )
  }

  const showPagination = pagination && pages > 1
  const showFooter = showPagination || hScroll.visible

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      {searchable && (
        <div className={styles.toolbar}>
          <Input
            size="sm"
            icon={Search}
            placeholder={searchPlaceholder}
            value={search}
            onChange={handleSearch}
          />
        </div>
      )}

      {data.length === 0 ? (
        <EmptyState title={emptyMessage} description="" />
      ) : (
        <div
          ref={scrollRef}
          className={[styles.scroll, loading && styles.scrollLoading].filter(Boolean).join(' ')}
        >
          {loading && (
            <div className={styles.overlaySpinner}><Spinner size="md" /></div>
          )}
          <table className={styles.table}>
            <thead>
              <tr>
                {cols.map((col) => (
                  <th
                    key={col.id}
                    style={col.width ? { width: col.width } : undefined}
                    className={[styles.th, sortable && col.sortable && styles.thSortable]
                      .filter(Boolean).join(' ')}
                    onClick={() => handleSort(col)}
                  >
                    <span className={styles.thInner}>
                      {typeof col.header === 'function' ? col.header() : col.header}
                      {sortable && col.sortable && (
                        <span className={styles.sortIcon}>
                          {sortCol === col.id
                            ? sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                            : <ArrowUp size={11} className={styles.sortIdle} />}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={row?.[rowKey] ?? i}
                  className={[styles.tr, onRowClick && styles.trClickable].filter(Boolean).join(' ')}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {cols.map((col) => {
                    const value = resolveValue(row, col)
                    let content
                    if (col.cell) {
                      try { content = col.cell({ value, row }) }
                      catch (e) { console.error('cell render error', col.id, e); content = '⚠' }
                    } else {
                      content = (value === null || value === undefined || value === '') ? '—' : value
                    }
                    return <td key={col.id} className={styles.td}>{content}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── STICKY FOOTER : scrollbar custom + pagination ─── */}
      {showFooter && (
        <div className={styles.stickyFooter}>
          {hScroll.visible && (
            <div
              className={styles.hscrollTrack}
              onClick={onTrackClick}
              role="scrollbar"
              aria-orientation="horizontal"
            >
              <div
                className={styles.hscrollThumb}
                style={{
                  width: hScroll.thumbWidth,
                  transform: `translateX(${hScroll.thumbLeft}px)`,
                }}
                onMouseDown={onThumbMouseDown}
              />
            </div>
          )}

          {showPagination && (
            <div className={styles.pagination}>
              <div className={styles.paginationInfo}>
                Page {page} sur {pages} · {total} résultats
              </div>
              <div className={styles.paginationControls}>
                <button className={styles.pageBtn} onClick={() => changePage(1)} disabled={page <= 1}><ChevronsLeft size={14} /></button>
                <button className={styles.pageBtn} onClick={() => changePage(page - 1)} disabled={page <= 1}><ChevronLeft size={14} /></button>
                <button className={styles.pageBtn} onClick={() => changePage(page + 1)} disabled={page >= pages}><ChevronRight size={14} /></button>
                <button className={styles.pageBtn} onClick={() => changePage(pages)} disabled={page >= pages}><ChevronsRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Table