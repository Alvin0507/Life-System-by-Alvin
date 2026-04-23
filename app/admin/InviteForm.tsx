'use client'
import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { inviteEmail } from './actions'

export default function InviteForm() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const form = new FormData()
    form.set('email', email)
    startTransition(async () => {
      const res = await inviteEmail(form)
      if (res?.error) {
        setMsg({ tone: 'err', text: res.error })
      } else {
        setMsg({ tone: 'ok', text: `${email} 已加入白名單。` })
        setEmail('')
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="partner@example.com"
        className="flex-1 bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm font-body text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent-blue/50"
      />
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent-blue/10 border border-accent-blue/40 text-accent-blue font-display text-xs tracking-widest hover:bg-accent-blue/20 transition-colors disabled:opacity-50"
      >
        <Plus size={14} />
        {pending ? '加入中…' : '加入白名單'}
      </button>
      {msg && (
        <p
          className={`sm:basis-full text-xs font-body ${
            msg.tone === 'ok' ? 'text-accent-green' : 'text-accent-red'
          }`}
        >
          {msg.text}
        </p>
      )}
    </form>
  )
}
