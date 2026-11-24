/**
 * Tooltip en portail (jamais clippé par overflow:hidden).
 * - Auto-flip au-dessus/en dessous du trigger
 * - Hover + focus accessibles
 * - Dismiss sur scroll/resize
 * - Supporte contenu simple (string) ou riche (ReactNode)
 *
 * Usage :
 *   <Tooltip content="Dernière mise à jour">
 *     <span>15 janv. 2026</span>
 *   </Tooltip>
 *
 *   <Tooltip
 *     content={
 *       <>
 *         <strong>Créée le</strong>
 *         <div>15 janv. 2026 · 14:32</div>
 *       </>
 *     }
 *   >
 *     <span>Détails</span>
 *   </Tooltip>
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './Tooltip.module.css'

export const Tooltip = ({
  content,
  children,
  placement = 'auto', // 'auto' | 'top' | 'bottom'
  delay = 0,
  maxWidth = 280,
  className,
}) => {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  const timerRef = useRef(null)

  const compute = () => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    const below =
      placement === 'bottom' ||
      (placement === 'auto' && r.top < 100)
    setPos({
      x: r.left + r.width / 2,
      y: below ? r.bottom : r.top,
      below,
    })
  }

  const show = () => {
    if (delay > 0) {
      timerRef.current = setTimeout(compute, delay)
    } else {
      compute()
    }
  }

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setPos(null)
  }

  useEffect(() => {
    if (!pos) return
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [pos])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  if (!content) return children

  return (
    <>
      <span
        ref={ref}
        className={`${styles.trigger} ${className || ''}`}
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={pos ? 'docs-tooltip' : undefined}
      >
        {children}
      </span>
      {pos && createPortal(
        <div
          id="docs-tooltip"
          role="tooltip"
          className={`${styles.tooltip} ${pos.below ? styles.below : styles.above}`}
          style={{
            left: pos.x,
            top: pos.y,
            maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
          }}
        >
          {typeof content === 'string' ? (
            <span className={styles.text}>{content}</span>
          ) : (
            content
          )}
        </div>,
        document.body,
      )}
    </>
  )
}

export default Tooltip