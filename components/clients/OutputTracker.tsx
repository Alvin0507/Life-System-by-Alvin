'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Minus, Plus, RotateCcw } from 'lucide-react'
import { useClientStore, CLIENT_CONFIG, CLIENT_ORDER } from '@/stores/useClientStore'
import { useAppStore } from '@/stores/useAppStore'
import { ClientName, MonthlyOutput } from '@/types'
import Modal from '@/components/ui/Modal'

/* ── Progress bar ── */
function OutputBar({ done, target, color }: { done: number; target: number; color: string }) {
  if (target === 0) return null
  const pct = Math.min(100, (done / target) * 100)
  const barColor = pct >= 100 ? '#ffd700' : pct >= 80 ? '#00ff88' : pct >= 50 ? '#ff8c42' : '#00d4ff'
  return (
    <div className="h-1.5 bg-void rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          backgroundColor: barColor,
          boxShadow: pct >= 100 ? `0 0 8px ${barColor}` : undefined,
          transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </div>
  )
}

/* ── Stepper ── */
function Stepper({
  label, done, target, onAdjust,
}: { label: string; done: number; target: number; onAdjust: (d: number) => void }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-ink-secondary font-body">{label}</span>
          <span className="font-mono text-xs text-ink-primary">
            {done}{target > 0 ? ` / ${target} 支` : ' 篇'}
          </span>
        </div>
        <OutputBar done={done} target={target} color="#00d4ff" />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onAdjust(-1)}
          disabled={done <= 0}
          className="w-6 h-6 rounded bg-elevated border border-border-subtle flex items-center justify-center
            text-ink-muted hover:text-ink-primary hover:border-border-active disabled:opacity-30 disabled:cursor-not-allowed
            transition-all"
        >
          <Minus size={10} />
        </button>
        <button
          onClick={() => onAdjust(1)}
          className="w-6 h-6 rounded bg-elevated border border-border-subtle flex items-center justify-center
            text-ink-muted hover:text-accent-blue hover:border-accent-blue/50 transition-all"
        >
          <Plus size={10} />
        </button>
      </div>
    </div>
  )
}

/* ── Client Block ── */
function ClientBlock({ client }: { client: ClientName }) {
  const [open, setOpen] = useState(true)
  const outputs = useClientStore(s => s.outputs)
  const output = outputs.find(o => o.client === client)
  const adjustOutput = useClientStore(s => s.adjustOutput)
  const cfg = CLIENT_CONFIG[client]

  if (!output) return null

  const hasContent = cfg.scriptTarget > 0 || cfg.editTarget > 0 || client === 'bitget'

  return (
    <div className="border border-border-subtle rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-4 py-3 bg-card hover:bg-elevated transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
          <span className="font-display text-[12px] tracking-widest text-ink-primary uppercase">
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {cfg.scriptTarget > 0 && (
            <span className="font-mono text-[12px] text-ink-muted">
              {output.script_done + output.edit_done} / {cfg.scriptTarget + cfg.editTarget}
            </span>
          )}
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={13} className="text-ink-muted" />
          </motion.span>
        </div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 bg-card/50 divide-y divide-border-subtle/40">
              {cfg.scriptTarget > 0 && (
                <Stepper
                  label="腳本"
                  done={output.script_done}
                  target={cfg.scriptTarget}
                  onAdjust={d => adjustOutput(client, 'script_done', d)}
                />
              )}
              {cfg.editTarget > 0 && (
                <Stepper
                  label="剪輯"
                  done={output.edit_done}
                  target={cfg.editTarget}
                  onAdjust={d => adjustOutput(client, 'edit_done', d)}
                />
              )}
              {client === 'bitget' && (
                <Stepper
                  label="Threads 發文"
                  done={output.threads_done}
                  target={0}
                  onAdjust={d => adjustOutput(client, 'threads_done', d)}
                />
              )}
              {!hasContent && (
                <p className="text-xs text-ink-muted py-3 font-body">無固定產出目標</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── MAIN ── */
export default function OutputTracker() {
  const [resetModal, setResetModal] = useState(false)
  const [resetInput, setResetInput] = useState('')
  const resetMonthlyOutputs = useClientStore(s => s.resetMonthlyOutputs)
  const addToast = useAppStore(s => s.addToast)

  function handleReset() {
    if (resetInput !== 'RESET') return
    resetMonthlyOutputs()
    addToast({ type: 'warning', message: '本月產出數字已清零。' })
    setResetModal(false)
    setResetInput('')
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase">
          Monthly Output
        </h2>
      </div>

      <div className="space-y-2">
        {CLIENT_ORDER.map(c => <ClientBlock key={c} client={c} />)}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setResetModal(true)}
          className="flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-accent-red transition-colors font-body"
        >
          <RotateCcw size={11} /> 月底重置
        </button>
      </div>

      <Modal open={resetModal} onClose={() => { setResetModal(false); setResetInput('') }} title="重置本月產出">
        <p className="text-sm text-ink-secondary font-body mb-4">
          此操作將清零所有產出數字，無法復原。請輸入 <span className="font-mono text-accent-red">RESET</span> 確認。
        </p>
        <input
          value={resetInput}
          onChange={e => setResetInput(e.target.value)}
          placeholder="輸入 RESET"
          autoFocus
          className="w-full bg-void border border-border-active rounded px-3 py-2 text-sm font-mono
            text-ink-primary outline-none placeholder:text-ink-muted mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => { setResetModal(false); setResetInput('') }}
            className="px-4 py-2 text-xs text-ink-muted hover:text-ink-primary transition-colors font-body"
          >
            取消
          </button>
          <button
            onClick={handleReset}
            disabled={resetInput !== 'RESET'}
            className="px-4 py-2 text-xs bg-accent-red/20 text-accent-red rounded border border-accent-red/30
              hover:bg-accent-red/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-display tracking-wider"
          >
            確認重置
          </button>
        </div>
      </Modal>
    </section>
  )
}
