import React from 'react'
import { useLocation } from 'react-router-dom'

const safeMessage = (error) => {
  try {
    return error?.message || String(error)
  } catch {
    return 'Erreur inconnue (objet non convertible en texte)'
  }
}

const safeStack = (error) => {
  try {
    return error?.stack || ''
  } catch {
    return ''
  }
}

class Boundary extends React.Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    // Un console.error personnalisé peut lui-même lever une exception : on l'isole
    try { console.error(error) } catch { /* ignoré */ }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div
        style={{
          margin: 24,
          padding: 16,
          border: '1px solid var(--danger-border, #fecaca)',
          background: 'var(--danger-subtle, #fef2f2)',
          color: 'var(--danger, #b91c1c)',
          borderRadius: 'var(--radius, 8px)',
          fontSize: 14,
        }}
      >
        <strong>Cette page a rencontré une erreur.</strong>
        <p style={{ margin: '8px 0', wordBreak: 'break-word' }}>{safeMessage(error)}</p>
        <pre
          style={{
            margin: 0,
            maxHeight: 220,
            overflow: 'auto',
            fontSize: 12,
            whiteSpace: 'pre-wrap',
          }}
        >
          {safeStack(error)}
        </pre>
      </div>
    )
  }
}

// Se réinitialise automatiquement quand on change de page
const ErrorBoundary = ({ children }) => {
  const { pathname } = useLocation()
  return <Boundary resetKey={pathname}>{children}</Boundary>
}

export default ErrorBoundary