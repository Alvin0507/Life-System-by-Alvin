'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Shield, LogOut } from 'lucide-react'
import { createClient, getSessionUser } from '@/lib/supabase/client'

export default function AccountMenu() {
  const [role, setRole] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const user = await getSessionUser()
      if (!user) return
      setEmail(user.email ?? null)
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      setRole(data?.role ?? null)
    })()
  }, [])

  return (
    <div className="px-2 py-3 border-t border-border-subtle shrink-0 flex flex-col gap-1">
      {role === 'owner' && (
        <Link
          href="/admin"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-ink-secondary hover:text-accent-gold hover:bg-elevated transition-colors whitespace-nowrap"
        >
          <Shield size={16} className="shrink-0" />
          <span className="font-display text-[12px] tracking-[0.18em] overflow-hidden whitespace-nowrap max-w-0 group-hover:max-w-[120px] opacity-0 group-hover:opacity-100 transition-all duration-200">
            ADMIN
          </span>
        </Link>
      )}
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-ink-secondary hover:text-accent-red hover:bg-elevated transition-colors whitespace-nowrap"
          title={email ?? undefined}
        >
          <LogOut size={16} className="shrink-0" />
          <span className="font-display text-[12px] tracking-[0.18em] overflow-hidden whitespace-nowrap max-w-0 group-hover:max-w-[120px] opacity-0 group-hover:opacity-100 transition-all duration-200">
            SIGN OUT
          </span>
        </button>
      </form>
    </div>
  )
}
