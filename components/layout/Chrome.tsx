'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import PageTransition from './PageTransition'
import NotificationBootstrap from './NotificationBootstrap'

const BARE_PATHS = ['/login', '/auth', '/onboarding']

export default function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const bare = BARE_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (bare) {
    return <main className="relative z-10 min-h-screen">{children}</main>
  }

  return (
    <>
      <NotificationBootstrap />
      <Sidebar />
      <MobileNav />
      <main className="ml-0 md:ml-16 pb-16 md:pb-0 relative z-10">
        <PageTransition>{children}</PageTransition>
      </main>
    </>
  )
}
