import { create } from 'zustand'

export const useUIStore = create((set, get) => ({
  // State
  sidebarOpen: true,
  theme: 'light',
  notifications: [],
  unreadCount: 0,
  modalStack: [],
  currentModal: null,
  toastQueue: [],
  loadingStates: {},
  
  // Sidebar
  toggleSidebar: () => set((state) => ({ 
    sidebarOpen: !state.sidebarOpen 
  })),
  
  setSidebarOpen: (open) => set({ 
    sidebarOpen: open 
  }),
  
  // Theme
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light'
  })),
  
  setTheme: (theme) => set({ theme }),
  
  // Notifications
  addNotification: (notification) => set((state) => ({
    notifications: [{
      id: Date.now(),
      read: false,
      timestamp: new Date().toISOString(),
      ...notification
    }, ...state.notifications].slice(0, 50),
    unreadCount: state.unreadCount + 1
  })),
  
  markAsRead: (notificationId) => set((state) => {
    const updatedNotifications = state.notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    )
    return {
      notifications: updatedNotifications,
      unreadCount: updatedNotifications.filter(n => !n.read).length
    }
  }),
  
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0
  })),
  
  removeNotification: (notificationId) => set((state) => {
    const filtered = state.notifications.filter(n => n.id !== notificationId)
    return {
      notifications: filtered,
      unreadCount: filtered.filter(n => !n.read).length
    }
  }),
  
  clearNotifications: () => set({
    notifications: [],
    unreadCount: 0
  }),
  
  // Modals
  openModal: (modalId, props = {}) => set((state) => ({
    modalStack: [...state.modalStack, { id: modalId, props }],
    currentModal: modalId
  })),
  
  closeModal: () => set((state) => {
    const newStack = state.modalStack.slice(0, -1)
    return {
      modalStack: newStack,
      currentModal: newStack[newStack.length - 1]?.id || null
    }
  }),
  
  closeAllModals: () => set({
    modalStack: [],
    currentModal: null
  }),
  
  // Loading states
  setLoading: (key, isLoading) => set((state) => ({
    loadingStates: {
      ...state.loadingStates,
      [key]: isLoading
    }
  })),
  
  isLoading: (key) => {
    return get().loadingStates[key] || false
  },
  
  // Toast queue (fallback si react-hot-toast ne suffit pas)
  addToast: (toast) => set((state) => ({
    toastQueue: [...state.toastQueue, {
      id: Date.now(),
      ...toast
    }]
  })),
  
  removeToast: (toastId) => set((state) => ({
    toastQueue: state.toastQueue.filter(t => t.id !== toastId)
  })),
  
  clearToasts: () => set({
    toastQueue: []
  }),
  
  // Window size
  windowWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
  windowHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  
  setWindowSize: (width, height) => set({
    windowWidth: width,
    windowHeight: height
  }),
  
  // Mobile detection
  isMobile: () => {
    return get().windowWidth < 768
  },
  
  isTablet: () => {
    const width = get().windowWidth
    return width >= 768 && width < 1024
  },
  
  isDesktop: () => {
    return get().windowWidth >= 1024
  },
  
  // Helpers
  reset: () => set({
    sidebarOpen: true,
    theme: 'light',
    modalStack: [],
    currentModal: null,
    toastQueue: [],
    loadingStates: {}
  }),
}))