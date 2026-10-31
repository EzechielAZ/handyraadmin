import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      permissions: [],
      
      // Actions
      login: async (email, password) => {
        set({ isLoading: true, error: null })
        
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          
          if (error) throw error
          
          // Récupérer les infos utilisateur supplémentaires
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select(`
              *,
              role:user_role,
              country:country_id (*)
            `)
            .eq('auth_id', data.user.id)
            .single()
          
          if (userError) throw userError
          
          // Récupérer les permissions selon le rôle
          const permissions = getPermissionsForRole(userData.user_role)
          
          set({
            user: userData,
            session: data.session,
            isAuthenticated: true,
            permissions,
            isLoading: false,
          })
          
          toast.success('Connexion réussie !')
          return { success: true }
          
        } catch (error) {
          console.error('Login error:', error)
          set({ 
            error: error.message, 
            isLoading: false,
            isAuthenticated: false 
          })
          toast.error(error.message || 'Erreur de connexion')
          return { success: false, error: error.message }
        }
      },
      
      logout: async () => {
        set({ isLoading: true })
        
        try {
          const { error } = await supabase.auth.signOut()
          if (error) throw error
          
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            permissions: [],
            isLoading: false,
          })
          
          toast.success('Déconnexion réussie')
          
        } catch (error) {
          console.error('Logout error:', error)
          set({ isLoading: false })
          toast.error('Erreur lors de la déconnexion')
        }
      },
      
      checkSession: async () => {
        set({ isLoading: true })
        
        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (error) throw error
          
          if (session) {
            // Récupérer les infos utilisateur
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select(`
                *,
                role:user_role,
                country:country_id (*)
              `)
              .eq('auth_id', session.user.id)
              .single()
            
            if (userError) throw userError
            
            const permissions = getPermissionsForRole(userData.user_role)
            
            set({
              user: userData,
              session,
              isAuthenticated: true,
              permissions,
              isLoading: false,
            })
          } else {
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              permissions: [],
              isLoading: false,
            })
          }
          
        } catch (error) {
          console.error('Session check error:', error)
          set({ 
            isLoading: false,
            isAuthenticated: false 
          })
        }
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
            isLoading: false 
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
      
      // Role check
      isAdmin: () => {
        return ['ADMIN', 'SUPER_ADMIN'].includes(get().user?.user_role)
      },
      
      isSuperAdmin: () => {
        return get().user?.user_role === 'SUPER_ADMIN'
      },
    }),
    {
      name: 'handyra-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
      }),
    }
  )
)

// Helper pour les permissions par rôle
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
      'manage_security',
      'view_analytics',
      'export_data',
      'manage_roles',
      'view_audit_logs',
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
    ],
    FINANCE: [
      'view_dashboard',
      'view_payments',
      'manage_payments',
      'view_reports',
      'view_subscriptions',
      'export_data',
    ],
    HPO_MANAGER: [
      'view_dashboard',
      'manage_hpo',
      'view_missions',
      'view_reports',
      'manage_hpo_contracts',
      'manage_supervisors',
    ],
    ANALYST: [
      'view_dashboard',
      'view_reports',
      'view_analytics',
      'export_data',
    ],
  }
  
  return permissions[role] || []
}