import { X } from 'lucide-react'
import { Search } from 'lucide-react'
import { Input, Select } from '../ui'
import styles from './DocsFilters.module.css'

export const DocsFilters = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Rechercher…',
  filters = [],       // [{ key, label, value, options: [{value,label}], onChange, searchable }]
  onClear,
  activeCount = 0,
  right,
}) => (
  <div className={styles.bar}>
    <div className={styles.left}>
      <div className={styles.searchWrap}>
        <Input
          size="md"
          icon={Search}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {filters.map((f) => (
        <div key={f.key} className={styles.filterItem}>
          <Select
            size="md"
            options={f.options}
            value={f.value ?? 'all'}
            onChange={(v) => f.onChange(v === 'all' ? null : v)}
            searchable={f.searchable ?? f.options.length > 8}
            clearable={false}
            placeholder={f.placeholder || f.label}
          />
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