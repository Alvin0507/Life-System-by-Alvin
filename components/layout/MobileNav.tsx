'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Zap, Briefcase, Calendar, Brain } from 'lucide-react'

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
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border-subtle flex items-center justify-around px-2 z-40 md:hidden">
      {navItems.map(({ icon: Icon, path, label }) => {
        const active = pathname === path
        return (
          <Link
            key={path}
            href={path}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors
              ${active ? 'text-accent-blue' : 'text-ink-secondary'}`}
          >
            <Icon size={20} />
            <span className="font-display text-[9px] tracking-wider">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
