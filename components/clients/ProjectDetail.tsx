'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Trash2, CheckCircle2, Circle, Calendar } from 'lucide-react'
import type { Project, ProjectStatus, Task, TaskCategory } from '@/types'
import { createClient as createSupabase } from '@/lib/supabase/client'
import { useClientStore, getClientKeyById } from '@/stores/useClientStore'

const STATUS_OPTIONS: ProjectStatus[] = ['active', 'done', 'archived']
const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: '進行中',
  done: '已完成',
  archived: '封存',
}

const CATEGORY_LABEL: Record<TaskCategory, string> = {
  win_condition: '勝利條件',
  client: '客戶',
  social: '社群',
  growth: '成長',
  non_neg: '不可妥協',
}

interface ProjectTask {
  id: string
  date: string
  content: string
  completed: boolean
  category: TaskCategory
  client_key: string | undefined
}

export default function ProjectDetail({
  project,
  onBack,
  onRename,
  onChangeStatus,
  onDelete,
}: {
  project: Project
  onBack: () => void
  onRename: (name: string) => void
  onChangeStatus: (status: ProjectStatus) => void
  onDelete: () => void
}) {
  const clients = useClientStore(s => s.clients)
  const [tasks, setTasks] = useState<ProjectTask[] | null>(null)
  const [name, setName] = useState(project.name)

  useEffect(() => { setName(project.name) }, [project.name])

  useEffect(() => {
    let alive = true
    async function load() {
      const supabase = createSupabase()
      const { data } = await supabase
        .from('tasks')
        .select('id, date, content, completed, category, client_id')
        .eq('project_id', project.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: true })
      if (!alive) return
      setTasks(
        (data ?? []).map(t => ({
          id: t.id,
          date: t.date,
          content: t.content,
          completed: t.completed,
          category: t.category as TaskCategory,
          client_key: getClientKeyById(t.client_id),
        }))
      )
    }
    load()
    return () => { alive = false }
  }, [project.id])

  const stats = useMemo(() => {
    if (!tasks) return { total: 0, done: 0, rate: 0 }
    const total = tasks.length
    const done = tasks.filter(t => t.completed).length
    return { total, done, rate: total > 0 ? Math.round((done / total) * 100) : 0 }
  }, [tasks])

  const grouped = useMemo(() => {
    if (!tasks) return [] as { date: string; rows: ProjectTask[] }[]
    const map = new Map<string, ProjectTask[]>()
    for (const t of tasks) {
      const arr = map.get(t.date) ?? []
      arr.push(t)
      map.set(t.date, arr)
    }
    return Array.from(map.entries())
      .map(([date, rows]) => ({ date, rows }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [tasks])

  const linkedClient = project.client_id ? clients.find(c => c.id === project.client_id) : null

  function commitName() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === project.name) { setName(project.name); return }
    onRename(trimmed)
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs text-ink-muted hover:text-accent-blue transition-colors mb-3 font-display tracking-wider"
      >
        <ArrowLeft size={13} /> 返回專案列表
      </button>

      <div className="bg-card border border-border-subtle rounded-xl p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <span
            className="w-3 h-3 rounded-full mt-1.5 shrink-0"
            style={{ backgroundColor: project.color, boxShadow: `0 0 10px ${project.color}80` }}
          />
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') { setName(project.name); (e.target as HTMLInputElement).blur() }
            }}
            className="flex-1 bg-transparent font-display text-xl tracking-wider text-ink-primary outline-none border-b border-transparent focus:border-accent-blue/40 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="font-display text-[10px] tracking-[0.2em] text-ink-muted uppercase mb-1">客戶</div>
            <div className="font-body text-ink-primary">
              {linkedClient ? (
                <span className="px-1.5 py-0.5 rounded text-[11px]" style={{ backgroundColor: linkedClient.color + '20', color: linkedClient.color }}>
                  {linkedClient.label}
                </span>
              ) : '—'}
            </div>
          </div>
          <div>
            <div className="font-display text-[10px] tracking-[0.2em] text-ink-muted uppercase mb-1">截止日</div>
            <div className="font-mono text-ink-primary">
              {project.due_date ? (
                <span className="flex items-center gap-1"><Calendar size={11} />{project.due_date}</span>
              ) : '—'}
            </div>
          </div>
          <div>
            <div className="font-display text-[10px] tracking-[0.2em] text-ink-muted uppercase mb-1">狀態</div>
            <select
              value={project.status}
              onChange={e => onChangeStatus(e.target.value as ProjectStatus)}
              className="bg-void border border-border-subtle rounded px-2 py-1 text-xs text-ink-primary font-body outline-none"
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <div className="font-display text-[10px] tracking-[0.2em] text-ink-muted uppercase mb-1">完成率</div>
            <div className="font-mono text-ink-primary">
              <span className="text-accent-green">{stats.done}</span>
              <span className="text-ink-muted"> / {stats.total}</span>
              <span className="ml-2 text-ink-muted">{stats.rate}%</span>
            </div>
          </div>
        </div>

        <div className="mt-4 h-1.5 bg-void rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.rate}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: project.color, boxShadow: `0 0 8px ${project.color}80` }}
          />
        </div>
      </div>

      {/* Tasks across dates */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase">All Tasks</h3>
        <button
          onClick={() => {
            if (confirm(`刪除專案「${project.name}」？關聯任務不會被刪除，僅清除 project 連結。`)) onDelete()
          }}
          className="text-xs text-ink-muted hover:text-accent-red transition-colors flex items-center gap-1 font-body"
        >
          <Trash2 size={11} /> 刪除專案
        </button>
      </div>

      {tasks === null ? (
        <p className="text-xs text-ink-muted py-8 text-center font-body">載入中…</p>
      ) : tasks.length === 0 ? (
        <p className="text-xs text-ink-muted py-8 text-center font-body">這個專案還沒有任務 — 在 /today 新增任務時選擇此專案</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ date, rows }) => (
            <div key={date}>
              <div className="font-display text-[11px] tracking-[0.2em] text-ink-muted uppercase mb-2">{date}</div>
              <div className="space-y-1.5">
                {rows.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-subtle bg-card text-xs"
                  >
                    {t.completed ? (
                      <CheckCircle2 size={13} className="text-accent-green shrink-0" />
                    ) : (
                      <Circle size={13} className="text-ink-muted shrink-0" />
                    )}
                    <span className={`flex-1 font-body ${t.completed ? 'line-through text-ink-muted' : 'text-ink-primary'}`}>
                      {t.content}
                    </span>
                    <span className="font-display text-[10px] tracking-wider text-ink-muted shrink-0">
                      {CATEGORY_LABEL[t.category]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  )
}
