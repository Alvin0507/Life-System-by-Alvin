'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Circle, Camera } from 'lucide-react'
import { useTodayStore } from '@/stores/useTodayStore'
import { useAppStore } from '@/stores/useAppStore'
import { DayMode } from '@/types'

interface ModeConfig {
  value: DayMode
  label: string
  subtitle: string
  description: string
  Icon: typeof Swords
  color: string
  activeClass: string
  accent: string
}

const MODES: ModeConfig[] = [
  {
    value: 'combat',
    label: '衝刺',
    subtitle: 'COMBAT',
    description: '專注模式 · 只顯示最關鍵任務，其他暫時關閉',
    Icon: Swords,
    color: 'text-accent-red',
    activeClass: 'bg-accent-red/15 text-accent-red border-accent-red/50',
    accent: 'rgba(255,56,96,0.35)',
  },
  {
    value: 'normal',
    label: '日常',
    subtitle: 'NORMAL',
    description: '標準模式 · 所有項目展開',
    Icon: Circle,
    color: 'text-ink-secondary',
    activeClass: 'bg-elevated text-ink-primary border-border-active',
    accent: 'rgba(0,212,255,0.28)',
  },
  {
    value: 'field',
    label: '外景',
    subtitle: 'FIELD',
    description: '拍攝日 · 顯示拍攝前後的檢查清單',
    Icon: Camera,
    color: 'text-accent-gold',
    activeClass: 'bg-accent-gold/15 text-accent-gold border-accent-gold/50',
    accent: 'rgba(255,215,0,0.35)',
  },
]

export default function ModeSwitch() {
  const dayMode = useTodayStore(s => s.dayMode)
  const setDayMode = useTodayStore(s => s.setDayMode)
  const addToast = useAppStore(s => s.addToast)
  const [hovered, setHovered] = useState<DayMode | null>(null)

  function handleSwitch(m: ModeConfig) {
    if (m.value === dayMode) return
    setDayMode(m.value)
    addToast({
      type: 'info',
      message: `切換至${m.label}模式 · ${m.description.split('·')[1]?.trim() ?? m.description}`,
    })
  }

  const shown = MODES.find(m => m.value === (hovered ?? dayMode)) ?? MODES[1]

  return (
    <div className="flex flex-col items-end gap-2">
      <div
        className="flex gap-1 p-1 bg-card border border-border-subtle rounded-lg relative"
        style={{ boxShadow: `0 0 20px ${shown.accent}` }}
      >
        {MODES.map(m => {
          const active = dayMode === m.value
          const Icon = m.Icon
          return (
            <button
              key={m.value}
              onClick={() => handleSwitch(m)}
              onMouseEnter={() => setHovered(m.value)}
              onMouseLeave={() => setHovered(null)}
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[12px] font-display tracking-widest
                border transition-all duration-200
                ${active ? m.activeClass : 'text-ink-muted border-transparent hover:text-ink-secondary hover:bg-elevated/60'}
              `}
            >
              <Icon size={11} className="shrink-0" />
              <span>{m.subtitle}</span>
            </button>
          )
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={shown.value}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="font-body text-[12px] text-ink-secondary text-right max-w-[240px]"
        >
          {shown.description}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
