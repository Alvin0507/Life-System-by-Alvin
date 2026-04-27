'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Users, UserCheck } from 'lucide-react'
import { useTodayStore } from '@/stores/useTodayStore'
import { useAppStore } from '@/stores/useAppStore'
import { useClientStore, CLIENT_CONFIG, CLIENT_ORDER } from '@/stores/useClientStore'
import { Task, ClientName } from '@/types'
import { completionQuotes } from '@/lib/quotes'

const GROWTH_OPTIONS = [
  '對標帳號調研', '自媒體腳本企劃', 'Vibe Coding',
  'AI 工具學習', 'SEO 文章', 'FB 文章',
]

/* ── Checkbox ── */
function Checkbox({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.8 }} onClick={onToggle}
      className={`relative shrink-0 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all duration-150
        ${done ? 'bg-accent-green border-accent-green' : 'border-ink-muted hover:border-accent-green'}`}
    >
      <AnimatePresence>
        {done && (
          <motion.span
            key="ripple"
            initial={{ scale: 0.4, opacity: 0.7 }}
            animate={{ scale: 2.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full bg-accent-green/50 pointer-events-none"
          />
        )}
      </AnimatePresence>
      {done && (
        <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} width={10} height={10} viewBox="0 0 10 10">
          <polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="#0f0f1a"
            strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      )}
    </motion.button>
  )
}

/* ── TaskRow ── */
function TaskRow({ task, showDelete }: { task: Task; showDelete?: boolean }) {
  const toggleTask = useTodayStore(s => s.toggleTask)
  const deleteTask = useTodayStore(s => s.deleteTask)
  const currentUserId = useTodayStore(s => s.currentUserId)
  const addToast = useAppStore(s => s.addToast)

  const isOthers = task.is_shared && task.user_id && currentUserId && task.user_id !== currentUserId
  const canDelete = showDelete && !isOthers

  function handleToggle() {
    toggleTask(task.id)
    if (!task.completed) {
      addToast({ type: 'info', message: completionQuotes[Math.floor(Math.random() * completionQuotes.length)] })
    }
  }

  const assignedToMe = task.assigned_to && task.assigned_to === currentUserId

  return (
    <div className="flex items-center gap-2 py-2 group/row">
      <Checkbox done={task.completed} onToggle={handleToggle} />
      <span className={`flex-1 text-sm font-body transition-all duration-200 ${task.completed ? 'line-through text-ink-muted' : 'text-ink-primary'}`}>
        {task.content}
      </span>
      {task.assigned_to ? (
        <span
          className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-display tracking-wider ${
            assignedToMe
              ? 'bg-accent-green/20 text-accent-green'
              : 'bg-accent-gold/20 text-accent-gold'
          }`}
          title={assignedToMe ? '指派給我' : `指派給 ${task.assignee_name ?? '夥伴'}`}
        >
          <UserCheck size={11} />
          <span className="text-[10px]">{assignedToMe ? '我' : task.assignee_name ?? '夥伴'}</span>
        </span>
      ) : task.is_shared && (
        <span
          className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-display tracking-wider bg-accent-blue/15 text-accent-blue"
          title={isOthers ? `${task.owner_name ?? '夥伴'} 建立的共用任務` : '共用任務'}
        >
          <Users size={11} />
          {isOthers && <span className="text-[10px]">{task.owner_name ?? '夥伴'}</span>}
        </span>
      )}
      {task.client && CLIENT_CONFIG[task.client] && (
        <span
          className="shrink-0 px-1.5 py-0.5 rounded text-[11px] font-display tracking-wider"
          style={{
            backgroundColor: `${CLIENT_CONFIG[task.client].color}26`,
            color: CLIENT_CONFIG[task.client].color,
          }}
        >
          {CLIENT_CONFIG[task.client].label}
        </span>
      )}
      {task.target_count && !task.completed && (
        <span className="shrink-0 text-[11px] font-mono text-ink-muted">×{task.target_count}</span>
      )}
      {canDelete && (
        <button onClick={() => deleteTask(task.id)}
          className="opacity-0 group-hover/row:opacity-100 text-ink-muted hover:text-accent-red transition-all"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}

/* ── CLIENT COLUMN ── */
function ClientColumn() {
  const allTasks = useTodayStore(s => s.tasks)
  const tasks = allTasks.filter(t => t.category === 'client')
  const addTask = useTodayStore(s => s.addTask)
  const todayStr = useTodayStore(s => s.todayStr)
  const partnerId = useTodayStore(s => s.partnerId)
  const partnerName = useTodayStore(s => s.partnerName)
  const clientsLoaded = useClientStore(s => s.loaded)
  const [adding, setAdding] = useState(false)
  const [input, setInput] = useState('')
  const [client, setClient] = useState<ClientName>('')
  const [shared, setShared] = useState(false)
  const [assignPartner, setAssignPartner] = useState(false)

  function handleAdd() {
    if (!input.trim()) return
    const chosen = client || CLIENT_ORDER[0]
    if (!chosen) return
    const assignedTo = shared && assignPartner && partnerId ? partnerId : null
    addTask({ date: todayStr, category: 'client', client: chosen, content: input.trim(), completed: false }, shared, assignedTo)
    setInput(''); setShared(false); setAssignPartner(false); setAdding(false)
  }

  return (
    <div className="bg-card border border-border-subtle rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle border-l-2 border-l-accent-red">
        <span className="font-display text-[12px] tracking-[0.2em] text-ink-primary uppercase">Client Work</span>
        <span className="ml-auto text-[12px] font-mono text-ink-muted">{tasks.filter(t => t.completed).length}/{tasks.length}</span>
      </div>
      <div className="px-4 py-2 divide-y divide-border-subtle/50">
        {tasks.map(t => <TaskRow key={t.id} task={t} showDelete />)}
      </div>
      <div className="px-4 pb-3">
        <AnimatePresence>
          {adding && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
            >
              <div className="flex gap-2 mt-2 mb-2">
                <select value={client || CLIENT_ORDER[0] || ''} onChange={e => setClient(e.target.value as ClientName)}
                  disabled={!clientsLoaded || CLIENT_ORDER.length === 0}
                  className="bg-elevated border border-border-subtle rounded px-2 py-1 text-xs text-ink-primary font-body outline-none">
                  {CLIENT_ORDER.map(k => (
                    <option key={k} value={k}>{CLIENT_CONFIG[k]?.label ?? k}</option>
                  ))}
                </select>
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
                  placeholder="任務內容..." autoFocus
                  className="flex-1 bg-elevated border border-border-subtle rounded px-2 py-1 text-xs text-ink-primary outline-none placeholder:text-ink-muted font-body"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => { setShared(s => !s); if (shared) setAssignPartner(false) }}
                  className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded font-body transition-colors ${
                    shared
                      ? 'bg-accent-blue/25 text-accent-blue'
                      : 'bg-elevated text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  <Users size={12} />
                  {shared ? '共用' : '個人'}
                </button>
                {shared && partnerId && (
                  <button
                    onClick={() => setAssignPartner(a => !a)}
                    className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded font-body transition-colors ${
                      assignPartner
                        ? 'bg-accent-gold/25 text-accent-gold'
                        : 'bg-elevated text-ink-muted hover:text-ink-primary'
                    }`}
                  >
                    <UserCheck size={12} />
                    {assignPartner ? `指派給 ${partnerName ?? '對方'}` : '未指派'}
                  </button>
                )}
                <button onClick={handleAdd} className="text-xs px-3 py-1 bg-accent-blue/15 text-accent-blue rounded hover:bg-accent-blue/25 transition-colors font-body">新增</button>
                <button onClick={() => setAdding(false)} className="text-xs px-3 py-1 text-ink-muted hover:text-ink-primary transition-colors font-body">取消</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink-primary transition-colors mt-2 font-body">
            <Plus size={13} /> 新增接案任務
          </button>
        )}
      </div>
    </div>
  )
}

/* ── SOCIAL COLUMN ── */
function SocialColumn() {
  const allTasks = useTodayStore(s => s.tasks)
  const tasks = allTasks.filter(t => t.category === 'social')

  return (
    <div className="bg-card border border-border-subtle rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle border-l-2 border-l-accent-gold">
        <span className="font-display text-[12px] tracking-[0.2em] text-ink-primary uppercase">Social Ops</span>
        <span className="ml-auto text-[12px] font-mono text-ink-muted">{tasks.filter(t => t.completed).length}/{tasks.length}</span>
      </div>
      <div className="px-4 py-2 divide-y divide-border-subtle/50">
        {tasks.map(t => <TaskRow key={t.id} task={t} />)}
      </div>
    </div>
  )
}

/* ── GROWTH COLUMN ── */
function GrowthColumn() {
  const allTasks = useTodayStore(s => s.tasks)
  const tasks = allTasks.filter(t => t.category === 'growth')
  const addTask = useTodayStore(s => s.addTask)
  const todayStr = useTodayStore(s => s.todayStr)
  const partnerId = useTodayStore(s => s.partnerId)
  const partnerName = useTodayStore(s => s.partnerName)
  const [topic, setTopic] = useState(GROWTH_OPTIONS[0])
  const [goal, setGoal] = useState('')
  const [shared, setShared] = useState(false)
  const [assignPartner, setAssignPartner] = useState(false)

  function handleAdd() {
    if (!goal.trim()) return
    const assignedTo = shared && assignPartner && partnerId ? partnerId : null
    addTask({ date: todayStr, category: 'growth', content: `${topic}：${goal.trim()}`, completed: false }, shared, assignedTo)
    setGoal(''); setShared(false); setAssignPartner(false)
  }

  return (
    <div className="bg-card border border-border-subtle rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle border-l-2 border-l-accent-green">
        <span className="font-display text-[12px] tracking-[0.2em] text-ink-primary uppercase">Growth</span>
        <span className="ml-auto text-[12px] font-mono text-ink-muted">{tasks.filter(t => t.completed).length}/{tasks.length}</span>
      </div>
      <div className="px-4 py-2 divide-y divide-border-subtle/50">
        {tasks.map(t => <TaskRow key={t.id} task={t} showDelete />)}
      </div>
      <div className="px-4 pb-3 space-y-2 mt-2">
        <select value={topic} onChange={e => setTopic(e.target.value)}
          className="w-full bg-elevated border border-border-subtle rounded px-2 py-1.5 text-xs text-ink-primary font-body outline-none">
          {GROWTH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <div className="flex gap-2">
          <input value={goal} onChange={e => setGoal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            placeholder="今日具體目標..."
            className="flex-1 bg-elevated border border-border-subtle rounded px-2 py-1 text-xs text-ink-primary outline-none placeholder:text-ink-muted font-body"
          />
          <button
            onClick={() => { setShared(s => !s); if (shared) setAssignPartner(false) }}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded font-body transition-colors ${
              shared
                ? 'bg-accent-blue/25 text-accent-blue'
                : 'bg-elevated text-ink-muted hover:text-ink-primary'
            }`}
          >
            <Users size={12} />
            {shared ? '共用' : '個人'}
          </button>
          <button onClick={handleAdd}
            className="px-3 py-1 bg-accent-green/15 text-accent-green rounded hover:bg-accent-green/25 transition-colors">
            <Plus size={13} />
          </button>
        </div>
        {shared && partnerId && (
          <button
            onClick={() => setAssignPartner(a => !a)}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded font-body transition-colors w-fit ${
              assignPartner
                ? 'bg-accent-gold/25 text-accent-gold'
                : 'bg-elevated text-ink-muted hover:text-ink-primary'
            }`}
          >
            <UserCheck size={12} />
            {assignPartner ? `指派給 ${partnerName ?? '對方'}` : '未指派'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── MAIN ── */
export default function TaskMatrix({ combatMode = false }: { combatMode?: boolean }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase">Task Matrix</h2>
        {combatMode && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-display text-[11px] tracking-widest text-accent-red"
          >
            · CLIENT FOCUS ONLY
          </motion.span>
        )}
      </div>
      <div className={`grid gap-4 ${combatMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
        <ClientColumn />
        <AnimatePresence>
          {!combatMode && (
            <>
              <motion.div
                key="social"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <SocialColumn />
              </motion.div>
              <motion.div
                key="growth"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <GrowthColumn />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
