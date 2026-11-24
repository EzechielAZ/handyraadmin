/**
 * Pagination URL-driven.
 * Le composant ne stocke RIEN — tout est contrôlé via props.
 * Le parent gère `page` et `pageSize` (via useSearchParams).
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './DocsPagination.module.css'

export const DocsPagination = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const go = (p) => {
    const clamped = Math.min(Math.max(1, p), totalPages)
    if (clamped !== page) onPageChange(clamped)
  }

  return (
    <div className={styles.bar}>
      <span className={styles.info}>
        {total === 0
          ? 'Aucun résultat'
          : `${start}–${end} sur ${total.toLocaleString('fr-FR')}`}
      </span>

      <div className={styles.controls}>
        {onPageSizeChange && (
          <label className={styles.sizeWrap}>
            <span className={styles.sizeLabel}>Lignes</span>
            <select
              className={styles.sizeSelect}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Éléments par page"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}

        <div className={styles.pager}>
          <button
            type="button"
            className={styles.btn}
            onClick={() => go(page - 1)}
            disabled={page <= 1}
            aria-label="Page précédente"
          >
            <ChevronLeft size={14} />
          </button>
          <span className={styles.pageLabel}>
            Page <strong>{page}</strong> / {totalPages}
          </span>
          <button
            type="button"
            className={styles.btn}
            onClick={() => go(page + 1)}
            disabled={page >= totalPages}
            aria-label="Page suivante"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default DocsPagination