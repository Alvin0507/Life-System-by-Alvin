'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Zap, Briefcase, Brain, Calendar } from 'lucide-react'

const navItems = [
  { icon: Home, path: '/', label: 'HOME' },
  { icon: Zap, path: '/today', label: 'TODAY' },
  { icon: Briefcase, path: '/clients', label: 'CLIENTS' },
  { icon: Calendar, path: '/weekly', label: 'WEEKLY' },
  { icon: Brain, path: '/learn', label: 'LEARN' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-md border-t border-border-subtle flex items-stretch justify-around px-1 z-40 md:hidden pb-[env(safe-area-inset-bottom)]">
      {navItems.map(({ icon: Icon, path, label }) => {
        const active = pathname === path
        return (
          <Link
            key={path}
            href={path}
            aria-current={active ? 'page' : undefined}
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors btn-press tap-pulse
              ${active
                ? 'text-accent-blue'
                : 'text-ink-muted active:text-ink-primary'}`}
          >
            {active && (
              <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent-blue shadow-glow-blue" />
            )}
            <Icon size={22} strokeWidth={active ? 2.4 : 1.9} className="mt-1" />
            <span className={`font-display tracking-wider text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
