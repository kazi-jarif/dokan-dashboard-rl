import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import webpush from 'web-push'

export const runtime = 'nodejs'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)
  const { data: subscriptions, error } = await createAdminClient().from('push_subscriptions').select('id, endpoint, keys')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const payload = JSON.stringify({
    title: 'Dokan test - notifications are working',
    body: 'Your Dokan push notifications are configured correctly.',
    url: '/notifications',
    tag: 'test',
  })
  const results = await Promise.allSettled(
    (subscriptions ?? []).map((subscription) =>
      webpush.sendNotification(subscription as webpush.PushSubscription, payload),
    ),
  )
  return NextResponse.json({ sent: results.filter((result) => result.status === 'fulfilled').length, failed: results.filter((result) => result.status === 'rejected').length })
}
