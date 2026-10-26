'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell, ChevronDown, History, Home, LogOut, Menu, Moon, Package, Settings, ShoppingBag, Sun, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useNotifications } from '@/components/notifications-provider'

const items = [
  { label: 'Overview', href: '/', icon: Home },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Orders', href: '/orders', icon: ShoppingBag },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'History', href: '/history', icon: History },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function DashboardShell({ children, title, email }: { children: React.ReactNode; title: string; email?: string }) {
  const pathname = usePathname(); const router = useRouter(); const { unreadCount } = useNotifications(); const [dark, setDark] = useState(false); const [open, setOpen] = useState<boolean | 'user'>(false)
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])
  async function logout() { await createClient().auth.signOut(); router.push('/login') }
  return <div className="min-h-screen bg-background lg:flex">
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card p-5 lg:flex lg:flex-col">
      <Link href="/" className="mb-10 flex items-center gap-3 px-2"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground font-bold">D</span><span className="text-lg font-semibold tracking-tight">Dokan</span></Link>
      <nav className="flex flex-col gap-1">{items.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${pathname === href ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="size-4" />{label}{label === 'Notifications' && unreadCount > 0 && <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{unreadCount > 9 ? '9+' : unreadCount}</span>}</Link>)}</nav>
      <div className="mt-auto rounded-2xl bg-primary/10 p-4"><p className="text-sm font-semibold text-primary">Your store is ready</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Manage everything from one simple dashboard.</p></div>
    </aside>
    <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-20 lg:pb-0">
      <header className="flex h-20 items-center justify-between border-b border-border bg-background/80 px-5 backdrop-blur-md sm:px-8"><div className="flex items-center gap-3"><button className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X className="size-5" /> : <Menu className="size-5" />}</button><h1 className="text-xl font-semibold tracking-tight">{title}</h1></div><div className="flex items-center gap-2"><button onClick={() => setDark(!dark)} className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted" aria-label="Toggle dark mode">{dark ? <Sun className="size-4" /> : <Moon className="size-4" />}</button><div className="relative"><button onClick={() => setOpen(open === 'user' ? false : 'user')} className="flex items-center gap-2 rounded-xl p-1.5 pr-2 hover:bg-muted"><span className="grid size-8 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{email?.[0]?.toUpperCase() ?? 'A'}</span><ChevronDown className="hidden size-4 text-muted-foreground sm:block" /></button>{open === 'user' && <div className="absolute right-0 top-12 z-20 w-56 rounded-xl border border-border bg-card p-2 shadow-xl"><p className="truncate px-3 py-2 text-xs text-muted-foreground">{email ?? 'Store admin'}</p><button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"><LogOut className="size-4" />Log out</button></div>}</div></div></header>
      {open && open !== 'user' && <div className="absolute inset-x-4 top-20 z-10 rounded-2xl border border-border bg-card p-3 shadow-xl lg:hidden"><nav className="flex flex-col gap-1">{items.map(({ label, href, icon: Icon }) => <Link onClick={() => setOpen(false)} key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${pathname === href ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}><Icon className="size-4" />{label}{label === 'Notifications' && unreadCount > 0 && <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{unreadCount > 9 ? '9+' : unreadCount}</span>}</Link>)}</nav></div>}
      <main className="flex-1 px-5 py-7 sm:px-8 sm:py-9">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-card/95 px-2 py-2 backdrop-blur lg:hidden">{items.slice(0, 5).map(({ label, href, icon: Icon }) => <Link key={href} href={href} className={`relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium ${pathname === href ? 'text-primary' : 'text-muted-foreground'}`}><Icon className="size-4" />{label}{label === 'Notifications' && unreadCount > 0 && <span className="absolute right-1/4 top-0 rounded-full bg-primary px-1 text-[9px] text-primary-foreground">{unreadCount > 9 ? '9+' : unreadCount}</span>}</Link>)}</nav>
    </div>
  </div>
}
