'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Zap, AlertTriangle, Trophy, X } from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { ToastItem } from '@/types'

const CONFIG = {
  success:     { Icon: CheckCircle, color: 'text-accent-green',  border: '#00ff8866',  glow: '0 0 12px rgba(0,255,136,0.25)'  },
  info:        { Icon: Zap,         color: 'text-accent-blue',   border: '#00d4ff66',  glow: '0 0 12px rgba(0,212,255,0.25)'  },
  warning:     { Icon: AlertTriangle,color: 'text-accent-orange', border: '#ff8c4266',  glow: '0 0 12px rgba(255,140,66,0.25)' },
  achievement: { Icon: Trophy,       color: 'text-accent-gold',   border: '#ffd70066',  glow: '0 0 12px rgba(255,215,0,0.25)'  },
} as const

function ToastCard({ toast }: { toast: ToastItem }) {
  const removeToast = useAppStore((s) => s.removeToast)
  const { Icon, color, border, glow } = CONFIG[toast.type]

  return (
    <motion.div
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{ borderColor: border, boxShadow: glow }}
      className="flex items-center gap-3 px-4 py-3 bg-elevated border rounded-lg min-w-[260px] max-w-sm"
    >
      <Icon size={15} className={`${color} shrink-0`} />
      <span className="flex-1 text-sm text-ink-primary font-body leading-tight">
        {toast.message}
      </span>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-ink-muted hover:text-ink-primary transition-colors shrink-0"
      >
        <X size={13} />
      </button>
    </motion.div>
  )
}

export default function Toast() {
  const toasts = useAppStore((s) => s.toasts)
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
