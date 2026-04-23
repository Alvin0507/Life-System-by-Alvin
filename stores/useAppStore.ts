import { create } from 'zustand'
import { ToastItem } from '@/types'

interface AppStore {
  currentPage: string
  setCurrentPage: (page: string) => void
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
  celebrationActive: boolean
  triggerCelebration: () => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  currentPage: 'today',
  setCurrentPage: (page) => set({ currentPage: page }),

  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2)
    const newToast: ToastItem = { ...toast, id }
    set((state) => {
      const updated = [...state.toasts, newToast]
      return { toasts: updated.slice(-3) }
    })
    setTimeout(() => get().removeToast(id), toast.duration ?? 3000)
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  celebrationActive: false,
  triggerCelebration: () => {
    set({ celebrationActive: true })
    setTimeout(() => set({ celebrationActive: false }), 1500)
  },
}))
