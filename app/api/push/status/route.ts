import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const endpoint = new URL(request.url).searchParams.get('endpoint')
  if (!endpoint) return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 })

  const { data, error } = await createAdminClient()
    .from('push_subscriptions')
    .select('endpoint')
    .eq('endpoint', endpoint)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ exists: Boolean(data) })
}
