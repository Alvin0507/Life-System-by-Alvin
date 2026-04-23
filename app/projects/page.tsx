'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, type MotionProps } from 'framer-motion'
import {
  Plus, Users, Trash2, UserPlus, UserMinus, LogOut, ChevronDown, ChevronRight,
} from 'lucide-react'
import { createClient as createSupabase } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import LoadingScreen from '@/components/ui/LoadingScreen'

/* ── Types ── */
interface Project {
  id: string
  label: string
  color: string
  owner_id: string
  revenue: number
  script_target: number
  edit_target: number
  created_at: string
}

interface Member {
  user_id: string
  role: string
  added_at: string
  display_name: string | null
  email: string
}

/* ── Palette ── */
const PROJECT_PALETTE = ['#60a5fa', '#f59e0b', '#34d399', '#c084fc', '#fb7185', '#facc15']

/* ══ MAIN ════════════════════════════════════════════════════════════════ */
const fadeUp = (delay: number): MotionProps => ({
  initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4 },
})

export default function ProjectsPage() {
  const [me, setMe] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loaded, setLoaded] = useState(false)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ label: '', color: PROJECT_PALETTE[0] })
  const addToast = useAppStore(s => s.addToast)

  const loadProjects = useCallback(async () => {
    const supabase = createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoaded(true); return }
    setMe(user.id)

    // RLS only returns projects where user is owner or member
    const { data } = await supabase
      .from('shared_projects')
      .select('*')
      .order('created_at', { ascending: false })
    setProjects((data ?? []) as Project[])
    setLoaded(true)
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  async function handleCreate() {
    const label = draft.label.trim()
    if (!label) { addToast({ type: 'warning', message: '專案名稱必填' }); return }
    const supabase = createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('shared_projects')
      .insert({ label, color: draft.color, owner_id: user.id })
      .select()
      .single()
    if (error || !data) { addToast({ type: 'warning', message: '建立失敗：' + (error?.message ?? '') }); return }
    // Auto-add owner as member
    await supabase.from('shared_project_members').insert({
      project_id: data.id, user_id: user.id, role: 'owner',
    })
    setDraft({ label: '', color: PROJECT_PALETTE[0] })
    setCreating(false)
    await loadProjects()
    addToast({ type: 'success', message: '專案已建立' })
  }

  if (!loaded) return <LoadingScreen label="LOADING PROJECTS" />

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 space-y-6 pb-24">
      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-ink-primary tracking-wider">Shared Projects</h1>
          <p className="font-body text-xs text-ink-secondary mt-1">多人協作 · 共享工作流</p>
        </div>
        <button
          onClick={() => setCreating(c => !c)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue/15 text-accent-blue rounded-lg
            border border-accent-blue/30 hover:bg-accent-blue/25 transition-all font-display text-[12px] tracking-widest"
        >
          <Plus size={12} /> {creating ? 'Cancel' : 'New Project'}
        </button>
      </motion.div>

      {creating && (
        <motion.div {...fadeUp(0.05)} className="bg-card border border-accent-blue/30 rounded-xl p-4 space-y-3">
          <div>
            <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1">專案名稱</p>
            <input
              value={draft.label}
              onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              placeholder="專案名稱"
              className="w-full font-body text-sm bg-elevated border border-border-subtle rounded px-2 py-1.5 text-ink-primary outline-none focus:border-accent-blue"
            />
          </div>
          <div>
            <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1.5">Color</p>
            <div className="flex gap-2">
              {PROJECT_PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setDraft(d => ({ ...d, color: c }))}
                  className={`w-7 h-7 rounded-full transition-all ${draft.color === c ? 'ring-2 ring-offset-2 ring-offset-card ring-accent-blue scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="w-full px-3 py-2 bg-accent-blue/20 text-accent-blue rounded-lg
              border border-accent-blue/40 hover:bg-accent-blue/30 transition-all font-display text-[12px] tracking-widest"
          >
            建立專案
          </button>
        </motion.div>
      )}

      {projects.length === 0 ? (
        <motion.div {...fadeUp(0.1)} className="bg-card border border-border-subtle rounded-xl p-8 text-center">
          <Users size={32} className="mx-auto text-ink-muted mb-3" />
          <p className="font-display text-sm text-ink-secondary tracking-wider">尚無專案</p>
          <p className="font-body text-xs text-ink-muted mt-1">建立第一個專案開始協作</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {projects.map((p, i) => (
            <motion.div key={p.id} {...fadeUp(0.1 + i * 0.03)}>
              <ProjectCard project={p} me={me} onChanged={loadProjects} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══ ProjectCard ═══════════════════════════════════════════════════════ */
function ProjectCard({ project, me, onChanged }: { project: Project; me: string | null; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const addToast = useAppStore(s => s.addToast)

  const isOwner = me === project.owner_id

  const loadMembers = useCallback(async () => {
    const supabase = createSupabase()
    const { data } = await supabase
      .from('shared_project_members')
      .select('user_id, role, added_at, profiles(display_name, email)')
      .eq('project_id', project.id)
    if (!data) { setMembers([]); return }
    type Row = {
      user_id: string
      role: string
      added_at: string
      profiles: { display_name: string | null; email: string } | null
    }
    const rows = data as unknown as Row[]
    setMembers(rows.map(r => ({
      user_id: r.user_id,
      role: r.role,
      added_at: r.added_at,
      display_name: r.profiles?.display_name ?? null,
      email: r.profiles?.email ?? '',
    })))
  }, [project.id])

  useEffect(() => { if (open) loadMembers() }, [open, loadMembers])

  async function invite() {
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return
    setInviting(true)
    try {
      const supabase = createSupabase()
      const { data: target } = await supabase.from('profiles').select('id').eq('email', email).single()
      if (!target) {
        addToast({ type: 'warning', message: '此 Email 尚未註冊 Alvin OS' })
        return
      }
      if (members.some(m => m.user_id === target.id)) {
        addToast({ type: 'warning', message: '已是成員' })
        return
      }
      const { error } = await supabase.from('shared_project_members').insert({
        project_id: project.id, user_id: target.id, role: 'member',
      })
      if (error) { addToast({ type: 'warning', message: '邀請失敗：' + error.message }); return }
      setInviteEmail('')
      await loadMembers()
      addToast({ type: 'success', message: '已加入成員' })
    } finally {
      setInviting(false)
    }
  }

  async function removeMember(userId: string) {
    if (!isOwner) return
    if (userId === project.owner_id) { addToast({ type: 'warning', message: '無法移除擁有者' }); return }
    if (!confirm('移除此成員？')) return
    const supabase = createSupabase()
    const { error } = await supabase
      .from('shared_project_members')
      .delete()
      .eq('project_id', project.id)
      .eq('user_id', userId)
    if (error) { addToast({ type: 'warning', message: '失敗：' + error.message }); return }
    await loadMembers()
    addToast({ type: 'success', message: '已移除' })
  }

  async function leaveProject() {
    if (isOwner) { addToast({ type: 'warning', message: '擁有者無法離開,請先刪除專案' }); return }
    if (!me) return
    if (!confirm('離開此專案？你將失去存取權。')) return
    const supabase = createSupabase()
    await supabase.from('shared_project_members').delete().eq('project_id', project.id).eq('user_id', me)
    await onChanged()
    addToast({ type: 'success', message: '已離開' })
  }

  async function deleteProject() {
    if (!isOwner) return
    if (!confirm(`刪除專案「${project.label}」？所有相關任務與資料會保留,但會解除專案關聯。此操作無法復原。`)) return
    const supabase = createSupabase()
    const { error } = await supabase.from('shared_projects').delete().eq('id', project.id)
    if (error) { addToast({ type: 'warning', message: '刪除失敗：' + error.message }); return }
    await onChanged()
    addToast({ type: 'success', message: '專案已刪除' })
  }

  async function updateField(field: 'label' | 'revenue' | 'script_target' | 'edit_target' | 'color', value: string | number) {
    if (!isOwner) return
    const supabase = createSupabase()
    const patch: { label?: string; color?: string; revenue?: number; script_target?: number; edit_target?: number } = {}
    if (field === 'label') patch.label = String(value)
    else if (field === 'color') patch.color = String(value)
    else if (field === 'revenue') patch.revenue = Math.max(0, Number(value) || 0)
    else if (field === 'script_target') patch.script_target = Math.max(0, Number(value) || 0)
    else if (field === 'edit_target') patch.edit_target = Math.max(0, Number(value) || 0)
    const { error } = await supabase.from('shared_projects').update(patch).eq('id', project.id)
    if (error) { addToast({ type: 'warning', message: '儲存失敗' }); return }
    await onChanged()
  }

  const memberCount = useMemo(() => members.length, [members])

  return (
    <div className="bg-card border border-border-subtle rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-elevated/30 transition-colors"
      >
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
        <span className="font-display text-sm text-ink-primary tracking-wider">{project.label}</span>
        {isOwner && (
          <span className="text-[11px] font-display tracking-widest text-accent-gold/80 uppercase px-1.5 py-0.5 rounded bg-accent-gold/10">
            Owner
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-[12px] font-mono text-ink-muted">
          <Users size={11} /> {memberCount || '—'}
        </span>
        {open ? <ChevronDown size={14} className="text-ink-muted" /> : <ChevronRight size={14} className="text-ink-muted" />}
      </button>

      {open && (
        <div className="border-t border-border-subtle divide-y divide-border-subtle">
          {/* Settings (owner only) */}
          {isOwner && (
            <div className="px-4 py-3 space-y-3">
              <div>
                <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1">Label</p>
                <ProjectInput value={project.label} onChange={v => updateField('label', v)} />
              </div>
              <div>
                <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1.5">Color</p>
                <div className="flex gap-2">
                  {PROJECT_PALETTE.map(c => (
                    <button
                      key={c}
                      onClick={() => updateField('color', c)}
                      className={`w-6 h-6 rounded-full transition-all ${project.color === c ? 'ring-2 ring-offset-2 ring-offset-card ring-accent-blue scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1">月收入</p>
                  <ProjectInput value={project.revenue} type="number" prefix="NT$" onChange={v => updateField('revenue', v)} />
                </div>
                <div>
                  <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1">腳本目標</p>
                  <ProjectInput value={project.script_target} type="number" suffix="支" onChange={v => updateField('script_target', v)} />
                </div>
                <div>
                  <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-1">剪輯目標</p>
                  <ProjectInput value={project.edit_target} type="number" suffix="支" onChange={v => updateField('edit_target', v)} />
                </div>
              </div>
            </div>
          )}

          {/* Members */}
          <div className="px-4 py-3">
            <p className="font-display text-[11px] tracking-wider text-ink-muted uppercase mb-2">Members</p>
            <div className="space-y-1.5">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center gap-3 px-3 py-2 bg-elevated/40 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-accent-blue/20 flex items-center justify-center text-[12px] font-display text-accent-blue uppercase shrink-0">
                    {(m.display_name ?? m.email)?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-xs text-ink-primary truncate">
                      {m.display_name ?? m.email}
                      {m.user_id === me && <span className="text-ink-muted ml-1">(you)</span>}
                    </p>
                    <p className="font-mono text-[12px] text-ink-muted truncate">{m.email}</p>
                  </div>
                  <span className="text-[11px] font-display tracking-widest text-ink-muted uppercase">{m.role}</span>
                  {isOwner && m.user_id !== project.owner_id && (
                    <button
                      onClick={() => removeMember(m.user_id)}
                      className="p-1 text-ink-muted hover:text-accent-red transition-colors"
                      title="移除"
                    >
                      <UserMinus size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Invite */}
            {isOwner && (
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') invite() }}
                  placeholder="透過 Email 邀請成員..."
                  className="flex-1 font-body text-sm bg-elevated border border-border-subtle rounded px-2 py-1.5 text-ink-primary outline-none focus:border-accent-blue"
                />
                <button
                  onClick={invite}
                  disabled={inviting || !inviteEmail.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-accent-blue/15 text-accent-blue rounded-md
                    border border-accent-blue/30 hover:bg-accent-blue/25 transition-all font-display text-[12px] tracking-widest
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <UserPlus size={12} /> Invite
                </button>
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="px-4 py-3 flex items-center justify-end gap-2">
            {!isOwner && (
              <button
                onClick={leaveProject}
                className="flex items-center gap-1.5 px-3 py-1.5 text-ink-muted hover:text-accent-red transition-colors font-display text-[12px] tracking-widest"
              >
                <LogOut size={12} /> Leave
              </button>
            )}
            {isOwner && (
              <button
                onClick={deleteProject}
                className="flex items-center gap-1.5 px-3 py-1.5 text-accent-red/80 hover:text-accent-red transition-colors font-display text-[12px] tracking-widest"
              >
                <Trash2 size={12} /> Delete Project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══ ProjectInput ══════════════════════════════════════════════════════ */
function ProjectInput({
  value, onChange, type = 'text', prefix, suffix,
}: {
  value: string | number
  onChange: (v: string | number) => void
  type?: string
  prefix?: string
  suffix?: string
}) {
  const [local, setLocal] = useState(String(value))
  useEffect(() => { setLocal(String(value)) }, [value])

  function commit() {
    if (local === String(value)) return
    onChange(type === 'number' ? Number(local) || 0 : local)
  }

  return (
    <div className="flex items-center gap-1.5 bg-elevated border border-border-subtle rounded px-2 py-1.5 focus-within:border-accent-blue">
      {prefix && <span className="text-[12px] text-ink-muted">{prefix}</span>}
      <input
        type={type}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        className="flex-1 bg-transparent font-mono text-xs text-ink-primary outline-none min-w-0"
      />
      {suffix && <span className="text-[12px] text-ink-muted">{suffix}</span>}
    </div>
  )
}
