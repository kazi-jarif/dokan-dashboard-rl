'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, Loader2, Send } from 'lucide-react'

type PushStatus = 'Not supported' | 'Blocked' | 'Off' | 'On'
type Feedback = { tone: 'success' | 'error'; text: string } | null

function base64UrlToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
}

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null)
  return body?.error || fallback
}

export function PushSettings() {
  const [status, setStatus] = useState<PushStatus>('Not supported')
  const [busy, setBusy] = useState<'enable' | 'disable' | 'test' | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const inspectSubscription = useCallback(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('Not supported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('Blocked')
      return
    }
    const registration = await navigator.serviceWorker.register('/sw.js')
    const ready = await navigator.serviceWorker.ready
    const subscription = await ready.pushManager.getSubscription()
    if (!subscription) {
      setStatus('Off')
      return
    }
    const response = await fetch(`/api/push/status?endpoint=${encodeURIComponent(subscription.endpoint)}`)
    if (!response.ok) throw new Error(await responseError(response, 'Unable to check notification status'))
    const result = await response.json()
    if (!result.exists) {
      const saveResponse = await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription),
      })
      if (!saveResponse.ok) throw new Error(await responseError(saveResponse, 'Unable to sync notification subscription'))
    }
    setStatus('On')
    void registration
  }, [])

  useEffect(() => {
    void inspectSubscription().catch(() => setStatus('Off'))
  }, [inspectSubscription])

  async function enable() {
    setBusy('enable'); setFeedback(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'Blocked' : 'Off')
        throw new Error(permission === 'denied' ? 'Notifications are blocked for this site.' : 'Notification permission was not granted.')
      }
      const registration = await navigator.serviceWorker.register('/sw.js')
      const ready = await navigator.serviceWorker.ready
      const subscription = await ready.pushManager.getSubscription() || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      const response = await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription),
      })
      if (!response.ok) throw new Error(await responseError(response, 'Unable to save notification subscription'))
      setStatus('On'); setFeedback({ tone: 'success', text: 'Notifications enabled on this device' })
    } catch (error) {
      await inspectSubscription().catch(() => undefined)
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to enable notifications' })
    } finally { setBusy(null) }
  }

  async function disable() {
    setBusy('disable'); setFeedback(null)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        const response = await fetch('/api/push/unsubscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        if (!response.ok) throw new Error(await responseError(response, 'Unable to disable notifications'))
        const removed = await subscription.unsubscribe()
        if (!removed) throw new Error('Unable to remove this device subscription')
      }
      setStatus('Off'); setFeedback({ tone: 'success', text: 'Notifications disabled on this device' })
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to disable notifications' })
    } finally { setBusy(null) }
  }

  async function test() {
    setBusy('test'); setFeedback(null)
    try {
      const response = await fetch('/api/push/test', { method: 'POST' })
      if (!response.ok) throw new Error(await responseError(response, 'Unable to send test notification'))
      const result = await response.json()
      setFeedback({ tone: 'success', text: `Sent to ${result.sent ?? 0} device${result.sent === 1 ? '' : 's'}; failed ${result.failed ?? 0}; removed ${result.removed ?? 0}` })
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to send test notification' })
    } finally { setBusy(null) }
  }

  const supported = status !== 'Not supported'
  return <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4"><div><p className="text-base font-semibold">Push notifications</p><p className="mt-1 text-sm text-muted-foreground">Status: <span className="font-medium text-foreground">{status}</span></p></div><div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">{status === 'On' ? <Bell /> : <BellOff />}</div></div>
    <p className="mt-4 text-xs leading-5 text-muted-foreground">If you do not see notifications, check that notifications are allowed for this site in your phone settings and that the phone is not in silent mode.</p>
    {feedback && <p role="status" className={`mt-3 rounded-xl p-3 text-sm ${feedback.tone === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-destructive/10 text-destructive'}`}>{feedback.text}</p>}
    <div className="mt-5 flex flex-wrap gap-2"><button disabled={!supported || busy !== null || status === 'On' || status === 'Blocked'} onClick={enable} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy === 'enable' && <Loader2 className="mr-2 inline size-4 animate-spin" />}{busy === 'enable' ? 'Enabling...' : 'Enable notifications'}</button><button disabled={busy !== null || status !== 'On'} onClick={disable} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium disabled:opacity-50">{busy === 'disable' && <Loader2 className="mr-2 inline size-4 animate-spin" />}{busy === 'disable' ? 'Disabling...' : 'Disable'}</button><button disabled={busy !== null || status !== 'On'} onClick={test} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium disabled:opacity-50">{busy === 'test' && <Loader2 className="mr-2 inline size-4 animate-spin" />}<Send className="mr-2 inline size-4" />{busy === 'test' ? 'Sending...' : 'Send test notification'}</button></div>
  </section>
}
