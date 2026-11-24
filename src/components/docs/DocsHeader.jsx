/**
 * Header de page docs : eyebrow + titre + description + actions.
 * Mirror du header Dashboard.
 */

import styles from './DocsHeader.module.css'

export const DocsHeader = ({
  eyebrow,
  title,
  description,
  actions,
  children,
}) => (
  <header className={styles.header}>
    <div className={styles.text}>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
      {children}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </header>
)

export default DocsHeader