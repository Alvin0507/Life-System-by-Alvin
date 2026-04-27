'use client'
import { create } from 'zustand'
import { Task, DailyNote, DayMode } from '@/types'
import { getTodayString } from '@/lib/utils'
import { createClient as createSupabase, getSessionUser } from '@/lib/supabase/client'
import { getClientIdByKey, getClientKeyById } from './useClientStore'
import { markMyAction } from '@/lib/notifications'

function getYesterdayString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

/* Daily note is stored as a single `content` text column in DB (JSON). */
const NOTE_BLANK: Omit<DailyNote, 'id' | 'date'> = {
  completed_summary: '',
  blocked_by: '',
  tomorrow_focus: '',
  day_mode: 'normal',
}

function parseNoteContent(content: string | null | undefined): Omit<DailyNote, 'id' | 'date'> {
  if (!content) return { ...NOTE_BLANK }
  try {
    const parsed = JSON.parse(content)
    return { ...NOTE_BLANK, ...parsed }
  } catch {
    return { ...NOTE_BLANK, completed_summary: content }
  }
}

function serializeNote(note: DailyNote): string {
  return JSON.stringify({
    completed_summary: note.completed_summary,
    blocked_by: note.blocked_by,
    tomorrow_focus: note.tomorrow_focus,
    day_mode: note.day_mode,
  })
}

interface TodayStore {
  tasks: Task[]
  note: DailyNote | null
  yesterdayNote: DailyNote | null
  dayMode: DayMode
  todayStr: string
  loaded: boolean
  currentUserId: string | null
  partnerId: string | null
  partnerName: string | null

  loadToday: () => Promise<void>
  setDayMode: (mode: DayMode) => void
  toggleTask: (id: string) => Promise<void>
  updateTaskContent: (id: string, content: string) => Promise<void>
  addTask: (
    task: Omit<Task, 'id' | 'created_at'>,
    isShared?: boolean,
    assignedTo?: string | null
  ) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  updateNote: (field: keyof DailyNote, value: string) => Promise<void>
  getCompletionRate: () => number
  getYesterdayNote: () => DailyNote | null
}

const LS_MODE_KEY = 'alvin_mode'

export const useTodayStore = create<TodayStore>((set, get) => ({
  tasks: [],
  note: null,
  yesterdayNote: null,
  dayMode: 'normal',
  todayStr: getTodayString(),
  loaded: false,
  currentUserId: null,
  partnerId: null,
  partnerName: null,

  loadToday: async () => {
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) {
      set({ loaded: true })
      return
    }
    const date = getTodayString()
    const yesterday = getYesterdayString()

    await supabase.rpc('rollover_tasks', { p_user_id: user.id, p_today: date })

    const storedMode =
      (typeof window !== 'undefined' ? (localStorage.getItem(LS_MODE_KEY) as DayMode) : null) ||
      'normal'

    const [tasksRes, noteRes, yNoteRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('date', date).order('sort_order'),
      supabase.from('daily_notes').select('*').eq('date', date).maybeSingle(),
      supabase.from('daily_notes').select('*').eq('date', yesterday).maybeSingle(),
    ])

    const rawTasks = tasksRes.data ?? []
    const profileIds = new Set<string>()
    for (const t of rawTasks) {
      if (t.user_id) profileIds.add(t.user_id)
      if (t.assigned_to) profileIds.add(t.assigned_to)
    }
    profileIds.delete(user.id)

    const profileMap = new Map<string, string>()
    let partnerId: string | null = null
    let partnerName: string | null = null

    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
    for (const p of allProfiles ?? []) {
      const name = p.display_name || p.email?.split('@')[0] || '夥伴'
      profileMap.set(p.id, name)
      if (p.id !== user.id && !partnerId) {
        partnerId = p.id
        partnerName = name
      }
    }

    const tasks: Task[] = rawTasks.map(t => ({
      id: t.id,
      date: t.date,
      category: t.category as Task['category'],
      client: getClientKeyById(t.client_id),
      content: t.content,
      completed: t.completed,
      target_count: t.target_count ?? undefined,
      is_shared: t.is_shared ?? false,
      user_id: t.user_id ?? undefined,
      owner_name: t.user_id && t.user_id !== user.id ? profileMap.get(t.user_id) ?? null : null,
      assigned_to: t.assigned_to ?? null,
      assignee_name: t.assigned_to ? (t.assigned_to === user.id ? '我' : profileMap.get(t.assigned_to) ?? null) : null,
      created_at: t.created_at,
    }))

    const note: DailyNote | null = noteRes.data
      ? {
          id: noteRes.data.id,
          date: noteRes.data.date,
          ...parseNoteContent(noteRes.data.content),
        }
      : null

    const yesterdayNote: DailyNote | null = yNoteRes.data
      ? {
          id: yNoteRes.data.id,
          date: yNoteRes.data.date,
          ...parseNoteContent(yNoteRes.data.content),
        }
      : null

    set({
      tasks,
      note,
      yesterdayNote,
      dayMode: storedMode,
      todayStr: date,
      loaded: true,
      currentUserId: user.id,
      partnerId,
      partnerName,
    })
  },

  setDayMode: mode => {
    if (typeof window !== 'undefined') localStorage.setItem(LS_MODE_KEY, mode)
    set({ dayMode: mode })
  },

  toggleTask: async id => {
    const { tasks } = get()
    const target = tasks.find(t => t.id === id)
    if (!target) return
    const nextDone = !target.completed
    markMyAction(id)
    set({ tasks: tasks.map(t => (t.id === id ? { ...t, completed: nextDone } : t)) })
    await createSupabase().from('tasks').update({ completed: nextDone }).eq('id', id)
  },

  updateTaskContent: async (id, content) => {
    set({
      tasks: get().tasks.map(t => (t.id === id ? { ...t, content } : t)),
    })
    await createSupabase().from('tasks').update({ content }).eq('id', id)
  },

  addTask: async (task, isShared = false, assignedTo = null) => {
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return
    const { tasks, partnerId, partnerName } = get()
    const sort_order = tasks.length
    const client_id = getClientIdByKey(task.client ?? null)

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        date: task.date,
        category: task.category,
        client_id,
        content: task.content,
        completed: task.completed,
        target_count: task.target_count ?? null,
        sort_order,
        is_shared: isShared,
        assigned_to: assignedTo,
      })
      .select()
      .single()
    if (error || !data) return
    markMyAction(data.id)

    const assigneeName =
      data.assigned_to === user.id ? '我'
      : data.assigned_to && data.assigned_to === partnerId ? partnerName
      : null

    const newTask: Task = {
      id: data.id,
      date: data.date,
      category: data.category as Task['category'],
      client: task.client,
      content: data.content,
      completed: data.completed,
      target_count: data.target_count ?? undefined,
      is_shared: data.is_shared ?? false,
      user_id: data.user_id ?? user.id,
      owner_name: null,
      assigned_to: data.assigned_to ?? null,
      assignee_name: assigneeName,
      created_at: data.created_at,
    }
    set({ tasks: [...tasks, newTask] })
  },

  deleteTask: async id => {
    set({ tasks: get().tasks.filter(t => t.id !== id) })
    await createSupabase().from('tasks').delete().eq('id', id)
  },

  updateNote: async (field, value) => {
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return

    const { note, todayStr } = get()
    const base: DailyNote =
      note ?? {
        id: '__pending',
        date: todayStr,
        ...NOTE_BLANK,
      }
    const updated = { ...base, [field]: value }
    set({ note: updated })

    const { data } = await supabase
      .from('daily_notes')
      .upsert(
        {
          user_id: user.id,
          date: todayStr,
          content: serializeNote(updated),
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single()
    if (data) {
      set({ note: { ...updated, id: data.id } })
    }
  },

  getCompletionRate: () => {
    const { tasks } = get()
    if (!tasks.length) return 0
    const done = tasks.filter(t => t.completed).length
    return Math.round((done / tasks.length) * 100)
  },

  getYesterdayNote: () => get().yesterdayNote,
}))
