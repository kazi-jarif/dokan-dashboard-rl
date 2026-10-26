import { DashboardShell } from '@/components/dashboard-shell'
import { PushSettings } from '@/components/push-settings'

export default function SettingsPage() {
  return <DashboardShell title="Settings"><div className="mx-auto flex max-w-2xl flex-col gap-6"><div><p className="text-2xl font-semibold tracking-tight">Settings</p><p className="mt-1 text-sm text-muted-foreground">Control how Dokan keeps you informed.</p></div><PushSettings /></div></DashboardShell>
}
