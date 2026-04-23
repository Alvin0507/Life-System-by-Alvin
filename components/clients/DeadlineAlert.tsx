'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, AlertTriangle, Clock } from 'lucide-react'
import { useClientStore, CLIENT_CONFIG, CLIENT_ORDER } from '@/stores/useClientStore'
import { useAppStore } from '@/stores/useAppStore'
import { ClientName, TaskStatus } from '@/types'

const STATUS_ORDER: TaskStatus[] = ['not_started', 'in_progress', 'done']
const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: '未開始', in_progress: '進行中', done: '已完成',
}
const STATUS_STYLE: Record<TaskStatus, string> = {
  not_started: 'bg-elevated text-ink-secondary border-border-subtle',
  in_progress: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',
  done:        'bg-accent-green/15 text-accent-green border-accent-green/30',
}

function getDaysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function formatDue(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function DeadlineAlert() {
  const deadlines = useClientStore(s => s.deadlines)
  const addDeadline = useClientStore(s => s.addDeadline)
  const setDeadlineStatus = useClientStore(s => s.setDeadlineStatus)
  const deleteDeadline = useClientStore(s => s.deleteDeadline)
  const addToast = useAppStore(s => s.addToast)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<{ due_date: string; client: ClientName; deliverable: string }>({
    due_date: '', client: 'bitget', deliverable: '',
  })

  function handleAdd() {
    if (!form.due_date || !form.deliverable.trim()) return
    addDeadline({ ...form, status: 'not_started' })
    addToast({ type: 'info', message: `Deadline 已新增：${form.deliverable}` })
    setShowForm(false)
    setForm({ due_date: '', client: 'bitget', deliverable: '' })
  }

  function cycleStatus(id: string, current: TaskStatus) {
    const idx = STATUS_ORDER.indexOf(current)
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
    setDeadlineStatus(id, next)
    if (next === 'done') addToast({ type: 'success', message: '✓ Deadline 完成！' })
  }

  // Sort: active first (by urgency), done at bottom
  const active = deadlines
    .filter(d => d.status !== 'done')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
  const done = deadlines
    .filter(d => d.status === 'done')
    .sort((a, b) => b.due_date.localeCompare(a.due_date))
  const sorted = [...active, ...done]

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase">
          Deadline Alert
        </h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs text-accent-blue hover:text-accent-blue/80 transition-colors font-body"
        >
          <Plus size={13} /> 新增
        </button>
      </div>

      {/* Inline form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="bg-elevated border border-border-active rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-display tracking-wider text-ink-secondary mb-1 uppercase">截止日</label>
                  <input
                    type="date" value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full bg-void border border-border-subtle rounded px-2 py-1.5 text-xs font-mono text-ink-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-display tracking-wider text-ink-secondary mb-1 uppercase">客戶</label>
                  <select
                    value={form.client}
                    onChange={e => setForm(f => ({ ...f, client: e.target.value as ClientName }))}
                    className="w-full bg-void border border-border-subtle rounded px-2 py-1.5 text-xs text-ink-primary font-body outline-none"
                  >
                    {CLIENT_ORDER.map(c => <option key={c} value={c}>{CLIENT_CONFIG[c].label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-display tracking-wider text-ink-secondary mb-1 uppercase">交付物</label>
                <input
                  value={form.deliverable}
                  onChange={e => setForm(f => ({ ...f, deliverable: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowForm(false) }}
                  placeholder="腳本初稿、剪輯完成..."
                  autoFocus
                  className="w-full bg-void border border-border-subtle rounded px-2 py-1.5 text-sm text-ink-primary font-body outline-none placeholder:text-ink-muted"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)} className="text-xs text-ink-muted hover:text-ink-primary transition-colors font-body px-3 py-1.5">取消</button>
                <button
                  onClick={handleAdd}
                  disabled={!form.due_date || !form.deliverable.trim()}
                  className="text-xs px-4 py-1.5 bg-accent-blue/15 text-accent-blue rounded border border-accent-blue/30
                    hover:bg-accent-blue/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-display tracking-wider"
                >
                  新增
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deadline cards */}
      {sorted.length === 0 ? (
        <p className="text-xs text-ink-muted font-body py-4 text-center">尚無 Deadline</p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {sorted.map(dl => {
              const days = getDaysUntil(dl.due_date)
              const isDone = dl.status === 'done'
              const isExpired = days < 0 && !isDone
              const isUrgent = days >= 0 && days < 3 && !isDone
              const isWarning = days >= 3 && days < 7 && !isDone
              const cfg = CLIENT_CONFIG[dl.client]

              return (
                <motion.div
                  key={dl.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: isDone ? 0.4 : 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl border
                    transition-all duration-200 group/dl
                    ${isExpired ? 'border-accent-red bg-accent-red/8 animate-pulse' :
                      isUrgent   ? 'border-accent-red/60 bg-accent-red/5' :
                      isWarning  ? 'border-accent-orange/60 bg-accent-orange/5' :
                      'border-border-subtle bg-card'}
                  `}
                  style={isExpired ? { boxShadow: '0 0 12px rgba(255,56,96,0.2)' } : undefined}
                >
                  {/* Urgency icon */}
                  <div className="shrink-0">
                    {isExpired || isUrgent ? (
                      <AlertTriangle size={13} className={isExpired ? 'text-accent-red' : 'text-accent-red/70'} />
                    ) : isWarning ? (
                      <Clock size={13} className="text-accent-orange" />
                    ) : (
                      <div className="w-2 h-2 rounded-full mt-0.5" style={{ backgroundColor: cfg.color }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-body ${isDone ? 'line-through' : 'text-ink-primary'}`}>
                        {dl.deliverable}
                      </span>
                      <span
                        className="text-[11px] font-display tracking-wider px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: cfg.color + '20', color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`font-mono text-xs ${isExpired ? 'text-accent-red' : isUrgent ? 'text-accent-red/80' : isWarning ? 'text-accent-orange' : 'text-ink-muted'}`}>
                        {formatDue(dl.due_date)}
                        {!isDone && (
                          <span className="ml-1">
                            {isExpired ? `（逾期 ${Math.abs(days)} 天）` :
                             days === 0 ? '（今天）' :
                             `（還有 ${days} 天）`}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Status toggle */}
                  <button
                    onClick={() => cycleStatus(dl.id, dl.status)}
                    className={`shrink-0 text-[11px] font-display tracking-wider px-2.5 py-1.5 rounded border transition-all ${STATUS_STYLE[dl.status]}`}
                  >
                    {STATUS_LABEL[dl.status]}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteDeadline(dl.id)}
                    className="opacity-0 group-hover/dl:opacity-100 text-ink-muted hover:text-accent-red transition-all shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}
