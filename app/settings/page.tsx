'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, type MotionProps } from 'framer-motion'
import { Download, ChevronRight } from 'lucide-react'
import { useClientStore } from '@/stores/useClientStore'
import { createClient as createSupabase } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import LoadingScreen from '@/components/ui/LoadingScreen'

/* ── Constants ── */
const BUILD_DATE = '2026-04-22'
const VERSION = 'v3.0'

/* ── Types ── */
interface UserProfile {
  display_name: string
  revenue_goal: number
  email: string
  role: string
}

/* ══ InlineInput ═══════════════════════════════════════════════════════ */
function InlineInput({
  value, onChange, prefix, suffix, type = 'text',
}: {
  value: string | number
  onChange: (v: string) => void
  prefix?: string
  suffix?: string
  type?: string
}) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(String(value))
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { setLocal(String(value)) }, [value])
  useEffect(() => { if (editing) ref.current?.select() }, [editing])

  function commit() {
    setEditing(false)
    onChange(local)
  }

  if (!editing) return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1 text-ink-primary hover:text-accent-blue transition-colors"
    >
      {prefix && <span className="text-xs text-ink-muted">{prefix}</span>}
      <span className="font-mono text-sm border-b border-dashed border-ink-muted/30 group-hover:border-accent-blue/50 transition-colors">
        {value}
      </span>
      {suffix && <span className="text-xs text-ink-muted">{suffix}</span>}
      <ChevronRight size={10} className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )

  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-xs text-ink-muted">{prefix}</span>}
      <input
        ref={ref} type={type} value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setLocal(String(value)); setEditing(false) } }}
        className="font-mono text-sm bg-elevated border border-accent-blue/50 rounded px-2 py-0.5 text-ink-primary outline-none w-28"
      />
      {suffix && <span className="text-xs text-ink-muted">{suffix}</span>}
    </div>
  )
}

/* ══ SystemInfo ════════════════════════════════════════════════════════ */
function SystemInfo({ profile }: { profile: UserProfile | null }) {
  const rows = [
    { label: 'Version',   value: VERSION },
    { label: 'Build Date', value: BUILD_DATE },
    { label: 'Email',     value: profile?.email ?? '—' },
    { label: 'Role',      value: profile?.role?.toUpperCase() ?? '—' },
    { label: 'Engine',    value: 'Next.js 16 · Supabase · Zustand' },
  ]

  return (
    <section>
      <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase mb-3">System Info</h2>
      <div className="bg-card border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3">
            <span className="font-display text-[10px] tracking-widest text-ink-secondary uppercase">{label}</span>
            <span className="font-mono text-xs text-ink-primary">{value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ══ ClientSettings ════════════════════════════════════════════════════ */
function ClientSettings() {
  const clients = useClientStore(s => s.clients)
  const addToast = useAppStore(s => s.addToast)

  async function update(
    id: string,
    field: 'label' | 'color' | 'revenue' | 'script_target' | 'edit_target',
    raw: string
  ) {
    const supabase = createSupabase()
    const patch: {
      label?: string; color?: string; revenue?: number; script_target?: number; edit_target?: number
    } = {}
    if (field === 'label') patch.label = raw
    else if (field === 'color') patch.color = raw
    else if (field === 'revenue') patch.revenue = Math.max(0, parseInt(raw) || 0)
    else if (field === 'script_target') patch.script_target = Math.max(0, parseInt(raw) || 0)
    else if (field === 'edit_target') patch.edit_target = Math.max(0, parseInt(raw) || 0)
    const { error } = await supabase.from('clients').update(patch).eq('id', id)
    if (error) {
      addToast({ type: 'warning', message: '儲存失敗：' + error.message })
      return
    }
    // Reload to propagate to CLIENT_CONFIG module-level state
    await useClientStore.getState().loadAll()
    addToast({ type: 'success', message: '設定已儲存' })
  }

  return (
    <section>
      <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase mb-3">Client Settings</h2>
      <div className="space-y-2">
        {clients.map(c => (
          <div key={c.id} className="bg-card border border-border-subtle rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <InlineInput value={c.label} onChange={v => update(c.id, 'label', v)} />
              <span className="ml-auto text-[10px] font-mono text-ink-muted">{c.key}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-0 divide-x divide-y divide-border-subtle/50">
              {([
                { key: 'revenue',       label: '月收入目標', prefix: 'NT$', suffix: '' },
                { key: 'script_target', label: '腳本月目標', prefix: '',    suffix: '支' },
                { key: 'edit_target',   label: '剪輯月目標', prefix: '',    suffix: '支' },
              ] as const).map(({ key, label, prefix, suffix }) => (
                <div key={key} className="px-4 py-3">
                  <p className="font-display text-[9px] tracking-wider text-ink-muted uppercase mb-1.5">{label}</p>
                  <InlineInput
                    value={c[key] as number}
                    onChange={v => update(c.id, key, v)}
                    prefix={prefix} suffix={suffix} type="number"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-ink-muted mt-2 font-body">點擊欄位直接編輯，Enter 確認，Esc 取消。</p>
    </section>
  )
}

/* ══ Personalization ═══════════════════════════════════════════════════ */
function Personalization({ profile, onUpdate }: {
  profile: UserProfile | null
  onUpdate: (field: 'display_name' | 'revenue_goal', value: string | number) => Promise<void>
}) {
  if (!profile) return null
  return (
    <section>
      <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase mb-3">Personalization</h2>
      <div className="bg-card border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-display text-[10px] tracking-widest text-ink-secondary uppercase">顯示名稱</span>
          <InlineInput value={profile.display_name} onChange={v => onUpdate('display_name', v)} />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-display text-[10px] tracking-widest text-ink-secondary uppercase">每月收入目標</span>
          <InlineInput
            value={profile.revenue_goal}
            onChange={v => onUpdate('revenue_goal', Math.max(0, parseInt(v) || 0))}
            prefix="NT$" type="number"
          />
        </div>
      </div>
    </section>
  )
}

/* ══ DataManagement ════════════════════════════════════════════════════ */
function DataManagement() {
  const addToast = useAppStore(s => s.addToast)

  async function handleExport() {
    const supabase = createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const tables = [
      'clients', 'tasks', 'daily_notes', 'modes', 'monthly_outputs',
      'field_trips', 'deadlines', 'learning_topics', 'learning_entries',
      'inspirations', 'weekly_reviews', 'win_condition_templates',
    ] as const

    const dump: Record<string, unknown> = { exported_at: new Date().toISOString() }
    for (const t of tables) {
      const { data } = await supabase.from(t).select('*')
      dump[t] = data ?? []
    }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    dump.profile = profile

    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date().toISOString().split('T')[0]
    a.href = url; a.download = `alvin-os-backup-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
    addToast({ type: 'success', message: '備份檔案已下載' })
  }

  return (
    <section>
      <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase mb-3">Data Management</h2>
      <div className="space-y-3">
        <div className="bg-card border border-accent-blue/20 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-[10px] tracking-widest text-accent-blue uppercase mb-0.5">匯出備份</p>
            <p className="text-xs text-ink-secondary font-body">下載所有 Supabase 上的個人資料為 JSON</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue/15 text-accent-blue rounded-lg
              border border-accent-blue/30 hover:bg-accent-blue/25 transition-all font-display text-[10px] tracking-widest shrink-0"
          >
            <Download size={13} /> 匯出
          </button>
        </div>
      </div>
    </section>
  )
}

/* ══ MAIN ════════════════════════════════════════════════════════════════ */
const fadeUp = (delay: number): MotionProps => ({
  initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4 },
})

export default function SettingsPage() {
  const [loaded, setLoaded] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const clientsLoaded = useClientStore(s => s.loaded)
  const loadClients = useClientStore(s => s.loadAll)
  const addToast = useAppStore(s => s.addToast)

  useEffect(() => { if (!clientsLoaded) loadClients() }, [clientsLoaded, loadClients])

  useEffect(() => {
    (async () => {
      const supabase = createSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoaded(true); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile({
          display_name: data.display_name ?? '',
          revenue_goal: data.revenue_goal,
          email: data.email,
          role: data.role,
        })
      }
      setLoaded(true)
    })()
  }, [])

  async function updateProfile(field: 'display_name' | 'revenue_goal', value: string | number) {
    if (!profile) return
    const supabase = createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const updated = { ...profile, [field]: value }
    setProfile(updated)
    const patch: { display_name?: string; revenue_goal?: number } =
      field === 'display_name' ? { display_name: String(value) } : { revenue_goal: Number(value) }
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
    if (error) addToast({ type: 'warning', message: '儲存失敗：' + error.message })
    else addToast({ type: 'success', message: '已儲存' })
  }

  if (!loaded || !clientsLoaded) return <LoadingScreen label="LOADING SETTINGS" />

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 space-y-8 pb-24">
      <motion.div {...fadeUp(0)}>
        <h1 className="font-display text-xl text-ink-primary tracking-wider">Settings</h1>
        <p className="font-body text-xs text-ink-secondary mt-1">系統設定 · 客戶管理 · 資料備份</p>
      </motion.div>

      <motion.div {...fadeUp(0.05)}><SystemInfo profile={profile} /></motion.div>
      <motion.div {...fadeUp(0.1)}><ClientSettings /></motion.div>
      <motion.div {...fadeUp(0.15)}><Personalization profile={profile} onUpdate={updateProfile} /></motion.div>
      <motion.div {...fadeUp(0.2)}><DataManagement /></motion.div>
    </div>
  )
}
