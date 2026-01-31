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

export const createNotificationSlice = (set: any): NotificationSlice => ({
  queue: [],
  notify: (notification: Notification) => {
    console.log('Notification:', notification)
    notification.id = crypto.randomUUID()
    set((state: any) => ({
      queue: [...state.queue, notification],
    }))
  },
  removeNotification: (id: string) => {
    set((state: any) => ({
      queue: state.queue.filter((n: Notification) => n.id !== id),
    }))
  },
})
