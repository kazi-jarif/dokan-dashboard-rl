'use client'

import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DashboardShell } from '@/components/dashboard-shell'
import { EmptyState } from '@/components/empty-state'
import { createClient } from '@/lib/supabase/client'

type Report = { month: string; revenue: number; delivered_orders: number; delivered_units: number; cancelled_orders: number }
const money = new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 })

export default function HistoryPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { createClient().from('monthly_reports').select('month,revenue,delivered_orders,delivered_units,cancelled_orders').order('month', { ascending: false }).then(({ data }: { data: unknown }) => setReports((data as Report[]) ?? [])).catch(() => setReports([])).finally(() => setLoading(false)) }, [])
  return <DashboardShell title="History"><div className="flex flex-col gap-5">{loading ? <div className="rounded-2xl border border-border/60 p-8 text-center text-sm text-muted-foreground">Loading reports...</div> : reports.length === 0 ? <EmptyState title="No monthly reports yet. The first one appears on the 1st of next month." /> : <><div className="rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-6"><p className="mb-5 font-medium">Revenue by month</p><ResponsiveContainer width="100%" height={220}><BarChart data={[...reports].reverse()}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(value) => formatMonth(value).split(' ')[0]} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(value) => `৳${value}`} /><Tooltip formatter={(value) => money.format(Number(value))} labelFormatter={(value) => formatMonth(String(value))} /><Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="grid gap-3">{reports.map((report) => <article key={report.month} className="rounded-2xl border border-border/60 bg-card/50 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{formatMonth(report.month)}</h3><strong>{money.format(report.revenue)}</strong></div><div className="mt-4 grid grid-cols-3 gap-2 text-sm text-muted-foreground"><span>Delivered<br /><b className="text-foreground">{report.delivered_orders}</b></span><span>Units<br /><b className="text-foreground">{report.delivered_units}</b></span><span>Cancelled<br /><b className="text-foreground">{report.cancelled_orders}</b></span></div></article>)}</div></>}</div></DashboardShell>
}
function formatMonth(value: string) { const date = new Date(`${value}-01T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
