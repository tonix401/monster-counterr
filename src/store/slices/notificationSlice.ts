import type { StateCreator } from 'zustand'

export type Notification = {
  id?: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
  /**
   * Duration in ms, standard duration is 3000ms (3 seconds)
   */
  duration?: number
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
