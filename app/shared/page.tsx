'use client'
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Send, Pin, PinOff, Trash2 } from 'lucide-react'
import { createClient as createSupabase } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { Task } from '@/types'
import { getTodayString } from '@/lib/utils'
import { getClientKeyById } from '@/stores/useClientStore'
import { useClientStore, CLIENT_CONFIG } from '@/stores/useClientStore'

interface SharedNote {
  id: string
  author_id: string
  content: string
  kind: string
  pinned: boolean
  created_at: string
  author_name: string
}

export default function SharedPage() {
  const [me, setMe] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map())
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<SharedNote[]>([])
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const clientsLoaded = useClientStore(s => s.loaded)
  const addToast = useAppStore(s => s.addToast)

  const load = useCallback(async () => {
    const supabase = createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoaded(true); return }
    setMe(user.id)

    const today = getTodayString()
    const [tasksRes, notesRes, profilesRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('is_shared', true).eq('date', today).order('created_at'),
      supabase.from('shared_notes').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('id, display_name, email'),
    ])

    const pMap = new Map<string, string>()
    for (const p of profilesRes.data ?? []) {
      pMap.set(p.id, p.display_name || p.email?.split('@')[0] || '夥伴')
    }
    setProfiles(pMap)

    setTasks((tasksRes.data ?? []).map(t => ({
      id: t.id,
      date: t.date,
      category: t.category as Task['category'],
      client: getClientKeyById(t.client_id),
      content: t.content,
      completed: t.completed,
      target_count: t.target_count ?? undefined,
      is_shared: t.is_shared ?? false,
      user_id: t.user_id ?? undefined,
      owner_name: pMap.get(t.user_id) ?? null,
      created_at: t.created_at,
    })))

    setNotes((notesRes.data ?? []).map(n => ({
      id: n.id,
      author_id: n.author_id,
      content: n.content,
      kind: n.kind,
      pinned: n.pinned,
      created_at: n.created_at,
      author_name: pMap.get(n.author_id) ?? '夥伴',
    })))

    setLoaded(true)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleTask(id: string, nextDone: boolean) {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, completed: nextDone } : t))
    await createSupabase().from('tasks').update({ completed: nextDone }).eq('id', id)
  }

  async function postNote() {
    const content = draft.trim()
    if (!content || !me) return
    setPosting(true)
    try {
      const supabase = createSupabase()
      const { data, error } = await supabase
        .from('shared_notes')
        .insert({ author_id: me, content })
        .select()
        .single()
      if (error || !data) { addToast({ type: 'warning', message: '發送失敗' }); return }
      setNotes(ns => [{
        id: data.id,
        author_id: data.author_id,
        content: data.content,
        kind: data.kind,
        pinned: data.pinned,
        created_at: data.created_at,
        author_name: profiles.get(data.author_id) ?? '我',
      }, ...ns])
      setDraft('')
    } finally {
      setPosting(false)
    }
  }

  async function togglePin(id: string, nextPinned: boolean) {
    setNotes(ns => ns.map(n => n.id === id ? { ...n, pinned: nextPinned } : n))
    await createSupabase().from('shared_notes').update({ pinned: nextPinned }).eq('id', id)
    await load()
  }

  async function deleteNote(id: string) {
    if (!confirm('刪除這則訊息？')) return
    setNotes(ns => ns.filter(n => n.id !== id))
    await createSupabase().from('shared_notes').delete().eq('id', id)
  }

  if (!loaded || !clientsLoaded) return <LoadingScreen label="LOADING SHARED" />

  const completedCount = tasks.filter(t => t.completed).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 space-y-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
          <Users size={22} className="text-accent-blue" />
          <div>
            <h1 className="font-display text-xl text-ink-primary tracking-wider">Shared Space</h1>
            <p className="font-body text-xs text-ink-secondary mt-1">雙人協作空間 · 共享任務與訊息</p>
          </div>
        </div>
      </motion.div>

      {/* Shared tasks today */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="bg-card border border-border-subtle rounded-xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle border-l-2 border-l-accent-blue">
          <span className="font-display text-[12px] tracking-[0.2em] text-ink-primary uppercase">Today · Shared Tasks</span>
          <span className="ml-auto text-[12px] font-mono text-ink-muted">{completedCount}/{tasks.length}</span>
        </div>
        {tasks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="font-body text-xs text-ink-muted">今日還沒有共用任務</p>
            <p className="font-body text-[11px] text-ink-muted mt-1">在 Today 頁面新增任務時開啟「共用」即可</p>
          </div>
        ) : (
          <div className="px-4 py-2 divide-y divide-border-subtle/50">
            {tasks.map(t => {
              const isOthers = t.user_id && t.user_id !== me
              return (
                <div key={t.id} className="flex items-center gap-2 py-2">
                  <button
                    onClick={() => toggleTask(t.id, !t.completed)}
                    className={`shrink-0 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all
                      ${t.completed ? 'bg-accent-green border-accent-green' : 'border-ink-muted hover:border-accent-green'}`}
                  >
                    {t.completed && (
                      <svg width={10} height={10} viewBox="0 0 10 10">
                        <polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="#0f0f1a"
                          strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm font-body ${t.completed ? 'line-through text-ink-muted' : 'text-ink-primary'}`}>
                    {t.content}
                  </span>
                  {t.client && CLIENT_CONFIG[t.client] && (
                    <span
                      className="shrink-0 px-1.5 py-0.5 rounded text-[11px] font-display tracking-wider"
                      style={{
                        backgroundColor: `${CLIENT_CONFIG[t.client].color}26`,
                        color: CLIENT_CONFIG[t.client].color,
                      }}
                    >
                      {CLIENT_CONFIG[t.client].label}
                    </span>
                  )}
                  <span className={`shrink-0 text-[11px] font-display tracking-wider px-1.5 py-0.5 rounded
                    ${isOthers ? 'bg-accent-gold/15 text-accent-gold' : 'bg-accent-blue/15 text-accent-blue'}`}>
                    {isOthers ? (t.owner_name ?? '夥伴') : '我'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </motion.section>

      {/* Shared notes */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="bg-card border border-border-subtle rounded-xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle border-l-2 border-l-accent-gold">
          <span className="font-display text-[12px] tracking-[0.2em] text-ink-primary uppercase">Messages</span>
        </div>

        <div className="px-4 py-3 border-b border-border-subtle flex gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postNote() } }}
            placeholder="寫一則共享訊息..."
            className="flex-1 bg-elevated border border-border-subtle rounded px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent-blue font-body"
          />
          <button
            onClick={postNote}
            disabled={posting || !draft.trim()}
            className="flex items-center gap-1 px-3 py-2 bg-accent-blue/15 text-accent-blue rounded border border-accent-blue/30 hover:bg-accent-blue/25 transition-all font-display text-[12px] tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={12} /> Send
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="font-body text-xs text-ink-muted">還沒有任何訊息</p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle/50">
            {notes.map(n => {
              const mine = n.author_id === me
              return (
                <div key={n.id} className="px-4 py-3 flex items-start gap-3 group/note">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-display uppercase shrink-0
                    ${mine ? 'bg-accent-blue/20 text-accent-blue' : 'bg-accent-gold/20 text-accent-gold'}`}>
                    {n.author_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[11px] tracking-wider text-ink-primary">{n.author_name}</span>
                      {n.pinned && <Pin size={10} className="text-accent-gold" />}
                      <span className="font-mono text-[11px] text-ink-muted ml-auto">
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>
                    <p className="font-body text-sm text-ink-primary mt-1 whitespace-pre-wrap break-words">{n.content}</p>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity">
                    <button
                      onClick={() => togglePin(n.id, !n.pinned)}
                      className="text-ink-muted hover:text-accent-gold transition-colors"
                      title={n.pinned ? '取消置頂' : '置頂'}
                    >
                      {n.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                    </button>
                    {mine && (
                      <button
                        onClick={() => deleteNote(n.id)}
                        className="text-ink-muted hover:text-accent-red transition-colors"
                        title="刪除"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.section>
    </div>
  )
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return '剛剛'
  if (diff < 3600) return `${Math.floor(diff / 60)}分鐘前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小時前`
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
