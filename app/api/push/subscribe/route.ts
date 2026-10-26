import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  const admin = createAdminClient()
  const { error: deleteError } = await admin.from('push_subscriptions').delete().eq('endpoint', body.endpoint)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  const { error } = await admin.from('push_subscriptions').insert({ endpoint: body.endpoint, keys: body.keys })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
