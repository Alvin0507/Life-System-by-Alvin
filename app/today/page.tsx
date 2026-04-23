'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence, type MotionProps } from 'framer-motion'
import { useTodayStore } from '@/stores/useTodayStore'
import { useAppStore } from '@/stores/useAppStore'
import { useClientStore } from '@/stores/useClientStore'
import { dailyQuotes } from '@/lib/quotes'
import { formatDate, getDayOfMonth, getDateSeed } from '@/lib/utils'
import { useGreeting } from '@/lib/hooks/useGreeting'
import ModeSwitch from '@/components/today/ModeSwitch'
import WinConditions from '@/components/today/WinConditions'
import TaskMatrix from '@/components/today/TaskMatrix'
import NonNegotiables from '@/components/today/NonNegotiables'
import DailyNote from '@/components/today/DailyNote'
import ProgressRing from '@/components/ui/ProgressRing'
import LoadingScreen from '@/components/ui/LoadingScreen'

/* ── helpers ── */
function getWeekday(): number {
  return new Date().getDay() || 7
}
function getQuoteIndex(manualOffset: number): number {
  const base = getDateSeed() % dailyQuotes.length
  return (base + manualOffset) % dailyQuotes.length
}

/* ── Field Operation View ── */
function FieldOperation() {
  const [checks, setChecks] = useState({
    script: false, gear: false, location: false, backup: false, social: false,
  })
  const toggle = (k: keyof typeof checks) =>
    setChecks(prev => ({ ...prev, [k]: !prev[k] }))

  const PRE = [
    { k: 'script'   as const, label: '腳本確認' },
    { k: 'gear'     as const, label: '器材確認' },
    { k: 'location' as const, label: '場地交通確認' },
  ]
  const POST = [
    { k: 'backup' as const, label: '素材備份' },
    { k: 'social' as const, label: '今日海巡 10 分鐘' },
  ]

  const doneCount = Object.values(checks).filter(Boolean).length
  const total = PRE.length + POST.length

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="bg-card border border-accent-gold/30 rounded-xl p-6 relative overflow-hidden"
      style={{ boxShadow: '0 0 32px rgba(255,215,0,0.12)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-gold/0 via-accent-gold to-accent-gold/0" />
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-sm tracking-[0.2em] text-accent-gold flex items-center gap-2">
          <span className="text-base">📍</span> FIELD OPERATION
        </h2>
        <span className="font-mono text-xs text-accent-gold tabular-nums">{doneCount}/{total}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[{ title: '拍攝前', items: PRE }, { title: '拍攝後', items: POST }].map(group => (
          <div key={group.title}>
            <p className="font-display text-[11px] tracking-widest text-ink-muted mb-3">{group.title}</p>
            <div className="space-y-2">
              {group.items.map(({ k, label }) => (
                <button key={k} onClick={() => toggle(k)}
                  className="flex items-center gap-3 w-full text-left group">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                    ${checks[k] ? 'bg-accent-gold border-accent-gold' : 'border-ink-muted group-hover:border-accent-gold'}`}>
                    {checks[k] && (
                      <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} width={8} height={8} viewBox="0 0 8 8">
                        <polyline points="1,4 3,6 7,2" fill="none" stroke="#0f0f1a" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                      </motion.svg>
                    )}
                  </div>
                  <span className={`text-sm font-body transition-colors ${checks[k] ? 'line-through text-ink-muted' : 'text-ink-primary'}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="font-display text-sm text-accent-gold mt-6 text-center tracking-wider">
        今天拍好就是贏了。其他明天再說。
      </p>
    </motion.section>
  )
}

/* ── COMBAT Banner ── */
function CombatBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative bg-gradient-to-r from-accent-red/10 via-accent-red/5 to-transparent border border-accent-red/40 rounded-xl px-5 py-3 flex items-center gap-3 overflow-hidden"
      style={{ boxShadow: '0 0 24px rgba(255,56,96,0.12)' }}
    >
      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent-red animate-pulse" />
      <span className="font-display text-accent-red text-lg">⚔</span>
      <div className="flex-1">
        <p className="font-display text-xs text-accent-red tracking-widest">COMBAT MODE</p>
        <p className="font-body text-[13px] text-ink-secondary mt-0.5">
          目前隱藏 SOCIAL / GROWTH / NON-NEG · 只顯示勝利條件和客戶任務
        </p>
      </div>
    </motion.div>
  )
}

/* ── MAIN PAGE ── */
export default function TodayPage() {
  const loadToday = useTodayStore(s => s.loadToday)
  const loaded = useTodayStore(s => s.loaded)
  const loadClients = useClientStore(s => s.loadAll)
  const clientsLoaded = useClientStore(s => s.loaded)
  const todayStr = useTodayStore(s => s.todayStr)
  const dayMode = useTodayStore(s => s.dayMode)
  const addToast = useAppStore(s => s.addToast)
  const greeting = useGreeting()

  const [clock, setClock] = useState('')
  const [quoteOffset, setQuoteOffset] = useState(0)
  const [dayOfMonth] = useState(getDayOfMonth)
  const [weekday] = useState(getWeekday)

  useEffect(() => { loadToday() }, [loadToday])
  useEffect(() => { if (!clientsLoaded) loadClients() }, [clientsLoaded, loadClients])

  useEffect(() => {
    document.body.classList.remove('mode-combat', 'mode-field')
    if (dayMode === 'combat') document.body.classList.add('mode-combat')
    else if (dayMode === 'field') document.body.classList.add('mode-field')
    return () => document.body.classList.remove('mode-combat', 'mode-field')
  }, [dayMode])

  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('zh-TW', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    })
    setClock(fmt())
    const id = setInterval(() => setClock(fmt()), 1000)
    return () => clearInterval(id)
  }, [])

  const quote = dailyQuotes[getQuoteIndex(quoteOffset)]

  const fadeUp = (delay: number): MotionProps => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.4, ease: 'easeOut' },
  })

  if (!loaded) return <LoadingScreen label="BOOTING" />

  const isCombat = dayMode === 'combat'
  const isField = dayMode === 'field'

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 space-y-6 pb-24">
      {/* ── HEADER ── */}
      <motion.div {...fadeUp(0)} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-body text-xs text-ink-secondary mb-1">
            <span className="text-accent-blue">◇</span> {greeting.text}
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-ink-primary tracking-wider">
            {formatDate(todayStr)}
          </h1>
          <p className="font-mono text-xs text-ink-secondary mt-1">
            本月第 {dayOfMonth} 天 · 本週第 {weekday} 天
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <span className="font-mono text-2xl text-accent-blue tabular-nums" style={{ textShadow: '0 0 18px rgba(0,212,255,0.4)' }}>
            {clock}
          </span>
          <ModeSwitch />
        </div>
      </motion.div>

      {/* ── COMBAT BANNER ── */}
      <AnimatePresence>
        {isCombat && (
          <motion.div
            key="combat-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <CombatBanner />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── QUOTE ── */}
      <motion.div {...fadeUp(0.05)}
        className="card-hover bg-card/80 backdrop-blur-sm border border-border-subtle rounded-xl px-6 py-5 text-center relative"
      >
        <p
          className="text-xl md:text-2xl leading-relaxed"
          style={{
            fontFamily: 'var(--font-quote)',
            fontWeight: 600,
            color: '#ffe452',
            textShadow: '0 0 18px rgba(255,215,0,0.45), 0 1px 0 rgba(0,0,0,0.4)',
          }}
        >
          {quote}
        </p>
        <button
          onClick={() => {
            setQuoteOffset(v => v + 1)
            addToast({ type: 'info', message: '換了一句話。' })
          }}
          className="absolute bottom-3 right-4 text-ink-muted hover:text-accent-gold text-xs font-body transition-colors"
        >
          ↻ 換一句
        </button>
      </motion.div>

      {/* ── WIN CONDITIONS (always shown) ── */}
      <motion.div {...fadeUp(0.1)}>
        <WinConditions />
      </motion.div>

      {/* ── TASK MATRIX / FIELD ── */}
      <motion.div {...fadeUp(0.15)}>
        <AnimatePresence mode="wait">
          {isField ? (
            <FieldOperation key="field" />
          ) : (
            <motion.div
              key="matrix"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <TaskMatrix combatMode={isCombat} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── NON-NEGOTIABLES (hidden in COMBAT / FIELD) ── */}
      <AnimatePresence>
        {!isCombat && !isField && (
          <motion.div
            key="nonneg"
            {...fadeUp(0.2)}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
          >
            <NonNegotiables />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DAILY NOTE ── */}
      <motion.div {...fadeUp(0.25)}>
        <DailyNote />
      </motion.div>

      {/* ── Floating Progress Ring ── */}
      <ProgressRing />
    </div>
  )
}
