'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send, Pin, PinOff, Trash2, X } from 'lucide-react'
import { createClient as createSupabase, getSessionUser } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { markMyAction } from '@/lib/notifications'

interface SharedNote {
  id: string
  author_id: string
  content: string
  pinned: boolean
  created_at: string
  author_name: string
}

export default function MessagesDrawer() {
  const [open, setOpen] = useState(false)
  const [me, setMe] = useState<string | null>(null)
  const [notes, setNotes] = useState<SharedNote[]>([])
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [unread, setUnread] = useState(0)
  const lastSeenRef = useRef<number>(0)
  const addToast = useAppStore(s => s.addToast)

  const load = useCallback(async () => {
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return
    setMe(user.id)
    const [notesRes, profilesRes] = await Promise.all([
      supabase.from('shared_notes').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('id, display_name, email'),
    ])
    const pMap = new Map<string, string>()
    for (const p of profilesRes.data ?? []) {
      pMap.set(p.id, p.display_name || p.email?.split('@')[0] || '夥伴')
    }
    const list: SharedNote[] = (notesRes.data ?? []).map(n => ({
      id: n.id,
      author_id: n.author_id,
      content: n.content,
      pinned: n.pinned,
      created_at: n.created_at,
      author_name: pMap.get(n.author_id) ?? '夥伴',
    }))
    setNotes(list)

    const unreadCount = list.filter(n =>
      n.author_id !== user.id && new Date(n.created_at).getTime() > lastSeenRef.current
    ).length
    setUnread(unreadCount)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = Number(localStorage.getItem('alvin_msgs_seen') || 0)
      lastSeenRef.current = stored
    }
    load()
  }, [load])

  useEffect(() => {
    const supabase = createSupabase()
    const channel = supabase
      .channel('messages-drawer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_notes' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  /* mark seen when opened */
  useEffect(() => {
    if (!open) return
    const now = Date.now()
    lastSeenRef.current = now
    if (typeof window !== 'undefined') localStorage.setItem('alvin_msgs_seen', String(now))
    setUnread(0)
  }, [open])

  /* close on Escape */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function postNote() {
    const content = draft.trim()
    if (!content || !me || posting) return
    setPosting(true)
    try {
      const supabase = createSupabase()
      const { data, error } = await supabase
        .from('shared_notes')
        .insert({ author_id: me, content })
        .select()
        .single()
      if (error || !data) { addToast({ type: 'warning', message: '送出失敗' }); return }
      markMyAction(data.id)
      setDraft('')
    } finally {
      setPosting(false)
    }
  }

  async function togglePin(id: string, nextPinned: boolean) {
    setNotes(ns => ns.map(n => n.id === id ? { ...n, pinned: nextPinned } : n))
    await createSupabase().from('shared_notes').update({ pinned: nextPinned }).eq('id', id)
  }

  async function deleteNote(id: string) {
    if (!confirm('刪除這則訊息？')) return
    setNotes(ns => ns.filter(n => n.id !== id))
    await createSupabase().from('shared_notes').delete().eq('id', id)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Messages"
        aria-label={`Open messages${unread > 0 ? ` (${unread} unread)` : ''}`}
        className="
          fixed z-[140]
          right-4 bottom-36 md:bottom-6
          w-12 h-12 rounded-full
          bg-card border border-border-active text-ink-primary
          flex items-center justify-center
          shadow-[0_8px_24px_rgba(0,0,0,0.4)]
          hover:bg-elevated active:scale-95 transition-all
        "
      >
        <MessageSquare size={18} />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-red text-void text-[10px] font-mono font-bold flex items-center justify-center shadow-[0_0_8px_rgba(255,56,96,0.6)]"
            aria-label={`${unread} unread messages`}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[180]"
            onClick={() => setOpen(false)}
          >
            <div className="absolute inset-0 bg-void/70 backdrop-blur-sm" />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
              className="
                absolute right-0 top-0 h-full
                w-full max-w-md bg-card border-l border-border-active
                flex flex-col
              "
            >
              <div className="flex items-center gap-2 px-4 h-14 border-b border-border-subtle shrink-0">
                <MessageSquare size={14} className="text-accent-blue" />
                <span className="font-display text-[13px] tracking-[0.22em] text-ink-primary uppercase">Messages</span>
                <button
                  onClick={() => setOpen(false)}
                  className="ml-auto text-ink-muted hover:text-ink-primary transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {notes.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="font-body text-xs text-ink-muted">還沒有任何訊息</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-subtle/50">
                    {notes.map(n => {
                      const mine = n.author_id === me
                      return (
                        <div key={n.id} className="px-4 py-3 flex items-start gap-3 group/note">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-display uppercase shrink-0
                            ${mine ? 'bg-accent-blue/20 text-accent-blue' : 'bg-accent-gold/20 text-accent-gold'}`}>
                            {n.author_name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-display text-[11px] tracking-wider text-ink-primary">{n.author_name}</span>
                              {n.pinned && <Pin size={10} className="text-accent-gold" />}
                              <span className="font-mono text-[11px] text-ink-muted ml-auto">
                                {formatRelative(n.created_at)}
                              </span>
                            </div>
                            <p className="font-body text-sm text-ink-primary mt-1 whitespace-pre-wrap break-words">{n.content}</p>
                          </div>
                          <div className="flex flex-col gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity">
                            <button
                              onClick={() => togglePin(n.id, !n.pinned)}
                              className="text-ink-muted hover:text-accent-gold transition-colors"
                              title={n.pinned ? '取消置頂' : '置頂'}
                            >
                              {n.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                            </button>
                            {mine && (
                              <button
                                onClick={() => deleteNote(n.id)}
                                className="text-ink-muted hover:text-accent-red transition-colors"
                                title="刪除"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-border-subtle flex gap-2 shrink-0">
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postNote() } }}
                  placeholder="寫一則訊息..."
                  className="flex-1 bg-elevated border border-border-subtle rounded px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent-blue font-body"
                />
                <button
                  onClick={postNote}
                  disabled={posting || !draft.trim()}
                  className="flex items-center gap-1 px-3 py-2 bg-accent-blue/15 text-accent-blue rounded border border-accent-blue/30 hover:bg-accent-blue/25 transition-all font-display text-[12px] tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={12} /> Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function formatRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return '剛剛'
  if (diff < 3600) return `${Math.floor(diff / 60)}分鐘前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小時前`
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
