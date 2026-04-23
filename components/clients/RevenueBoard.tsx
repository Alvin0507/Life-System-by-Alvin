'use client'
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { useClientStore, CLIENT_CONFIG, CLIENT_ORDER, TOTAL_REVENUE_GOAL } from '@/stores/useClientStore'
import { useAppStore } from '@/stores/useAppStore'
import { RevenueStatus, ClientName } from '@/types'
import { getDaysLeftInMonth, getDayOfMonth } from '@/lib/utils'

const STATUS_CONFIG: Record<RevenueStatus, { label: string; bg: string; text: string }> = {
  pending:     { label: '待確認', bg: 'bg-accent-orange/20', text: 'text-accent-orange' },
  in_progress: { label: '進行中', bg: 'bg-accent-blue/20',   text: 'text-accent-blue'   },
  received:    { label: '已收款', bg: 'bg-accent-gold/20',   text: 'text-accent-gold'   },
}

function ClientCard({ client }: { client: ClientName }) {
  const outputs = useClientStore(s => s.outputs)
  const output = outputs.find(o => o.client === client)
  const setRevenueStatus = useClientStore(s => s.setRevenueStatus)
  const cfg = CLIENT_CONFIG[client]

  if (!output) return null

  const STATUS_ORDER: RevenueStatus[] = ['pending', 'in_progress', 'received']
  const isReceived = output.revenue_status === 'received'

  return (
    <motion.div
      layout
      className={`bg-card border rounded-xl overflow-hidden transition-all duration-300
        ${isReceived ? 'border-accent-gold/50' : 'border-border-subtle hover:border-border-active'}`}
      style={isReceived ? { boxShadow: '0 0 20px rgba(255,215,0,0.12)' } : undefined}
    >
      {/* Top bar */}
      <div
        className="h-[3px]"
        style={{ backgroundColor: cfg.color, opacity: isReceived ? 1 : 0.5 }}
      />

      <div className="p-4">
        {/* Client label */}
        <p className="font-display text-[12px] tracking-widest text-ink-secondary uppercase mb-2">
          {cfg.label}
        </p>

        {/* Revenue amount */}
        <p
          className="font-mono text-3xl font-bold leading-none mb-4"
          style={{ color: cfg.color }}
        >
          {cfg.revenue.toLocaleString()}
        </p>

        {/* Status toggles */}
        <div className="flex gap-1">
          {STATUS_ORDER.map(status => {
            const { label, bg, text } = STATUS_CONFIG[status]
            const active = output.revenue_status === status
            return (
              <button
                key={status}
                onClick={() => setRevenueStatus(client, status)}
                className={`
                  flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[11px] font-display
                  tracking-wider transition-all duration-150
                  ${active ? `${bg} ${text} border border-current/30` : 'text-ink-muted border border-transparent hover:border-border-subtle'}
                `}
              >
                {status === 'received' && active && <Check size={9} />}
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

export default function RevenueBoard() {
  const outputs = useClientStore(s => s.outputs)
  const addToast = useAppStore(s => s.addToast)
  const triggerCelebration = useAppStore(s => s.triggerCelebration)

  const prevAllReceived = useRef(false)
  const receivedAmount = outputs
    .filter(o => o.revenue_status === 'received')
    .reduce((sum, o) => sum + CLIENT_CONFIG[o.client].revenue, 0)
  const progressPct = Math.min(100, (receivedAmount / TOTAL_REVENUE_GOAL) * 100)

  useEffect(() => {
    const allReceived = outputs.length > 0 && outputs.every(o => o.revenue_status === 'received')
    if (allReceived && !prevAllReceived.current) {
      triggerCelebration()
      addToast({ type: 'achievement', message: '🏆 本月全數收款完成！' })
    }
    prevAllReceived.current = allReceived
  }, [outputs, addToast, triggerCelebration])

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-display text-sm tracking-[0.2em] text-accent-gold uppercase">
          Revenue Command
        </h2>
        <span className="font-mono text-xs text-ink-secondary">
          本月第 {getDayOfMonth()} 天 · 剩 {getDaysLeftInMonth()} 天
        </span>
      </div>

      {/* Client cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {CLIENT_ORDER.map(c => <ClientCard key={c} client={c} />)}
      </div>

      {/* Total progress */}
      <div className="bg-card border border-border-subtle rounded-xl p-4">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="font-display text-[11px] tracking-widest text-ink-muted uppercase mb-1">
              本月目標 NT$ {TOTAL_REVENUE_GOAL.toLocaleString()}
            </p>
            <p className="font-mono text-2xl text-ink-primary">
              NT$ <span
                className="text-accent-green"
                style={receivedAmount === TOTAL_REVENUE_GOAL ? { color: '#ffd700' } : undefined}
              >
                {receivedAmount.toLocaleString()}
              </span>
            </p>
          </div>
          <p className="font-mono text-sm text-ink-secondary">{Math.round(progressPct)}%</p>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-elevated rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${progressPct}%`,
              background: progressPct >= 100
                ? 'linear-gradient(90deg, #ffd700, #ffed4a)'
                : progressPct >= 80
                ? '#00ff88'
                : progressPct >= 50
                ? '#ff8c42'
                : '#00d4ff',
              boxShadow: progressPct >= 100 ? '0 0 12px rgba(255,215,0,0.5)' : undefined,
              transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </div>
      </div>
    </section>
  )
}
