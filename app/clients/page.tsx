'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence, type MotionProps } from 'framer-motion'
import { Video, DollarSign, Plane, AlarmClock } from 'lucide-react'
import { useClientStore } from '@/stores/useClientStore'
import RevenueBoard from '@/components/clients/RevenueBoard'
import OutputTracker from '@/components/clients/OutputTracker'
import FieldTrips from '@/components/clients/FieldTrips'
import DeadlineAlert from '@/components/clients/DeadlineAlert'
import LoadingScreen from '@/components/ui/LoadingScreen'

const fadeUp = (delay: number): MotionProps => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: 'easeOut' },
})

type TabKey = 'output' | 'revenue' | 'trips' | 'deadlines'

const TABS: { key: TabKey; label: string; icon: typeof Video; accent: string }[] = [
  { key: 'output',    label: 'OUTPUT',    icon: Video,      accent: '#00d4ff' },
  { key: 'revenue',   label: 'REVENUE',   icon: DollarSign, accent: '#00ff88' },
  { key: 'trips',     label: 'TRIPS',     icon: Plane,      accent: '#ffd700' },
  { key: 'deadlines', label: 'DEADLINES', icon: AlarmClock, accent: '#ff3860' },
]

const LS_KEY = 'alvin_clients_tab'

export default function ClientsPage() {
  const loadAll = useClientStore(s => s.loadAll)
  const loaded = useClientStore(s => s.loaded)
  const [tab, setTab] = useState<TabKey>('output')

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(LS_KEY) as TabKey | null
    if (stored && TABS.some(t => t.key === stored)) setTab(stored)
  }, [])

  function handleTab(next: TabKey) {
    setTab(next)
    if (typeof window !== 'undefined') localStorage.setItem(LS_KEY, next)
  }

  if (!loaded) return <LoadingScreen label="SYNCING CLIENTS" />

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 pb-24">
      <motion.div {...fadeUp(0)}>
        <div className="mb-5">
          <p className="font-display text-[12px] tracking-[0.3em] text-ink-muted mb-1">CLIENT COMMAND CENTER</p>
          <h1 className="font-display text-2xl md:text-3xl text-ink-primary tracking-wider">接案營運中樞</h1>
        </div>
      </motion.div>

      {/* ── TABS ── */}
      <motion.div {...fadeUp(0.05)} className="mb-6">
        <div className="flex gap-1 overflow-x-auto bg-card border border-border-subtle rounded-xl p-1">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => handleTab(t.key)}
                className={`relative flex-1 min-w-[90px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-display text-[12px] tracking-[0.18em] transition-all btn-press ${
                  active ? 'text-ink-primary' : 'text-ink-muted hover:text-ink-secondary'
                }`}
                style={active ? { backgroundColor: `${t.accent}1a`, boxShadow: `inset 0 0 0 1px ${t.accent}40` } : undefined}
              >
                <Icon size={14} style={{ color: active ? t.accent : undefined }} />
                <span className="hidden sm:inline">{t.label}</span>
                {active && (
                  <motion.span
                    layoutId="clients-tab-underline"
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                    style={{ backgroundColor: t.accent, boxShadow: `0 0 8px ${t.accent}80` }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* ── PANEL ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {tab === 'output' && <OutputTracker />}
          {tab === 'revenue' && <RevenueBoard />}
          {tab === 'trips' && <FieldTrips />}
          {tab === 'deadlines' && <DeadlineAlert />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
