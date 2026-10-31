import React, { useState, useEffect, useRef } from 'react'
import { MoreVertical } from 'lucide-react'
import styles from './ActionsMenu.module.css'

const ActionsMenu = ({ items = [], align = 'right' }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div className={`${styles.menu} ${align === 'right' ? styles.menuRight : ''}`} role="menu">
          {items.map((item, i) => {
            if (item.separator) {
              return <div key={`sep-${i}`} className={styles.separator} />
            }
            const Icon = item.icon
            return (
              <button
                key={item.label}
                type="button"
                className={`${styles.item} ${item.danger ? styles.itemDanger : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  item.onClick?.()
                }}
                role="menuitem"
              >
                {Icon && <Icon size={13} />}
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ActionsMenu