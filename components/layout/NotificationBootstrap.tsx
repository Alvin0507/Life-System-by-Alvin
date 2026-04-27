'use client'
import { useEffect } from 'react'
import { createClient as createSupabase, getSessionUser } from '@/lib/supabase/client'
import { isMyRecentAction, notify } from '@/lib/notifications'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface TaskRow {
  id: string
  is_shared: boolean
  user_id: string
  assigned_to: string | null
  completed: boolean
  content: string
}

interface NoteRow {
  id: string
  author_id: string
  content: string
}

export default function NotificationBootstrap() {
  useEffect(() => {
    let cancelled = false
    let channel: RealtimeChannel | null = null

    ;(async () => {
      const user = await getSessionUser()
      if (!user || cancelled) return
      const me = user.id

      const supabase = createSupabase()
      const { data: partners } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .neq('id', me)
      const partner = partners?.[0]
      const partnerName = partner
        ? partner.display_name || partner.email?.split('@')[0] || '夥伴'
        : '夥伴'

      channel = supabase
        .channel('global-notify')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'tasks' },
          payload => {
            const n = payload.new as TaskRow
            const o = payload.old as Partial<TaskRow>
            if (!n?.id || isMyRecentAction(n.id)) return
            if (!n.is_shared) return
            if (n.completed === true && o?.completed === false) {
              notify(`${partnerName} 完成了任務`, n.content || '', { tag: `task-done-${n.id}` })
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'tasks' },
          payload => {
            const n = payload.new as TaskRow
            if (!n?.id || isMyRecentAction(n.id)) return
            if (!n.is_shared || n.user_id === me) return
            if (n.assigned_to === me) {
              notify(`${partnerName} 指派了任務給你`, n.content || '', { tag: `task-new-${n.id}` })
            } else {
              notify(`${partnerName} 新增共用任務`, n.content || '', { tag: `task-new-${n.id}` })
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'shared_notes' },
          payload => {
            const n = payload.new as NoteRow
            if (!n?.id || isMyRecentAction(n.id)) return
            if (n.author_id === me) return
            notify(`${partnerName} 留言`, n.content || '', { tag: `note-${n.id}` })
          }
        )
        .subscribe()
    })()

    return () => {
      cancelled = true
      if (channel) {
        const supabase = createSupabase()
        supabase.removeChannel(channel)
      }
    }
  }, [])

  return null
}
