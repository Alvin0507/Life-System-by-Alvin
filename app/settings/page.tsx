'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, type MotionProps } from 'framer-motion'
import { Download, ChevronRight, Plus, Archive, RotateCcw, Trash2 } from 'lucide-react'
import { useClientStore } from '@/stores/useClientStore'
import { createClient as createSupabase } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import LoadingScreen from '@/components/ui/LoadingScreen'
import type { Client } from '@/types'

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
            <span className="font-display text-[12px] tracking-widest text-ink-secondary uppercase">{label}</span>
            <span className="font-mono text-xs text-ink-primary">{value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ══ ClientSettings ════════════════════════════════════════════════════ */
const DEFAULT_CLIENT_COLORS = ['#60a5fa', '#f59e0b', '#34d399', '#c084fc', '#fb7185', '#facc15']

function ClientSettings() {
  const clients = useClientStore(s => s.clients)
  const addClient = useClientStore(s => s.addClient)
  const archiveClient = useClientStore(s => s.archiveClient)
  const restoreClient = useClientStore(s => s.restoreClient)
  const listArchivedClients = useClientStore(s => s.listArchivedClients)
  const addToast = useAppStore(s => s.addToast)

  const [archived, setArchived] = useState<Client[]>([])
  const [showArchive, setShowArchive] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ key: '', label: '', color: DEFAULT_CLIENT_COLORS[0] })

  const refreshArchived = useCallback(async () => {
    const list = await listArchivedClients()
    setArchived(list)
  }, [listArchivedClients])

  useEffect(() => { if (showArchive) refreshArchived() }, [showArchive, refreshArchived])

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
    await useClientStore.getState().loadAll()
    addToast({ type: 'success', message: '設定已儲存' })
  }

  async function handleAdd() {
    const key = draft.key.trim().toLowerCase().replace(/\s+/g, '_')
    const label = draft.label.trim()
    if (!key || !label) {
      addToast({ type: 'warning', message: 'Key 與顯示名稱都必填' })
      return
    }
    if (clients.some(c => c.key === key)) {
      addToast({ type: 'warning', message: '此 Key 已存在' })
      return
    }
    const created = await addClient({
      key, label, color: draft.color,
      revenue: 0, script_target: 0, edit_target: 0,
    })
    if (!created) {
      addToast({ type: 'warning', message: '新增失敗' })
      return
    }
    setDraft({ key: '', label: '', color: DEFAULT_CLIENT_COLORS[0] })
    setAdding(false)
    addToast({ type: 'success', message: '已新增客戶' })
  }

  async function handleArchive(id: string, label: string) {
    if (!confirm(`封存「${label}」？封存後該客戶不會出現在選單中，但歷史資料會保留。`)) return
    await archiveClient(id)
    addToast({ type: 'success', message: '已封存' })
  }

  async function handleRestore(id: string) {
    await restoreClient(id)
    await refreshArchived()
    addToast({ type: 'success', message: '已還原' })
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase">Client Settings</h2>
        <button
          onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1 px-2.5 py-1 bg-accent-blue/15 text-accent-blue rounded-md
            border border-accent-blue/30 hover:bg-accent-blue/25 transition-all font-display text-[11px] tracking-widest"
        >
          <Plus size={11} /> {adding ? 'Cancel' : 'Add'}
        </button>
      </div>

      {adding && (
        <div className="bg-card border border-accent-blue/30 rounded-xl p-4 mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1">Key</p>
              <input
                value={draft.key}
                onChange={e => setDraft(d => ({ ...d, key: e.target.value }))}
                placeholder="e.g. my_client"
                className="w-full font-mono text-sm bg-elevated border border-border-subtle rounded px-2 py-1.5 text-ink-primary outline-none focus:border-accent-blue"
              />
            </div>
            <div>
              <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1">Label</p>
              <input
                value={draft.label}
                onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
                placeholder="顯示名稱"
                className="w-full font-body text-sm bg-elevated border border-border-subtle rounded px-2 py-1.5 text-ink-primary outline-none focus:border-accent-blue"
              />
            </div>
          </div>
          <div>
            <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1.5">Color</p>
            <div className="flex gap-2">
              {DEFAULT_CLIENT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setDraft(d => ({ ...d, color: c }))}
                  className={`w-7 h-7 rounded-full transition-all ${draft.color === c ? 'ring-2 ring-offset-2 ring-offset-card ring-accent-blue scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="w-full px-3 py-2 bg-accent-blue/20 text-accent-blue rounded-lg
              border border-accent-blue/40 hover:bg-accent-blue/30 transition-all font-display text-[12px] tracking-widest"
          >
            建立客戶
          </button>
        </div>
      )}

      <div className="space-y-2">
        {clients.map(c => (
          <div key={c.id} className="bg-card border border-border-subtle rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <InlineInput value={c.label} onChange={v => update(c.id, 'label', v)} />
              <span className="ml-auto text-[12px] font-mono text-ink-muted">{c.key}</span>
              <button
                onClick={() => handleArchive(c.id, c.label)}
                className="p-1 text-ink-muted hover:text-accent-gold transition-colors"
                title="封存"
              >
                <Archive size={13} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-0 divide-x divide-y divide-border-subtle/50">
              {([
                { key: 'revenue',       label: '月收入目標', prefix: 'NT$', suffix: '' },
                { key: 'script_target', label: '腳本月目標', prefix: '',    suffix: '支' },
                { key: 'edit_target',   label: '剪輯月目標', prefix: '',    suffix: '支' },
              ] as const).map(({ key, label, prefix, suffix }) => (
                <div key={key} className="px-4 py-3">
                  <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1.5">{label}</p>
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

      <button
        onClick={() => setShowArchive(s => !s)}
        className="mt-3 text-[12px] font-display tracking-widest text-ink-muted hover:text-ink-secondary uppercase"
      >
        {showArchive ? '▾ Hide' : '▸ Show'} Archived ({archived.length || '?'})
      </button>

      {showArchive && (
        <div className="mt-2 space-y-2">
          {archived.length === 0 ? (
            <p className="text-[12px] text-ink-muted font-body px-3 py-2">沒有封存的客戶</p>
          ) : archived.map(c => (
            <div key={c.id} className="bg-card/50 border border-border-subtle/50 rounded-lg flex items-center gap-3 px-4 py-2.5">
              <div className="w-2 h-2 rounded-full shrink-0 opacity-50" style={{ backgroundColor: c.color }} />
              <span className="font-body text-xs text-ink-muted">{c.label}</span>
              <span className="text-[12px] font-mono text-ink-muted/60">{c.key}</span>
              <button
                onClick={() => handleRestore(c.id)}
                className="ml-auto flex items-center gap-1 text-[11px] font-display tracking-widest text-accent-blue hover:text-accent-blue/80 uppercase"
              >
                <RotateCcw size={10} /> Restore
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[12px] text-ink-muted mt-2 font-body">點擊欄位直接編輯，Enter 確認，Esc 取消。</p>
    </section>
  )
}

/* ══ ModeSettings ══════════════════════════════════════════════════════ */
interface ModeRow {
  id: string
  key: string
  label: string
  subtitle: string
  description: string | null
  color: string
  icon: string
  is_default: boolean
  sort_order: number
}

const MODE_PALETTE = ['#60a5fa', '#ef4444', '#34d399', '#f59e0b', '#c084fc', '#94a3b8']

function ModeSettings() {
  const addToast = useAppStore(s => s.addToast)
  const [modes, setModes] = useState<ModeRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ key: '', label: '', subtitle: '', color: MODE_PALETTE[0], icon: '✦' })

  const load = useCallback(async () => {
    const supabase = createSupabase()
    const { data } = await supabase.from('modes').select('*').order('sort_order')
    setModes((data ?? []) as ModeRow[])
    setLoaded(true)
  }, [])

  useEffect(() => { load() }, [load])

  async function update(id: string, patch: Partial<ModeRow>) {
    const supabase = createSupabase()
    const { error } = await supabase.from('modes').update(patch).eq('id', id)
    if (error) { addToast({ type: 'warning', message: '儲存失敗：' + error.message }); return }
    setModes(ms => ms.map(m => m.id === id ? { ...m, ...patch } : m))
    addToast({ type: 'success', message: '已儲存' })
  }

  async function handleAdd() {
    const key = draft.key.trim().toLowerCase().replace(/\s+/g, '_')
    const label = draft.label.trim()
    if (!key || !label) { addToast({ type: 'warning', message: 'Key 與 Label 必填' }); return }
    if (modes.some(m => m.key === key)) { addToast({ type: 'warning', message: '此 Key 已存在' }); return }
    const supabase = createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const nextOrder = (modes[modes.length - 1]?.sort_order ?? -1) + 1
    const { error } = await supabase.from('modes').insert({
      user_id: user.id,
      key, label,
      subtitle: draft.subtitle || label,
      color: draft.color,
      icon: draft.icon || '✦',
      sort_order: nextOrder,
      is_default: false,
    })
    if (error) { addToast({ type: 'warning', message: '新增失敗：' + error.message }); return }
    setDraft({ key: '', label: '', subtitle: '', color: MODE_PALETTE[0], icon: '✦' })
    setAdding(false)
    await load()
    addToast({ type: 'success', message: '模式已建立' })
  }

  async function handleDelete(id: string, label: string, isDefault: boolean) {
    if (isDefault) { addToast({ type: 'warning', message: '預設模式無法刪除' }); return }
    if (!confirm(`刪除模式「${label}」？`)) return
    const supabase = createSupabase()
    const { error } = await supabase.from('modes').delete().eq('id', id)
    if (error) { addToast({ type: 'warning', message: '刪除失敗：' + error.message }); return }
    setModes(ms => ms.filter(m => m.id !== id))
    addToast({ type: 'success', message: '已刪除' })
  }

  if (!loaded) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase">Modes</h2>
        <button
          onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1 px-2.5 py-1 bg-accent-blue/15 text-accent-blue rounded-md
            border border-accent-blue/30 hover:bg-accent-blue/25 transition-all font-display text-[11px] tracking-widest"
        >
          <Plus size={11} /> {adding ? 'Cancel' : 'Add'}
        </button>
      </div>

      {adding && (
        <div className="bg-card border border-accent-blue/30 rounded-xl p-4 mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1">Key</p>
              <input value={draft.key} onChange={e => setDraft(d => ({ ...d, key: e.target.value }))} placeholder="e.g. focus"
                className="w-full font-mono text-sm bg-elevated border border-border-subtle rounded px-2 py-1.5 text-ink-primary outline-none focus:border-accent-blue" />
            </div>
            <div>
              <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1">Icon</p>
              <input value={draft.icon} onChange={e => setDraft(d => ({ ...d, icon: e.target.value }))} placeholder="✦" maxLength={2}
                className="w-full font-body text-sm bg-elevated border border-border-subtle rounded px-2 py-1.5 text-ink-primary outline-none focus:border-accent-blue" />
            </div>
          </div>
          <div>
            <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1">Label</p>
            <input value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} placeholder="顯示名稱"
              className="w-full font-body text-sm bg-elevated border border-border-subtle rounded px-2 py-1.5 text-ink-primary outline-none focus:border-accent-blue" />
          </div>
          <div>
            <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1">Subtitle</p>
            <input value={draft.subtitle} onChange={e => setDraft(d => ({ ...d, subtitle: e.target.value }))} placeholder="副標題"
              className="w-full font-body text-sm bg-elevated border border-border-subtle rounded px-2 py-1.5 text-ink-primary outline-none focus:border-accent-blue" />
          </div>
          <div>
            <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1.5">Color</p>
            <div className="flex gap-2">
              {MODE_PALETTE.map(c => (
                <button key={c} onClick={() => setDraft(d => ({ ...d, color: c }))}
                  className={`w-7 h-7 rounded-full transition-all ${draft.color === c ? 'ring-2 ring-offset-2 ring-offset-card ring-accent-blue scale-110' : ''}`}
                  style={{ backgroundColor: c }} aria-label={c} />
              ))}
            </div>
          </div>
          <button onClick={handleAdd}
            className="w-full px-3 py-2 bg-accent-blue/20 text-accent-blue rounded-lg border border-accent-blue/40 hover:bg-accent-blue/30 transition-all font-display text-[12px] tracking-widest">
            建立模式
          </button>
        </div>
      )}

      <div className="space-y-2">
        {modes.map(m => (
          <div key={m.id} className="bg-card border border-border-subtle rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
              <span className="text-lg shrink-0" style={{ color: m.color }}>{m.icon}</span>
              <InlineInput value={m.label} onChange={v => update(m.id, { label: v })} />
              <span className="ml-auto text-[12px] font-mono text-ink-muted">{m.key}</span>
              {!m.is_default && (
                <button onClick={() => handleDelete(m.id, m.label, m.is_default)}
                  className="p-1 text-ink-muted hover:text-accent-red transition-colors" title="刪除">
                  <Trash2 size={13} />
                </button>
              )}
              {m.is_default && (
                <span className="text-[11px] font-display tracking-widest text-accent-gold/80 uppercase">Default</span>
              )}
            </div>
            <div className="px-4 py-3 space-y-2">
              <div>
                <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1">Subtitle</p>
                <InlineInput value={m.subtitle} onChange={v => update(m.id, { subtitle: v })} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ══ LearningTopicSettings ═════════════════════════════════════════════ */
interface TopicRow {
  id: string
  label: string
  emoji: string
  archived: boolean
  sort_order: number
}

function LearningTopicSettings() {
  const addToast = useAppStore(s => s.addToast)
  const [topics, setTopics] = useState<TopicRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [draftLabel, setDraftLabel] = useState('')
  const [draftEmoji, setDraftEmoji] = useState('📘')

  const load = useCallback(async () => {
    const supabase = createSupabase()
    const { data } = await supabase.from('learning_topics').select('*').order('sort_order')
    setTopics((data ?? []) as TopicRow[])
    setLoaded(true)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    const label = draftLabel.trim()
    if (!label) return
    const supabase = createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const nextOrder = (topics[topics.length - 1]?.sort_order ?? -1) + 1
    const { error } = await supabase.from('learning_topics').insert({
      user_id: user.id, label, emoji: draftEmoji || '📘', sort_order: nextOrder, archived: false,
    })
    if (error) { addToast({ type: 'warning', message: '新增失敗：' + error.message }); return }
    setDraftLabel(''); setDraftEmoji('📘')
    await load()
    addToast({ type: 'success', message: '主題已建立' })
  }

  async function toggleArchive(id: string, archived: boolean) {
    const supabase = createSupabase()
    const { error } = await supabase.from('learning_topics').update({ archived: !archived }).eq('id', id)
    if (error) { addToast({ type: 'warning', message: '失敗：' + error.message }); return }
    setTopics(ts => ts.map(t => t.id === id ? { ...t, archived: !archived } : t))
  }

  async function updateLabel(id: string, label: string) {
    const supabase = createSupabase()
    const { error } = await supabase.from('learning_topics').update({ label }).eq('id', id)
    if (error) { addToast({ type: 'warning', message: '儲存失敗' }); return }
    setTopics(ts => ts.map(t => t.id === id ? { ...t, label } : t))
  }

  if (!loaded) return null
  const active = topics.filter(t => !t.archived)
  const archivedList = topics.filter(t => t.archived)

  return (
    <section>
      <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase mb-3">Learning Topics</h2>

      <div className="bg-card border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle">
        {active.map(t => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-base shrink-0">{t.emoji}</span>
            <InlineInput value={t.label} onChange={v => updateLabel(t.id, v)} />
            <button onClick={() => toggleArchive(t.id, t.archived)}
              className="ml-auto p-1 text-ink-muted hover:text-accent-gold transition-colors" title="封存">
              <Archive size={13} />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-elevated/30">
          <input value={draftEmoji} onChange={e => setDraftEmoji(e.target.value)} maxLength={2}
            className="w-10 text-center font-body text-base bg-elevated border border-border-subtle rounded px-1 py-1 text-ink-primary outline-none focus:border-accent-blue" />
          <input value={draftLabel} onChange={e => setDraftLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            placeholder="新主題..."
            className="flex-1 font-body text-sm bg-elevated border border-border-subtle rounded px-2 py-1 text-ink-primary outline-none focus:border-accent-blue" />
          <button onClick={handleAdd}
            className="flex items-center gap-1 px-2.5 py-1 bg-accent-blue/15 text-accent-blue rounded-md border border-accent-blue/30 hover:bg-accent-blue/25 transition-all font-display text-[11px] tracking-widest">
            <Plus size={11} /> Add
          </button>
        </div>
      </div>

      {archivedList.length > 0 && (
        <>
          <button onClick={() => setShowArchived(s => !s)}
            className="mt-3 text-[12px] font-display tracking-widest text-ink-muted hover:text-ink-secondary uppercase">
            {showArchived ? '▾ Hide' : '▸ Show'} Archived ({archivedList.length})
          </button>
          {showArchived && (
            <div className="mt-2 space-y-1.5">
              {archivedList.map(t => (
                <div key={t.id} className="bg-card/50 border border-border-subtle/50 rounded-lg flex items-center gap-3 px-4 py-2">
                  <span className="text-sm opacity-50">{t.emoji}</span>
                  <span className="font-body text-xs text-ink-muted">{t.label}</span>
                  <button onClick={() => toggleArchive(t.id, t.archived)}
                    className="ml-auto flex items-center gap-1 text-[11px] font-display tracking-widest text-accent-blue hover:text-accent-blue/80 uppercase">
                    <RotateCcw size={10} /> Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
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
          <span className="font-display text-[12px] tracking-widest text-ink-secondary uppercase">顯示名稱</span>
          <InlineInput value={profile.display_name} onChange={v => onUpdate('display_name', v)} />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-display text-[12px] tracking-widest text-ink-secondary uppercase">每月收入目標</span>
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
            <p className="font-display text-[12px] tracking-widest text-accent-blue uppercase mb-0.5">匯出備份</p>
            <p className="text-xs text-ink-secondary font-body">下載所有 Supabase 上的個人資料為 JSON</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue/15 text-accent-blue rounded-lg
              border border-accent-blue/30 hover:bg-accent-blue/25 transition-all font-display text-[12px] tracking-widest shrink-0"
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
      <motion.div {...fadeUp(0.1)}><Personalization profile={profile} onUpdate={updateProfile} /></motion.div>
      <motion.div {...fadeUp(0.15)}><ClientSettings /></motion.div>
      <motion.div {...fadeUp(0.2)}><ModeSettings /></motion.div>
      <motion.div {...fadeUp(0.25)}><LearningTopicSettings /></motion.div>
      <motion.div {...fadeUp(0.3)}><DataManagement /></motion.div>
    </div>
  )
}
