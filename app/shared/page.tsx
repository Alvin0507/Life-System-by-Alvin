'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, UserCheck, Send, Pin, PinOff, Trash2, Bell, BellOff,
  CheckCircle2, PlusCircle, MessageSquare, Activity,
} from 'lucide-react'
import { createClient as createSupabase, getSessionUser } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { Task } from '@/types'
import { getTodayString } from '@/lib/utils'
import { getClientKeyById } from '@/stores/useClientStore'
import { useClientStore, CLIENT_CONFIG } from '@/stores/useClientStore'
import {
  ensureNotifyPermission,
  getNotifyPermission,
  markMyAction,
} from '@/lib/notifications'

type AssignFilter = 'all' | 'mine' | 'partner' | 'unassigned'
type ActivityKind = 'task_completed' | 'task_created' | 'task_assigned' | 'note_posted'

interface SharedNote {
  id: string
  author_id: string
  content: string
  kind: string
  pinned: boolean
  created_at: string
  author_name: string
}

interface ActivityEntry {
  id: string
  actor_id: string
  actor_name: string
  kind: ActivityKind
  summary: string
  created_at: string
}

export default function SharedPage() {
  const [me, setMe] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map())
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<SharedNote[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [filter, setFilter] = useState<AssignFilter>('all')
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const clientsLoaded = useClientStore(s => s.loaded)
  const addToast = useAppStore(s => s.addToast)

  useEffect(() => {
    setPermission(getNotifyPermission())
  }, [])

  async function handleEnableNotify() {
    const result = await ensureNotifyPermission()
    setPermission(result)
    if (result === 'granted') addToast({ type: 'success', message: '桌面通知已啟用' })
    else if (result === 'denied') addToast({ type: 'warning', message: '已被瀏覽器封鎖，請至網址列旁的鎖頭手動允許' })
  }

  const load = useCallback(async () => {
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) { setLoaded(true); return }
    setMe(user.id)

    const today = getTodayString()
    const [tasksRes, notesRes, profilesRes, activityRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('is_shared', true).eq('date', today).order('created_at'),
      supabase.from('shared_notes').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('id, display_name, email'),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50),
    ])

    const pMap = new Map<string, string>()
    for (const p of profilesRes.data ?? []) {
      pMap.set(p.id, p.display_name || p.email?.split('@')[0] || '夥伴')
    }
    setProfiles(pMap)

    setActivity((activityRes.data ?? []).map(a => ({
      id: a.id,
      actor_id: a.actor_id,
      actor_name: pMap.get(a.actor_id) ?? '夥伴',
      kind: a.kind as ActivityKind,
      summary: a.summary,
      created_at: a.created_at,
    })))

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
      assigned_to: t.assigned_to ?? null,
      assignee_name: t.assigned_to ? (pMap.get(t.assigned_to) ?? null) : null,
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

  useEffect(() => {
    const supabase = createSupabase()
    const channel = supabase
      .channel('shared-page-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: 'is_shared=eq.true' },
        () => load()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'shared_notes' },
        () => load()
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        () => load()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  async function toggleTask(id: string, nextDone: boolean) {
    markMyAction(id)
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
      markMyAction(data.id)
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

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks
    if (filter === 'mine') return tasks.filter(t => t.assigned_to === me)
    if (filter === 'partner') return tasks.filter(t => t.assigned_to && t.assigned_to !== me)
    return tasks.filter(t => !t.assigned_to)
  }, [tasks, filter, me])

  if (!loaded || !clientsLoaded) return <LoadingScreen label="LOADING SHARED" />

  const completedCount = filteredTasks.filter(t => t.completed).length

  const filterChips: { key: AssignFilter; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: tasks.length },
    { key: 'mine', label: '指派給我', count: tasks.filter(t => t.assigned_to === me).length },
    { key: 'partner', label: '指派給對方', count: tasks.filter(t => t.assigned_to && t.assigned_to !== me).length },
    { key: 'unassigned', label: '未指派', count: tasks.filter(t => !t.assigned_to).length },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 space-y-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
          <Users size={22} className="text-accent-blue" />
          <div className="flex-1">
            <h1 className="font-display text-xl text-ink-primary tracking-wider">Shared Space</h1>
            <p className="font-body text-xs text-ink-secondary mt-1">雙人協作空間 · 共享任務與訊息</p>
          </div>
          {permission === 'default' && (
            <button
              onClick={handleEnableNotify}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-gold/15 text-accent-gold border border-accent-gold/30 rounded-lg text-[12px] font-display tracking-wider hover:bg-accent-gold/25 transition-colors"
            >
              <Bell size={13} />
              啟用通知
            </button>
          )}
          {permission === 'denied' && (
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 bg-elevated text-ink-muted border border-border-subtle rounded-lg text-[12px] font-display tracking-wider"
              title="瀏覽器已封鎖，請至網址列旁的鎖頭手動允許"
            >
              <BellOff size={13} />
              通知已封鎖
            </span>
          )}
          {permission === 'granted' && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-green/10 text-accent-green/80 border border-accent-green/20 rounded-lg text-[12px] font-display tracking-wider">
              <Bell size={13} />
              通知已開啟
            </span>
          )}
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
          <span className="ml-auto text-[12px] font-mono text-ink-muted">{completedCount}/{filteredTasks.length}</span>
        </div>

        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border-subtle/60 overflow-x-auto">
          {filterChips.map(chip => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-display tracking-wider transition-colors whitespace-nowrap ${
                filter === chip.key
                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40'
                  : 'bg-elevated text-ink-muted hover:text-ink-primary border border-transparent'
              }`}
            >
              {chip.label}
              <span className="font-mono opacity-70">{chip.count}</span>
            </button>
          ))}
        </div>

        {filteredTasks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="font-body text-xs text-ink-muted">
              {tasks.length === 0 ? '今日還沒有共用任務' : '此篩選沒有任務'}
            </p>
            {tasks.length === 0 && (
              <p className="font-body text-[11px] text-ink-muted mt-1">在 Today 頁面新增任務時開啟「共用」即可</p>
            )}
          </div>
        ) : (
          <div className="px-4 py-2 divide-y divide-border-subtle/50">
            {filteredTasks.map(t => {
              const isOthers = t.user_id && t.user_id !== me
              const assignedToMe = t.assigned_to && t.assigned_to === me
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
                  {t.assigned_to ? (
                    <span
                      className={`shrink-0 flex items-center gap-1 text-[11px] font-display tracking-wider px-1.5 py-0.5 rounded
                        ${assignedToMe ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-gold/20 text-accent-gold'}`}
                      title={`指派給 ${assignedToMe ? '我' : t.assignee_name ?? '夥伴'}`}
                    >
                      <UserCheck size={11} />
                      {assignedToMe ? '我' : t.assignee_name ?? '夥伴'}
                    </span>
                  ) : (
                    <span className={`shrink-0 text-[11px] font-display tracking-wider px-1.5 py-0.5 rounded
                      ${isOthers ? 'bg-accent-gold/15 text-accent-gold' : 'bg-accent-blue/15 text-accent-blue'}`}>
                      {isOthers ? (t.owner_name ?? '夥伴') : '我'}
                    </span>
                  )}
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

      {/* Activity timeline */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="bg-card border border-border-subtle rounded-xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle border-l-2 border-l-accent-green">
          <Activity size={14} className="text-accent-green" />
          <span className="font-display text-[12px] tracking-[0.2em] text-ink-primary uppercase">Activity</span>
          <span className="ml-auto text-[12px] font-mono text-ink-muted">{activity.length}</span>
        </div>
        {activity.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="font-body text-xs text-ink-muted">還沒有任何活動</p>
            <p className="font-body text-[11px] text-ink-muted mt-1">完成共用任務或留言後會在這裡顯示</p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle/50 max-h-[420px] overflow-y-auto">
            {activity.map(a => {
              const isMine = a.actor_id === me
              return (
                <div key={a.id} className="px-4 py-2.5 flex items-start gap-3">
                  <ActivityIcon kind={a.kind} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-display text-[11px] tracking-wider ${isMine ? 'text-accent-blue' : 'text-accent-gold'}`}>
                        {isMine ? '我' : a.actor_name}
                      </span>
                      <span className="font-body text-[11px] text-ink-muted">{actionLabel(a.kind)}</span>
                      <span className="font-mono text-[11px] text-ink-muted ml-auto">{formatRelativeTime(a.created_at)}</span>
                    </div>
                    <p className="font-body text-xs text-ink-secondary mt-0.5 truncate" title={a.summary}>
                      {a.summary}
                    </p>
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

function ActivityIcon({ kind }: { kind: ActivityKind }) {
  const cls = 'shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5'
  if (kind === 'task_completed') {
    return <div className={`${cls} bg-accent-green/15 text-accent-green`}><CheckCircle2 size={14} /></div>
  }
  if (kind === 'task_assigned') {
    return <div className={`${cls} bg-accent-gold/15 text-accent-gold`}><UserCheck size={14} /></div>
  }
  if (kind === 'note_posted') {
    return <div className={`${cls} bg-accent-blue/15 text-accent-blue`}><MessageSquare size={14} /></div>
  }
  return <div className={`${cls} bg-elevated text-ink-secondary`}><PlusCircle size={14} /></div>
}

function actionLabel(kind: ActivityKind): string {
  switch (kind) {
    case 'task_completed': return '完成了任務'
    case 'task_created': return '新增了共用任務'
    case 'task_assigned': return '指派了任務'
    case 'note_posted': return '發了訊息'
  }
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
