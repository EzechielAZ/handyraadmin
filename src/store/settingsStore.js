import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      // State
      settings: {
        company: null,
        country: null,
        notifications: {},
        appearance: {},
      },
      isLoading: false,
      error: null,
      
      // Actions
      fetchCompanySettings: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const { data, error } = await supabase
            .from('company_settings')
            .select('*')
            .single()
          
          if (error) throw error
          
          set((state) => ({
            settings: {
              ...state.settings,
              company: data,
            },
            isLoading: false,
          }))
          
        } catch (error) {
          console.error('Fetch company settings error:', error)
          set({ error: error.message, isLoading: false })
        }
      },
      
      fetchCountrySettings: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const { data, error } = await supabase
            .from('country_settings')
            .select('*')
            .eq('is_active', true)
          
          if (error) throw error
          
          set((state) => ({
            settings: {
              ...state.settings,
              country: data,
            },
            isLoading: false,
          }))
          
        } catch (error) {
          console.error('Fetch country settings error:', error)
          set({ error: error.message, isLoading: false })
        }
      },
      
      updateCompanySettings: async (updates) => {
        set({ isLoading: true, error: null })
        
        try {
          const { data, error } = await supabase
            .from('company_settings')
            .update({
              ...updates,
              updated_at: new Date().toISOString(),
            })
            .eq('id_setting', get().settings.company?.id_setting)
            .select()
            .single()
          
          if (error) throw error
          
          set((state) => ({
            settings: {
              ...state.settings,
              company: data,
            },
            isLoading: false,
          }))
          
          toast.success('Paramètres mis à jour')
          
        } catch (error) {
          console.error('Update company settings error:', error)
          set({ error: error.message, isLoading: false })
          toast.error('Erreur lors de la mise à jour')
        }
      },
      
      updateNotificationSettings: (settings) => set((state) => ({
        settings: {
          ...state.settings,
          notifications: {
            ...state.settings.notifications,
            ...settings,
          },
        },
      })),
      
      updateAppearanceSettings: (settings) => set((state) => ({
        settings: {
          ...state.settings,
          appearance: {
            ...state.settings.appearance,
            ...settings,
          },
        },
      })),
      
      // Helpers
      getCommissionRate: () => {
        return get().settings.company?.handyra_commission_rate || 10
      },
      
      getTransactionFee: () => {
        return get().settings.company?.transaction_fee_fixed || 500
      },
      
      getHPREConfig: (countryCode) => {
        const country = get().settings.country?.find(c => c.iso_code === countryCode)
        return country || null
      },
      
      getAgentFees: (projectSize) => {
        const country = get().settings.country?.[0]
        if (!country) return null
        
        const fees = {
          SMALL: country.agent_fee_small,
          MEDIUM: country.agent_fee_medium,
          LARGE: country.agent_fee_large,
        }
        
        return fees[projectSize] || null
      },
      
      reset: () => set({
        settings: {
          company: null,
          country: null,
          notifications: {},
          appearance: {},
        },
        isLoading: false,
        error: null,
      }),
    }),
    {
      name: 'handyra-settings-storage',
      partialize: (state) => ({
        settings: {
          notifications: state.settings.notifications,
          appearance: state.settings.appearance,
        },
      }),
    }
  )
)