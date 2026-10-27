'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type OrderRow = { order_id?: string; status?: string; date?: string; price?: number | string; quantity?: number | string }

const money = new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 })

export function OverviewInsights() {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/orders', { cache: 'no-store' }).then((response) => response.json()).then((payload) => setRows(Array.isArray(payload.rows) ? payload.rows : [])).catch(() => setRows([])).finally(() => setLoading(false))
  }, [])

  const month = new Date().toISOString().slice(0, 7)
  const currentRows = rows.filter((row) => row.date?.startsWith(month))
  const delivered = currentRows.filter((row) => row.status?.toLowerCase() === 'delivered')
  const cancelled = currentRows.filter((row) => row.status?.toLowerCase() === 'cancel')
  const distinctCount = (items: OrderRow[]) => new Set(items.map((row, index) => row.order_id?.trim() || `empty-${index}`)).size
  const revenue = delivered.reduce((sum, row) => sum + Number(row.price || 0) * Number(row.quantity || 0), 0)
  const chartData = useMemo(() => {
    const days = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    return Array.from({ length: days }, (_, index) => {
      const date = `${month}-${String(index + 1).padStart(2, '0')}`
      return { day: index + 1, revenue: delivered.filter((row) => row.date === date).reduce((sum, row) => sum + Number(row.price || 0) * Number(row.quantity || 0), 0) }
    })
  }, [delivered, month])

  if (loading) return <div className="flex min-h-64 items-center justify-center rounded-2xl border border-border/60 bg-card/50 text-sm text-muted-foreground">Loading this month&apos;s insights...</div>

  return <section aria-labelledby="month-heading" className="flex flex-col gap-5"><h3 id="month-heading" className="text-lg font-semibold">This month</h3><div className="grid gap-3 sm:grid-cols-3"><Stat label="Revenue" value={money.format(revenue)} /><Stat label="Delivered orders" value={String(distinctCount(delivered))} /><Stat label="Cancelled orders" value={String(distinctCount(cancelled))} /></div><div className="rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-6"><div className="mb-5"><p className="font-medium">Delivered revenue</p><p className="text-sm text-muted-foreground">Daily performance for the current month</p></div>{revenue === 0 ? <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">No delivered revenue this month.</p> : <ResponsiveContainer width="100%" height={230}><BarChart data={chartData}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(value) => `৳${value}`} /><Tooltip formatter={(value) => money.format(Number(value))} labelFormatter={(label) => `Day ${label}`} /><Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>}</div></section>
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-border/60 bg-card/50 p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight">{value}</p></div> }
