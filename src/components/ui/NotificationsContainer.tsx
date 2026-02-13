import { useNotifications, useRemoveNotification } from '@/store/useMonsterStore'
import type { Notification } from '@/store/types'
import type React from 'react'
import { useEffect } from 'react'
import './NotificationsContainer.css'
import { TIMING } from '@/constants'

const Notification: React.FC<{ notification: Notification }> = ({ notification }) => {
  const removeNotification = useRemoveNotification()

  useEffect(() => {
    setTimeout(() => {
      removeNotification(notification.id!)
    }, notification.duration ?? TIMING.DEFAULT_NOTIFICATION_DURATION)
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
