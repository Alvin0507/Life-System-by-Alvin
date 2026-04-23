'use client'
import { motion } from 'framer-motion'

export default function LoadingScreen({ label = 'BOOTING' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative w-14 h-14">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
            <circle cx={28} cy={28} r={24} stroke="#1e1e35" strokeWidth={3} fill="none" />
            <motion.circle
              cx={28} cy={28} r={24}
              stroke="#00d4ff" strokeWidth={3} fill="none"
              strokeLinecap="round"
              strokeDasharray="40 110"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
              style={{ transformOrigin: '28px 28px' }}
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-accent-gold"
            style={{ animation: 'logo-pulse 1.8s ease-in-out infinite' }}
          >
            A
          </span>
        </div>
        <span className="font-mono text-[10px] tracking-[0.3em] text-ink-muted animate-pulse">
          {label}...
        </span>
      </motion.div>
    </div>
  )
}
