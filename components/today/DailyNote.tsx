'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useTodayStore } from '@/stores/useTodayStore'
import { DailyNote as DailyNoteType } from '@/types'

function AutoTextarea({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(v), 500)
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [onChange])

  return (
    <textarea
      ref={ref}
      defaultValue={value}
      onChange={handleChange}
      placeholder={placeholder}
      rows={2}
      className="w-full bg-transparent text-sm text-ink-primary font-body resize-none outline-none
        placeholder:text-ink-muted leading-relaxed min-h-[48px]"
    />
  )
}

const fields: { key: keyof DailyNoteType; emoji: string; label: string; placeholder: string }[] = [
  { key: 'completed_summary', emoji: '✅', label: '完成了', placeholder: '今天完成了什麼...' },
  { key: 'blocked_by',        emoji: '🔴', label: '卡在',   placeholder: '什麼事情卡住了...' },
  { key: 'tomorrow_focus',    emoji: '➡️', label: '明天第一件事', placeholder: '明天一起床先做...' },
]

export default function DailyNote() {
  const note = useTodayStore(s => s.note)
  const updateNote = useTodayStore(s => s.updateNote)
  const getYesterdayNote = useTodayStore(s => s.getYesterdayNote)
  const [showYesterday, setShowYesterday] = useState(false)
  const [yesterdayNote, setYesterdayNote] = useState<DailyNoteType | null>(null)
  const [now, setNow] = useState('')

  useEffect(() => {
    setNow(new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }))
    const interval = setInterval(() => {
      setNow(new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }))
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  function handleToggleYesterday() {
    if (!showYesterday && !yesterdayNote) {
      setYesterdayNote(getYesterdayNote())
    }
    setShowYesterday(v => !v)
  }

  return (
    <section className="bg-card border border-border-subtle rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase">Debrief</h2>
          {now && <span className="font-mono text-xs text-ink-muted">{now}</span>}
        </div>
        <button
          onClick={handleToggleYesterday}
          className="flex items-center gap-1.5 text-ink-muted hover:text-ink-secondary transition-colors text-xs font-body"
        >
          昨日備註
          <motion.span animate={{ rotate: showYesterday ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={13} />
          </motion.span>
        </button>
      </div>

      {/* Yesterday */}
      <AnimatePresence>
        {showYesterday && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-border-subtle"
          >
            <div className="px-5 py-4 bg-void/40">
              <p className="font-display text-[11px] tracking-widest text-ink-muted mb-3">YESTERDAY</p>
              {yesterdayNote ? (
                <div className="space-y-2">
                  {fields.map(f => (
                    <div key={f.key}>
                      <span className="text-xs text-ink-muted">{f.emoji} {f.label}</span>
                      <p className="text-sm text-ink-secondary mt-0.5 font-body">
                        {(yesterdayNote[f.key] as string) || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-muted font-body">昨天沒有備註。</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today fields */}
      <div className="divide-y divide-border-subtle">
        {fields.map(f => (
          <div key={f.key} className="px-5 py-4">
            <p className="font-display text-[12px] tracking-widest text-ink-secondary mb-2 uppercase">
              {f.emoji} {f.label}
            </p>
            <AutoTextarea
              value={(note?.[f.key] as string) ?? ''}
              onChange={v => updateNote(f.key, v)}
              placeholder={f.placeholder}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
