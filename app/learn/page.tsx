'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, type MotionProps } from 'framer-motion'
import { Plus, Trash2, X } from 'lucide-react'
import { getWeekStart, getTodayString } from '@/lib/utils'
import { Inspiration } from '@/types'
import { createClient as createSupabase, getSessionUser } from '@/lib/supabase/client'
import LoadingScreen from '@/components/ui/LoadingScreen'

/* ── Types ── */
interface LearningTopic { id: string; label: string; emoji: string; sort_order: number }
interface LearningEntry { date: string; topic_id: string; notes: string; checked: boolean }
type EntryMap = Record<string, LearningEntry>

const TAG_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  zaizai:  { label: '🏠 隨行阿宅', color: '#00ff88', bg: 'rgba(0,255,136,0.15)' },
  lulumen: { label: '🌍 LuLuMen',  color: '#00d4ff', bg: 'rgba(0,212,255,0.15)' },
  bitget:  { label: '💰 Bitget',   color: '#44b8e0', bg: 'rgba(68,184,224,0.18)' },
  hunter:  { label: '🎯 獵人',     color: '#ff8c42', bg: 'rgba(255,140,66,0.18)' },
  other:   { label: '💡 其他',     color: '#a8a8cc', bg: 'rgba(168,168,204,0.18)' },
}

/* ── Helpers ── */
function dateOffset(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + days); return d.toISOString().split('T')[0]
}
function getWeekDays(ws: string): string[] {
  return Array.from({ length: 7 }, (_, i) => dateOffset(ws, i))
}
function entryKey(date: string, topicId: string) { return `${date}:${topicId}` }
function getEntry(map: EntryMap, date: string, topicId: string): LearningEntry {
  return map[entryKey(date, topicId)] ?? { date, topic_id: topicId, notes: '', checked: false }
}
function calcStreak(map: EntryMap, topicId: string, today: string): number {
  let streak = 0
  const d = new Date(today + 'T00:00:00')
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().split('T')[0]
    const e = getEntry(map, ds, topicId)
    if (e.checked) { streak++ }
    else if (i > 0) { break }
    d.setDate(d.getDate() - 1)
  }
  return streak
}
function lastStudied(map: EntryMap, topicId: string, today: string): string {
  const d = new Date(today + 'T00:00:00')
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().split('T')[0]
    const e = getEntry(map, ds, topicId)
    if (e.checked) {
      if (i === 0) return '今天'
      if (i === 1) return '昨天'
      return `${i} 天前`
    }
    d.setDate(d.getDate() - 1)
  }
  return '未曾學習'
}
function fmtTs(ts: string): string {
  const d = new Date(ts)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

/* ══ StreakBoard ══════════════════════════════════════════════════════════ */
function StreakBoard({ topics, entries, today }: { topics: LearningTopic[]; entries: EntryMap; today: string }) {
  const streaks: Record<string, number> = {}
  const todayChecked: Record<string, boolean> = {}
  topics.forEach(t => {
    streaks[t.id] = calcStreak(entries, t.id, today)
    todayChecked[t.id] = getEntry(entries, today, t.id).checked
  })

  return (
    <section>
      <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase mb-3">Learning Streak</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {topics.slice(0, 3).map(t => {
          const streak = streaks[t.id] ?? 0
          const isToday = todayChecked[t.id]
          return (
            <div key={t.id} className={`bg-card border rounded-xl p-4 transition-all duration-300
              ${isToday ? 'border-accent-gold/40' : 'border-border-subtle'}`}
              style={isToday ? { boxShadow: '0 0 16px rgba(255,215,0,0.1)' } : undefined}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{t.emoji}</span>
                <span className="font-body text-xs text-ink-secondary">{t.label}</span>
                {isToday && (
                  <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                    className="ml-auto">🔥</motion.span>
                )}
              </div>
              <p className="font-mono text-4xl text-accent-gold font-bold leading-none mb-1">{streak}</p>
              <p className="font-body text-xs text-ink-muted">連續天數</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ══ LearningCard ════════════════════════════════════════════════════════ */
function LearningCard({
  topic, today, weekDays, entries, onToggle, onNotes, onDelete,
}: {
  topic: LearningTopic
  today: string
  weekDays: string[]
  entries: EntryMap
  onToggle: (topicId: string, checked: boolean) => void
  onNotes: (topicId: string, notes: string) => void
  onDelete?: () => void
}) {
  const entry = getEntry(entries, today, topic.id)
  const weekChecks = weekDays.map(d => getEntry(entries, d, topic.id).checked)
  const last = lastStudied(entries, topic.id, today)
  const [localNotes, setLocalNotes] = useState(entry.notes)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setLocalNotes(entry.notes) }, [entry.notes])

  function handleNotes(v: string) {
    setLocalNotes(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onNotes(topic.id, v), 500)
  }

  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-all duration-300
      ${entry.checked ? 'border-accent-green/40' : 'border-border-subtle'}`}
      style={entry.checked ? { boxShadow: '0 0 16px rgba(0,255,136,0.1)' } : undefined}>

      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
        <span className="text-lg">{topic.emoji}</span>
        <span className="font-body text-sm text-ink-primary flex-1">{topic.label}</span>
        {onDelete && (
          <button onClick={onDelete} className="text-ink-muted hover:text-accent-red transition-colors">
            <X size={13} />
          </button>
        )}
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => onToggle(topic.id, !entry.checked)}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
            ${entry.checked ? 'bg-accent-green border-accent-green' : 'border-ink-muted hover:border-accent-green'}`}>
          {entry.checked && (
            <motion.svg initial={{scale:0}} animate={{scale:1}} width={14} height={14} viewBox="0 0 14 14">
              <polyline points="2,7 5.5,10.5 12,3.5" fill="none" stroke="#0f0f1a" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          )}
        </motion.button>
      </div>

      <div className="flex gap-1 px-4 py-2">
        {weekDays.map((d, i) => (
          <div key={d} title={d}
            className={`flex-1 h-1.5 rounded-full transition-all duration-300
              ${weekChecks[i] ? 'bg-accent-blue' : d === today ? 'bg-border-active' : 'bg-elevated'}`} />
        ))}
      </div>

      <div className="px-4 pb-3">
        <textarea
          value={localNotes}
          onChange={e => handleNotes(e.target.value)}
          placeholder="今日學習筆記..."
          rows={2}
          className="w-full bg-transparent text-xs text-ink-primary font-body placeholder:text-ink-muted outline-none resize-none leading-relaxed"
        />
        <p className="text-[12px] text-ink-muted mt-1 font-body">上次學習：{last}</p>
      </div>
    </div>
  )
}

/* ══ InspirationVault ════════════════════════════════════════════════════ */
function InspirationVault({
  insps, onAdd, onDelete,
}: {
  insps: Inspiration[]
  onAdd: (content: string, tags: string[]) => void
  onDelete: (id: string) => void
}) {
  const [input, setInput] = useState('')
  const [selTags, setSelTags] = useState<string[]>([])
  const [filterTag, setFilterTag] = useState<string | null>(null)

  function toggleTag(tag: string) {
    setSelTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function add() {
    if (!input.trim()) return
    onAdd(input.trim(), selTags)
    setInput(''); setSelTags([])
  }

  const visible = filterTag
    ? insps.filter(i => i.tags.includes(filterTag))
    : insps

  return (
    <section>
      <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase mb-3">Inspiration Vault</h2>

      <div className="bg-card border border-border-subtle rounded-xl p-4 mb-3">
        <div className="flex gap-2 mb-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add() }}
            placeholder="記下一個靈感、想法、金句... （Enter 新增）"
            className="flex-1 bg-elevated border border-border-subtle rounded px-3 py-2 text-sm text-ink-primary font-body placeholder:text-ink-muted outline-none"
          />
          <button onClick={add} disabled={!input.trim()}
            className="px-4 py-2 bg-accent-blue/15 text-accent-blue rounded border border-accent-blue/30
              hover:bg-accent-blue/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-display text-[12px] tracking-wider">
            <Plus size={14} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(TAG_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => toggleTag(key)}
              className={`px-2.5 py-1 rounded-full text-[12px] font-body border transition-all
                ${selTags.includes(key) ? 'border-current' : 'border-transparent bg-elevated'}`}
              style={selTags.includes(key) ? { color: cfg.color, backgroundColor: cfg.bg } : undefined}>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <button onClick={() => setFilterTag(null)}
          className={`px-2.5 py-1 rounded-full text-[12px] font-display tracking-wider border transition-all
            ${!filterTag ? 'bg-elevated border-border-active text-ink-primary' : 'border-transparent text-ink-muted hover:border-border-subtle'}`}>
          ALL ({insps.length})
        </button>
        {Object.entries(TAG_CONFIG).map(([key, cfg]) => {
          const cnt = insps.filter(i => i.tags.includes(key)).length
          if (!cnt) return null
          return (
            <button key={key} onClick={() => setFilterTag(filterTag === key ? null : key)}
              className={`px-2.5 py-1 rounded-full text-[12px] font-body border transition-all`}
              style={filterTag === key ? { color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.color + '50' } : { borderColor: 'transparent', color: '#a8a8cc' }}>
              {cfg.label} ({cnt})
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <p className="text-xs text-ink-muted font-body py-6 text-center">還沒有靈感。把想法記下來吧。</p>
      ) : (
        <div className="columns-2 md:columns-3 gap-3">
          <AnimatePresence>
            {visible.map(insp => (
              <motion.div key={insp.id}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
                className="break-inside-avoid mb-3 bg-card border border-border-subtle rounded-xl p-3 group/insp">
                <p className="text-sm text-ink-primary font-body leading-relaxed mb-2">{insp.content}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {insp.tags.map(tag => {
                      const cfg = TAG_CONFIG[tag]
                      if (!cfg) return null
                      return (
                        <span key={tag} className="text-[11px] px-1.5 py-0.5 rounded-full font-body"
                          style={{ color: cfg.color, backgroundColor: cfg.bg }}>
                          {cfg.label.split(' ')[0]}
                        </span>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-ink-muted font-mono">{fmtTs(insp.created_at)}</span>
                    <button onClick={() => onDelete(insp.id)}
                      className="opacity-0 group-hover/insp:opacity-100 text-ink-muted hover:text-accent-red transition-all">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}

/* ══ MAIN ════════════════════════════════════════════════════════════════ */
const fadeUp = (delay: number): MotionProps => ({
  initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4 },
})

export default function LearnPage() {
  const [loaded, setLoaded] = useState(false)
  const [topics, setTopics] = useState<LearningTopic[]>([])
  const [entries, setEntries] = useState<EntryMap>({})
  const [insps, setInsps] = useState<Inspiration[]>([])
  const [addingTopic, setAddingTopic] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newEmoji, setNewEmoji] = useState('📚')
  const today = getTodayString()
  const weekDays = getWeekDays(getWeekStart())

  useEffect(() => {
    (async () => {
      const supabase = createSupabase()
      const user = await getSessionUser()
      if (!user) { setLoaded(true); return }

      const cutoff = new Date(today + 'T00:00:00')
      cutoff.setDate(cutoff.getDate() - 365)
      const cutoffStr = cutoff.toISOString().split('T')[0]

      const [topicsRes, entriesRes, inspsRes] = await Promise.all([
        supabase.from('learning_topics').select('*').eq('archived', false).order('sort_order'),
        supabase.from('learning_entries').select('*').gte('date', cutoffStr),
        supabase.from('inspirations').select('*').order('created_at', { ascending: false }),
      ])

      setTopics((topicsRes.data ?? []).map(t => ({
        id: t.id, label: t.label, emoji: t.emoji, sort_order: t.sort_order,
      })))

      const map: EntryMap = {}
      for (const e of entriesRes.data ?? []) {
        map[entryKey(e.date, e.topic_id)] = {
          date: e.date, topic_id: e.topic_id, notes: e.notes, checked: e.checked,
        }
      }
      setEntries(map)

      setInsps((inspsRes.data ?? []).map(i => ({
        id: i.id, content: i.content, tags: i.tags ?? [], created_at: i.created_at,
      })))

      setLoaded(true)
    })()
  }, [today])

  async function addTopic() {
    if (!newLabel.trim() || topics.length >= 6) return
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return
    const sort_order = topics.length
    const { data } = await supabase
      .from('learning_topics')
      .insert({ user_id: user.id, label: newLabel.trim(), emoji: newEmoji, sort_order })
      .select().single()
    if (!data) return
    setTopics([...topics, { id: data.id, label: data.label, emoji: data.emoji, sort_order: data.sort_order }])
    setNewLabel(''); setAddingTopic(false)
  }

  async function deleteTopic(id: string) {
    setTopics(topics.filter(t => t.id !== id))
    await createSupabase().from('learning_topics').update({ archived: true }).eq('id', id)
  }

  async function toggleEntry(topicId: string, checked: boolean) {
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return
    const key = entryKey(today, topicId)
    const existing = entries[key] ?? { date: today, topic_id: topicId, notes: '', checked: false }
    const updated = { ...existing, checked }
    setEntries({ ...entries, [key]: updated })
    await supabase.from('learning_entries').upsert(
      { user_id: user.id, date: today, topic_id: topicId, checked, notes: updated.notes },
      { onConflict: 'user_id,date,topic_id' }
    )
  }

  async function updateNotes(topicId: string, notes: string) {
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return
    const key = entryKey(today, topicId)
    const existing = entries[key] ?? { date: today, topic_id: topicId, notes: '', checked: false }
    const updated = { ...existing, notes }
    setEntries({ ...entries, [key]: updated })
    await supabase.from('learning_entries').upsert(
      { user_id: user.id, date: today, topic_id: topicId, notes, checked: updated.checked },
      { onConflict: 'user_id,date,topic_id' }
    )
  }

  async function addInspiration(content: string, tags: string[]) {
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return
    const { data } = await supabase
      .from('inspirations')
      .insert({ user_id: user.id, content, tags })
      .select().single()
    if (!data) return
    setInsps([{ id: data.id, content: data.content, tags: data.tags ?? [], created_at: data.created_at }, ...insps])
  }

  async function deleteInspiration(id: string) {
    setInsps(insps.filter(i => i.id !== id))
    await createSupabase().from('inspirations').delete().eq('id', id)
  }

  if (!loaded) return <LoadingScreen label="LOADING STREAKS" />

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 space-y-8 pb-24">

      <motion.div {...fadeUp(0)}>
        <StreakBoard topics={topics} entries={entries} today={today} />
      </motion.div>

      <motion.div {...fadeUp(0.07)}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary uppercase">Learning Log</h2>
          {topics.length < 6 && (
            <button onClick={() => setAddingTopic(v => !v)}
              className="flex items-center gap-1.5 text-xs text-accent-blue hover:text-accent-blue/80 transition-colors font-body">
              <Plus size={13} /> 新增主題
            </button>
          )}
        </div>

        <AnimatePresence>
          {addingTopic && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
              <div className="bg-elevated border border-border-active rounded-xl p-3 flex gap-2">
                <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
                  className="w-10 text-center bg-void border border-border-subtle rounded px-1 py-1.5 text-base outline-none" />
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTopic(); if (e.key === 'Escape') setAddingTopic(false) }}
                  placeholder="主題名稱" autoFocus
                  className="flex-1 bg-void border border-border-subtle rounded px-2 py-1.5 text-sm text-ink-primary font-body placeholder:text-ink-muted outline-none" />
                <button onClick={addTopic} disabled={!newLabel.trim()}
                  className="px-3 py-1.5 bg-accent-blue/15 text-accent-blue rounded text-xs font-display tracking-wider
                    hover:bg-accent-blue/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  新增
                </button>
                <button onClick={() => setAddingTopic(false)} className="text-ink-muted hover:text-ink-primary transition-colors px-1">
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topics.map(t => (
            <LearningCard
              key={t.id}
              topic={t}
              today={today}
              weekDays={weekDays}
              entries={entries}
              onToggle={toggleEntry}
              onNotes={updateNotes}
              onDelete={() => deleteTopic(t.id)}
            />
          ))}
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.12)}>
        <InspirationVault insps={insps} onAdd={addInspiration} onDelete={deleteInspiration} />
      </motion.div>
    </div>
  )
}
