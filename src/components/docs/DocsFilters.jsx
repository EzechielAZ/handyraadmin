/**
 * Barre de filtres de page docs.
 * - Recherche avec debounce côté parent (via useDebounce)
 * - Filtres dropdown (native <select> stylé — peut être swap pour ui.Select)
 * - Compteur de filtres actifs + bouton "Effacer"
 * - Slot `right` pour boutons d'action (Rafraîchir, Nouveau)
 */

import { Search, X, ChevronDown } from 'lucide-react'
import styles from './DocsFilters.module.css'

export const DocsFilters = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Rechercher…',
  filters = [],       // [{ key, label, value, options: [{value,label}], onChange }]
  onClear,
  activeCount = 0,
  right,
  loading = false,
}) => (
  <div className={styles.bar}>
    <div className={styles.left}>
      <div className={styles.searchWrap}>
        <Search size={12} className={styles.searchIcon} />
        <input
          type="search"
          className={styles.searchInput}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Rechercher"
        />
        {search && (
          <button
            type="button"
            className={styles.searchClear}
            onClick={() => onSearchChange('')}
            aria-label="Effacer la recherche"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {filters.map((f) => (
        <div key={f.key} className={styles.filterItem}>
          <select
            className={styles.select}
            value={f.value ?? 'all'}
            onChange={(e) =>
              f.onChange(e.target.value === 'all' ? null : e.target.value)
            }
            aria-label={f.label}
            title={f.label}
          >
            {f.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown size={11} className={styles.selectChevron} aria-hidden="true" />
        </div>
      ))}

      {activeCount > 0 && (
        <button type="button" className={styles.clearBtn} onClick={onClear}>
          <X size={11} />
          Effacer ({activeCount})
        </button>
      )}
    </div>

    {right && <div className={styles.right}>{right}</div>}
  </div>
)

export default DocsFilters