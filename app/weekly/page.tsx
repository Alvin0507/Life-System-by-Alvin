'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, type MotionProps } from 'framer-motion'
import { Lock } from 'lucide-react'
import { useClientStore, CLIENT_CONFIG, CLIENT_ORDER } from '@/stores/useClientStore'
import { createClient as createSupabase, getSessionUser } from '@/lib/supabase/client'
import { getWeekStart, getDaysLeftInMonth } from '@/lib/utils'
import { DayMode, Task, WeeklyReview, FieldTrip, MonthlyOutput } from '@/types'
import LoadingScreen from '@/components/ui/LoadingScreen'

/* ── Types ── */
type WeekDayMode = DayMode | 'rest'
interface DayContext { mode: WeekDayMode; note: string }
type TaskMap = Record<string, Task[]>
type DayMap = Record<string, DayContext>
type ReviewMap = Record<string, WeeklyReview>

/* ── Constants ── */
const DAY_ABBR = ['MON','TUE','WED','THU','FRI','SAT','SUN']
const MODE_CYCLE: WeekDayMode[] = ['normal','combat','field','rest']
const MODE_EMOJI: Record<string, string> = { normal:'⚡', combat:'🔥', field:'📍', rest:'😴' }
const MODE_STYLE: Record<string, string> = {
  normal:  'bg-elevated text-ink-secondary border-border-active',
  combat:  'bg-accent-red/15 text-accent-red border-accent-red/30',
  field:   'bg-accent-gold/15 text-accent-gold border-accent-gold/30',
  rest:    'bg-void text-ink-muted border-border-subtle',
}
const DEFAULT_CTX: DayContext = { mode: 'normal', note: '' }

/* ── Local helpers ── */
function dateOffset(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}
function getWeekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => dateOffset(start, i))
}
function fmt2(n: number) { return String(n).padStart(2, '0') }
function weekRange(ws: string): string {
  const s = new Date(ws + 'T00:00:00')
  const e = new Date(ws + 'T00:00:00'); e.setDate(s.getDate() + 6)
  return `${fmt2(s.getMonth()+1)}.${fmt2(s.getDate())} — ${fmt2(e.getMonth()+1)}.${fmt2(e.getDate())}`
}
function lastNWeeks(n: number): string[] {
  const res: string[] = []
  const d = new Date(getWeekStart() + 'T00:00:00')
  for (let i = 0; i < n; i++) {
    res.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() - 7)
  }
  return res
}
function monthCalendar(y: number, m: number): (string | null)[] {
  const first = new Date(y, m, 1)
  const days = new Date(y, m + 1, 0).getDate()
  const startDow = (first.getDay() + 6) % 7
  const cells: (string | null)[] = Array(startDow).fill(null)
  for (let d = 1; d <= days; d++)
    cells.push(`${y}-${fmt2(m+1)}-${fmt2(d)}`)
  return cells
}
function parseDayContent(content: string | null | undefined): DayContext {
  if (!content) return { ...DEFAULT_CTX }
  try {
    const parsed = JSON.parse(content)
    return {
      mode: (parsed.day_mode as WeekDayMode) ?? 'normal',
      note: parsed.day_note ?? '',
    }
  } catch {
    return { ...DEFAULT_CTX }
  }
}
function mergeDayContent(rawContent: string | null | undefined, patch: Partial<DayContext>): string {
  let base: Record<string, unknown> = {}
  if (rawContent) {
    try { base = JSON.parse(rawContent) } catch { /* ignore */ }
  }
  if (patch.mode !== undefined) base.day_mode = patch.mode
  if (patch.note !== undefined) base.day_note = patch.note
  return JSON.stringify(base)
}

/* ══ DayBox ══════════════════════════════════════════════════════════════ */
function DayBox({
  date, today, trips, tasks, ctx, onUpdate,
}: {
  date: string
  today: string
  trips: FieldTrip[]
  tasks: Task[]
  ctx: DayContext
  onUpdate: (date: string, patch: Partial<DayContext>) => void
}) {
  const [exp, setExp] = useState(false)
  const [localNote, setLocalNote] = useState(ctx.note)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFuture = date > today
  const isToday = date === today
  const d = new Date(date + 'T00:00:00')
  const dayIdx = (d.getDay() + 6) % 7
  const hasTrip = trips.some(t => t.trip_date === date)

  useEffect(() => { setLocalNote(ctx.note) }, [ctx.note])

  function cycle(e: React.MouseEvent) {
    e.stopPropagation()
    if (isFuture) return
    const next = MODE_CYCLE[(MODE_CYCLE.indexOf(ctx.mode) + 1) % MODE_CYCLE.length]
    onUpdate(date, { mode: next })
  }

  function onNote(v: string) {
    setLocalNote(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onUpdate(date, { note: v }), 500)
  }

  const done = tasks.filter(t => t.completed).length

  return (
    <div className={`rounded-xl border transition-all duration-200 ${
      isToday ? 'border-accent-blue bg-accent-blue/5 shadow-glow-blue' :
      'border-border-subtle bg-card'} ${isFuture ? 'opacity-40' : ''}`}>
      <div
        role="button"
        tabIndex={isFuture ? -1 : 0}
        onClick={() => !isFuture && setExp(v => !v)}
        onKeyDown={(e) => { if (!isFuture && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setExp(v => !v) } }}
        className="w-full p-2.5 text-center"
      >
        <div className="font-display text-[11px] tracking-wider text-ink-muted mb-0.5">{DAY_ABBR[dayIdx]}</div>
        <div className={`font-mono text-xl font-bold leading-none mb-1.5 ${isToday ? 'text-accent-blue' : 'text-ink-primary'}`}>
          {d.getDate()}
        </div>
        {hasTrip && <div className="text-[13px] mb-1">📍</div>}
        {!isFuture && (
          <button onClick={cycle} className={`text-[8px] font-display tracking-wider px-1 py-0.5 rounded border transition-all ${MODE_STYLE[ctx.mode] ?? MODE_STYLE.normal}`}>
            {MODE_EMOJI[ctx.mode] ?? '⚡'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {exp && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}}
            exit={{height:0,opacity:0}} transition={{duration:0.18}} className="overflow-hidden border-t border-border-subtle">
            <div className="p-2.5 space-y-2">
              <p className="font-mono text-[12px] text-ink-secondary">✓ {done}/{tasks.length}</p>
              <textarea value={localNote} onChange={e => onNote(e.target.value)}
                placeholder="備注..." rows={2}
                className="w-full bg-void text-xs text-ink-primary font-body placeholder:text-ink-muted outline-none resize-none" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ══ ScriptPacing ════════════════════════════════════════════════════════ */
function ScriptPacing({ outputs }: { outputs: MonthlyOutput[] }) {
  const daysLeft = getDaysLeftInMonth()
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7))

  const clients = CLIENT_ORDER.filter(c => {
    const cfg = CLIENT_CONFIG[c]
    return cfg && (cfg.scriptTarget > 0 || cfg.editTarget > 0)
  })

  return (
    <section>
      <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase mb-3">Script Pacing</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {clients.map(client => {
          const cfg = CLIENT_CONFIG[client]
          const out = outputs.find(o => o.client === client)
          const scriptLeft = Math.max(0, cfg.scriptTarget - (out?.script_done ?? 0))
          const editLeft = Math.max(0, cfg.editTarget - (out?.edit_done ?? 0))
          const weekScript = Math.ceil(scriptLeft / weeksLeft)
          const weekEdit = Math.ceil(editLeft / weeksLeft)

          return (
            <div key={client} className="bg-card border border-border-subtle rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                <span className="font-display text-[12px] tracking-widest text-ink-primary uppercase">{cfg.label}</span>
              </div>
              {cfg.scriptTarget > 0 && (
                <p className="text-xs font-body text-ink-secondary mb-1">
                  腳本：本週建議 <span className="font-mono text-accent-blue">{weekScript}</span> 支
                  <span className="text-ink-muted ml-1">({out?.script_done ?? 0}/{cfg.scriptTarget})</span>
                </p>
              )}
              {cfg.editTarget > 0 && (
                <p className="text-xs font-body text-ink-secondary">
                  剪輯：本週建議 <span className="font-mono text-accent-gold">{weekEdit}</span> 支
                  <span className="text-ink-muted ml-1">({out?.edit_done ?? 0}/{cfg.editTarget})</span>
                </p>
              )}
              <div className="mt-2 h-1 bg-void rounded-full overflow-hidden">
                {cfg.scriptTarget > 0 && (
                  <div className="h-full rounded-full bg-accent-blue transition-all duration-700"
                    style={{ width: `${Math.min(100, ((out?.script_done ?? 0) / cfg.scriptTarget) * 100)}%` }} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ══ WeeklyDebrief ═══════════════════════════════════════════════════════ */
function WeeklyDebrief({
  weekStart, reviews, onSave,
}: {
  weekStart: string
  reviews: ReviewMap
  onSave: (ws: string, field: keyof WeeklyReview, val: string) => void
}) {
  const isFriday = new Date().getDay() === 5
  const [historyWs, setHistoryWs] = useState(weekStart)
  const weeks = lastNWeeks(4)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const currentReview = reviews[weekStart]
  const [localValues, setLocalValues] = useState<Record<string, string>>({
    went_well: currentReview?.went_well ?? '',
    improve: currentReview?.improve ?? '',
    next_week_focus: currentReview?.next_week_focus ?? '',
  })

  useEffect(() => {
    setLocalValues({
      went_well: reviews[weekStart]?.went_well ?? '',
      improve: reviews[weekStart]?.improve ?? '',
      next_week_focus: reviews[weekStart]?.next_week_focus ?? '',
    })
  }, [weekStart, reviews])

  function update(field: keyof WeeklyReview, val: string) {
    if (field === 'id' || field === 'week_start') return
    setLocalValues(prev => ({ ...prev, [field]: val }))
    if (timers.current[field]) clearTimeout(timers.current[field])
    timers.current[field] = setTimeout(() => onSave(weekStart, field, val), 500)
  }

  if (!isFriday) return (
    <section>
      <h2 className="font-display text-sm tracking-[0.2em] text-ink-secondary uppercase mb-3">Weekly Debrief</h2>
      <div className="bg-card border border-border-subtle rounded-xl p-8 flex flex-col items-center gap-3">
        <Lock size={24} className="text-ink-muted" />
        <p className="font-display text-xs tracking-widest text-ink-muted">週五才能開啟</p>
      </div>
    </section>
  )

  const FIELDS: { key: keyof WeeklyReview; emoji: string; label: string; ph: string }[] = [
    { key: 'went_well',        emoji: '🏆', label: '本週做得最好的事',   ph: '寫下你本週的亮點...' },
    { key: 'improve',          emoji: '🔧', label: '需要改進的地方',     ph: '哪裡可以做得更好...' },
    { key: 'next_week_focus',  emoji: '⚡', label: '下週最重要的一件事', ph: '下週你要做什麼...' },
  ]

  const displayReview = historyWs !== weekStart ? reviews[historyWs] : null

  return (
    <section>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase">Weekly Debrief</h2>
        <select
          value={historyWs}
          onChange={e => setHistoryWs(e.target.value)}
          className="bg-elevated border border-border-subtle rounded px-2 py-1 text-xs font-mono text-ink-secondary outline-none"
        >
          {weeks.map((ws, i) => (
            <option key={ws} value={ws}>{i === 0 ? '本週' : weekRange(ws)}</option>
          ))}
        </select>
      </div>

      <div className="bg-card border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle">
        {FIELDS.map(f => (
          <div key={f.key} className="px-5 py-4">
            <p className="font-display text-[12px] tracking-widest text-ink-secondary mb-2 uppercase">
              {f.emoji} {f.label}
            </p>
            {historyWs === weekStart ? (
              <textarea
                value={localValues[f.key as string] ?? ''}
                onChange={e => update(f.key, e.target.value)}
                placeholder={f.ph}
                rows={3}
                className="w-full bg-transparent text-sm text-ink-primary font-body placeholder:text-ink-muted outline-none resize-none leading-relaxed"
              />
            ) : (
              <p className="text-sm text-ink-secondary font-body">
                {(displayReview?.[f.key] as string) || '—'}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

/* ══ MiniCalendar ════════════════════════════════════════════════════════ */
function MiniCalendar({ fieldTrips, tasksByDate }: { fieldTrips: FieldTrip[]; tasksByDate: TaskMap }) {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const cells = monthCalendar(now.getFullYear(), now.getMonth())

  const calData: Record<string, number> = {}
  cells.forEach(date => {
    if (!date || date > today) return
    const tasks = tasksByDate[date] ?? []
    if (tasks.length) calData[date] = tasks.filter(t => t.completed).length / tasks.length
  })

  return (
    <section>
      <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase mb-3">
        {now.getFullYear()}.{fmt2(now.getMonth() + 1)} 月曆
      </h2>
      <div className="bg-card border border-border-subtle rounded-xl p-4">
        <div className="grid grid-cols-7 mb-2">
          {DAY_ABBR.map(d => (
            <div key={d} className="text-center font-display text-[8px] tracking-wider text-ink-muted py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} />
            const isToday = date === today
            const isFuture = date > today
            const rate = calData[date] ?? -1
            const hasTrip = fieldTrips.some(t => t.trip_date === date)
            const d = new Date(date + 'T00:00:00').getDate()

            return (
              <div key={date} className={`
                relative aspect-square rounded flex flex-col items-center justify-center
                transition-all duration-200 text-center
                ${isToday ? 'border border-accent-blue' :
                  isFuture ? '' :
                  rate >= 0.8 ? 'bg-accent-green/15' :
                  rate >= 0 ? 'bg-elevated/60' : ''}
              `}>
                <span className={`font-mono text-[13px] leading-none ${
                  isToday ? 'text-accent-blue font-bold' :
                  isFuture ? 'text-ink-muted' :
                  rate >= 0.8 ? 'text-accent-green' :
                  'text-ink-secondary'
                }`}>{d}</span>
                {hasTrip && <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-accent-blue" />}
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-accent-green/30" />
            <span className="text-[11px] text-ink-muted font-body">完成率 ≥80%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
            <span className="text-[11px] text-ink-muted font-body">外出</span>
          </div>
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

export default function WeeklyPage() {
  const [loaded, setLoaded] = useState(false)
  const [weekStart] = useState(getWeekStart)
  const [tasksByDate, setTasksByDate] = useState<TaskMap>({})
  const [days, setDays] = useState<DayMap>({})
  const [dayRawContent, setDayRawContent] = useState<Record<string, string>>({})
  const [reviews, setReviews] = useState<ReviewMap>({})
  const fieldTrips = useClientStore(s => s.fieldTrips)
  const outputs = useClientStore(s => s.outputs)
  const clientsLoaded = useClientStore(s => s.loaded)
  const loadClients = useClientStore(s => s.loadAll)
  const today = new Date().toISOString().split('T')[0]
  const weekDays = getWeekDays(weekStart)

  useEffect(() => { if (!clientsLoaded) loadClients() }, [clientsLoaded, loadClients])

  useEffect(() => {
    (async () => {
      const supabase = createSupabase()
      const user = await getSessionUser()
      if (!user) { setLoaded(true); return }

      const cutoff = new Date(today + 'T00:00:00')
      cutoff.setDate(cutoff.getDate() - 42)
      const cutoffStr = cutoff.toISOString().split('T')[0]

      const reviewCutoff = new Date(weekStart + 'T00:00:00')
      reviewCutoff.setDate(reviewCutoff.getDate() - 28)
      const reviewCutoffStr = reviewCutoff.toISOString().split('T')[0]

      const [tasksRes, notesRes, reviewsRes] = await Promise.all([
        supabase.from('tasks').select('*').gte('date', cutoffStr),
        supabase.from('daily_notes').select('*').gte('date', cutoffStr),
        supabase.from('weekly_reviews').select('*').gte('week_start', reviewCutoffStr),
      ])

      const tasksMap: TaskMap = {}
      for (const t of tasksRes.data ?? []) {
        const arr = tasksMap[t.date] ?? (tasksMap[t.date] = [])
        arr.push({
          id: t.id,
          date: t.date,
          category: t.category as Task['category'],
          content: t.content,
          completed: t.completed,
          target_count: t.target_count ?? undefined,
          created_at: t.created_at,
        })
      }
      setTasksByDate(tasksMap)

      const dmap: DayMap = {}
      const raws: Record<string, string> = {}
      for (const n of notesRes.data ?? []) {
        dmap[n.date] = parseDayContent(n.content)
        raws[n.date] = n.content ?? ''
      }
      setDays(dmap)
      setDayRawContent(raws)

      const rmap: ReviewMap = {}
      for (const r of reviewsRes.data ?? []) {
        rmap[r.week_start] = {
          id: r.id,
          week_start: r.week_start,
          went_well: r.went_well,
          improve: r.improve,
          next_week_focus: r.next_week_focus,
        }
      }
      setReviews(rmap)

      setLoaded(true)
    })()
  }, [today, weekStart])

  const updateDay = useCallback(async (date: string, patch: Partial<DayContext>) => {
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return
    const currentCtx = days[date] ?? DEFAULT_CTX
    const updatedCtx = { ...currentCtx, ...patch }
    setDays(prev => ({ ...prev, [date]: updatedCtx }))
    const newContent = mergeDayContent(dayRawContent[date], patch)
    setDayRawContent(prev => ({ ...prev, [date]: newContent }))
    await supabase.from('daily_notes').upsert(
      { user_id: user.id, date, content: newContent },
      { onConflict: 'user_id,date' }
    )
  }, [days, dayRawContent])

  const saveReview = useCallback(async (ws: string, field: keyof WeeklyReview, val: string) => {
    if (field === 'id' || field === 'week_start') return
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return
    const base = reviews[ws] ?? { id: '__pending', week_start: ws, went_well: '', improve: '', next_week_focus: '' }
    const updated = { ...base, [field]: val }
    setReviews(prev => ({ ...prev, [ws]: updated }))
    const payload: {
      user_id: string
      week_start: string
      went_well: string
      improve: string
      next_week_focus: string
    } = {
      user_id: user.id,
      week_start: ws,
      went_well: updated.went_well,
      improve: updated.improve,
      next_week_focus: updated.next_week_focus,
    }
    const { data } = await supabase
      .from('weekly_reviews')
      .upsert(payload, { onConflict: 'user_id,week_start' })
      .select()
      .single()
    if (data) {
      setReviews(prev => ({ ...prev, [ws]: { ...updated, id: data.id } }))
    }
  }, [reviews])

  if (!loaded) return <LoadingScreen label="LOADING WEEK" />

  const todayIdx = weekDays.indexOf(today)
  const daysPassed = todayIdx >= 0 ? todayIdx + 1 : 7
  const daysLeft = 7 - daysPassed
  const weekTrips = fieldTrips.filter(t => weekDays.includes(t.trip_date))

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 space-y-8 pb-24">

      <motion.div {...fadeUp(0)}>
        <div className="bg-card border border-border-subtle rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-xl text-ink-primary tracking-wider">{weekRange(weekStart)}</h1>
            <p className="font-mono text-xs text-ink-secondary mt-1">
              已過 {daysPassed} 天 · 剩 {daysLeft} 天
              {weekTrips.length > 0 && <span> · 本週外出 <span className="text-accent-gold">{weekTrips.length}</span> 次</span>}
            </p>
          </div>
          <span className="font-display text-[12px] tracking-[0.2em] text-ink-secondary uppercase">WEEKLY OPS</span>
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.05)}>
        <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase mb-3">Week Grid</h2>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          {weekDays.map(date => (
            <DayBox
              key={date}
              date={date}
              today={today}
              trips={fieldTrips}
              tasks={tasksByDate[date] ?? []}
              ctx={days[date] ?? DEFAULT_CTX}
              onUpdate={updateDay}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {Object.entries({ '🔥': 'COMBAT', '⚡': 'NORMAL', '📍': 'FIELD', '😴': 'REST' }).map(([emoji, label]) => (
            <span key={label} className="text-[11px] text-ink-muted font-body">{emoji} {label}</span>
          ))}
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.1)}>
        <ScriptPacing outputs={outputs} />
      </motion.div>

      <motion.div {...fadeUp(0.15)}>
        <WeeklyDebrief weekStart={weekStart} reviews={reviews} onSave={saveReview} />
      </motion.div>

      <motion.div {...fadeUp(0.2)}>
        <MiniCalendar fieldTrips={fieldTrips} tasksByDate={tasksByDate} />
      </motion.div>
    </div>
  )
}
