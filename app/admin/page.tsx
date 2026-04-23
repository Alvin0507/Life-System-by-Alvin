import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InviteForm from './InviteForm'
import InviteRow from './InviteRow'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (me?.role !== 'owner') redirect('/')

  const [{ data: invites }, { data: members }] = await Promise.all([
    supabase
      .from('invites')
      .select('id, email, status, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, email, display_name, role, created_at')
      .order('created_at', { ascending: true }),
  ])

  const pending = (invites ?? []).filter(i => i.status === 'pending')
  const accepted = (invites ?? []).filter(i => i.status === 'accepted')
  const revoked = (invites ?? []).filter(i => i.status === 'revoked')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:px-8 pb-24 space-y-8">
      <div>
        <p className="font-display text-[10px] tracking-[0.3em] text-accent-gold mb-2">
          ◆ OWNER CONSOLE
        </p>
        <h1 className="font-display text-3xl text-ink-primary tracking-wider mb-1">
          成員與邀請
        </h1>
        <p className="font-body text-sm text-ink-secondary">
          只有擁有者能看到這個頁面。加進白名單的 email 才能登入。
        </p>
      </div>

      {/* Members */}
      <section className="bg-card border border-border-subtle rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary">
            MEMBERS · {members?.length ?? 0}
          </h2>
        </div>
        <ul className="divide-y divide-border-subtle">
          {(members ?? []).map(m => (
            <li key={m.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-body text-sm text-ink-primary truncate">
                  {m.display_name || m.email}
                </p>
                <p className="font-mono text-xs text-ink-muted truncate">{m.email}</p>
              </div>
              <span
                className={`font-display text-[10px] tracking-widest px-2 py-1 rounded shrink-0 ${
                  m.role === 'owner'
                    ? 'text-accent-gold bg-accent-gold/10 border border-accent-gold/30'
                    : 'text-ink-secondary bg-elevated border border-border-subtle'
                }`}
              >
                {m.role.toUpperCase()}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Add invite */}
      <section className="bg-card border border-border-subtle rounded-xl p-5">
        <h2 className="font-display text-sm tracking-[0.2em] text-ink-primary mb-4">
          INVITE BY EMAIL
        </h2>
        <InviteForm />
      </section>

      {/* Pending */}
      <section className="bg-card border border-border-subtle rounded-xl p-5">
        <h2 className="font-display text-sm tracking-[0.2em] text-accent-blue mb-4">
          PENDING · {pending.length}
        </h2>
        {pending.length === 0 ? (
          <p className="font-body text-sm text-ink-muted">尚無待加入的邀請。</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {pending.map(i => (
              <InviteRow key={i.id} invite={i} action="revoke" />
            ))}
          </ul>
        )}
      </section>

      {/* Accepted */}
      {accepted.length > 0 && (
        <section className="bg-card border border-border-subtle rounded-xl p-5">
          <h2 className="font-display text-sm tracking-[0.2em] text-accent-green mb-4">
            ACCEPTED · {accepted.length}
          </h2>
          <ul className="divide-y divide-border-subtle">
            {accepted.map(i => (
              <InviteRow key={i.id} invite={i} action="none" />
            ))}
          </ul>
        </section>
      )}

      {/* Revoked */}
      {revoked.length > 0 && (
        <section className="bg-card border border-border-subtle rounded-xl p-5">
          <h2 className="font-display text-sm tracking-[0.2em] text-ink-muted mb-4">
            REVOKED · {revoked.length}
          </h2>
          <ul className="divide-y divide-border-subtle">
            {revoked.map(i => (
              <InviteRow key={i.id} invite={i} action="restore" />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
