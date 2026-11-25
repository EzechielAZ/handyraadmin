import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styles from './Markdown.module.css'

// Liens externes : nouvel onglet. Le HTML brut n'est PAS interprété (sûr par défaut).
const components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  ),
}

export const Markdown = ({ children, compact = false, className = '' }) => {
  if (!children || !String(children).trim()) return null
  return (
    <div className={[styles.md, compact && styles.compact, className].filter(Boolean).join(' ')}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {String(children)}
      </ReactMarkdown>
    </div>
  )
}

export default Markdown