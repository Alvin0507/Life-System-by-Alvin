'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Zap, Briefcase, Users, Calendar } from 'lucide-react'

const navItems = [
  { icon: Home, path: '/', label: 'HOME' },
  { icon: Zap, path: '/today', label: 'TODAY' },
  { icon: Briefcase, path: '/clients', label: 'CLIENTS' },
  { icon: Users, path: '/shared', label: 'SHARED' },
  { icon: Calendar, path: '/weekly', label: 'WEEKLY' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[68px] bg-card/95 backdrop-blur-md border-t border-border-subtle flex items-center justify-around px-2 z-40 md:hidden">
      {navItems.map(({ icon: Icon, path, label }) => {
        const active = pathname === path
        return (
          <Link
            key={path}
            href={path}
            className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all btn-press tap-pulse
              ${active
                ? 'text-accent-blue bg-accent-blue/10'
                : 'text-ink-secondary active:text-ink-primary'}`}
          >
            {active && (
              <span className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-accent-blue rounded-full shadow-glow-blue" />
            )}
            <Icon size={24} strokeWidth={active ? 2.4 : 2} />
            <span className="font-display text-[13px] tracking-wider font-semibold">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
