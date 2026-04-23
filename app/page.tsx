'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, type MotionProps } from 'framer-motion'
import { Zap, Briefcase, Calendar, Brain, Settings, ArrowUpRight, Flame, Sparkles, Target, Clock, Users } from 'lucide-react'
import { useTodayStore } from '@/stores/useTodayStore'
import { useClientStore, CLIENT_CONFIG, CLIENT_ORDER, TOTAL_REVENUE_GOAL } from '@/stores/useClientStore'
import { useGreeting } from '@/lib/hooks/useGreeting'
import { useCountUp } from '@/lib/hooks/useCountUp'
import { formatDate, getTodayString, getDaysLeftInMonth, getDateSeed } from '@/lib/utils'
import { dailyQuotes } from '@/lib/quotes'
import LoadingScreen from '@/components/ui/LoadingScreen'
import TeamStatsWidget from '@/components/home/TeamStatsWidget'
import { Inspiration, ClientName } from '@/types'
import { createClient as createSupabase } from '@/lib/supabase/client'

/* ── Helpers ── */
async function fetchBestLearnStreak(today: string): Promise<{ topic: string; streak: number }> {
  const supabase = createSupabase()
  const { data: topics } = await supabase
    .from('learning_topics')
    .select('id, label, emoji')
    .eq('archived', false)
  if (!topics?.length) return { topic: '—', streak: 0 }

  const { data: entries } = await supabase
    .from('learning_entries')
    .select('date, topic_id, checked')
    .eq('checked', true)
  const byTopic = new Map<string, Set<string>>()
  for (const e of entries ?? []) {
    if (!byTopic.has(e.topic_id)) byTopic.set(e.topic_id, new Set())
    byTopic.get(e.topic_id)!.add(e.date)
  }

  let best = { topic: '—', streak: 0 }
  for (const t of topics) {
    const dates = byTopic.get(t.id) ?? new Set()
    let s = 0
    const d = new Date(today + 'T00:00:00')
    for (let i = 0; i < 365; i++) {
      const ds = d.toISOString().split('T')[0]
      if (dates.has(ds)) s++
      else if (i > 0) break
      d.setDate(d.getDate() - 1)
    }
    if (s > best.streak) best = { topic: `${t.emoji} ${t.label}`, streak: s }
  }
  return best
}

async function fetchInspirations(limit: number): Promise<Inspiration[]> {
  const { data } = await createSupabase()
    .from('inspirations')
    .select('id, content, tags, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as Inspiration[]
}

async function fetchCompletionStreak(today: string): Promise<number> {
  const since = new Date(today + 'T00:00:00')
  since.setDate(since.getDate() - 90)
  const { data } = await createSupabase()
    .from('tasks')
    .select('date, completed')
    .gte('date', since.toISOString().split('T')[0])
  if (!data) return 0
  const byDate = new Map<string, { total: number; done: number }>()
  for (const t of data) {
    if (!byDate.has(t.date)) byDate.set(t.date, { total: 0, done: 0 })
    const b = byDate.get(t.date)!
    b.total++
    if (t.completed) b.done++
  }
  let streak = 0
  const d = new Date(today + 'T00:00:00')
  for (let i = 0; i < 90; i++) {
    const ds = d.toISOString().split('T')[0]
    const b = byDate.get(ds)
    if (!b || !b.total) {
      if (i > 0) break
    } else if (b.done / b.total >= 0.8) streak++
    else if (i > 0) break
    d.setDate(d.getDate() - 1)
  }
  return streak
}

const R = 68
const CIRC = 2 * Math.PI * R

/* ── Hero Ring ── */
function HeroRing({ rate }: { rate: number }) {
  const animated = useCountUp(rate, 900)
  const isComplete = rate === 100
  const color = isComplete ? '#00ff88' : rate >= 70 ? '#00d4ff' : rate >= 40 ? '#ffd700' : '#ff8c42'
  const offset = CIRC * (1 - rate / 100)

  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative w-[180px] h-[180px]"
      style={{ filter: `drop-shadow(0 0 24px ${color}55)` }}
    >
      <svg width={180} height={180} className="-rotate-90">
        <circle cx={90} cy={90} r={R} stroke="#1e1e35" strokeWidth={8} fill="none" />
        <circle
          cx={90} cy={90} r={R}
          stroke={color} strokeWidth={8} fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1), stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[11px] tracking-[0.3em] text-ink-muted mb-1">TODAY</span>
        <span className="font-mono text-5xl font-bold tabular-nums leading-none" style={{ color }}>
          {animated}
        </span>
        <span className="font-mono text-xs text-ink-muted mt-1">% complete</span>
      </div>
    </motion.div>
  )
}

/* ── Stat Card ── */
function StatCard({
  icon: Icon, label, value, suffix, accent, subtitle, delay,
}: {
  icon: typeof Zap; label: string; value: number; suffix?: string
  accent: string; subtitle?: string; delay: number
}) {
  const animated = useCountUp(value, 700)
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="bg-card border border-border-subtle rounded-xl p-4 card-hover relative overflow-hidden"
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} style={{ color: accent }} />
        <span className="font-display text-[11px] tracking-widest text-ink-secondary uppercase">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-3xl font-bold tabular-nums" style={{ color: accent }}>
          {animated}
        </span>
        {suffix && <span className="font-mono text-[13px] text-ink-muted">{suffix}</span>}
      </div>
      {subtitle && <p className="font-body text-[12px] text-ink-muted mt-1 truncate">{subtitle}</p>}
    </motion.div>
  )
}

/* ── Nav Tile ── */
function NavTile({
  href, icon: Icon, label, subtitle, accent, delay,
}: {
  href: string; icon: typeof Zap; label: string; subtitle: string; accent: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      <Link
        href={href}
        className="group block bg-card border border-border-subtle rounded-xl p-5 relative overflow-hidden transition-all duration-300 hover:border-border-active"
        style={{ boxShadow: `0 0 0 ${accent}00` }}
      >
        <span
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `radial-gradient(circle at top right, ${accent}18, transparent 60%)` }}
        />
        <div className="relative flex items-start justify-between mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
            style={{ backgroundColor: `${accent}18`, color: accent }}
          >
            <Icon size={18} />
          </div>
          <ArrowUpRight
            size={14}
            className="text-ink-muted group-hover:text-ink-primary transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </div>
        <p className="relative font-display text-sm tracking-widest text-ink-primary mb-1">{label}</p>
        <p className="relative font-body text-[13px] text-ink-muted">{subtitle}</p>
      </Link>
    </motion.div>
  )
}

/* ── MAIN ── */
const fadeUp = (delay: number): MotionProps => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: 'easeOut' },
})

export default function HomePage() {
  const loadToday = useTodayStore(s => s.loadToday)
  const todayLoaded = useTodayStore(s => s.loaded)
  const tasks = useTodayStore(s => s.tasks)

  const loadClients = useClientStore(s => s.loadAll)
  const clientsLoaded = useClientStore(s => s.loaded)
  const outputs = useClientStore(s => s.outputs)

  const greeting = useGreeting()
  const todayStr = getTodayString()
  const daysLeft = getDaysLeftInMonth()

  const [clock, setClock] = useState('')
  const [learnStreak, setLearnStreak] = useState<{ topic: string; streak: number }>({ topic: '—', streak: 0 })
  const [completionStreak, setCompletionStreak] = useState(0)
  const [latestInsps, setLatestInsps] = useState<Inspiration[]>([])

  useEffect(() => { loadToday(); loadClients() }, [loadToday, loadClients])

  useEffect(() => {
    if (!todayLoaded) return
    fetchBestLearnStreak(todayStr).then(setLearnStreak)
    fetchCompletionStreak(todayStr).then(setCompletionStreak)
    fetchInspirations(3).then(setLatestInsps)
  }, [todayLoaded, todayStr])

  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('zh-TW', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
    setClock(fmt())
    const id = setInterval(() => setClock(fmt()), 30_000)
    return () => clearInterval(id)
  }, [])

  const rate = useMemo(() => {
    if (!tasks.length) return 0
    return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)
  }, [tasks])

  const doneCount = tasks.filter(t => t.completed).length
  const winTasks = tasks.filter(t => t.category === 'win_condition' && t.content.trim())
  const winDone = winTasks.filter(t => t.completed).length

  const revenueTotal = outputs.reduce((sum, o) => {
    if (o.revenue_status === 'received') return sum + CLIENT_CONFIG[o.client].revenue
    return sum
  }, 0)
  const revenuePct = Math.round((revenueTotal / TOTAL_REVENUE_GOAL) * 100)

  const quote = dailyQuotes[getDateSeed() % dailyQuotes.length]

  if (!todayLoaded || !clientsLoaded) return <LoadingScreen label="BOOTING" />

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 space-y-8 pb-24">

      {/* ── Header ── */}
      <motion.div {...fadeUp(0)} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-body text-xs text-ink-secondary mb-1.5">
            <span className="text-accent-blue">◇</span> {greeting.text}
          </p>
          <h1 className="font-display text-3xl md:text-5xl text-ink-primary tracking-wider">
            ALVIN OS
          </h1>
          <p className="font-mono text-xs text-ink-secondary mt-2">
            {formatDate(todayStr)} · <span className="text-accent-blue">{clock}</span>
          </p>
        </div>
        <Link
          href="/today"
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue/10 text-accent-blue border border-accent-blue/30 rounded-lg font-display text-[12px] tracking-widest hover:bg-accent-blue/20 transition-all group"
          style={{ boxShadow: '0 0 18px rgba(0,212,255,0.15)' }}
        >
          <Zap size={13} className="group-hover:scale-110 transition-transform" />
          ENTER TODAY
          <ArrowUpRight size={12} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </motion.div>

      {/* ── Hero: Progress Ring + Quote ── */}
      <motion.section
        {...fadeUp(0.08)}
        className="bg-card/80 backdrop-blur-sm border border-border-subtle rounded-2xl p-6 md:p-8 relative overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 20% 30%, rgba(0,212,255,0.12), transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,215,0,0.08), transparent 45%)',
          }}
        />
        <div className="relative grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-center">
          <div className="flex justify-center">
            <HeroRing rate={rate} />
          </div>
          <div className="space-y-4">
            <div>
              <p className="font-display text-[12px] tracking-[0.3em] text-ink-muted mb-2">MISSION STATUS</p>
              <p className="font-body text-sm text-ink-primary leading-relaxed">
                今日 <span className="font-mono text-accent-blue font-bold">{doneCount}</span>
                <span className="text-ink-muted"> / {tasks.length}</span> 任務完成
                {winTasks.length > 0 && (
                  <span> · 勝利條件 <span className="font-mono text-accent-gold font-bold">{winDone}/{winTasks.length}</span></span>
                )}
              </p>
            </div>
            <div className="border-l-2 border-accent-gold/60 pl-4 py-2">
              <p
                className="text-lg md:text-2xl leading-relaxed"
                style={{
                  fontFamily: 'var(--font-quote)',
                  fontWeight: 600,
                  color: '#ffe452',
                  textShadow: '0 0 18px rgba(255,215,0,0.45), 0 1px 0 rgba(0,0,0,0.4)',
                }}
              >
                {quote}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Stat Grid ── */}
      <section>
        <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase mb-3">Vital Signs</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Flame} label="連勝天數" value={completionStreak} suffix="天"
            accent="#ff8c42" subtitle="完成率 ≥ 80%" delay={0.12}
          />
          <StatCard
            icon={Brain} label="學習連勝" value={learnStreak.streak} suffix="天"
            accent="#00ff88" subtitle={learnStreak.topic} delay={0.16}
          />
          <StatCard
            icon={Target} label="月收進度" value={revenuePct} suffix="%"
            accent="#ffd700" subtitle={`NT$ ${revenueTotal.toLocaleString()}`} delay={0.2}
          />
          <StatCard
            icon={Clock} label="本月剩餘" value={daysLeft} suffix="天"
            accent="#00d4ff" subtitle="還可以衝的日子" delay={0.24}
          />
        </div>
      </section>

      {/* ── Client Revenue Snapshot ── */}
      <motion.section {...fadeUp(0.28)}>
        <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase mb-3">Client Snapshot</h2>
        <div className="bg-card border border-border-subtle rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-body text-xs text-ink-secondary">已收款進度</span>
            <span className="font-mono text-xs text-ink-primary tabular-nums">
              NT$ <span className="text-accent-gold">{revenueTotal.toLocaleString()}</span>
              <span className="text-ink-muted"> / {TOTAL_REVENUE_GOAL.toLocaleString()}</span>
            </span>
          </div>
          <div className="h-2 bg-void rounded-full overflow-hidden mb-5 relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, revenuePct)}%` }}
              transition={{ delay: 0.4, duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-accent-gold/60 via-accent-gold to-accent-green"
              style={{ boxShadow: '0 0 8px rgba(255,215,0,0.4)' }}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CLIENT_ORDER.map((c: ClientName) => {
              const cfg = CLIENT_CONFIG[c]
              const out = outputs.find(o => o.client === c)
              const received = out?.revenue_status === 'received'
              const inProg = out?.revenue_status === 'in_progress'
              return (
                <div key={c} className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${received ? '' : inProg ? 'animate-pulse' : 'opacity-40'}`}
                    style={{ backgroundColor: cfg.color, boxShadow: received ? `0 0 8px ${cfg.color}` : undefined }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-[13px] text-ink-primary truncate">{cfg.label}</p>
                    <p className="font-mono text-[12px] text-ink-muted">
                      {received ? '✓ 已收' : inProg ? '進行中' : '待處理'} · NT${(cfg.revenue / 1000).toFixed(0)}K
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* ── Team Stats (only renders if user belongs to any shared project) ── */}
      <TeamStatsWidget />

      {/* ── Nav Tiles ── */}
      <section>
        <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase mb-3">Modules</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <NavTile
            href="/today" icon={Zap} label="TODAY" subtitle="今日作戰"
            accent="#00d4ff" delay={0.32}
          />
          <NavTile
            href="/weekly" icon={Calendar} label="WEEKLY" subtitle="週報覆盤"
            accent="#7c3aed" delay={0.36}
          />
          <NavTile
            href="/clients" icon={Briefcase} label="CLIENTS" subtitle="接案營運"
            accent="#ff8c42" delay={0.4}
          />
          <NavTile
            href="/projects" icon={Users} label="PROJECTS" subtitle="多人協作"
            accent="#60a5fa" delay={0.42}
          />
          <NavTile
            href="/learn" icon={Brain} label="LEARN" subtitle="學習積累"
            accent="#00ff88" delay={0.44}
          />
          <NavTile
            href="/settings" icon={Settings} label="SETTINGS" subtitle="系統設定"
            accent="#7070a0" delay={0.48}
          />
        </div>
      </section>

      {/* ── Recent Inspirations ── */}
      {latestInsps.length > 0 && (
        <motion.section {...fadeUp(0.52)}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase flex items-center gap-2">
              <Sparkles size={13} className="text-accent-gold" />
              Latest Sparks
            </h2>
            <Link
              href="/learn"
              className="font-display text-[12px] tracking-widest text-ink-muted hover:text-accent-blue transition-colors"
            >
              ALL →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {latestInsps.map(insp => (
              <div
                key={insp.id}
                className="bg-card border border-border-subtle rounded-xl p-4 card-hover"
              >
                <p className="font-body text-sm text-ink-primary leading-relaxed line-clamp-3">
                  {insp.content}
                </p>
                <p className="font-mono text-[12px] text-ink-muted mt-2">
                  {new Date(insp.created_at).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  )
}
