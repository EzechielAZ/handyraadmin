import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut, Search } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { mainNavigation, secondaryNavigation } from '../../constants/nav'
import styles from './Sidebar.module.css'

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState({})
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const allNavItems = [...mainNavigation, ...secondaryNavigation]
  const filteredNavItems = allNavItems.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true
    if (!user?.user_role) return false
    return item.roles.includes(user.user_role)
  })

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) setMobileOpen((v) => !v)
    else setCollapsed((v) => !v)
  }

  const toggleGroup = (id) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const getInitials = (name) => {
    if (!name) return 'A'
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  }

  const sidebarClasses = [
    styles.sidebar,
    collapsed && styles.collapsed,
    mobileOpen && styles.mobileOpen,
  ].filter(Boolean).join(' ')

  return (
    <>
      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      <aside className={sidebarClasses} aria-label="Navigation principale">
        {/* ── Header ── */}
        <div
          className={styles.header}
          onClick={collapsed ? toggleSidebar : undefined}
          style={{ cursor: collapsed ? 'pointer' : 'default' }}
          title={collapsed ? 'Déplier la navigation' : undefined}
        >
          <div className={styles.brand}>
            <div className={styles.brandMark} aria-hidden="true">H</div>
            {!collapsed && (
              <div className={styles.brandText}>
                <span className={styles.brandName}>Handyra</span>
                <span className={styles.brandSub}>Admin</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={(e) => { e.stopPropagation(); toggleSidebar() }}
              aria-label="Réduire la navigation"
            >
              <ChevronLeft size={14} />
            </button>
          )}
        </div>

        {/* ── Search ── */}
        {!collapsed && (
          <div className={styles.searchWrap}>
            <div className={styles.search}>
              <Search size={12} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Rechercher…"
                aria-label="Rechercher"
              />
              <kbd className={styles.kbd}>⌘K</kbd>
            </div>
          </div>
        )}

        {/* ── Nav ── */}
        <nav className={styles.nav}>
          {filteredNavItems.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyTitle}>Aucun menu</span>
              {!collapsed && (
                <span className={styles.emptyHint}>
                  {user?.user_role || 'Rôle non défini'}
                </span>
              )}
            </div>
          ) : (
            filteredNavItems.map((item) => {
              const Icon = item.icon
              const hasChildren = item.children && item.children.length > 0
              const isGroupOpen = expandedGroups[item.id]

              return (
                <div key={item.id} className={styles.navGroup}>
                  {collapsed && (
                    <span className={styles.tooltip}>{item.label}</span>
                  )}

                  <NavLink
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) =>
                      [styles.navItem, isActive && styles.active]
                        .filter(Boolean).join(' ')
                    }
                    onClick={(e) => {
                      if (hasChildren) {
                        e.preventDefault()
                        toggleGroup(item.id)
                      }
                    }}
                  >
                    <span className={styles.iconWrap}>
                      <Icon size={15} strokeWidth={1.8} />
                    </span>

                    {!collapsed && (
                      <>
                        <span className={styles.navLabel}>{item.label}</span>
                        <span className={styles.navMeta}>
                          {item.badge && (
                            <span className={styles.badge}>{item.badge}</span>
                          )}
                          {hasChildren && (
                            <ChevronRight
                              size={11}
                              className={[
                                styles.chevron,
                                isGroupOpen && styles.chevronOpen,
                              ].filter(Boolean).join(' ')}
                            />
                          )}
                        </span>
                      </>
                    )}
                  </NavLink>

                  {!collapsed && hasChildren && isGroupOpen && (
                    <div className={styles.subMenu}>
                      {item.children.map((child) => (
                        <NavLink
                          key={child.id}
                          to={child.path}
                          className={({ isActive }) =>
                            [styles.subItem, isActive && styles.subActive]
                              .filter(Boolean).join(' ')
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </nav>

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <div className={styles.userCard}>
            <div className={styles.avatar}>{getInitials(user?.full_name)}</div>
            {!collapsed && (
              <div className={styles.userMeta}>
                <span className={styles.userName}>
                  {user?.full_name || 'Administrateur'}
                </span>
                <span className={styles.userRole}>
                  {user?.user_role || 'Admin'}
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              className={styles.logoutBtn}
              onClick={logout}
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <LogOut size={14} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar