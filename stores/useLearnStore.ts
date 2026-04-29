'use client'
import { create } from 'zustand'
import { createClient as createSupabase, getSessionUser } from '@/lib/supabase/client'
import { Inspiration } from '@/types'

export interface LearningTopic { id: string; label: string; emoji: string; sort_order: number }
export interface LearningEntry { date: string; topic_id: string; notes: string; checked: boolean }
export type EntryMap = Record<string, LearningEntry>

const TTL_MS = 30_000

export function entryKey(date: string, topicId: string) { return `${date}:${topicId}` }

interface LearnStore {
  topics: LearningTopic[]
  entries: EntryMap
  insps: Inspiration[]
  loaded: boolean
  lastLoadedAt: number
  load: (opts?: { force?: boolean }) => Promise<void>
  setTopics: (next: LearningTopic[]) => void
  setEntries: (next: EntryMap) => void
  setInsps: (next: Inspiration[]) => void
}

export const useLearnStore = create<LearnStore>((set, get) => ({
  topics: [],
  entries: {},
  insps: [],
  loaded: false,
  lastLoadedAt: 0,

  load: async (opts) => {
    const force = opts?.force ?? false
    const state = get()
    if (!force && state.loaded && Date.now() - state.lastLoadedAt < TTL_MS) return

    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) { set({ loaded: true, lastLoadedAt: Date.now() }); return }

    const today = new Date().toISOString().split('T')[0]
    const cutoff = new Date(today + 'T00:00:00')
    cutoff.setDate(cutoff.getDate() - 365)
    const cutoffStr = cutoff.toISOString().split('T')[0]

    const [topicsRes, entriesRes, inspsRes] = await Promise.all([
      supabase.from('learning_topics').select('*').eq('archived', false).order('sort_order'),
      supabase.from('learning_entries').select('*').gte('date', cutoffStr),
      supabase.from('inspirations').select('*').order('created_at', { ascending: false }),
    ])

    const topics: LearningTopic[] = (topicsRes.data ?? []).map(t => ({
      id: t.id, label: t.label, emoji: t.emoji, sort_order: t.sort_order,
    }))

    const entries: EntryMap = {}
    for (const e of entriesRes.data ?? []) {
      entries[entryKey(e.date, e.topic_id)] = {
        date: e.date, topic_id: e.topic_id, notes: e.notes, checked: e.checked,
      }
    }

    const insps: Inspiration[] = (inspsRes.data ?? []).map(i => ({
      id: i.id, content: i.content, tags: i.tags ?? [], created_at: i.created_at,
    }))

    set({ topics, entries, insps, loaded: true, lastLoadedAt: Date.now() })
  },

  setTopics: next => set({ topics: next }),
  setEntries: next => set({ entries: next }),
  setInsps: next => set({ insps: next }),
}))
