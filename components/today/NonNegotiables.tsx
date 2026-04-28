'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useTodayStore } from '@/stores/useTodayStore'
import { useAppStore } from '@/stores/useAppStore'
import { completionQuotes } from '@/lib/quotes'

export default function NonNegotiables() {
  const allTasks = useTodayStore(s => s.tasks)
  const tasks = allTasks.filter(t => t.category === 'non_neg')
  const toggleTask = useTodayStore(s => s.toggleTask)
  const addToast = useAppStore(s => s.addToast)
  const [open, setOpen] = useState(true)

  const done = tasks.filter(t => t.completed).length

  function handleToggle(id: string, wasCompleted: boolean) {
    toggleTask(id)
    if (!wasCompleted) {
      const msg = completionQuotes[Math.floor(Math.random() * completionQuotes.length)]
      addToast({ type: 'success', message: msg })
    }
  }

  return (
    <section>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-end gap-2 mb-3 hover:opacity-80 transition-opacity text-left"
      >
        <div className="flex-1">
          <h2 className="font-display text-sm tracking-[0.2em] text-ink-secondary uppercase">
            Non-Negotiables
          </h2>
          <p className="text-ink-muted text-xs mt-0.5 font-body">不做這些，今天不算完整</p>
        </div>
        <span className="font-mono text-xs text-ink-muted">{done}/{tasks.length}</span>
        <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }} className="text-ink-muted pb-0.5">
          <ChevronDown size={14} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tasks.map(task => (
          <motion.button
            key={task.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleToggle(task.id, task.completed)}
            className={`
              p-4 rounded-xl border text-left transition-all duration-200
              ${task.completed
                ? 'border-accent-green bg-accent-green/8'
                : 'border-border-subtle bg-card hover:border-border-active'
              }
            `}
            style={task.completed ? { boxShadow: '0 0 16px rgba(0,255,136,0.12)' } : undefined}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`text-sm font-body leading-relaxed ${task.completed ? 'text-accent-green' : 'text-ink-primary'}`}>
                {task.content}
              </span>
              <div className={`
                shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5
                transition-all duration-200
                ${task.completed ? 'bg-accent-green border-accent-green' : 'border-ink-muted'}
              `}>
                {task.completed && (
                  <svg width={10} height={10} viewBox="0 0 10 10">
                    <polyline
                      points="1.5,5 4,7.5 8.5,2.5"
                      fill="none" stroke="#0f0f1a"
                      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
