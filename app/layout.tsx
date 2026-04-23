import type { Metadata } from 'next'
import { Orbitron, JetBrains_Mono, Noto_Sans_TC } from 'next/font/google'
import './globals.css'
import Chrome from '@/components/layout/Chrome'
import Toast from '@/components/ui/Toast'
import ParticleBlast from '@/components/ui/ParticleBlast'
import BackgroundFX from '@/components/ui/BackgroundFX'

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-display',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
})

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Alvin OS',
  description: 'Personal Life Management System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-TW"
      className={`h-full ${orbitron.variable} ${jetbrainsMono.variable} ${notoSansTC.variable}`}
    >
      <body className="h-full text-ink-primary">
        <BackgroundFX />
        <Chrome>{children}</Chrome>
        <Toast />
        <ParticleBlast />
      </body>
    </html>
  )
}
