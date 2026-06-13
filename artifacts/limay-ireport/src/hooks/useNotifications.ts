import { useState, useEffect, useRef } from 'react'
import { dbGet, dbUpdate } from '@/lib/api'
import type { Notification } from '@/types'

export function useNotifications(userId?: string, officeId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function load() {
    if (!userId) return
    const params = new URLSearchParams()
    params.set('select', '*')
    params.set('order', 'created_at.desc')
    params.set('limit', '10')
    const orParts = [`recipient_user_id.eq.${userId}`]
    if (officeId) orParts.push(`recipient_office_id.eq.${officeId}`)
    params.set('or', `(${orParts.join(',')})`)

    const { data } = await dbGet<Notification[]>('notifications', params)
    setNotifications(data ?? [])
  }

  useEffect(() => {
    load()
    if (!userId) return

    intervalRef.current = setInterval(load, 30_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [userId, officeId])

  async function markAllAsRead() {
    if (!userId) return
    const params = new URLSearchParams()
    const orParts = [`recipient_user_id.eq.${userId}`]
    if (officeId) orParts.push(`recipient_office_id.eq.${officeId}`)
    params.set('or', `(${orParts.join(',')})`)
    await dbUpdate('notifications', params, { is_read: true })
    load()
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return { notifications, unreadCount, markAllAsRead }
}
