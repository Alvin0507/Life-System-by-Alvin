'use client'
import { create } from 'zustand'
import { createClient as createSupabase, getSessionUser } from '@/lib/supabase/client'
import type { Project, ProjectStatus } from '@/types'

const PROJECTS_TTL_MS = 30_000

interface ProjectStore {
  projects: Project[]
  loaded: boolean
  lastLoadedAt: number

  loadAll: (opts?: { force?: boolean }) => Promise<void>

  addProject: (init: {
    name: string
    client_id?: string | null
    color?: string
    due_date?: string | null
  }) => Promise<Project | null>

  updateProject: (id: string, patch: Partial<Pick<Project, 'name' | 'client_id' | 'color' | 'due_date' | 'status' | 'sort_order'>>) => Promise<void>

  setProjectStatus: (id: string, status: ProjectStatus) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  reorderProjects: (orderedIds: string[]) => Promise<void>
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  loaded: false,
  lastLoadedAt: 0,

  loadAll: async opts => {
    const force = opts?.force ?? false
    const state = get()
    if (!force && state.loaded && Date.now() - state.lastLoadedAt < PROJECTS_TTL_MS) return

    const supabase = createSupabase()
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) return
    set({
      projects: (data ?? []) as Project[],
      loaded: true,
      lastLoadedAt: Date.now(),
    })
  },

  addProject: async init => {
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return null
    const { projects } = get()
    const nextOrder = (projects[projects.length - 1]?.sort_order ?? -1) + 1

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: init.name,
        client_id: init.client_id ?? null,
        color: init.color ?? '#00d4ff',
        due_date: init.due_date ?? null,
        sort_order: nextOrder,
        status: 'active',
      })
      .select()
      .single()
    if (error || !data) return null
    set({ projects: [...projects, data as Project] })
    return data as Project
  },

  updateProject: async (id, patch) => {
    const prev = get().projects
    const optimistic = prev.map(p => (p.id === id ? { ...p, ...patch } : p))
    set({ projects: optimistic })
    const supabase = createSupabase()
    const { error } = await supabase.from('projects').update(patch).eq('id', id)
    if (error) set({ projects: prev })
  },

  setProjectStatus: async (id, status) => {
    await get().updateProject(id, { status })
  },

  deleteProject: async id => {
    const prev = get().projects
    set({ projects: prev.filter(p => p.id !== id) })
    const supabase = createSupabase()
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) set({ projects: prev })
  },

  reorderProjects: async orderedIds => {
    const prev = get().projects
    const map = new Map(prev.map(p => [p.id, p]))
    const next: Project[] = orderedIds
      .map((id, idx) => {
        const p = map.get(id)
        return p ? { ...p, sort_order: idx } : null
      })
      .filter((x): x is Project => x !== null)
    set({ projects: next })

    const supabase = createSupabase()
    await Promise.all(
      next.map(p => supabase.from('projects').update({ sort_order: p.sort_order }).eq('id', p.id))
    )
  },
}))
