'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, ArrowUpRight } from 'lucide-react'
import { createClient as createSupabase } from '@/lib/supabase/client'
import { getTodayString } from '@/lib/utils'

interface PersonStat {
  user_id: string
  name: string
  total: number
  done: number
  is_me: boolean
}

export default function TwoPersonWidget() {
  const [stats, setStats] = useState<PersonStat[] | null>(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    (async () => {
      const supabase = createSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStats([]); return }

      const today = getTodayString()
      const [tasksRes, profilesRes, notesRes] = await Promise.all([
        supabase.from('tasks').select('user_id, completed').eq('is_shared', true).eq('date', today),
        supabase.from('profiles').select('id, display_name, email'),
        supabase
          .from('shared_notes')
          .select('id', { count: 'exact', head: true })
          .neq('author_id', user.id)
          .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
      ])

      if (!tasksRes.data || tasksRes.data.length === 0) {
        setStats([])
        setUnread(notesRes.count ?? 0)
        return
      }

      const pMap = new Map<string, string>()
      for (const p of profilesRes.data ?? []) {
        pMap.set(p.id, p.display_name || p.email?.split('@')[0] || '夥伴')
      }

      const grouped = new Map<string, { total: number; done: number }>()
      for (const t of tasksRes.data) {
        if (!t.user_id) continue
        const cur = grouped.get(t.user_id) ?? { total: 0, done: 0 }
        cur.total++
        if (t.completed) cur.done++
        grouped.set(t.user_id, cur)
      }

      const rows: PersonStat[] = Array.from(grouped.entries()).map(([uid, v]) => ({
        user_id: uid,
        name: uid === user.id ? '我' : (pMap.get(uid) ?? '夥伴'),
        total: v.total,
        done: v.done,
        is_me: uid === user.id,
      })).sort((a, b) => (a.is_me ? -1 : 1) - (b.is_me ? -1 : 1))

      setStats(rows)
      setUnread(notesRes.count ?? 0)
    })()
  }, [])

  if (stats === null) return null
  if (stats.length === 0 && unread === 0) return null

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
        {stats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.map(s => {
              const rate = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0
              const color = s.is_me ? '#00d4ff' : '#ffd700'
              return (
                <div key={s.user_id} className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-sm tracking-wider text-ink-primary font-semibold">
                      {s.name}
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
                </div>
              )
            })}
          </div>
        ) : (
          <p className="font-body text-xs text-ink-muted text-center py-2">今日還沒有共用任務</p>
        )}

        {unread > 0 && (
          <div className="mt-4 pt-4 border-t border-border-subtle flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-gold animate-pulse shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
            <span className="font-body text-xs text-ink-secondary">
              過去 24 小時有 <span className="text-accent-gold font-semibold">{unread}</span> 則新訊息
            </span>
          </div>
        )}
      </div>
    </motion.section>
  )
}
