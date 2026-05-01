'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Command, Zap, Calendar, Briefcase, Brain, Settings,
  Plus, Sparkles, MessageSquare, ArrowRight, CornerDownLeft, Folder,
} from 'lucide-react'
import { useTodayStore } from '@/stores/useTodayStore'
import { useLearnStore } from '@/stores/useLearnStore'
import { useClientStore, CLIENT_ORDER, CLIENT_CONFIG, getClientIdByKey } from '@/stores/useClientStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useAppStore } from '@/stores/useAppStore'
import { createClient as createSupabase, getSessionUser } from '@/lib/supabase/client'
import { getTodayString } from '@/lib/utils'
import { TaskCategory, ClientName, Inspiration } from '@/types'

type Mode = 'root' | 'add-task' | 'add-spark' | 'add-message'

interface NavItem {
  id: string
  label: string
  href: string
  icon: typeof Zap
  accent: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',     label: 'Home',     href: '/',         icon: Command,   accent: '#a3a3c2' },
  { id: 'today',    label: 'Today',    href: '/today',    icon: Zap,       accent: '#00d4ff' },
  { id: 'weekly',   label: 'Weekly',   href: '/weekly',   icon: Calendar,  accent: '#7c3aed' },
  { id: 'clients',  label: 'Clients',  href: '/clients',  icon: Briefcase, accent: '#ff8c42' },
  { id: 'learn',    label: 'Learn',    href: '/learn',    icon: Brain,     accent: '#00ff88' },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings,  accent: '#7070a0' },
]

const TASK_CATEGORIES: { value: TaskCategory; label: string; accent: string }[] = [
  { value: 'win_condition', label: '勝利條件', accent: '#ffd700' },
  { value: 'client',        label: '客戶',     accent: '#ff3860' },
  { value: 'social',        label: '社群',     accent: '#ffd700' },
  { value: 'growth',        label: '成長',     accent: '#00ff88' },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('root')
  const [query, setQuery] = useState('')
  const [hoverIdx, setHoverIdx] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()
  const addToast = useAppStore(s => s.addToast)

  const addTask = useTodayStore(s => s.addTask)
  const setInsps = useLearnStore(s => s.setInsps)
  const inspirations = useLearnStore(s => s.insps)
  const clientsLoaded = useClientStore(s => s.loaded)
  const loadClients = useClientStore(s => s.loadAll)
  const projects = useProjectStore(s => s.projects)
  const loadProjects = useProjectStore(s => s.loadAll)

  /* category / client for task mode */
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('client')
  const [taskClient, setTaskClient] = useState<ClientName | ''>('')
  const [taskProjectId, setTaskProjectId] = useState<string>('')

  /* ── global hotkey + custom event ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        if (mode !== 'root') { setMode('root'); setQuery('') }
        else setOpen(false)
      }
    }
    function onOpen() { setOpen(true) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('cmdk:open', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('cmdk:open', onOpen)
    }
  }, [open, mode])

  /* reset on close */
  useEffect(() => {
    if (!open) {
      setMode('root')
      setQuery('')
      setHoverIdx(0)
      return
    }
    if (!clientsLoaded) loadClients()
    loadProjects()
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [open, clientsLoaded, loadClients, loadProjects])

  /* default client when palette opens task mode */
  useEffect(() => {
    if (mode === 'add-task' && !taskClient && CLIENT_ORDER.length) {
      setTaskClient(CLIENT_ORDER[0])
    }
  }, [mode, taskClient])

  /* ── root command list ── */
  type RootCmd = { id: string; label: string; hint: string; icon: typeof Zap; accent: string; run: () => void }
  const rootCommands: RootCmd[] = useMemo(() => {
    const list: RootCmd[] = [
      {
        id: 'add-task', label: '新增任務', hint: 'Add task to Today',
        icon: Plus, accent: '#00d4ff', run: () => { setMode('add-task'); setQuery('') },
      },
      {
        id: 'add-spark', label: '記錄靈感', hint: 'Add inspiration',
        icon: Sparkles, accent: '#ffd700', run: () => { setMode('add-spark'); setQuery('') },
      },
      {
        id: 'add-message', label: '送訊息給夥伴', hint: 'Post shared message',
        icon: MessageSquare, accent: '#60a5fa', run: () => { setMode('add-message'); setQuery('') },
      },
    ]
    for (const n of NAV_ITEMS) {
      list.push({
        id: `nav-${n.id}`, label: `前往 ${n.label}`, hint: n.href,
        icon: n.icon, accent: n.accent,
        run: () => { router.push(n.href); setOpen(false) },
      })
    }
    return list
  }, [router])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rootCommands
    return rootCommands.filter(c =>
      c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q)
    )
  }, [rootCommands, query])

  useEffect(() => { setHoverIdx(0) }, [query, mode])

  /* ── action runners ── */
  async function submitTask() {
    const content = query.trim()
    if (!content || submitting) return
    setSubmitting(true)
    try {
      await addTask({
        date: getTodayString(),
        category: taskCategory,
        client: taskCategory === 'client' ? (taskClient || undefined) : undefined,
        content,
        completed: false,
        project_id: taskCategory === 'client' && taskProjectId ? taskProjectId : null,
      })
      setTaskProjectId('')
      addToast({ type: 'success', message: '任務已加到今日' })
      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function submitSpark() {
    const content = query.trim()
    if (!content || submitting) return
    setSubmitting(true)
    try {
      const supabase = createSupabase()
      const user = await getSessionUser()
      if (!user) { addToast({ type: 'warning', message: '請先登入' }); return }
      const { data, error } = await supabase
        .from('inspirations')
        .insert({ user_id: user.id, content, tags: [] })
        .select()
        .single()
      if (error || !data) { addToast({ type: 'warning', message: '儲存失敗' }); return }
      const newInsp: Inspiration = {
        id: data.id, content: data.content, tags: data.tags ?? [], created_at: data.created_at,
      }
      setInsps([newInsp, ...inspirations])
      addToast({ type: 'success', message: '靈感已記錄' })
      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function submitMessage() {
    const content = query.trim()
    if (!content || submitting) return
    setSubmitting(true)
    try {
      const supabase = createSupabase()
      const user = await getSessionUser()
      if (!user) { addToast({ type: 'warning', message: '請先登入' }); return }
      const { error } = await supabase
        .from('shared_notes')
        .insert({ author_id: user.id, content })
      if (error) { addToast({ type: 'warning', message: '送出失敗' }); return }
      addToast({ type: 'success', message: '訊息已送出' })
      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  function onKeyDownInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mode === 'root') {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHoverIdx(i => Math.min(filtered.length - 1, i + 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setHoverIdx(i => Math.max(0, i - 1)) }
      if (e.key === 'Enter')     { e.preventDefault(); filtered[hoverIdx]?.run() }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (mode === 'add-task') submitTask()
      else if (mode === 'add-spark') submitSpark()
      else if (mode === 'add-message') submitMessage()
    }
  }

  /* ── header label per mode ── */
  const placeholder =
    mode === 'add-task'    ? '輸入任務內容...' :
    mode === 'add-spark'   ? '記下這個靈感...' :
    mode === 'add-message' ? '寫一則給夥伴的訊息...' :
                             '輸入指令或搜尋... (⌘K)'

  return (
    <>
      {/* Mobile FAB */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="
          md:hidden fixed bottom-20 right-4 z-[150]
          w-12 h-12 rounded-full
          bg-accent-blue/90 text-void
          flex items-center justify-center
          shadow-[0_8px_24px_rgba(0,212,255,0.45)]
          active:scale-95 transition-transform
        "
      >
        <Plus size={22} strokeWidth={2.4} />
      </button>

      <AnimatePresence>
        {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-xl bg-card border border-border-active rounded-xl overflow-hidden"
            style={{ boxShadow: '0 24px 60px -20px rgba(0,212,255,0.25), 0 0 0 1px rgba(255,255,255,0.04)' }}
          >
            {/* Top bar */}
            <div className="flex items-center gap-2 px-4 h-12 border-b border-border-subtle">
              {mode === 'root' ? (
                <Command size={14} className="text-accent-blue shrink-0" />
              ) : (
                <button
                  onClick={() => { setMode('root'); setQuery('') }}
                  className="text-ink-muted hover:text-ink-primary text-[11px] font-display tracking-widest"
                >
                  ← BACK
                </button>
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onKeyDownInput}
                placeholder={placeholder}
                className="flex-1 bg-transparent outline-none text-sm text-ink-primary font-body placeholder:text-ink-muted"
              />
              {mode === 'root' && (
                <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border-subtle bg-elevated text-[10px] font-mono text-ink-muted">
                  ⌘K
                </kbd>
              )}
            </div>

            {/* Body */}
            {mode === 'root' && (
              <div className="max-h-[60vh] overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-ink-muted font-body">沒有符合的指令</p>
                ) : (
                  filtered.map((c, i) => {
                    const Icon = c.icon
                    const active = i === hoverIdx
                    return (
                      <button
                        key={c.id}
                        onClick={() => c.run()}
                        onMouseEnter={() => setHoverIdx(i)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          active ? 'bg-elevated' : 'hover:bg-elevated/60'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${c.accent}1f`, color: c.accent }}
                        >
                          <Icon size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm text-ink-primary truncate">{c.label}</p>
                          <p className="font-mono text-[11px] text-ink-muted truncate">{c.hint}</p>
                        </div>
                        {active && <CornerDownLeft size={12} className="text-ink-muted shrink-0" />}
                      </button>
                    )
                  })
                )}
              </div>
            )}

            {mode === 'add-task' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TASK_CATEGORIES.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setTaskCategory(c.value)}
                      className={`px-2.5 py-1 rounded text-[11px] font-display tracking-wider transition-all ${
                        taskCategory === c.value
                          ? 'border'
                          : 'bg-elevated text-ink-muted hover:text-ink-primary border border-transparent'
                      }`}
                      style={taskCategory === c.value ? {
                        backgroundColor: `${c.accent}1f`,
                        color: c.accent,
                        borderColor: `${c.accent}55`,
                      } : undefined}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                {taskCategory === 'client' && CLIENT_ORDER.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {CLIENT_ORDER.map(k => {
                      const cfg = CLIENT_CONFIG[k]
                      const active = taskClient === k
                      return (
                        <button
                          key={k}
                          onClick={() => { setTaskClient(k); setTaskProjectId('') }}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-display tracking-wider transition-all ${
                            active ? 'border' : 'bg-elevated text-ink-muted hover:text-ink-primary border border-transparent'
                          }`}
                          style={active ? {
                            backgroundColor: `${cfg.color}1f`, color: cfg.color, borderColor: `${cfg.color}55`,
                          } : undefined}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                          {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                )}
                {taskCategory === 'client' && (() => {
                  const clientId = getClientIdByKey(taskClient || null)
                  const opts = projects.filter(p => p.status === 'active' && (!p.client_id || p.client_id === clientId))
                  if (opts.length === 0) return null
                  return (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-display text-[10px] tracking-widest text-ink-muted flex items-center gap-1">
                        <Folder size={10} /> 專案
                      </span>
                      <button
                        onClick={() => setTaskProjectId('')}
                        className={`px-2 py-1 rounded text-[11px] font-display tracking-wider transition-all border ${
                          taskProjectId === '' ? 'bg-elevated text-ink-primary border-border-active' : 'bg-elevated/50 text-ink-muted border-transparent hover:text-ink-primary'
                        }`}
                      >
                        無
                      </button>
                      {opts.map(p => {
                        const active = taskProjectId === p.id
                        return (
                          <button
                            key={p.id}
                            onClick={() => setTaskProjectId(p.id)}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-display tracking-wider transition-all ${
                              active ? 'border' : 'bg-elevated text-ink-muted hover:text-ink-primary border border-transparent'
                            }`}
                            style={active ? {
                              backgroundColor: `${p.color}1f`, color: p.color, borderColor: `${p.color}55`,
                            } : undefined}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="max-w-[100px] truncate">{p.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}
                <ActionFooter
                  hint="Enter 送出 · Esc 返回"
                  label={submitting ? '送出中...' : '加入今日'}
                  disabled={!query.trim() || submitting}
                  onSubmit={submitTask}
                />
              </div>
            )}

            {mode === 'add-spark' && (
              <div className="p-4 space-y-3">
                <p className="font-display text-[11px] tracking-widest text-ink-muted">SPARK · 寫下，存到 Learn</p>
                <ActionFooter
                  hint="Enter 送出 · Esc 返回"
                  label={submitting ? '送出中...' : '記錄靈感'}
                  disabled={!query.trim() || submitting}
                  onSubmit={submitSpark}
                />
              </div>
            )}

            {mode === 'add-message' && (
              <div className="p-4 space-y-3">
                <p className="font-display text-[11px] tracking-widest text-ink-muted">MESSAGE · 送到 Shared</p>
                <ActionFooter
                  hint="Enter 送出 · Esc 返回"
                  label={submitting ? '送出中...' : '送出訊息'}
                  disabled={!query.trim() || submitting}
                  onSubmit={submitMessage}
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}

function ActionFooter({
  hint, label, disabled, onSubmit,
}: {
  hint: string; label: string; disabled: boolean; onSubmit: () => void
}) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
      <span className="font-mono text-[11px] text-ink-muted">{hint}</span>
      <button
        onClick={onSubmit}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-blue/15 text-accent-blue border border-accent-blue/30 text-[12px] font-display tracking-widest hover:bg-accent-blue/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {label}
        <ArrowRight size={11} />
      </button>
    </div>
  )
}
