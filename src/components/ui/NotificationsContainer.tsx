import { useNotifications, useRemoveNotification } from '@/store'
import type { Notification } from '@/store/slices/notificationSlice'
import type React from 'react'
import { useEffect } from 'react'
import './NotificationsContainer.css'

const Notification: React.FC<{ notification: Notification }> = ({ notification }) => {
  const removeNotification = useRemoveNotification()

  useEffect(() => {
    setTimeout(() => {
      removeNotification(notification.id!)
    }, 3000)
  }, [])

  return (
    <div className={`notification notification-${notification.type}`}>{notification.message}</div>
  )
}

export const NotificationContainer: React.FC = () => {
  const notifications = useNotifications()

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Notification key={notification.id} notification={notification} />
      ))}
    </div>
  )
}
