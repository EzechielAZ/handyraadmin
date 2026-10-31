import React from 'react'
import styles from './Tabs.module.css'

const Tabs = ({ tabs = [], activeTab, onChange, className = '' }) => (
  <div className={[styles.tabs, className].filter(Boolean).join(' ')} role="tablist">
    {tabs.map((tab) => {
      const Icon = tab.icon
      const isActive = activeTab === tab.id
      const badge = tab.badge ?? tab.count

      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          className={[styles.tab, isActive && styles.active].filter(Boolean).join(' ')}
          onClick={() => onChange?.(tab.id)}
        >
          {Icon && <Icon size={14} className={styles.icon} />}
          <span>{tab.label}</span>
          {badge !== undefined && badge !== null && (
            <span className={styles.badge}>{badge}</span>
          )}
        </button>
      )
    })}
  </div>
)

export default Tabs