/**
 * Error boundary + état d'erreur inline.
 * - `DocsErrorBoundary` : class component, wrap les pages
 * - `DocsErrorState`    : composant inline pour les erreurs de query
 *                         (utilisable sans crasher l'arbre)
 */

import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { getDocsErrorMessage } from '../../lib/docsErrors'
import styles from './DocsErrorBoundary.module.css'

/* ─── État d'erreur inline (fonctionnel) ─── */
export const DocsErrorState = ({
  error,
  title = 'Impossible de charger les données',
  onRetry,
  retryLabel = 'Réessayer',
  compact = false,
}) => (
  <div className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
    <div className={styles.iconDisc} aria-hidden="true">
      <AlertTriangle size={22} strokeWidth={2} />
    </div>
    <h3 className={styles.title}>{title}</h3>
    <p className={styles.message}>{getDocsErrorMessage(error)}</p>
    {error?.code && <code className={styles.code}>{error.code}</code>}
    {onRetry && (
      <button type="button" className={styles.action} onClick={onRetry}>
        <RotateCcw size={13} />
        {retryLabel}
      </button>
    )}
  </div>
)

/* ─── Boundary (class) ─── */
export class DocsErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[DocsErrorBoundary]', error, info)
    if (typeof this.props.onError === 'function') this.props.onError(error, info)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          reset: this.reset,
        })
      }
      return (
        <div className={styles.pageWrap}>
          <DocsErrorState
            error={this.state.error}
            title="Une erreur inattendue est survenue"
            onRetry={this.reset}
            retryLabel="Réessayer"
          />
        </div>
      )
    }
    return this.props.children
  }
}

export default DocsErrorBoundary