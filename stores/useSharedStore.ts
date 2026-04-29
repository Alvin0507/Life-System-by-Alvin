'use client'
import { create } from 'zustand'
import { createClient as createSupabase, getSessionUser } from '@/lib/supabase/client'
import { Task } from '@/types'
import { getTodayString } from '@/lib/utils'
import { getClientKeyById } from '@/stores/useClientStore'

export type ActivityKind = 'task_completed' | 'task_created' | 'task_assigned' | 'note_posted'

export interface SharedNote {
  id: string
  author_id: string
  content: string
  kind: string
  pinned: boolean
  created_at: string
  author_name: string
}

export interface ActivityEntry {
  id: string
  actor_id: string
  actor_name: string
  kind: ActivityKind
  summary: string
  created_at: string
}

const TTL_MS = 30_000

interface SharedStore {
  me: string | null
  profiles: Map<string, string>
  tasks: Task[]
  notes: SharedNote[]
  activity: ActivityEntry[]
  loaded: boolean
  lastLoadedAt: number

  load: (opts?: { force?: boolean }) => Promise<void>
  setTasks: (next: Task[] | ((prev: Task[]) => Task[])) => void
  setNotes: (next: SharedNote[] | ((prev: SharedNote[]) => SharedNote[])) => void
}

export const useSharedStore = create<SharedStore>((set, get) => ({
  me: null,
  profiles: new Map(),
  tasks: [],
  notes: [],
  activity: [],
  loaded: false,
  lastLoadedAt: 0,

  load: async (opts) => {
    const force = opts?.force ?? false
    const state = get()
    if (!force && state.loaded && Date.now() - state.lastLoadedAt < TTL_MS) return

    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) {
      set({ loaded: true, lastLoadedAt: Date.now() })
      return
    }

    const today = getTodayString()
    const [tasksRes, notesRes, profilesRes, activityRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('is_shared', true).eq('date', today).order('created_at'),
      supabase.from('shared_notes').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('id, display_name, email'),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50),
    ])

    const pMap = new Map<string, string>()
    for (const p of profilesRes.data ?? []) {
      pMap.set(p.id, p.display_name || p.email?.split('@')[0] || '夥伴')
    }

    const activity: ActivityEntry[] = (activityRes.data ?? []).map(a => ({
      id: a.id,
      actor_id: a.actor_id,
      actor_name: pMap.get(a.actor_id) ?? '夥伴',
      kind: a.kind as ActivityKind,
      summary: a.summary,
      created_at: a.created_at,
    }))

    const tasks: Task[] = (tasksRes.data ?? []).map(t => ({
      id: t.id,
      date: t.date,
      category: t.category as Task['category'],
      client: getClientKeyById(t.client_id),
      content: t.content,
      completed: t.completed,
      target_count: t.target_count ?? undefined,
      is_shared: t.is_shared ?? false,
      user_id: t.user_id ?? undefined,
      owner_name: pMap.get(t.user_id) ?? null,
      assigned_to: t.assigned_to ?? null,
      assignee_name: t.assigned_to ? (pMap.get(t.assigned_to) ?? null) : null,
      created_at: t.created_at,
    }))

    const notes: SharedNote[] = (notesRes.data ?? []).map(n => ({
      id: n.id,
      author_id: n.author_id,
      content: n.content,
      kind: n.kind,
      pinned: n.pinned,
      created_at: n.created_at,
      author_name: pMap.get(n.author_id) ?? '夥伴',
    }))

    set({
      me: user.id,
      profiles: pMap,
      tasks,
      notes,
      activity,
      loaded: true,
      lastLoadedAt: Date.now(),
    })
  },

  setTasks: next => set(state => ({
    tasks: typeof next === 'function' ? next(state.tasks) : next,
  })),
  setNotes: next => set(state => ({
    notes: typeof next === 'function' ? next(state.notes) : next,
  })),
}))
