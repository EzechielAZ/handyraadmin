import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'
import styles from './ActionsMenu.module.css'

const GAP = 4      // espace entre le bouton et le menu
const MARGIN = 8   // marge minimale avec les bords de la fenêtre

const ActionsMenu = ({ items = [], align = 'right' }) => {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  /* ── Positionnement : fixed, calculé depuis le bouton, avec retournement ── */
  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return

    const t = trigger.getBoundingClientRect()
    const m = menu.getBoundingClientRect()

    const spaceBelow = window.innerHeight - t.bottom
    const spaceAbove = t.top
    const openUp = spaceBelow < m.height + GAP + MARGIN && spaceAbove > spaceBelow

    const top = openUp
      ? Math.max(MARGIN, t.top - m.height - GAP)
      : t.bottom + GAP

    let left = align === 'right' ? t.right - m.width : t.left
    left = Math.min(Math.max(MARGIN, left), window.innerWidth - m.width - MARGIN)

    setPos({ top, left, up: openUp })
  }, [open, align, items.length])

  /* ── Fermeture : clic extérieur, Échap, scroll, resize ── */
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onMouseDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      close()
    }
    const onEsc = (e) => { if (e.key === 'Escape') close() }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onEsc)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true) // capture : scroll de n'importe quel conteneur
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onEsc)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  const menu = open && (
    <div
      ref={menuRef}
      className={`${styles.menu} ${pos?.up ? styles.menuUp : ''}`}
      style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
      role="menu"
      // Un portail propage les événements React à l'arbre parent (ex. onClick de la ligne du tableau)
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={`sep-${i}`} className={styles.separator} />
        }
        const Icon = item.icon
        return (
          <button
            key={`${item.label}-${i}`}
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
  )

  return (
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical size={15} />
      </button>

      {menu && createPortal(menu, document.body)}
    </div>
  )
}

export default ActionsMenu