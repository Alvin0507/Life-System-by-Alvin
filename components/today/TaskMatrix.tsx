'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Users, UserCheck, ChevronDown, Folder } from 'lucide-react'
import { useTodayStore } from '@/stores/useTodayStore'
import { useAppStore } from '@/stores/useAppStore'
import { useClientStore, CLIENT_CONFIG, CLIENT_ORDER } from '@/stores/useClientStore'
import { useProjectStore } from '@/stores/useProjectStore'
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
      {task.project_id && <ProjectChip projectId={task.project_id} />}
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

/* ── Project chip ── */
function ProjectChip({ projectId }: { projectId: string }) {
  const project = useProjectStore(s => s.projects.find(p => p.id === projectId))
  if (!project) return null
  return (
    <span
      className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-display tracking-wider"
      style={{ backgroundColor: `${project.color}26`, color: project.color }}
      title={`專案：${project.name}`}
    >
      <Folder size={10} />
      <span className="text-[10px] max-w-[80px] truncate">{project.name}</span>
    </span>
  )
}

/* ── Collapsible Section Header ── */
function SectionHeader({
  title, accent, done, total, open, onToggle,
}: {
  title: string
  accent: string
  done: number
  total: number
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-4 py-3 border-b border-border-subtle border-l-2 hover:bg-elevated/50 transition-colors text-left"
      style={{ borderLeftColor: accent }}
    >
      <span className="font-display text-[12px] tracking-[0.2em] text-ink-primary uppercase">{title}</span>
      <span className="ml-auto text-[12px] font-mono text-ink-muted">{done}/{total}</span>
      <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }} className="text-ink-muted">
        <ChevronDown size={14} />
      </motion.span>
    </button>
  )
}

/* ── CLIENT COLUMN ── */
function ClientColumn({ projectFilter }: { projectFilter: string | null }) {
  const allTasks = useTodayStore(s => s.tasks)
  const tasks = allTasks.filter(t =>
    t.category === 'client' && (!projectFilter || t.project_id === projectFilter)
  )
  const addTask = useTodayStore(s => s.addTask)
  const todayStr = useTodayStore(s => s.todayStr)
  const partnerId = useTodayStore(s => s.partnerId)
  const partnerName = useTodayStore(s => s.partnerName)
  const clientsLoaded = useClientStore(s => s.loaded)
  const clients = useClientStore(s => s.clients)
  const projects = useProjectStore(s => s.projects)
  const loadProjects = useProjectStore(s => s.loadAll)
  const [adding, setAdding] = useState(false)
  const [input, setInput] = useState('')
  const [client, setClient] = useState<ClientName>('')
  const [projectId, setProjectId] = useState<string>('')
  const [shared, setShared] = useState(false)
  const [assignPartner, setAssignPartner] = useState(false)
  const [open, setOpen] = useState(true)

  useEffect(() => { loadProjects() }, [loadProjects])

  const chosenClientKey = client || CLIENT_ORDER[0]
  const chosenClient = useMemo(
    () => clients.find(c => c.key === chosenClientKey),
    [clients, chosenClientKey]
  )
  const projectOptions = useMemo(
    () => projects.filter(p => p.status === 'active' && (!chosenClient || !p.client_id || p.client_id === chosenClient.id)),
    [projects, chosenClient]
  )

  function handleAdd() {
    if (!input.trim()) return
    const chosen = client || CLIENT_ORDER[0]
    if (!chosen) return
    const assignedTo = shared && assignPartner && partnerId ? partnerId : null
    addTask({
      date: todayStr,
      category: 'client',
      client: chosen,
      content: input.trim(),
      completed: false,
      project_id: projectId || null,
    }, shared, assignedTo)
    setInput(''); setShared(false); setAssignPartner(false); setProjectId(''); setAdding(false)
  }

  return (
    <div className="bg-card border border-border-subtle rounded-xl overflow-hidden">
      <SectionHeader
        title="Client Work"
        accent="#ff3860"
        done={tasks.filter(t => t.completed).length}
        total={tasks.length}
        open={open}
        onToggle={() => setOpen(o => !o)}
      />
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
      <div className="px-4 py-2 divide-y divide-border-subtle/50">
        {tasks.map(t => <TaskRow key={t.id} task={t} showDelete />)}
      </div>
      <div className="px-4 pb-3">
        <AnimatePresence>
          {adding && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
            >
              <div className="flex gap-2 mt-2 mb-2 flex-wrap">
                <select value={client || CLIENT_ORDER[0] || ''} onChange={e => setClient(e.target.value as ClientName)}
                  disabled={!clientsLoaded || CLIENT_ORDER.length === 0}
                  className="bg-elevated border border-border-subtle rounded px-2 py-1 text-xs text-ink-primary font-body outline-none">
                  {CLIENT_ORDER.map(k => (
                    <option key={k} value={k}>{CLIENT_CONFIG[k]?.label ?? k}</option>
                  ))}
                </select>
                {projectOptions.length > 0 && (
                  <select
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                    className="bg-elevated border border-border-subtle rounded px-2 py-1 text-xs text-ink-primary font-body outline-none max-w-[140px]"
                    title="關聯專案（跨日標籤）"
                  >
                    <option value="">無專案</option>
                    {projectOptions.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
                  placeholder="任務內容..." autoFocus
                  className="flex-1 min-w-[140px] bg-elevated border border-border-subtle rounded px-2 py-1 text-xs text-ink-primary outline-none placeholder:text-ink-muted font-body"
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── SOCIAL COLUMN ── */
function SocialColumn({ projectFilter }: { projectFilter: string | null }) {
  const allTasks = useTodayStore(s => s.tasks)
  const tasks = allTasks.filter(t =>
    t.category === 'social' && (!projectFilter || t.project_id === projectFilter)
  )
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-card border border-border-subtle rounded-xl overflow-hidden">
      <SectionHeader
        title="Social Ops"
        accent="#ffd700"
        done={tasks.filter(t => t.completed).length}
        total={tasks.length}
        open={open}
        onToggle={() => setOpen(o => !o)}
      />
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-2 divide-y divide-border-subtle/50">
              {tasks.map(t => <TaskRow key={t.id} task={t} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── GROWTH COLUMN ── */
function GrowthColumn({ projectFilter }: { projectFilter: string | null }) {
  const allTasks = useTodayStore(s => s.tasks)
  const tasks = allTasks.filter(t =>
    t.category === 'growth' && (!projectFilter || t.project_id === projectFilter)
  )
  const addTask = useTodayStore(s => s.addTask)
  const todayStr = useTodayStore(s => s.todayStr)
  const partnerId = useTodayStore(s => s.partnerId)
  const partnerName = useTodayStore(s => s.partnerName)
  const [topic, setTopic] = useState(GROWTH_OPTIONS[0])
  const [goal, setGoal] = useState('')
  const [shared, setShared] = useState(false)
  const [assignPartner, setAssignPartner] = useState(false)
  const [open, setOpen] = useState(true)

  function handleAdd() {
    if (!goal.trim()) return
    const assignedTo = shared && assignPartner && partnerId ? partnerId : null
    addTask({ date: todayStr, category: 'growth', content: `${topic}：${goal.trim()}`, completed: false }, shared, assignedTo)
    setGoal(''); setShared(false); setAssignPartner(false)
  }

  return (
    <div className="bg-card border border-border-subtle rounded-xl overflow-hidden">
      <SectionHeader
        title="Growth"
        accent="#00ff88"
        done={tasks.filter(t => t.completed).length}
        total={tasks.length}
        open={open}
        onToggle={() => setOpen(o => !o)}
      />
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── PROJECT FILTER STRIP ── */
function ProjectFilterStrip({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const projects = useProjectStore(s => s.projects)
  const tasks = useTodayStore(s => s.tasks)
  const loadProjects = useProjectStore(s => s.loadAll)

  useEffect(() => { loadProjects() }, [loadProjects])

  const usedIds = useMemo(() => {
    const set = new Set<string>()
    for (const t of tasks) if (t.project_id) set.add(t.project_id)
    return set
  }, [tasks])

  const visible = useMemo(
    () => projects.filter(p => p.status === 'active' || usedIds.has(p.id)),
    [projects, usedIds]
  )
  if (visible.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
      <Folder size={11} className="text-ink-muted shrink-0" />
      <button
        onClick={() => onChange(null)}
        className={`px-2.5 py-1 rounded-full text-[11px] font-display tracking-wider border transition-all shrink-0 ${
          value === null
            ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/40'
            : 'border-border-subtle text-ink-muted hover:text-ink-secondary'
        }`}
      >
        全部
      </button>
      {visible.map(p => {
        const active = value === p.id
        const count = tasks.filter(t => t.project_id === p.id).length
        return (
          <button
            key={p.id}
            onClick={() => onChange(active ? null : p.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-display tracking-wider border transition-all shrink-0 ${
              active ? '' : 'border-border-subtle text-ink-muted hover:text-ink-secondary'
            }`}
            style={active ? {
              backgroundColor: `${p.color}1f`, color: p.color, borderColor: `${p.color}55`,
            } : undefined}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="max-w-[120px] truncate">{p.name}</span>
            {count > 0 && <span className="font-mono text-[10px] opacity-70">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/* ── MAIN ── */
export default function TaskMatrix({ combatMode = false }: { combatMode?: boolean }) {
  const [projectFilter, setProjectFilter] = useState<string | null>(null)

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
      <ProjectFilterStrip value={projectFilter} onChange={setProjectFilter} />
      <div className="space-y-3">
        <ClientColumn projectFilter={projectFilter} />
        <AnimatePresence>
          {!combatMode && (
            <>
              <motion.div
                key="social"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <SocialColumn projectFilter={projectFilter} />
              </motion.div>
              <motion.div
                key="growth"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <GrowthColumn projectFilter={projectFilter} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
