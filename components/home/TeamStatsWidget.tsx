'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, ArrowUpRight, Trophy } from 'lucide-react'
import { createClient as createSupabase } from '@/lib/supabase/client'

interface MemberStat {
  user_id: string
  display_name: string | null
  email: string
  total: number
  done: number
}

interface ProjectStat {
  project_id: string
  project_label: string
  project_color: string
  total_tasks: number
  completed_tasks: number
  member_count: number
  members: MemberStat[]
}

export default function TeamStatsWidget() {
  const [stats, setStats] = useState<ProjectStat[] | null>(null)

  useEffect(() => {
    (async () => {
      const supabase = createSupabase()
      const { data, error } = await supabase.rpc('team_stats_weekly', { days_back: 7 })
      if (error || !data) { setStats([]); return }
      const rows = data.map(r => ({
        project_id: r.project_id,
        project_label: r.project_label,
        project_color: r.project_color,
        total_tasks: Number(r.total_tasks) || 0,
        completed_tasks: Number(r.completed_tasks) || 0,
        member_count: Number(r.member_count) || 0,
        members: (Array.isArray(r.members) ? r.members : []) as unknown as MemberStat[],
      })) as ProjectStat[]
      setStats(rows)
    })()
  }, [])

  if (stats === null) return null
  if (stats.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase flex items-center gap-2">
          <Users size={13} className="text-accent-blue" />
          Team Stats
          <span className="text-ink-muted text-[9px] tracking-widest">· 7 DAYS</span>
        </h2>
        <Link
          href="/projects"
          className="font-display text-[10px] tracking-widest text-ink-muted hover:text-accent-blue transition-colors flex items-center gap-1"
        >
          ALL <ArrowUpRight size={10} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {stats.map(p => {
          const rate = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0
          const topMember = [...p.members].sort((a, b) => b.done - a.done)[0]
          return (
            <div
              key={p.project_id}
              className="bg-card border border-border-subtle rounded-xl p-4 card-hover relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
                style={{ background: `linear-gradient(90deg, transparent, ${p.project_color}, transparent)` }}
              />
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: p.project_color }}
                />
                <span className="font-display text-sm text-ink-primary tracking-wider truncate">
                  {p.project_label}
                </span>
                <span className="ml-auto font-mono text-[10px] text-ink-muted">
                  {p.member_count} {p.member_count === 1 ? 'member' : 'members'}
                </span>
              </div>

              <div className="flex items-baseline gap-1 mb-1">
                <span
                  className="font-mono text-3xl font-bold tabular-nums"
                  style={{ color: p.project_color }}
                >
                  {p.completed_tasks}
                </span>
                <span className="font-mono text-xs text-ink-muted">
                  / {p.total_tasks} tasks · {rate}%
                </span>
              </div>

              <div className="h-1.5 bg-void rounded-full overflow-hidden mt-2 mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, rate)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: p.project_color,
                    boxShadow: `0 0 6px ${p.project_color}60`,
                  }}
                />
              </div>

              {topMember && topMember.done > 0 ? (
                <div className="flex items-center gap-2 text-[11px] text-ink-secondary">
                  <Trophy size={11} className="text-accent-gold shrink-0" />
                  <span className="font-body truncate">
                    {topMember.display_name ?? topMember.email}
                  </span>
                  <span className="ml-auto font-mono text-ink-muted">
                    {topMember.done}/{topMember.total}
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-ink-muted font-body">本週尚無完成任務</p>
              )}
            </div>
          )
        })}
      </div>
    </motion.section>
  )
}
