'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Zap, Briefcase, Calendar, Brain, Settings, Users } from 'lucide-react'
import AccountMenu from './AccountMenu'

const navItems = [
  { icon: Home,      path: '/',         label: 'HOME'     },
  { icon: Zap,       path: '/today',    label: 'TODAY'    },
  { icon: Briefcase, path: '/clients',  label: 'CLIENTS'  },
  { icon: Users,     path: '/projects', label: 'PROJECTS' },
  { icon: Calendar,  path: '/weekly',   label: 'WEEKLY'   },
  { icon: Brain,     path: '/learn',    label: 'LEARN'    },
  { icon: Settings,  path: '/settings', label: 'SETTINGS' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="
      group
      fixed left-0 top-0 h-full z-40
      w-16 hover:w-52
      transition-[width] duration-200 ease-out
      bg-card border-r border-border-subtle
      flex-col overflow-hidden
      hidden md:flex
    ">
      {/* Brand */}
      <div className="flex items-center h-16 px-[18px] shrink-0 border-b border-border-subtle overflow-hidden">
        <span className="font-display text-accent-gold font-bold text-sm tracking-widest shrink-0 leading-none flex items-center gap-[1px]">
          A
          <span
            className="inline-block w-[2px] h-[0.9em] bg-accent-gold ml-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ animation: 'blink 1s step-end infinite' }}
          />
        </span>
        <span className="
          font-display text-accent-gold font-bold text-sm tracking-widest leading-none
          whitespace-nowrap overflow-hidden
          max-w-0 group-hover:max-w-[160px]
          opacity-0 group-hover:opacity-100
          transition-all duration-200 ease-out
        ">
          LVIN OS
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-2 flex-1 mt-2">
        {navItems.map(({ icon: Icon, path, label }) => {
          const active = pathname === path
          return (
            <Link
              key={path}
              href={path}
              className={`
                relative flex items-center gap-3 px-3 py-[11px] rounded-lg
                transition-colors duration-150 whitespace-nowrap
                ${active
                  ? 'text-accent-blue bg-accent-blue/10'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-elevated'
                }
              `}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent-blue rounded-r-full shadow-glow-blue animate-pulse" />
              )}
              <Icon size={17} className="shrink-0" />
              <span className="
                font-display text-[10px] tracking-[0.18em]
                overflow-hidden whitespace-nowrap
                max-w-0 group-hover:max-w-[120px]
                opacity-0 group-hover:opacity-100
                transition-all duration-200 ease-out
              ">
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Account */}
      <AccountMenu />
    </aside>
  )
}
