import type { StateCreator } from 'zustand'

export type Notification = {
  id?: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
  duration?: number // in milliseconds
}

export type NotificationSlice = {
  queue: Notification[]
  notify: (notification: Notification) => void
  removeNotification: (id: string) => void
}

export const createNotificationSlice: StateCreator<NotificationSlice, [], [], NotificationSlice> = (
  set
) => ({
  queue: [],

  notify: (notification: Notification): void => {
    console.log('Notification:', notification)
    notification.id = crypto.randomUUID()
    set((state) => ({
      queue: [...state.queue, notification],
    }))
  },

  removeNotification: (id: string): void => {
    set((state) => ({
      queue: state.queue.filter((n) => n.id !== id),
    }))
  },
})
