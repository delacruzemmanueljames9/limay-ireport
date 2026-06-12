import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types'

export function useNotifications(userId?: string, officeId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  async function load() {
    if (!userId) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`recipient_user_id.eq.${userId}${officeId ? `,recipient_office_id.eq.${officeId}` : ''}`)
      .order('created_at', { ascending: false })
      .limit(10)
    setNotifications((data ?? []) as Notification[])
  }

  useEffect(() => {
    load()
    if (!userId) return
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        load()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, officeId])

  async function markAllAsRead() {
    if (!userId) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .or(`recipient_user_id.eq.${userId}${officeId ? `,recipient_office_id.eq.${officeId}` : ''}`)
    load()
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return { notifications, unreadCount, markAllAsRead }
}
