import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import webpush from 'web-push'
import { timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'

function secretMatches(value: string | null, expected: string) {
  if (!value) return false
  const actual = Buffer.from(value)
  const target = Buffer.from(expected)
  return actual.length === target.length && timingSafeEqual(actual, target)
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get('x-push-secret'), process.env.PUSH_SEND_SECRET ?? '')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 2048) return NextResponse.json({ error: 'Request too large' }, { status: 413 })
  const body = await request.json().catch(() => null)
  if (!body || !['confirmed', 'cancelled', 'complaint'].includes(body.type) || typeof body.title !== 'string' || body.title.length > 200 || typeof body.body !== 'string' || body.body.length > 500 || (body.url !== undefined && typeof body.url !== 'string')) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)
  const admin = createAdminClient()
  const { data: subscriptions, error } = await admin.from('push_subscriptions').select('id, endpoint, keys')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const results = await Promise.allSettled((subscriptions ?? []).map(async (subscription) => {
    try { await webpush.sendNotification(subscription as webpush.PushSubscription, JSON.stringify({ title: body.title, body: body.body, url: body.url || '/notifications', tag: body.type })) ; return { sent: true } }
    catch (error) { const statusCode = (error as { statusCode?: number }).statusCode; if (statusCode === 404 || statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id); throw error }
  }))
  return NextResponse.json({ sent: results.filter((result) => result.status === 'fulfilled').length, failed: results.filter((result) => result.status === 'rejected').length, removed: (subscriptions ?? []).filter((_, index) => results[index].status === 'rejected' && [404, 410].includes((results[index] as PromiseRejectedResult).reason?.statusCode)).length })
}
