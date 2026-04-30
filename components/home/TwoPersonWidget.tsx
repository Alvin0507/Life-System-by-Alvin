'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, ArrowUpRight, CheckCircle2, PlusCircle, MessageSquare, UserCheck, Activity } from 'lucide-react'
import { createClient as createSupabase, getSessionUser } from '@/lib/supabase/client'
import { getTodayString } from '@/lib/utils'

type ActivityKind = 'task_completed' | 'task_created' | 'task_assigned' | 'note_posted'

interface PersonStat {
  user_id: string
  name: string
  total: number
  done: number
  is_me: boolean
  last_activity_at: string | null
  last_activity_kind: ActivityKind | null
  last_activity_summary: string | null
}

interface ActivityRow {
  id: string
  actor_id: string
  actor_name: string
  kind: ActivityKind
  summary: string
  created_at: string
  is_me: boolean
}

const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000

export default function TwoPersonWidget() {
  const [stats, setStats] = useState<PersonStat[] | null>(null)
  const [unread, setUnread] = useState(0)
  const [activities, setActivities] = useState<ActivityRow[]>([])

  const load = useCallback(async () => {
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) { setStats([]); return }

    const today = getTodayString()
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString()

    const [tasksRes, profilesRes, notesRes, activityRes] = await Promise.all([
      supabase.from('tasks').select('user_id, completed').eq('is_shared', true).eq('date', today),
      supabase.from('profiles').select('id, display_name, email'),
      supabase
        .from('shared_notes')
        .select('id', { count: 'exact', head: true })
        .neq('author_id', user.id)
        .gte('created_at', dayAgo),
      supabase
        .from('activity_log')
        .select('id, actor_id, kind, summary, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const profiles = (profilesRes.data ?? [])
    const profileMap = new Map<string, string>()
    for (const p of profiles) {
      profileMap.set(p.id, p.id === user.id ? '我' : (p.display_name || p.email?.split('@')[0] || '夥伴'))
    }
    if (profiles.length === 0) { setStats([]); setUnread(notesRes.count ?? 0); return }

    const taskMap = new Map<string, { total: number; done: number }>()
    for (const t of tasksRes.data ?? []) {
      if (!t.user_id) continue
      const cur = taskMap.get(t.user_id) ?? { total: 0, done: 0 }
      cur.total++
      if (t.completed) cur.done++
      taskMap.set(t.user_id, cur)
    }

    const lastByActor = new Map<string, { kind: ActivityKind; summary: string; created_at: string }>()
    for (const a of activityRes.data ?? []) {
      if (!lastByActor.has(a.actor_id)) {
        lastByActor.set(a.actor_id, {
          kind: a.kind as ActivityKind,
          summary: a.summary,
          created_at: a.created_at,
        })
      }
    }

    const rows: PersonStat[] = profiles.map(p => {
      const t = taskMap.get(p.id) ?? { total: 0, done: 0 }
      const a = lastByActor.get(p.id) ?? null
      return {
        user_id: p.id,
        name: profileMap.get(p.id) ?? '夥伴',
        total: t.total,
        done: t.done,
        is_me: p.id === user.id,
        last_activity_at: a?.created_at ?? null,
        last_activity_kind: a?.kind ?? null,
        last_activity_summary: a?.summary ?? null,
      }
    }).sort((a, b) => (a.is_me === b.is_me ? 0 : a.is_me ? -1 : 1))

    setStats(rows)
    setUnread(notesRes.count ?? 0)
    setActivities((activityRes.data ?? []).map(a => ({
      id: a.id,
      actor_id: a.actor_id,
      actor_name: profileMap.get(a.actor_id) ?? '夥伴',
      kind: a.kind as ActivityKind,
      summary: a.summary,
      created_at: a.created_at,
      is_me: a.actor_id === user.id,
    })))
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const supabase = createSupabase()
    const channel = supabase
      .channel('two-person-widget')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: 'is_shared=eq.true' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shared_notes' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  if (stats === null) return null
  if (stats.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-[15px] tracking-[0.2em] text-ink-primary uppercase flex items-center gap-2">
          <Users size={16} className="text-accent-blue" />
          Shared Today
        </h2>
        <Link
          href="/shared"
          className="font-display text-[13px] tracking-widest text-ink-muted hover:text-accent-blue transition-colors flex items-center gap-1 btn-press"
        >
          OPEN <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className="bg-card border border-border-subtle rounded-xl p-5 card-interactive">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.map(s => {
            const rate = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0
            const color = s.is_me ? '#00d4ff' : '#ffd700'
            const isActive = s.last_activity_at
              ? Date.now() - new Date(s.last_activity_at).getTime() < ACTIVE_THRESHOLD_MS
              : false
            return (
              <div key={s.user_id} className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-sm tracking-wider text-ink-primary font-semibold flex items-center gap-1.5">
                    {s.name}
                    {isActive && (
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                        title="剛剛活動過"
                      />
                    )}
                  </span>
                  <span
                    className="ml-auto font-mono text-3xl font-bold tabular-nums"
                    style={{ color, textShadow: `0 0 14px ${color}60` }}
                  >
                    {s.done}
                  </span>
                  <span className="font-mono text-sm text-ink-secondary">/ {s.total}</span>
                </div>
                <div className="h-2 bg-void rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, rate)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full progress-shimmer"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 0 10px ${color}80, inset 0 0 4px rgba(255,255,255,0.3)`,
                    }}
                  />
                </div>
                {s.last_activity_at && (
                  <div className="flex items-center gap-1.5 text-[11px] font-body text-ink-muted">
                    <ActionIcon kind={s.last_activity_kind} />
                    <span className="truncate flex-1" title={s.last_activity_summary ?? ''}>
                      {actionVerb(s.last_activity_kind)} · {s.last_activity_summary || '—'}
                    </span>
                    <span className="font-mono shrink-0">{formatRelative(s.last_activity_at)}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {unread > 0 && (
          <div className="mt-4 pt-4 border-t border-border-subtle flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-gold animate-pulse shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
            <span className="font-body text-xs text-ink-secondary">
              過去 24 小時有 <span className="text-accent-gold font-semibold">{unread}</span> 則新訊息
            </span>
          </div>
        )}

        {activities.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border-subtle">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={12} className="text-accent-green" />
              <span className="font-display text-[11px] tracking-[0.2em] text-ink-muted uppercase">Activity</span>
              <span className="ml-auto text-[11px] font-mono text-ink-muted">{activities.length}</span>
            </div>
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {activities.slice(0, 10).map(a => (
                <div key={a.id} className="flex items-center gap-2 text-[12px]">
                  <ActionIcon kind={a.kind} />
                  <span className={`font-display text-[11px] tracking-wider shrink-0 ${a.is_me ? 'text-accent-blue' : 'text-accent-gold'}`}>
                    {a.is_me ? '我' : a.actor_name}
                  </span>
                  <span className="font-body text-ink-secondary truncate flex-1" title={a.summary}>
                    {actionVerb(a.kind)} · {a.summary}
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted shrink-0">{formatRelative(a.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.section>
  )
}

function ActionIcon({ kind }: { kind: ActivityKind | null }) {
  if (kind === 'task_completed') return <CheckCircle2 size={11} className="text-accent-green shrink-0" />
  if (kind === 'task_assigned') return <UserCheck size={11} className="text-accent-gold shrink-0" />
  if (kind === 'note_posted') return <MessageSquare size={11} className="text-accent-blue shrink-0" />
  return <PlusCircle size={11} className="text-ink-muted shrink-0" />
}

function actionVerb(kind: ActivityKind | null): string {
  switch (kind) {
    case 'task_completed': return '完成'
    case 'task_created': return '新增'
    case 'task_assigned': return '指派'
    case 'note_posted': return '留言'
    default: return ''
  }
}

function formatRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return '剛剛'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}
