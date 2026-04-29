'use client'
import { create } from 'zustand'
import { createClient as createSupabase, getSessionUser } from '@/lib/supabase/client'
import { DayMode, Task, WeeklyReview } from '@/types'

export type WeekDayMode = DayMode | 'rest'
export interface DayContext { mode: WeekDayMode; note: string }
export type TaskMap = Record<string, Task[]>
export type DayMap = Record<string, DayContext>
export type ReviewMap = Record<string, WeeklyReview>

export const DEFAULT_DAY_CTX: DayContext = { mode: 'normal', note: '' }
const TTL_MS = 30_000

export function parseDayContent(content: string | null | undefined): DayContext {
  if (!content) return { ...DEFAULT_DAY_CTX }
  try {
    const parsed = JSON.parse(content)
    return {
      mode: (parsed.day_mode as WeekDayMode) ?? 'normal',
      note: parsed.day_note ?? '',
    }
  } catch {
    return { ...DEFAULT_DAY_CTX }
  }
}

export function mergeDayContent(rawContent: string | null | undefined, patch: Partial<DayContext>): string {
  let base: Record<string, unknown> = {}
  if (rawContent) {
    try { base = JSON.parse(rawContent) } catch { /* ignore */ }
  }
  if (patch.mode !== undefined) base.day_mode = patch.mode
  if (patch.note !== undefined) base.day_note = patch.note
  return JSON.stringify(base)
}

interface WeeklyStore {
  tasksByDate: TaskMap
  days: DayMap
  dayRawContent: Record<string, string>
  reviews: ReviewMap
  loaded: boolean
  lastLoadedAt: number
  loadedFor: { today: string; weekStart: string } | null

  load: (today: string, weekStart: string, opts?: { force?: boolean }) => Promise<void>
  setDay: (date: string, ctx: DayContext, raw: string) => void
  setReview: (ws: string, review: WeeklyReview) => void
}

export const useWeeklyStore = create<WeeklyStore>((set, get) => ({
  tasksByDate: {},
  days: {},
  dayRawContent: {},
  reviews: {},
  loaded: false,
  lastLoadedAt: 0,
  loadedFor: null,

  load: async (today, weekStart, opts) => {
    const force = opts?.force ?? false
    const state = get()
    const sameWindow =
      state.loadedFor && state.loadedFor.today === today && state.loadedFor.weekStart === weekStart
    if (!force && state.loaded && sameWindow && Date.now() - state.lastLoadedAt < TTL_MS) return

    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) {
      set({ loaded: true, lastLoadedAt: Date.now(), loadedFor: { today, weekStart } })
      return
    }

    const cutoff = new Date(today + 'T00:00:00')
    cutoff.setDate(cutoff.getDate() - 42)
    const cutoffStr = cutoff.toISOString().split('T')[0]

    const reviewCutoff = new Date(weekStart + 'T00:00:00')
    reviewCutoff.setDate(reviewCutoff.getDate() - 28)
    const reviewCutoffStr = reviewCutoff.toISOString().split('T')[0]

    const [tasksRes, notesRes, reviewsRes] = await Promise.all([
      supabase.from('tasks').select('*').gte('date', cutoffStr),
      supabase.from('daily_notes').select('*').gte('date', cutoffStr),
      supabase.from('weekly_reviews').select('*').gte('week_start', reviewCutoffStr),
    ])

    const tasksMap: TaskMap = {}
    for (const t of tasksRes.data ?? []) {
      const arr = tasksMap[t.date] ?? (tasksMap[t.date] = [])
      arr.push({
        id: t.id,
        date: t.date,
        category: t.category as Task['category'],
        content: t.content,
        completed: t.completed,
        target_count: t.target_count ?? undefined,
        created_at: t.created_at,
      })
    }

    const dmap: DayMap = {}
    const raws: Record<string, string> = {}
    for (const n of notesRes.data ?? []) {
      dmap[n.date] = parseDayContent(n.content)
      raws[n.date] = n.content ?? ''
    }

    const rmap: ReviewMap = {}
    for (const r of reviewsRes.data ?? []) {
      rmap[r.week_start] = {
        id: r.id,
        week_start: r.week_start,
        went_well: r.went_well,
        improve: r.improve,
        next_week_focus: r.next_week_focus,
      }
    }

    set({
      tasksByDate: tasksMap,
      days: dmap,
      dayRawContent: raws,
      reviews: rmap,
      loaded: true,
      lastLoadedAt: Date.now(),
      loadedFor: { today, weekStart },
    })
  },

  setDay: (date, ctx, raw) => {
    set(state => ({
      days: { ...state.days, [date]: ctx },
      dayRawContent: { ...state.dayRawContent, [date]: raw },
    }))
  },

  setReview: (ws, review) => {
    set(state => ({ reviews: { ...state.reviews, [ws]: review } }))
  },
}))
