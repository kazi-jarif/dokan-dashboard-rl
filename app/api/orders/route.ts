import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const endpoint = () => `${process.env.N8N_BASE_URL}/webhook/dokan-dashboard`

async function forward(body: Record<string, unknown>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Dashboard-Key': process.env.N8N_DASHBOARD_KEY ?? '' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({ ok: false, error: 'Invalid response from order service' }))
  if (Array.isArray(payload.rows)) {
    payload.rows = payload.rows.map((row: Record<string, string>) => ({ ...row, mobile: row['mobile '] ?? '' }))
  }
  return NextResponse.json(payload, { status: response.status })
}

export async function GET() { return forward({ action: 'list' }) }
export async function POST(request: Request) {
  const body = await request.json()
  if (!['update', 'cancel'].includes(body.action)) return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 })
  return forward(body)
}
