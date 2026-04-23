'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodayStore } from '@/stores/useTodayStore'
import { useCountUp } from '@/lib/hooks/useCountUp'

const R = 32
const CIRCUMFERENCE = 2 * Math.PI * R

export default function ProgressRing() {
  const [hovered, setHovered] = useState(false)
  const tasks = useTodayStore(s => s.tasks)
  const allDone = tasks.filter(t => t.completed).length
  const rate = tasks.length ? Math.round((allDone / tasks.length) * 100) : 0
  const animatedRate = useCountUp(rate, 600)

  if (!tasks.length) return null

  const done = (cat: string) => tasks.filter(t => t.category === cat && t.completed).length
  const total = (cat: string) => tasks.filter(t => t.category === cat).length
  const dashOffset = CIRCUMFERENCE * (1 - rate / 100)
  const isComplete = rate === 100
  const ringColor = isComplete ? '#00ff88' : '#00d4ff'

  return (
    <div
      className="fixed bottom-24 right-4 z-40 md:bottom-8 md:right-6"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-3 bg-elevated border border-border-active rounded-xl px-4 py-3 min-w-[200px] shadow-lg"
            style={{ boxShadow: '0 0 20px rgba(0,212,255,0.1)' }}
          >
            <p className="font-display text-[9px] tracking-widest text-ink-muted mb-2">PROGRESS</p>
            {[
              { label: 'WIN',     cat: 'win_condition' },
              { label: 'CLIENT',  cat: 'client'        },
              { label: 'SOCIAL',  cat: 'social'        },
              { label: 'GROWTH',  cat: 'growth'        },
              { label: 'NON-NEG', cat: 'non_neg'       },
            ].map(({ label, cat }) => (
              <div key={cat} className="flex justify-between items-center py-[3px]">
                <span className="font-display text-[9px] text-ink-secondary tracking-wider">{label}</span>
                <span className="font-mono text-[11px] text-ink-primary">
                  {done(cat)}/{total(cat)}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="relative w-20 h-20"
        animate={isComplete ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={isComplete ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : { duration: 0.2 }}
        style={isComplete ? { filter: 'drop-shadow(0 0 12px rgba(0,255,136,0.45))' } : { filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.25))' }}
      >
        <svg width={80} height={80} className="-rotate-90">
          <circle
            cx={40} cy={40} r={R}
            stroke="#1e1e35" strokeWidth={5} fill="none"
          />
          <circle
            cx={40} cy={40} r={R}
            stroke={ringColor} strokeWidth={5} fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-mono text-xs leading-none tabular-nums"
            style={{ color: ringColor }}
          >
            {animatedRate}%
          </span>
        </div>
      </motion.div>
    </div>
  )
}
