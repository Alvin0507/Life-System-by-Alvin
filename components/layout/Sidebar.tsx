'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Zap, Briefcase, Calendar, Brain, Settings, Command } from 'lucide-react'
import AccountMenu from './AccountMenu'

const navItems = [
  { icon: Home,      path: '/',         label: 'HOME'     },
  { icon: Zap,       path: '/today',    label: 'TODAY'    },
  { icon: Briefcase, path: '/clients',  label: 'CLIENTS'  },
  { icon: Calendar,  path: '/weekly',   label: 'WEEKLY'   },
  { icon: Brain,     path: '/learn',    label: 'LEARN'    },
]

const utilityItems = [
  { icon: Settings,  path: '/settings', label: 'SETTINGS' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="
      group peer
      fixed left-0 top-0 h-full z-40
      w-16 hover:w-56
      transition-[width] duration-200 ease-in-out
      bg-card border-r border-border-subtle
      flex-col overflow-hidden
      hidden md:flex
    ">
      {/* Brand */}
      <div className="flex items-center h-16 px-[18px] shrink-0 border-b border-border-subtle overflow-hidden">
        <span className="font-display text-accent-gold font-bold text-base tracking-widest shrink-0 leading-none flex items-center gap-[1px]">
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
      <nav className="flex flex-col gap-1 px-2 pt-3 flex-1">
        {navItems.map(({ icon: Icon, path, label }) => (
          <NavItem key={path} icon={Icon} path={path} label={label} active={pathname === path} />
        ))}

        {/* Divider */}
        <div className="my-3 mx-2 border-t border-border-subtle/60" />

        {utilityItems.map(({ icon: Icon, path, label }) => (
          <NavItem key={path} icon={Icon} path={path} label={label} active={pathname === path} />
        ))}
      </nav>

      {/* Command Palette trigger */}
      <button
        type="button"
        title="Command (⌘K)"
        onClick={() => window.dispatchEvent(new Event('cmdk:open'))}
        className="
          mx-2 mb-2 flex items-center gap-3 px-3 py-2 rounded-lg whitespace-nowrap
          text-ink-muted hover:text-accent-blue hover:bg-accent-blue/8
          transition-colors duration-150 btn-press
        "
      >
        <Command size={16} className="shrink-0" strokeWidth={2} />
        <span className="
          flex-1 font-display text-[11px] tracking-[0.18em] font-semibold text-left
          overflow-hidden whitespace-nowrap
          max-w-0 group-hover:max-w-[140px]
          opacity-0 group-hover:opacity-100
          transition-all duration-200 ease-out
        ">
          COMMAND
        </span>
        <kbd className="
          font-mono text-[9px] px-1 py-px rounded border border-border-subtle bg-elevated
          overflow-hidden whitespace-nowrap shrink-0
          max-w-0 group-hover:max-w-[40px]
          opacity-0 group-hover:opacity-100
          transition-all duration-200 ease-out
        ">
          ⌘K
        </kbd>
      </button>

      {/* Account */}
      <AccountMenu />
    </aside>
  )
}

function NavItem({
  icon: Icon, path, label, active,
}: {
  icon: typeof Home
  path: string
  label: string
  active: boolean
}) {
  return (
    <Link
      href={path}
      title={label}
      aria-current={active ? 'page' : undefined}
      className={`
        relative flex items-center gap-3 px-3 py-2.5 rounded-lg
        transition-colors duration-150 whitespace-nowrap btn-press
        ${active
          ? 'text-accent-blue bg-accent-blue/12'
          : 'text-ink-secondary hover:text-ink-primary hover:bg-elevated/70'
        }
      `}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent-blue rounded-r-full shadow-glow-blue" />
      )}
      <Icon size={18} className="shrink-0" strokeWidth={active ? 2.4 : 2} />
      <span className="
        font-display text-[12px] tracking-[0.18em] font-semibold
        overflow-hidden whitespace-nowrap
        max-w-0 group-hover:max-w-[140px]
        opacity-0 group-hover:opacity-100
        transition-all duration-200 ease-out
      ">
        {label}
      </span>
    </Link>
  )
}
