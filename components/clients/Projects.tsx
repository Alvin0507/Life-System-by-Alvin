'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Folder, Calendar, ChevronRight } from 'lucide-react'
import { useProjectStore } from '@/stores/useProjectStore'
import { useClientStore } from '@/stores/useClientStore'
import { useAppStore } from '@/stores/useAppStore'
import type { Project, ProjectStatus } from '@/types'
import ProjectDetail from './ProjectDetail'

const STATUS_ORDER: ProjectStatus[] = ['active', 'done', 'archived']
const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: '進行中',
  done: '已完成',
  archived: '封存',
}
const STATUS_STYLE: Record<ProjectStatus, string> = {
  active: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',
  done: 'bg-accent-green/15 text-accent-green border-accent-green/30',
  archived: 'bg-elevated text-ink-muted border-border-subtle',
}

const COLOR_PALETTE = ['#00d4ff', '#00ff88', '#ffd700', '#ff3860', '#a855f7', '#f97316']

function getDaysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}
function formatDue(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function Projects() {
  const projects = useProjectStore(s => s.projects)
  const loadAll = useProjectStore(s => s.loadAll)
  const addProject = useProjectStore(s => s.addProject)
  const setProjectStatus = useProjectStore(s => s.setProjectStatus)
  const deleteProject = useProjectStore(s => s.deleteProject)
  const updateProject = useProjectStore(s => s.updateProject)
  const clients = useClientStore(s => s.clients)
  const addToast = useAppStore(s => s.addToast)

  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('active')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<{ name: string; client_id: string | null; color: string; due_date: string }>({
    name: '', client_id: null, color: COLOR_PALETTE[0], due_date: '',
  })

  useEffect(() => { loadAll() }, [loadAll])

  const filtered = useMemo(() => {
    const list = filter === 'all' ? projects : projects.filter(p => p.status === filter)
    return [...list].sort((a, b) => {
      if (a.status !== b.status) return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      const ad = a.due_date ?? '9999-12-31'
      const bd = b.due_date ?? '9999-12-31'
      return ad.localeCompare(bd)
    })
  }, [projects, filter])

  const selected = selectedId ? projects.find(p => p.id === selectedId) ?? null : null

  async function handleAdd() {
    if (!form.name.trim()) return
    const created = await addProject({
      name: form.name.trim(),
      client_id: form.client_id,
      color: form.color,
      due_date: form.due_date || null,
    })
    if (created) addToast({ type: 'success', message: `專案已新增：${created.name}` })
    setShowForm(false)
    setForm({ name: '', client_id: null, color: COLOR_PALETTE[0], due_date: '' })
  }

  function cycleStatus(p: Project) {
    const idx = STATUS_ORDER.indexOf(p.status)
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
    setProjectStatus(p.id, next)
    if (next === 'done') addToast({ type: 'success', message: `✓ 專案完成：${p.name}` })
  }

  function clientLabel(client_id: string | null): { label: string; color: string } | null {
    if (!client_id) return null
    const c = clients.find(c => c.id === client_id)
    return c ? { label: c.label, color: c.color } : null
  }

  if (selected) {
    return (
      <ProjectDetail
        project={selected}
        onBack={() => setSelectedId(null)}
        onRename={name => updateProject(selected.id, { name })}
        onChangeStatus={status => updateProject(selected.id, { status })}
        onDelete={() => { deleteProject(selected.id); setSelectedId(null) }}
      />
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase flex items-center gap-2">
          <Folder size={14} className="text-accent-blue" /> Projects
        </h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs text-accent-blue hover:text-accent-blue/80 transition-colors font-body"
        >
          <Plus size={13} /> 新增
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {(['active', 'done', 'archived', 'all'] as const).map(k => {
          const isActive = filter === k
          const label = k === 'all' ? '全部' : STATUS_LABEL[k]
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1 rounded-full text-[11px] font-display tracking-wider border transition-all ${
                isActive
                  ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/40'
                  : 'border-border-subtle text-ink-muted hover:text-ink-secondary'
              }`}
            >
              {label}
            </button>
          )
        })}
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
              <div>
                <label className="block text-[12px] font-display tracking-wider text-ink-secondary mb-1 uppercase">專案名稱</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowForm(false) }}
                  placeholder="例如：Q2 品牌重塑"
                  autoFocus
                  className="w-full bg-void border border-border-subtle rounded px-2 py-1.5 text-sm text-ink-primary font-body outline-none placeholder:text-ink-muted"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-display tracking-wider text-ink-secondary mb-1 uppercase">客戶</label>
                  <select
                    value={form.client_id ?? ''}
                    onChange={e => setForm(f => ({ ...f, client_id: e.target.value || null }))}
                    className="w-full bg-void border border-border-subtle rounded px-2 py-1.5 text-xs text-ink-primary font-body outline-none"
                  >
                    <option value="">— 無 —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-display tracking-wider text-ink-secondary mb-1 uppercase">截止日</label>
                  <input
                    type="date" value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full bg-void border border-border-subtle rounded px-2 py-1.5 text-xs font-mono text-ink-primary outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-display tracking-wider text-ink-secondary mb-1 uppercase">顏色</label>
                <div className="flex gap-2">
                  {COLOR_PALETTE.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-110 ring-2 ring-offset-2 ring-offset-elevated' : ''}`}
                      style={{ backgroundColor: c, ...(form.color === c ? { boxShadow: `0 0 10px ${c}80` } : {}) }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)} className="text-xs text-ink-muted hover:text-ink-primary transition-colors font-body px-3 py-1.5">取消</button>
                <button
                  onClick={handleAdd}
                  disabled={!form.name.trim()}
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

      {/* Project list */}
      {filtered.length === 0 ? (
        <p className="text-xs text-ink-muted font-body py-8 text-center">
          {filter === 'active' ? '尚無進行中的專案' : '此狀態無專案'}
        </p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map(p => {
              const cli = clientLabel(p.client_id)
              const days = p.due_date ? getDaysUntil(p.due_date) : null
              const isDone = p.status === 'done'
              const isExpired = days !== null && days < 0 && !isDone

              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: isDone || p.status === 'archived' ? 0.5 : 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="group/proj flex items-center gap-3 px-4 py-3 rounded-xl border border-border-subtle bg-card hover:border-accent-blue/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedId(p.id)}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}80` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-body ${isDone ? 'line-through text-ink-secondary' : 'text-ink-primary'}`}>
                        {p.name}
                      </span>
                      {cli && (
                        <span
                          className="text-[10px] font-display tracking-wider px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: cli.color + '20', color: cli.color }}
                        >
                          {cli.label}
                        </span>
                      )}
                    </div>
                    {p.due_date && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Calendar size={10} className={isExpired ? 'text-accent-red' : 'text-ink-muted'} />
                        <span className={`font-mono text-[11px] ${isExpired ? 'text-accent-red' : 'text-ink-muted'}`}>
                          {formatDue(p.due_date)}
                          {!isDone && days !== null && (
                            <span className="ml-1">
                              {days < 0 ? `（逾期 ${Math.abs(days)} 天）` :
                               days === 0 ? '（今天）' :
                               `（${days} 天後）`}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); cycleStatus(p) }}
                    className={`shrink-0 text-[11px] font-display tracking-wider px-2.5 py-1.5 rounded border transition-all ${STATUS_STYLE[p.status]}`}
                  >
                    {STATUS_LABEL[p.status]}
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation()
                      if (confirm(`刪除「${p.name}」？關聯任務的 project 將被清空。`)) deleteProject(p.id)
                    }}
                    className="opacity-0 group-hover/proj:opacity-100 text-ink-muted hover:text-accent-red transition-all shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>

                  <ChevronRight size={14} className="text-ink-muted shrink-0" />
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}
