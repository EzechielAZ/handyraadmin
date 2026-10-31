import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import toast from 'react-hot-toast'

export const useNotificationStore = create((set, get) => ({
  // State
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  realtimeChannel: null,
  
  // Actions
  fetchNotifications: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    
    set({ isLoading: true, error: null })
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id_user)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      
      set({
        notifications: data,
        unreadCount: data.filter(n => !n.is_read).length,
        isLoading: false,
      })
      
    } catch (error) {
      console.error('Fetch notifications error:', error)
      set({ error: error.message, isLoading: false })
    }
  },
  
  markAsRead: async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id_notification', notificationId)
      
      if (error) throw error
      
      set((state) => {
        const updatedNotifications = state.notifications.map(n =>
          n.id_notification === notificationId ? { ...n, is_read: true } : n
        )
        return {
          notifications: updatedNotifications,
          unreadCount: updatedNotifications.filter(n => !n.is_read).length,
        }
      })
      
    } catch (error) {
      console.error('Mark as read error:', error)
    }
  },
  
  markAllAsRead: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id_user)
        .eq('is_read', false)
      
      if (error) throw error
      
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0,
      }))
      
    } catch (error) {
      console.error('Mark all as read error:', error)
    }
  },
  
  deleteNotification: async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id_notification', notificationId)
      
      if (error) throw error
      
      set((state) => {
        const filtered = state.notifications.filter(n => n.id_notification !== notificationId)
        return {
          notifications: filtered,
          unreadCount: filtered.filter(n => !n.is_read).length,
        }
      })
      
      toast.success('Notification supprimée')
      
    } catch (error) {
      console.error('Delete notification error:', error)
      toast.error('Erreur lors de la suppression')
    }
  },
  
  clearAll: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id_user)
      
      if (error) throw error
      
      set({
        notifications: [],
        unreadCount: 0,
      })
      
      toast.success('Toutes les notifications ont été supprimées')
      
    } catch (error) {
      console.error('Clear all error:', error)
      toast.error('Erreur lors de la suppression')
    }
  },
  
  // Realtime subscriptions
  subscribeToNotifications: () => {
    const user = useAuthStore.getState().user
    if (!user) return
    
    // Clean up existing subscription
    get().unsubscribeFromNotifications()
    
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id_user}`,
        },
        (payload) => {
          const newNotification = payload.new
          
          set((state) => ({
            notifications: [newNotification, ...state.notifications].slice(0, 50),
            unreadCount: state.unreadCount + 1,
          }))
          
          // Show toast for new notification
          toast.custom((t) => (
            <div className="notification-toast">
              <div className="notification-toast-icon">
                {getNotificationIcon(newNotification.type)}
              </div>
              <div className="notification-toast-content">
                <h4>{newNotification.title}</h4>
                <p>{newNotification.message}</p>
              </div>
            </div>
          ), {
            duration: 5000,
            position: 'top-right',
          })
        }
      )
      .subscribe()
    
    set({ realtimeChannel: channel })
  },
  
  unsubscribeFromNotifications: () => {
    const channel = get().realtimeChannel
    if (channel) {
      supabase.removeChannel(channel)
      set({ realtimeChannel: null })
    }
  },
  
  // Helpers
  getUnreadCount: () => {
    return get().unreadCount
  },
  
  hasUnread: () => {
    return get().unreadCount > 0
  },
  
  reset: () => {
    get().unsubscribeFromNotifications()
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      realtimeChannel: null,
    })
  },
}))

// Helper pour les icônes de notification
const getNotificationIcon = (type) => {
  const icons = {
    MISSION_ALERT: '🚀',
    PAYMENT: '💰',
    HPRE_BONUS: '🎁',
    CHAT: '💬',
    SYSTEM: '⚙️',
    KYC: '📄',
    REPORT: '📊',
  }
  return icons[type] || '📢'
}