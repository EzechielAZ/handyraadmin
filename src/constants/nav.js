import {
  LayoutDashboard,
  Users,
  Briefcase,
  UserCircle,
  CreditCard,
  HardHat,
  Store,
  FileText,
  Settings,
  Settings2,
  Gift,
  BarChart3,
  Shield,
  Truck,
  Award,
  Calendar,
  MessageSquare,
  Bell,
  HelpCircle,
  LogOut,
  Layers,
  BookOpen,
} from 'lucide-react'

/*
 * Visibilité des menus :
 *  - `permissions` : l'item est visible si l'utilisateur possède AU MOINS UNE de ces permissions
 *    (voir getPermissionsForRole dans store/authStore.js)
 *  - sans `permissions` : visible pour tout administrateur connecté
 *
 * Rôles admin (admin.roles) : SUPER_ADMIN, ADMIN, MODERATOR, FINANCE, OPERATIONS
 */

// ─── Navigation principale ───
export const mainNavigation = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    path: '/dashboard',
    permissions: ['view_dashboard'],
  },
  {
    id: 'artisans',
    label: 'Artisans',
    icon: Users,
    path: '/artisans',
    permissions: ['manage_artisans'],
    badge: 'KYCs en attente',
  },
  {
    id: 'missions',
    label: 'Missions',
    icon: Briefcase,
    path: '/missions',
    permissions: ['manage_missions', 'view_missions'],
  },
  {
    id: 'users',
    label: 'Clients',
    icon: UserCircle,
    path: '/users',
    permissions: ['manage_users'],
  },
  {
    id: 'payments',
    label: 'Paiements',
    icon: CreditCard,
    path: '/payments',
    permissions: ['manage_payments', 'view_payments'],
  },
  {
    id: 'hpo',
    label: 'HPO',
    icon: HardHat,
    path: '/hpo',
    permissions: ['manage_hpo'],
    children: [
      {
        id: 'supervisors',
        label: 'Superviseurs',
        path: '/hpo/supervisors',
      },
      {
        id: 'agents',
        label: 'Agents HPO',
        path: '/hpo/agents',
      },
      {
        id: 'contracts',
        label: 'Contrats',
        path: '/hpo/contracts',
      },
    ],
  },
  {
    id: 'hardware',
    label: 'Quincailleries',
    icon: Store,
    path: '/hardware',
    permissions: ['manage_hardware'],
  },
  {
    id: 'reports',
    label: 'Rapports',
    icon: FileText,
    path: '/reports',
    permissions: ['view_reports', 'manage_reports'],
  },
  {
    id: 'subscriptions',
    label: 'Abonnements',
    icon: Gift,
    path: '/subscriptions',
    permissions: ['manage_subscriptions', 'view_subscriptions'],
  },
  {
    id: 'categories',
    label: 'Catégories',
    icon: Layers,
    path: '/categories',
    permissions: ['view_categories', 'manage_categories'],
  },
  {
    id: 'docs',
    label: 'Documentation',
    icon: BookOpen,
    path: '/docs',
    permissions: [
      'view_docs',
      'manage_docs',
      'manage_features',
      'manage_releases',
      'manage_issues',
      'manage_pages',
      'manage_adrs',
      'manage_runbooks',
      'manage_glossary',
    ],
    children: [
      { id: 'docs-features', label: 'Features',   path: '/docs/features' },
      { id: 'docs-releases', label: 'Releases',   path: '/docs/releases' },
      { id: 'docs-issues',   label: 'Issues',     path: '/docs/issues' },
      { id: 'docs-pages',    label: 'Pages',      path: '/docs/pages' },
      { id: 'docs-adrs',     label: 'ADRs',       path: '/docs/adrs' },
      { id: 'docs-runbooks', label: 'Runbooks',   path: '/docs/runbooks' },
      { id: 'docs-glossary', label: 'Glossaire',  path: '/docs/glossary' },
      { id: 'docs-activity', label: 'Activité',   path: '/docs/activity' },
    ],
  },
]

// ─── Navigation secondaire ───
export const secondaryNavigation = [
  {
    id: 'app-settings',
    label: 'Paramètres app',
    icon: Settings2,
    path: '/app-settings',
    permissions: ['manage_app_settings'],
  },
  {
    id: 'analytics',
    label: 'Analytiques',
    icon: BarChart3,
    path: '/analytics',
    permissions: ['view_analytics'],
  },
  {
    id: 'security',
    label: 'Sécurité',
    icon: Shield,
    path: '/security',
    permissions: ['manage_security'],
  },
  {
    id: 'logistics',
    label: 'Logistique',
    icon: Truck,
    path: '/logistics',
    permissions: ['manage_hardware', 'manage_missions'],
  },
  {
    id: 'badges',
    label: 'Badges',
    icon: Award,
    path: '/badges',
    permissions: ['manage_artisans'],
  },
  {
    id: 'calendar',
    label: 'Calendrier',
    icon: Calendar,
    path: '/calendar',
    permissions: ['manage_missions', 'view_missions'],
  },
]

// ─── Navigation utilisateur ───
export const userNavigation = [
  {
    id: 'profile',
    label: 'Mon profil',
    icon: UserCircle,
    path: '/profile',
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageSquare,
    path: '/messages',
    badge: 3,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    path: '/notifications',
    badge: 5,
  },
  {
    id: 'settings',
    label: 'Paramètres',
    icon: Settings,
    path: '/settings',
    permissions: ['view_settings', 'manage_settings'],
  },
  {
    id: 'help',
    label: 'Aide',
    icon: HelpCircle,
    path: '/help',
  },
  {
    id: 'logout',
    label: 'Déconnexion',
    icon: LogOut,
    path: '/logout',
    divider: true,
  },
]

// ─── Navigation par rôle admin ───
const byIds = (ids) =>
  [...mainNavigation, ...secondaryNavigation].filter((item) => ids.includes(item.id))

export const roleBasedNavigation = {
  SUPER_ADMIN: [...mainNavigation, ...secondaryNavigation],
  ADMIN: byIds([
    'dashboard', 'artisans', 'missions', 'users', 'payments', 'hpo', 'hardware',
    'reports', 'subscriptions', 'categories', 'docs',
    'logistics', 'badges', 'calendar',
  ]),
  MODERATOR: byIds([
    'dashboard', 'artisans', 'missions', 'users', 'reports', 'badges', 'calendar', 'docs',
  ]),
  FINANCE: byIds(['dashboard', 'payments', 'subscriptions', 'reports', 'docs']),
  OPERATIONS: byIds([
    'dashboard', 'artisans', 'missions', 'hpo', 'hardware', 'reports',
    'docs', 'logistics', 'badges', 'calendar',
  ]),
}

// ─── Breadcrumbs ───
export const breadcrumbs = {
  '/dashboard': [{ label: 'Tableau de bord' }],

  '/artisans': [{ label: 'Artisans', path: '/artisans' }],
  '/artisans/:id': [
    { label: 'Artisans', path: '/artisans' },
    { label: 'Détails artisan' },
  ],

  '/missions': [{ label: 'Missions', path: '/missions' }],
  '/missions/:id': [
    { label: 'Missions', path: '/missions' },
    { label: 'Détails mission' },
  ],

  '/users': [{ label: 'Clients', path: '/users' }],
  '/users/:id': [
    { label: 'Clients', path: '/users' },
    { label: 'Détails client' },
  ],

  '/payments': [{ label: 'Paiements', path: '/payments' }],

  '/hpo': [{ label: 'HPO', path: '/hpo' }],
  '/hpo/supervisors': [
    { label: 'HPO', path: '/hpo' },
    { label: 'Superviseurs' },
  ],
  '/hpo/agents': [
    { label: 'HPO', path: '/hpo' },
    { label: 'Agents HPO' },
  ],
  '/hpo/contracts': [
    { label: 'HPO', path: '/hpo' },
    { label: 'Contrats' },
  ],

  '/hardware': [{ label: 'Quincailleries', path: '/hardware' }],

  '/reports': [{ label: 'Rapports', path: '/reports' }],

  '/subscriptions': [{ label: 'Abonnements', path: '/subscriptions' }],

  '/categories': [{ label: 'Catégories', path: '/categories' }],

  '/app-settings': [{ label: 'Paramètres app', path: '/app-settings' }],

  '/profile': [{ label: 'Profil', path: '/profile' }],

  '/messages': [{ label: 'Messages', path: '/messages' }],

  '/notifications': [{ label: 'Notifications', path: '/notifications' }],

  '/settings': [{ label: 'Paramètres', path: '/settings' }],

  '/help': [{ label: 'Aide', path: '/help' }],

  // ─── Documentation ───
  '/docs': [{ label: 'Documentation', path: '/docs' }],
  '/docs/features': [
    { label: 'Documentation', path: '/docs' },
    { label: 'Features' },
  ],
  '/docs/features/:ref': [
    { label: 'Documentation', path: '/docs' },
    { label: 'Features', path: '/docs/features' },
    { label: 'Détails feature' },
  ],
  '/docs/releases': [
    { label: 'Documentation', path: '/docs' },
    { label: 'Releases' },
  ],
  '/docs/releases/:ref': [
    { label: 'Documentation', path: '/docs' },
    { label: 'Releases', path: '/docs/releases' },
    { label: 'Détails release' },
  ],
  '/docs/issues': [
    { label: 'Documentation', path: '/docs' },
    { label: 'Issues' },
  ],
  '/docs/issues/:ref': [
    { label: 'Documentation', path: '/docs' },
    { label: 'Issues', path: '/docs/issues' },
    { label: 'Détails issue' },
  ],
  '/docs/pages': [
    { label: 'Documentation', path: '/docs' },
    { label: 'Pages' },
  ],
  '/docs/pages/:ref': [
    { label: 'Documentation', path: '/docs' },
    { label: 'Pages', path: '/docs/pages' },
    { label: 'Détails page' },
  ],
  '/docs/adrs': [
    { label: 'Documentation', path: '/docs' },
    { label: 'ADRs' },
  ],
  '/docs/adrs/:ref': [
    { label: 'Documentation', path: '/docs' },
    { label: 'ADRs', path: '/docs/adrs' },
    { label: 'Détails ADR' },
  ],
  '/docs/runbooks': [
    { label: 'Documentation', path: '/docs' },
    { label: 'Runbooks' },
  ],
  '/docs/glossary': [
    { label: 'Documentation', path: '/docs' },
    { label: 'Glossaire' },
  ],
  '/docs/activity': [
    { label: 'Documentation', path: '/docs' },
    { label: 'Activité' },
  ],
}

export default mainNavigation