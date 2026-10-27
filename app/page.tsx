import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard-shell'
import { OverviewInsights } from '@/components/overview-insights'

export default async function Home() {
  const { data: { user } } = await (await createClient()).auth.getUser()

  return (
    <DashboardShell title="Overview" email={user?.email}>
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">Good morning</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">Welcome back.</h2>
        <p className="mt-2 text-muted-foreground">Here&apos;s what&apos;s happening with your store.</p>
      </div>
      <OverviewInsights />
    </DashboardShell>
  )
}
