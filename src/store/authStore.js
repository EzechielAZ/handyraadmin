import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const NOT_ADMIN_MESSAGE = 'Accès réservé aux administrateurs'

// ─── Permissions par rôle admin (admin.roles) ───
// Les permissions docs_* sont alignées sur admin.docs_permissions (voir migration SQL).
const getPermissionsForRole = (role) => {
  const permissions = {
    SUPER_ADMIN: [
      'view_dashboard',
      'manage_artisans',
      'manage_missions',
      'manage_users',
      'manage_payments',
      'manage_hpo',
      'manage_hardware',
      'manage_reports',
      'manage_subscriptions',
      'manage_settings',
      'manage_categories',
      'manage_app_settings',
      'manage_security',
      'view_analytics',
      'export_data',
      'manage_roles',
      'view_audit_logs',
      // Documentation
      'view_docs',
      'manage_docs',
      'manage_features',
      'manage_releases',
      'manage_issues',
      'manage_pages',
      'manage_adrs',
      'manage_runbooks',
      'manage_glossary',
      // Tests de validation
      'view_tests',
      'manage_tests',
    ],
    ADMIN: [
      'view_dashboard',
      'manage_artisans',
      'manage_missions',
      'manage_users',
      'manage_payments',
      'manage_hpo',
      'manage_hardware',
      'view_reports',
      'manage_subscriptions',
      'view_settings',
      'view_categories',
      // Documentation
      'view_docs',
      'manage_docs',
      'manage_features',
      'manage_releases',
      'manage_issues',
      'manage_pages',
      'manage_adrs',
      'manage_runbooks',
      'manage_glossary',
      // Tests de validation
      'view_tests',
      'manage_tests',
    ],
    MODERATOR: [
      'view_dashboard',
      'manage_artisans',
      'manage_users',
      'view_missions',
      'view_reports',
      // Documentation — lecture + écriture features/pages/issues
      'view_docs',
      'manage_features',
      'manage_pages',
      'manage_issues',
      // Tests de validation — lecture + écriture
      'view_tests',
      'manage_tests',
    ],
    FINANCE: [
      'view_dashboard',
      'view_payments',
      'manage_payments',
      'view_reports',
      'view_subscriptions',
      'export_data',
      // Documentation — lecture seule
      'view_docs',
      // Tests de validation — lecture seule
      'view_tests',
    ],
    OPERATIONS: [
      'view_dashboard',
      'manage_missions',
      'manage_artisans',
      'manage_hpo',
      'manage_hardware',
      'view_reports',
      // Documentation — écriture features/issues
      'view_docs',
      'manage_features',
      'manage_issues',
      // Tests de validation — lecture + écriture
      'view_tests',
      'manage_tests',
    ],
  }

  return permissions[role] || []
}

// Messages d'erreur lisibles
const formatAuthError = (error) => {
  const message = error?.message || ''
  if (message === NOT_ADMIN_MESSAGE) return message
  if (/invalid login credentials/i.test(message)) return 'Email ou mot de passe incorrect'
  if (/email not confirmed/i.test(message)) return 'Email non confirmé'
  if (/failed to fetch|network/i.test(message)) return 'Problème de connexion au serveur'
  return message || 'Erreur de connexion'
}

// Charge le profil + rôle admin. Lève NOT_ADMIN_MESSAGE si le compte n'est pas admin actif.
const loadAdminProfile = async (authUserId) => {
  const { data: role, error: roleError } = await supabase.rpc('get_my_admin_role')
  if (roleError) throw roleError
  if (!role) throw new Error(NOT_ADMIN_MESSAGE)

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*, country:country_id (*)')
    .eq('auth_id', authUserId)
    .single()
  if (userError) throw userError

  return { user: { ...userData, role }, role }
}

const emptyAuthState = {
  user: null,
  session: null,
  role: null,
  isAuthenticated: false,
  permissions: [],
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      ...emptyAuthState,
      isLoading: false,
      error: null,

      // Actions
      login: async (email, password) => {
        set({ isLoading: true, error: null })

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) throw error

          let profile
          try {
            profile = await loadAdminProfile(data.user.id)
          } catch (profileError) {
            // Compte valide mais pas admin : on ferme la session Supabase
            await supabase.auth.signOut()
            throw profileError
          }

          set({
            user: profile.user,
            role: profile.role,
            session: data.session,
            isAuthenticated: true,
            permissions: getPermissionsForRole(profile.role),
            isLoading: false,
          })

          toast.success('Connexion réussie !')
          return { success: true }

        } catch (error) {
          console.error('Login error:', error)
          const message = formatAuthError(error)
          set({
            ...emptyAuthState,
            error: message,
            isLoading: false,
          })
          toast.error(message)
          return { success: false, error: message }
        }
      },

      logout: async () => {
        set({ isLoading: true })

        try {
          const { error } = await supabase.auth.signOut()
          if (error) throw error

          set({ ...emptyAuthState, isLoading: false })
          toast.success('Déconnexion réussie')

        } catch (error) {
          console.error('Logout error:', error)
          set({ isLoading: false })
          toast.error('Erreur lors de la déconnexion')
        }
      },

      // Appelé au démarrage de l'app : valide la session et le rôle admin
      checkSession: async () => {
        set({ isLoading: true })

        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          if (error) throw error

          if (!session) {
            set({ ...emptyAuthState, isLoading: false })
            return
          }

          try {
            const profile = await loadAdminProfile(session.user.id)
            set({
              user: profile.user,
              role: profile.role,
              session,
              isAuthenticated: true,
              permissions: getPermissionsForRole(profile.role),
              isLoading: false,
            })
          } catch (profileError) {
            if (profileError?.message === NOT_ADMIN_MESSAGE) {
              await supabase.auth.signOut()
            }
            throw profileError
          }

        } catch (error) {
          console.error('Session check error:', error)
          set({ ...emptyAuthState, isLoading: false })
        }
      },

      // Appelé par onAuthStateChange (déconnexion depuis un autre onglet, token expiré…)
      handleSignedOut: () => set({ ...emptyAuthState, isLoading: false }),

      handleTokenRefreshed: (session) => {
        if (session) set({ session })
      },

      updateUser: async (updates) => {
        set({ isLoading: true })

        try {
          const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id_user', get().user?.id_user)
            .select()
            .single()

          if (error) throw error

          set({
            user: { ...get().user, ...data },
            isLoading: false,
          })

          toast.success('Profil mis à jour')

        } catch (error) {
          console.error('Update error:', error)
          set({ isLoading: false })
          toast.error('Erreur lors de la mise à jour')
        }
      },

      resetPassword: async (email) => {
        set({ isLoading: true })

        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          })

          if (error) throw error

          toast.success('Email de réinitialisation envoyé')
          set({ isLoading: false })

        } catch (error) {
          console.error('Reset password error:', error)
          set({ isLoading: false })
          toast.error('Erreur lors de l\'envoi')
        }
      },

      updatePassword: async (newPassword) => {
        set({ isLoading: true })

        try {
          const { error } = await supabase.auth.updateUser({
            password: newPassword,
          })

          if (error) throw error

          toast.success('Mot de passe mis à jour')
          set({ isLoading: false })

        } catch (error) {
          console.error('Update password error:', error)
          set({ isLoading: false })
          toast.error('Erreur lors de la mise à jour')
        }
      },

      clearError: () => set({ error: null }),

      // Check permissions
      hasPermission: (permission) => {
        return get().permissions.includes(permission)
      },

      hasAnyPermission: (permissions) => {
        return permissions.some(p => get().permissions.includes(p))
      },

      hasAllPermissions: (permissions) => {
        return permissions.every(p => get().permissions.includes(p))
      },

      // Role check (rôle admin issu de admin.roles)
      isAdmin: () => {
        return ['ADMIN', 'SUPER_ADMIN'].includes(get().role)
      },

      isSuperAdmin: () => {
        return get().role === 'SUPER_ADMIN'
      },
    }),
    {
      name: 'handyra-auth-storage',
      storage: createJSONStorage(() => localStorage),
      // La session (tokens) est gérée par Supabase : on ne la duplique pas ici
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
      }),
    }
  )
)