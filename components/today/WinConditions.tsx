'use client'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTodayStore } from '@/stores/useTodayStore'
import { useAppStore } from '@/stores/useAppStore'

const NUMS = ['01', '02', '03']

export default function WinConditions() {
  const allTasks = useTodayStore(s => s.tasks)
  const tasks = allTasks.filter(t => t.category === 'win_condition')
  const toggleTask = useTodayStore(s => s.toggleTask)
  const updateTaskContent = useTodayStore(s => s.updateTaskContent)
  const addToast = useAppStore(s => s.addToast)
  const triggerCelebration = useAppStore(s => s.triggerCelebration)

  const prevAllDone = useRef(false)
  const [winning, setWinning] = useState(false)

  useEffect(() => {
    const allDone = tasks.length === 3 && tasks.every(t => t.completed)
    if (allDone && !prevAllDone.current) {
      triggerCelebration()
      addToast({ type: 'achievement', message: '今天你贏了，Alvin。' })
      setWinning(true)
      setTimeout(() => setWinning(false), 700)
    }
    prevAllDone.current = allDone
  }, [tasks, addToast, triggerCelebration])

  return (
    <section className="bg-card border border-border-subtle rounded-xl p-5">
      <div className="mb-4">
        <h2
          className={`font-display text-sm tracking-[0.2em] uppercase transition-colors duration-300 ${winning ? 'win-flash text-accent-gold' : 'text-accent-blue'}`}
        >
          Win Conditions
        </h2>
        <p className="text-ink-secondary text-xs mt-1 font-body">這三件完成，今天就贏了</p>
      </div>

      <div className="flex flex-col gap-3">
        {tasks.map((task, i) => (
          <div
            key={task.id}
            className={`
              flex items-center gap-3 p-3 rounded-lg border transition-all duration-200
              ${task.completed
                ? 'border-accent-green/30 bg-accent-green/5'
                : 'border-border-subtle bg-elevated'
              }
            `}
          >
            {/* Number */}
            <span className="font-mono text-xs text-accent-gold shrink-0 w-6">{NUMS[i]}</span>

            {/* Input */}
            <input
              type="text"
              value={task.content}
              onChange={e => updateTaskContent(task.id, e.target.value)}
              placeholder="今天最重要的事..."
              className={`
                flex-1 bg-transparent text-sm outline-none font-body
                placeholder:text-ink-muted
                transition-all duration-200
                ${task.completed ? 'line-through text-ink-muted' : 'text-ink-primary'}
              `}
            />

            {/* Checkbox */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => toggleTask(task.id)}
              className={`
                shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                transition-all duration-200
                ${task.completed
                  ? 'bg-accent-green border-accent-green'
                  : 'border-ink-muted hover:border-accent-green'
                }
              `}
            >
              {task.completed && (
                <motion.svg
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  width={12} height={12} viewBox="0 0 12 12"
                >
                  <polyline
                    points="2,6 5,9 10,3"
                    fill="none"
                    stroke="#0f0f1a"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              )}
            </motion.button>
          </div>
        ))}
      </div>
    </section>
  )
}
