import {
  LayoutDashboard,
  Users,
  Briefcase,
  UserCircle,
  CreditCard,
  HardHat,
  Wrench,
  FileText,
  Settings,
  Gift,
  BarChart3,
  Shield,
  Truck,
  Store,
  Award,
  Calendar,
  MessageSquare,
  Bell,
  HelpCircle,
  LogOut,
} from 'lucide-react'

// Navigation principale
export const mainNavigation = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['ADMIN', 'SUPER_ADMIN', 'ARTISAN'], // ARTISAN ajouté
  },
  {
    id: 'artisans',
    label: 'Artisans',
    icon: Users,
    path: '/artisans',
    roles: ['ADMIN', 'SUPER_ADMIN', 'ARTISAN'], // ARTISAN ajouté
    badge: 'KYCs en attente',
  },
  {
    id: 'missions',
    label: 'Missions',
    icon: Briefcase,
    path: '/missions',
    roles: ['ADMIN', 'SUPER_ADMIN', 'ARTISAN'], // ARTISAN ajouté
  },
  {
    id: 'users',
    label: 'Clients',
    icon: UserCircle,
    path: '/users',
    roles: ['ADMIN', 'SUPER_ADMIN', 'ARTISAN'], // ARTISAN ajouté
  },
  {
    id: 'payments',
    label: 'Paiements',
    icon: CreditCard,
    path: '/payments',
    roles: ['ADMIN', 'FINANCE', 'SUPER_ADMIN', 'ARTISAN'], // ARTISAN ajouté
  },
  {
    id: 'hpo',
    label: 'HPO',
    icon: HardHat,
    path: '/hpo',
    roles: ['ADMIN', 'HPO_MANAGER', 'SUPER_ADMIN', 'ARTISAN'], // ARTISAN ajouté
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
    roles: ['ADMIN', 'SUPER_ADMIN', 'ARTISAN'], // ARTISAN ajouté
  },
  {
    id: 'reports',
    label: 'Rapports',
    icon: FileText,
    path: '/reports',
    roles: ['ADMIN', 'ANALYST', 'SUPER_ADMIN', 'ARTISAN'], // ARTISAN ajouté
  },
  {
    id: 'subscriptions',
    label: 'Abonnements',
    icon: Gift,
    path: '/subscriptions',
    roles: ['ADMIN', 'FINANCE', 'SUPER_ADMIN', 'ARTISAN'], // ARTISAN ajouté
  },
]

// Navigation secondaire
export const secondaryNavigation = [
  {
    id: 'analytics',
    label: 'Analytiques',
    icon: BarChart3,
    path: '/analytics',
    roles: ['ADMIN', 'ANALYST', 'SUPER_ADMIN', 'ARTISAN'], // ARTISAN ajouté
  },
  {
    id: 'security',
    label: 'Sécurité',
    icon: Shield,
    path: '/security',
    roles: ['SUPER_ADMIN', 'ARTISAN'], // ARTISAN ajouté
  },
  {
    id: 'logistics',
    label: 'Logistique',
    icon: Truck,
    path: '/logistics',
    roles: ['ADMIN', 'SUPER_ADMIN', 'ARTISAN'], // ARTISAN ajouté
  },
  {
    id: 'badges',
    label: 'Badges',
    icon: Award,
    path: '/badges',
    roles: ['ADMIN', 'SUPER_ADMIN', 'ARTISAN'], // ARTISAN ajouté
  },
  {
    id: 'calendar',
    label: 'Calendrier',
    icon: Calendar,
    path: '/calendar',
    roles: ['ADMIN', 'SUPER_ADMIN', 'ARTISAN'], // ARTISAN ajouté
  },
]

// Navigation utilisateur
export const userNavigation = [
  {
    id: 'profile',
    label: 'Mon profil',
    icon: UserCircle,
    path: '/profile',
    roles: ['ADMIN', 'SUPER_ADMIN', 'ARTISAN', 'FINANCE', 'HPO_MANAGER', 'ANALYST'], // Tous les rôles
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageSquare,
    path: '/messages',
    badge: 3,
    roles: ['ADMIN', 'SUPER_ADMIN', 'ARTISAN', 'FINANCE', 'HPO_MANAGER', 'ANALYST'], // Tous les rôles
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    path: '/notifications',
    badge: 5,
    roles: ['ADMIN', 'SUPER_ADMIN', 'ARTISAN', 'FINANCE', 'HPO_MANAGER', 'ANALYST'], // Tous les rôles
  },
  {
    id: 'settings',
    label: 'Paramètres',
    icon: Settings,
    path: '/settings',
    roles: ['ADMIN', 'SUPER_ADMIN', 'ARTISAN', 'FINANCE', 'HPO_MANAGER', 'ANALYST'], // Tous les rôles
  },
  {
    id: 'help',
    label: 'Aide',
    icon: HelpCircle,
    path: '/help',
    roles: ['ADMIN', 'SUPER_ADMIN', 'ARTISAN', 'FINANCE', 'HPO_MANAGER', 'ANALYST'], // Tous les rôles
  },
  {
    id: 'logout',
    label: 'Déconnexion',
    icon: LogOut,
    path: '/logout',
    divider: true,
    roles: ['ADMIN', 'SUPER_ADMIN', 'ARTISAN', 'FINANCE', 'HPO_MANAGER', 'ANALYST'], // Tous les rôles
  },
]

// Navigation par rôle
export const roleBasedNavigation = {
  ADMIN: [...mainNavigation, ...secondaryNavigation],
  SUPER_ADMIN: [...mainNavigation, ...secondaryNavigation],
  ARTISAN: [ // Nouvelle entrée pour ARTISAN
    ...mainNavigation.filter(item => 
      ['dashboard', 'missions', 'payments', 'reports', 'profile'].includes(item.id)
    ),
    ...secondaryNavigation.filter(item =>
      ['analytics', 'calendar'].includes(item.id)
    ),
  ],
  FINANCE: mainNavigation.filter(item => 
    ['dashboard', 'payments', 'subscriptions', 'reports'].includes(item.id)
  ),
  HPO_MANAGER: mainNavigation.filter(item =>
    ['dashboard', 'hpo', 'missions', 'reports'].includes(item.id)
  ),
  ANALYST: secondaryNavigation.filter(item =>
    ['analytics', 'reports'].includes(item.id)
  ),
}

// Breadcrumbs mapping
export const breadcrumbs = {
  '/dashboard': [{ label: 'Tableau de bord' }],
  
  '/artisans': [
    { label: 'Artisans', path: '/artisans' }
  ],
  '/artisans/:id': [
    { label: 'Artisans', path: '/artisans' },
    { label: 'Détails artisan' }
  ],
  
  '/missions': [
    { label: 'Missions', path: '/missions' }
  ],
  '/missions/:id': [
    { label: 'Missions', path: '/missions' },
    { label: 'Détails mission' }
  ],
  
  '/users': [
    { label: 'Clients', path: '/users' }
  ],
  '/users/:id': [
    { label: 'Clients', path: '/users' },
    { label: 'Détails client' }
  ],
  
  '/payments': [
    { label: 'Paiements', path: '/payments' }
  ],
  
  '/hpo': [
    { label: 'HPO', path: '/hpo' }
  ],
  '/hpo/supervisors': [
    { label: 'HPO', path: '/hpo' },
    { label: 'Superviseurs' }
  ],
  '/hpo/agents': [
    { label: 'HPO', path: '/hpo' },
    { label: 'Agents HPO' }
  ],
  '/hpo/contracts': [
    { label: 'HPO', path: '/hpo' },
    { label: 'Contrats' }
  ],
  
  '/hardware': [
    { label: 'Quincailleries', path: '/hardware' }
  ],
  
  '/reports': [
    { label: 'Rapports', path: '/reports' }
  ],
  
  '/subscriptions': [
    { label: 'Abonnements', path: '/subscriptions' }
  ],
  
  '/profile': [
    { label: 'Profil', path: '/profile' }
  ],
  
  '/messages': [
    { label: 'Messages', path: '/messages' }
  ],
  
  '/notifications': [
    { label: 'Notifications', path: '/notifications' }
  ],
  
  '/settings': [
    { label: 'Paramètres', path: '/settings' }
  ],
  
  '/help': [
    { label: 'Aide', path: '/help' }
  ],
}

export default mainNavigation