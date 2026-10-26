'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type NotificationType = 'confirmed' | 'cancelled' | 'complaint'
export type Notification = { id: number; type: NotificationType; title: string; body: string; data: { order_id?: string } | null; read: boolean; created_at: string }
type NotificationChange = { event: 'INSERT' | 'UPDATE'; row: Notification; oldRow?: Notification }

type NotificationsContextValue = { unreadCount: number; refreshUnread: () => Promise<void>; onNotificationChange: (listener: (change: NotificationChange) => void) => () => void }
const NotificationsContext = createContext<NotificationsContextValue>({ unreadCount: 0, refreshUnread: async () => {}, onNotificationChange: () => () => {} })
const TYPES: NotificationType[] = ['confirmed', 'cancelled', 'complaint']

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = useMemo(() => createClient(), [])
  const listeners = useRef(new Set<(change: NotificationChange) => void>())
  const refreshUnread = useCallback(async () => {
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false).in('type', TYPES)
    if (typeof count === 'number') setUnreadCount(count)
  }, [supabase])
  const onNotificationChange = useCallback((listener: (change: NotificationChange) => void) => {
    listeners.current.add(listener)
    return () => listeners.current.delete(listener)
  }, [])
  useEffect(() => {
    void refreshUnread()
    const channel = supabase.channel('notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: { new: Notification }) => {
      const row = payload.new as Notification
      if (TYPES.includes(row.type)) {
        if (!row.read) setUnreadCount((count) => count + 1)
        listeners.current.forEach((listener) => listener({ event: 'INSERT', row }))
      }
    }).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, (payload: { new: Notification; old: Notification }) => {
      const row = payload.new as Notification
      const oldRow = payload.old as Notification
      if (TYPES.includes(row.type)) {
        if (oldRow.read !== row.read) setUnreadCount((count) => Math.max(0, count + (row.read ? -1 : 1)))
        listeners.current.forEach((listener) => listener({ event: 'UPDATE', row, oldRow }))
      }
    }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [refreshUnread, supabase])
  return <NotificationsContext.Provider value={{ unreadCount, refreshUnread, onNotificationChange }}>{children}</NotificationsContext.Provider>
}

export function useNotifications() { return useContext(NotificationsContext) }
