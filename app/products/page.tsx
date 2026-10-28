'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DashboardShell } from '@/components/dashboard-shell'
import { EmptyState } from '@/components/empty-state'
import { AlertCircle, Check, ChevronDown, ChevronUp, ImagePlus, Loader2, Minus, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

type Product = { id: number; name: string; description: string | null; price: number; stock: number; image_url: string | null; offers: string[] | null }
type FormState = { name: string; description: string; price: string; stock: string; offers: string[]; offerInput: string; image: File | null; preview: string | null }
const emptyForm: FormState = { name: '', description: '', price: '', stock: '10', offers: [], offerInput: '', image: null, preview: null }

function formatPrice(price: number) { return `৳${new Intl.NumberFormat('en-US').format(price)}` }
function errorText(error: { message?: string; status?: number } | null) { return `${error?.message ?? 'Something went wrong'}${error?.status ? ` (status ${error.status})` : ''}` }
function filePathFromUrl(url: string | null) { if (!url) return null; try { const marker = '/product-images/'; const index = url.indexOf(marker); return index >= 0 ? decodeURIComponent(url.slice(index + marker.length).split('?')[0]) : null } catch { return null } }

export default function ProductsPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const stockTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const notify = useCallback((type: 'success' | 'error', message: string) => { setToast({ type, message }); window.setTimeout(() => setToast(null), 4200) }, [])
  const fetchProducts = useCallback(async (showLoading = true) => {
    if (!supabase) return
    if (showLoading) setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('products').select('id,name,description,price,stock,image_url,offers').order('id', { ascending: false })
    if (error) { setError(errorText(error)); notify('error', errorText(error)) } else setProducts((data ?? []) as Product[])
    if (showLoading) setLoading(false)
  }, [notify, supabase])
  const refreshProducts = useCallback(() => fetchProducts(false), [fetchProducts])
  useEffect(() => { setSupabase(createClient()) }, [])
  useEffect(() => {
    if (!supabase) return
    void fetchProducts()
    const channel = supabase
      .channel('products-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products' }, refreshProducts)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, refreshProducts)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'products' }, refreshProducts)
      .subscribe()
    const refreshWhenActive = () => {
      if (document.visibilityState === 'visible') void refreshProducts()
    }
    document.addEventListener('visibilitychange', refreshWhenActive)
    window.addEventListener('focus', refreshWhenActive)
    return () => {
      document.removeEventListener('visibilitychange', refreshWhenActive)
      window.removeEventListener('focus', refreshWhenActive)
      void supabase.removeChannel(channel)
      Object.values(stockTimers.current).forEach(clearTimeout)
    }
  }, [fetchProducts, refreshProducts, supabase])

  const filtered = products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()))
  function openAdd() { setEditing(null); setForm(emptyForm); setFormOpen(true) }
  function openEdit(product: Product) { setEditing(product); setForm({ name: product.name, description: product.description ?? '', price: String(product.price), stock: String(product.stock), offers: product.offers ?? [], offerInput: '', image: null, preview: product.image_url }); setFormOpen(true) }
  function chooseImage(file: File | undefined) { if (!file) return; const allowed = ['image/jpeg', 'image/png', 'image/webp']; if (!allowed.includes(file.type)) { notify('error', 'Image must be JPG, PNG, or WebP.'); return } if (file.size > 3 * 1024 * 1024) { notify('error', 'Image must be smaller than 3 MB.'); return } setForm((current) => ({ ...current, image: file, preview: URL.createObjectURL(file) })) }
  function addOffer() { const offer = form.offerInput.trim(); if (offer && !form.offers.includes(offer)) setForm({ ...form, offers: [...form.offers, offer], offerInput: '' }) }
  async function saveProduct(event: React.FormEvent) {
    event.preventDefault(); if (!supabase) return; const price = Number(form.price); const stock = Number(form.stock)
    if (!form.name.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) { notify('error', 'Enter a name, a valid non-negative price, and a whole-number stock.'); return }
    setSaving(true)
    try {
      let imageUrl = editing?.image_url ?? null
      if (form.image) { const extension = form.image.name.split('.').pop()?.toLowerCase() ?? 'jpg'; const path = `${Date.now()}-${crypto.randomUUID()}.${extension}`; const upload = await supabase.storage.from('product-images').upload(path, form.image, { upsert: false, contentType: form.image.type }); if (upload.error) throw upload.error; imageUrl = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl }
      const values = { name: form.name.trim(), description: form.description.trim() || null, price, stock, offers: form.offers, image_url: imageUrl }
      const result = editing ? await supabase.from('products').update(values).eq('id', editing.id) : await supabase.from('products').insert(values)
      if (result.error) throw result.error
      if (editing && form.image && editing.image_url) { const oldPath = filePathFromUrl(editing.image_url); if (oldPath) await supabase.storage.from('product-images').remove([oldPath]) }
      await fetchProducts(); setFormOpen(false); notify('success', editing ? 'Product updated.' : 'Product added.')
    } catch (caught) { const message = errorText(caught as { message?: string; status?: number }); notify('error', message) } finally { setSaving(false) }
  }
  function changeStock(product: Product, delta: number) { if (!supabase) return; const next = Math.max(0, product.stock + delta); setProducts((current) => current.map((item) => item.id === product.id ? { ...item, stock: next } : item)); clearTimeout(stockTimers.current[product.id]); stockTimers.current[product.id] = setTimeout(async () => { const result = await supabase.from('products').update({ stock: next }).eq('id', product.id); if (result.error) notify('error', errorText(result.error)); else { await fetchProducts(); notify('success', 'Stock updated.') } }, 450) }
  async function deleteProduct() { if (!supabase || !deleting) return; const product = deleting; setDeleting(null); const result = await supabase.from('products').delete().eq('id', product.id); if (result.error) { notify('error', errorText(result.error)); return } const path = filePathFromUrl(product.image_url); if (path) await supabase.storage.from('product-images').remove([path]); await fetchProducts(); notify('success', 'Product deleted.') }

  return <DashboardShell title="Products"><div className="flex flex-col gap-6">
    {toast && <div role="status" className={`fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${toast.type === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-primary/30 bg-primary/10 text-primary'}`}><span>{toast.message}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)}><X className="size-4" /></button></div>}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-muted-foreground">Manage your storefront inventory</p></div><button onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Add product</button></div>
    <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="h-11 w-full rounded-lg border bg-background pl-10 pr-4 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring" /></div>
    {error && <div className="flex items-center justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><span className="flex items-center gap-2 text-destructive"><AlertCircle className="size-4" /> {error}</span><button onClick={() => void fetchProducts()} className="font-semibold underline">Retry</button></div>}
    {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="h-72 animate-pulse rounded-xl border bg-muted/50" />)}</div> : filtered.length === 0 ? <EmptyState /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((product) => <ProductCard key={product.id} product={product} onEdit={openEdit} onDelete={setDeleting} onStock={changeStock} />)}</div>}
  </div>
  {formOpen && <ProductForm form={form} setForm={setForm} editing={editing} saving={saving} onClose={() => setFormOpen(false)} onSave={saveProduct} onImage={chooseImage} onOffer={addOffer} />}
  {deleting && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-xl"><h2 className="text-lg font-semibold">Delete product?</h2><p className="mt-2 text-sm text-muted-foreground">This product will be permanently removed and any customers waiting for it will also be removed from the waitlist.</p><div className="mt-6 flex justify-end gap-3"><button onClick={() => setDeleting(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button onClick={deleteProduct} className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">Delete</button></div></div></div>}
  </DashboardShell>
}

function ProductCard({ product, onEdit, onDelete, onStock }: { product: Product; onEdit: (p: Product) => void; onDelete: (p: Product) => void; onStock: (p: Product, d: number) => void }) { const status = product.stock === 0 ? 'Out of stock' : product.stock <= 5 ? 'Low stock' : null; return <article className="overflow-hidden rounded-xl border bg-card shadow-sm"><div className="flex h-44 items-center justify-center bg-muted/40">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : <ImagePlus className="size-10 text-muted-foreground/40" />}</div><div className="flex flex-col gap-4 p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{product.name}</h2><p className="mt-1 text-xl font-bold">{formatPrice(Number(product.price))}</p></div>{status && <span className={`rounded-full px-2 py-1 text-xs font-medium ${product.stock === 0 ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>{status}</span>}</div>{product.description && <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>}<div className="flex flex-wrap gap-1.5">{(product.offers ?? []).map((offer) => <span key={offer} className="rounded-full bg-secondary px-2 py-1 text-xs">{offer}</span>)}</div><div className="flex items-center justify-between border-t pt-3"><div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Stock</span><button aria-label={`Decrease stock for ${product.name}`} onClick={() => onStock(product, -1)} className="rounded-md border p-1" disabled={product.stock === 0}><Minus className="size-3" /></button><strong className="min-w-6 text-center">{product.stock}</strong><button aria-label={`Increase stock for ${product.name}`} onClick={() => onStock(product, 1)} className="rounded-md border p-1"><Plus className="size-3" /></button></div><div className="flex gap-1"><button aria-label={`Edit ${product.name}`} onClick={() => onEdit(product)} className="rounded-md p-2 text-muted-foreground hover:bg-muted"><Pencil className="size-4" /></button><button aria-label={`Delete ${product.name}`} onClick={() => onDelete(product)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button></div></div></div></article> }

function ProductForm({ form, setForm, editing, saving, onClose, onSave, onImage, onOffer }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; editing: Product | null; saving: boolean; onClose: () => void; onSave: (event: React.FormEvent) => void; onImage: (file: File | undefined) => void; onOffer: () => void }) { return <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"><form onSubmit={onSave} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border bg-background p-5 shadow-xl sm:rounded-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{editing ? 'Edit product' : 'Add product'}</h2><button type="button" aria-label="Close" onClick={onClose}><X className="size-5" /></button></div><div className="mt-5 flex flex-col gap-4"><label className="flex flex-col gap-1.5 text-sm font-medium">Name *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 rounded-lg border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><label className="flex flex-col gap-1.5 text-sm font-medium">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-20 rounded-lg border bg-background p-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-1.5 text-sm font-medium">Price *<input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="h-10 rounded-lg border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><label className="flex flex-col gap-1.5 text-sm font-medium">Stock<input type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="h-10 rounded-lg border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label></div><div className="flex flex-col gap-1.5 text-sm font-medium">Offers<div className="flex gap-2"><input value={form.offerInput} onChange={(e) => setForm({ ...form, offerInput: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onOffer() } }} placeholder="Type an offer and press Enter" className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" /><button type="button" onClick={onOffer} className="rounded-lg border px-3">Add</button></div><div className="flex flex-wrap gap-2">{form.offers.map((offer) => <span key={offer} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs">{offer}<button type="button" aria-label={`Remove ${offer}`} onClick={() => setForm({ ...form, offers: form.offers.filter((item) => item !== offer) })}><X className="size-3" /></button></span>)}</div></div><label className="flex flex-col gap-1.5 text-sm font-medium">Product image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onImage(e.target.files?.[0])} className="block w-full rounded-lg border p-2 text-sm font-normal" />{form.preview && <img src={form.preview} alt="Product preview" className="h-36 w-full rounded-lg object-cover" />}</label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving && <Loader2 className="size-4 animate-spin" />}{editing ? 'Save changes' : 'Add product'}</button></div></form></div> }
