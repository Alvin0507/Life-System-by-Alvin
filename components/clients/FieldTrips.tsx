'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, MapPin } from 'lucide-react'
import { useClientStore, CLIENT_CONFIG, CLIENT_ORDER } from '@/stores/useClientStore'
import { useAppStore } from '@/stores/useAppStore'
import { ClientName, TripDuration } from '@/types'
import { getYearMonth } from '@/lib/utils'
import Modal from '@/components/ui/Modal'

function getDaysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function formatTripDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export default function FieldTrips() {
  const fieldTrips = useClientStore(s => s.fieldTrips)
  const addFieldTrip = useClientStore(s => s.addFieldTrip)
  const deleteFieldTrip = useClientStore(s => s.deleteFieldTrip)
  const addToast = useAppStore(s => s.addToast)

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<{
    trip_date: string; client: ClientName; duration: TripDuration; notes: string
  }>({ trip_date: '', client: 'hunter', duration: 'full', notes: '' })

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const ym = getYearMonth()
  const thisMonthTrips = fieldTrips.filter(t => t.trip_date.startsWith(ym))
  const futureTrips = fieldTrips.filter(t => getDaysUntil(t.trip_date) > 0)
    .sort((a, b) => a.trip_date.localeCompare(b.trip_date))
  const nextTrip = futureTrips[0]
  const daysLeft = nextTrip ? getDaysUntil(nextTrip.trip_date) : null

  function handleAdd() {
    if (!form.trip_date) return
    addFieldTrip(form)
    addToast({ type: 'success', message: `外出已新增：${formatTripDate(form.trip_date)}` })
    setModal(false)
    setForm({ trip_date: '', client: 'hunter', duration: 'full', notes: '' })
  }

  const sorted = [...fieldTrips].sort((a, b) => a.trip_date.localeCompare(b.trip_date))
  const firstFutureIdx = sorted.findIndex(t => getDaysUntil(t.trip_date) >= 0)

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase">
          Field Operations
        </h2>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-1.5 text-xs text-accent-blue hover:text-accent-blue/80 transition-colors font-body"
        >
          <Plus size={13} /> 新增外出
        </button>
      </div>

      {/* Info bar */}
      <div className="bg-card border border-border-subtle rounded-xl px-4 py-3 mb-3 flex items-center gap-3 flex-wrap">
        <MapPin size={13} className="text-accent-gold shrink-0" />
        <span className="font-body text-xs text-ink-secondary">
          本月已排 <span className="text-ink-primary font-mono">{thisMonthTrips.length}</span> 次外出
        </span>
        {nextTrip && daysLeft !== null && (
          <>
            <span className="text-border-active">·</span>
            <span className="font-body text-xs text-ink-secondary">
              下次出動：
              <span className="text-accent-gold font-mono"> {formatTripDate(nextTrip.trip_date)}</span>
              <span className="text-ink-muted">（還有 {daysLeft} 天）</span>
            </span>
          </>
        )}
      </div>

      {/* Trip list */}
      {sorted.length === 0 ? (
        <p className="text-xs text-ink-muted font-body py-4 text-center">尚無外出記錄</p>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {sorted.map((trip, i) => {
              const daysUntil = getDaysUntil(trip.trip_date)
              const isPast = daysUntil < 0
              const isToday = daysUntil === 0
              const isNextFuture = i === firstFutureIdx
              const cfg = CLIENT_CONFIG[trip.client]

              return (
                <motion.div
                  key={trip.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: isPast ? 0.45 : 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg border
                    transition-all duration-200 group/trip
                    ${isToday    ? 'border-accent-blue/60 bg-accent-blue/5' :
                      isNextFuture ? 'border-accent-gold/50 bg-accent-gold/5' :
                      'border-border-subtle bg-card'}
                  `}
                >
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-mono text-xs ${isToday ? 'text-accent-blue' : isNextFuture ? 'text-accent-gold' : 'text-ink-primary'}`}>
                        {formatTripDate(trip.trip_date)}
                      </span>
                      <span className="font-display text-[11px] tracking-wider text-ink-secondary uppercase">
                        {cfg.label}
                      </span>
                      <span className="text-[11px] text-ink-muted font-body">
                        {trip.duration === 'full' ? '全天' : '半天'}
                      </span>
                      {isToday && <span className="text-[11px] text-accent-blue font-display tracking-wider">TODAY</span>}
                      {isNextFuture && <span className="text-[11px] text-accent-gold font-display tracking-wider">NEXT</span>}
                    </div>
                    {trip.notes && (
                      <p className="text-xs text-ink-muted mt-0.5 truncate font-body">{trip.notes}</p>
                    )}
                  </div>
                  {!isPast && (
                    <button
                      onClick={() => deleteFieldTrip(trip.id)}
                      className="opacity-0 group-hover/trip:opacity-100 text-ink-muted hover:text-accent-red transition-all shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="新增外出行程">
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-display tracking-wider text-ink-secondary mb-1.5 uppercase">日期</label>
            <input
              type="date" value={form.trip_date}
              onChange={e => setForm(f => ({ ...f, trip_date: e.target.value }))}
              className="w-full bg-void border border-border-active rounded px-3 py-2 text-sm font-mono text-ink-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-[12px] font-display tracking-wider text-ink-secondary mb-1.5 uppercase">客戶</label>
            <select
              value={form.client}
              onChange={e => setForm(f => ({ ...f, client: e.target.value as ClientName }))}
              className="w-full bg-void border border-border-active rounded px-3 py-2 text-sm text-ink-primary font-body outline-none"
            >
              {CLIENT_ORDER.map(c => (
                <option key={c} value={c}>{CLIENT_CONFIG[c].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-display tracking-wider text-ink-secondary mb-1.5 uppercase">時長</label>
            <div className="flex gap-2">
              {(['full', 'half'] as TripDuration[]).map(d => (
                <button
                  key={d}
                  onClick={() => setForm(f => ({ ...f, duration: d }))}
                  className={`flex-1 py-2 rounded text-xs font-display tracking-wider border transition-all
                    ${form.duration === d
                      ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/40'
                      : 'text-ink-muted border-border-subtle hover:border-border-active'}`}
                >
                  {d === 'full' ? '全天' : '半天'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-display tracking-wider text-ink-secondary mb-1.5 uppercase">備注</label>
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="地點、任務..."
              className="w-full bg-void border border-border-active rounded px-3 py-2 text-sm text-ink-primary font-body outline-none placeholder:text-ink-muted"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!form.trip_date}
            className="w-full py-2.5 bg-accent-blue/15 text-accent-blue rounded font-display text-xs tracking-widest
              hover:bg-accent-blue/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-1"
          >
            新增
          </button>
        </div>
      </Modal>
    </section>
  )
}
