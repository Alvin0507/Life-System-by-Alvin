'use client'
import { useTransition } from 'react'
import { X, Undo2 } from 'lucide-react'
import { revokeInvite, restoreInvite } from './actions'

type Invite = { id: string; email: string; status: string; created_at: string }

export default function InviteRow({
  invite,
  action,
}: {
  invite: Invite
  action: 'revoke' | 'restore' | 'none'
}) {
  const [pending, startTransition] = useTransition()

  function fire(fn: (fd: FormData) => Promise<{ error?: string; ok?: boolean }>) {
    const fd = new FormData()
    fd.set('id', invite.id)
    startTransition(() => {
      fn(fd)
    })
  }

  return (
    <li className="py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-body text-sm text-ink-primary truncate">{invite.email}</p>
        <p className="font-mono text-[12px] text-ink-muted">
          {new Date(invite.created_at).toLocaleDateString('zh-TW')}
        </p>
      </div>
      {action === 'revoke' && (
        <button
          onClick={() => fire(revokeInvite)}
          disabled={pending}
          className="flex items-center gap-1 text-xs font-display tracking-widest text-ink-secondary hover:text-accent-red transition-colors disabled:opacity-50"
        >
          <X size={13} /> 撤回
        </button>
      )}
      {action === 'restore' && (
        <button
          onClick={() => fire(restoreInvite)}
          disabled={pending}
          className="flex items-center gap-1 text-xs font-display tracking-widest text-ink-secondary hover:text-accent-blue transition-colors disabled:opacity-50"
        >
          <Undo2 size={13} /> 還原
        </button>
      )}
    </li>
  )
}
