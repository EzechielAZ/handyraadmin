import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Bell, Search, Menu, ChevronDown, Settings, User, LogOut, HelpCircle, X,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import styles from './TopBar.module.css'

const TopBar = () => {
  const [searchValue, setSearchValue] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [now, setNow] = useState(new Date())

  const notifRef = useRef(null)
  const profileRef = useRef(null)

  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { toggleSidebar } = useUIStore()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const getPageTitle = () => {
    const p = location.pathname
    if (p === '/dashboard')             return 'Tableau de bord'
    if (p.startsWith('/artisans'))      return 'Artisans'
    if (p.startsWith('/missions'))      return 'Missions'
    if (p.startsWith('/users'))         return 'Utilisateurs'
    if (p.startsWith('/payments'))      return 'Paiements'
    if (p.startsWith('/hpo'))           return 'HPO'
    if (p.startsWith('/hardware'))      return 'Quincailleries'
    if (p.startsWith('/reports'))       return 'Rapports'
    if (p.startsWith('/subscriptions')) return 'Abonnements'
    if (p.startsWith('/settings'))      return 'Paramètres'
    return 'Handyra Admin'
  }

  const title = getPageTitle()

  const notifications = [
    { id: 1, title: 'Nouvel artisan inscrit',          time: '5 min',    read: false },
    { id: 2, title: 'Mission terminée #M123',          time: '1 heure',  read: false },
    { id: 3, title: 'Paiement reçu · 50 000 F',        time: '2 heures', read: true  },
    { id: 4, title: 'Rapport hebdomadaire disponible', time: '1 jour',   read: true  },
  ]
  const unread = notifications.filter((n) => !n.read).length

  const getInitials = (name) => {
    if (!name) return 'A'
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  }

  const fmtTime = (d) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const fmtDate = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuBtn}
          onClick={toggleSidebar}
          aria-label="Basculer la navigation"
        >
          <Menu size={16} />
        </button>

        <h1 className={styles.pageTitle}>{title}</h1>
      </div>

      <div className={styles.right}>
        {/* Search */}
        <div className={styles.search}>
          <Search size={12} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Rechercher…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            aria-label="Rechercher"
          />
          {searchValue ? (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => setSearchValue('')}
              aria-label="Effacer"
            >
              <X size={11} />
            </button>
          ) : (
            <kbd className={styles.kbd}>⌘K</kbd>
          )}
        </div>

        <div className={styles.sep} />

        {/* Notifications */}
        <div ref={notifRef} className={styles.popoverWrap}>
          <button
            type="button"
            className={[styles.iconBtn, notifOpen && styles.iconBtnActive]
              .filter(Boolean).join(' ')}
            onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false) }}
            aria-label="Notifications"
          >
            <Bell size={15} strokeWidth={1.8} />
            {unread > 0 && <span className={styles.dot}>{unread}</span>}
          </button>

          {notifOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHead}>
                <span className={styles.dropdownTitle}>Notifications</span>
                <span className={styles.unreadPill}>{unread} non lues</span>
              </div>
              <div className={styles.notifList}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={[styles.notifItem, !n.read && styles.notifUnread]
                      .filter(Boolean).join(' ')}
                  >
                    <div className={styles.notifDot} />
                    <div className={styles.notifBody}>
                      <div className={styles.notifTitle}>{n.title}</div>
                      <div className={styles.notifTime}>Il y a {n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.dropdownFoot}>
                <button type="button" className={styles.footBtn}>Voir tout</button>
              </div>
            </div>
          )}
        </div>

        {/* Clock */}
        <div className={styles.clock}>
          <span className={styles.clockTime}>{fmtTime(now)}</span>
          <span className={styles.clockDate}>{fmtDate(now)}</span>
        </div>

        <div className={styles.sep} />

        {/* Profile */}
        <div ref={profileRef} className={styles.popoverWrap}>
          <button
            type="button"
            className={[styles.profileBtn, profileOpen && styles.profileBtnActive]
              .filter(Boolean).join(' ')}
            onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false) }}
          >
            <span className={styles.avatar}>{getInitials(user?.full_name)}</span>
            <span className={styles.profileMeta}>
              <span className={styles.profileName}>
                {user?.full_name?.split(' ')[0] || 'Admin'}
              </span>
              <span className={styles.profileRole}>
                {user?.user_role || 'Administrateur'}
              </span>
            </span>
            <ChevronDown
              size={12}
              className={[styles.chevron, profileOpen && styles.chevronUp]
                .filter(Boolean).join(' ')}
            />
          </button>

          {profileOpen && (
            <div className={[styles.dropdown, styles.dropdownProfile].join(' ')}>
              <div className={styles.profileHead}>
                <span className={styles.profileAvatarLg}>
                  {getInitials(user?.full_name)}
                </span>
                <div className={styles.profileInfo}>
                  <strong>{user?.full_name || 'Administrateur'}</strong>
                  <span>{user?.email || 'admin@handyra.com'}</span>
                </div>
              </div>

              <div className={styles.menuSection}>
                <button type="button" className={styles.menuItem}>
                  <User size={13} /><span>Mon profil</span>
                </button>
                <button type="button" className={styles.menuItem}>
                  <Settings size={13} /><span>Paramètres</span>
                </button>
                <button type="button" className={styles.menuItem}>
                  <HelpCircle size={13} /><span>Aide &amp; Support</span>
                </button>
              </div>

              <div className={styles.menuDivider} />

              <div className={styles.menuSection}>
                <button
                  type="button"
                  className={[styles.menuItem, styles.menuItemDanger].join(' ')}
                  onClick={logout}
                >
                  <LogOut size={13} /><span>Déconnexion</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default TopBar