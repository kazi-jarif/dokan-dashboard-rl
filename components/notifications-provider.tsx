'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type NotificationType = 'confirmed' | 'cancelled' | 'complaint'
export type Notification = { id: number; type: NotificationType; title: string; body: string; data: { order_id?: string } | null; read: boolean; created_at: string }

type NotificationsContextValue = { unreadCount: number; refreshUnread: () => Promise<void> }
const NotificationsContext = createContext<NotificationsContextValue>({ unreadCount: 0, refreshUnread: async () => {} })
const TYPES: NotificationType[] = ['confirmed', 'cancelled', 'complaint']

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = useMemo(() => createClient(), [])
  const refreshUnread = async () => {
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false).in('type', TYPES)
    if (typeof count === 'number') setUnreadCount(count)
  }
  useEffect(() => {
    void refreshUnread()
    const channel = supabase.channel('notifications-sidebar').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: { new: Notification; old: Notification }) => {
      const row = payload.new as Notification
      if (!row.read && TYPES.includes(row.type)) setUnreadCount((count) => count + 1)
    }).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, (payload: { new: Notification; old: Notification }) => {
      const oldRow = payload.old as Notification
      const row = payload.new as Notification
      if (!TYPES.includes(row.type)) return
      if (oldRow.read !== row.read) setUnreadCount((count) => Math.max(0, count + (row.read ? -1 : 1)))
    }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [supabase])
  return <NotificationsContext.Provider value={{ unreadCount, refreshUnread }}>{children}</NotificationsContext.Provider>
}

export function useNotifications() { return useContext(NotificationsContext) }
