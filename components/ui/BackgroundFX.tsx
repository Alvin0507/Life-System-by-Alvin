'use client'
import { useEffect, useState } from 'react'
import { useTodayStore } from '@/stores/useTodayStore'

const MODE_TINT: Record<string, { a: string; b: string; c: string }> = {
  normal: { a: '#00d4ff', b: '#ffd700', c: '#7c3aed' },
  combat: { a: '#ff3860', b: '#ff8c42', c: '#00d4ff' },
  field:  { a: '#ffd700', b: '#ff8c42', c: '#00ff88' },
}

export default function BackgroundFX() {
  const dayMode = useTodayStore(s => s.dayMode)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const tint = MODE_TINT[mounted ? dayMode : 'normal'] ?? MODE_TINT.normal

  return (
    <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Base radial gradient for depth */}
      <div
        className="absolute inset-0 transition-[background] duration-1000"
        style={{
          background: `radial-gradient(ellipse at 20% 0%, ${tint.a}15 0%, transparent 45%),
                       radial-gradient(ellipse at 80% 100%, ${tint.b}12 0%, transparent 50%),
                       radial-gradient(ellipse at 50% 50%, ${tint.c}08 0%, transparent 60%)`,
        }}
      />

      {/* Floating orb 1 */}
      <div
        className="absolute rounded-full blur-3xl opacity-30 transition-[background] duration-1000"
        style={{
          width: 560, height: 560,
          background: `radial-gradient(circle, ${tint.a}22 0%, transparent 70%)`,
          top: '-10%', left: '-8%',
          animation: 'orb-drift-1 26s ease-in-out infinite',
        }}
      />
      {/* Floating orb 2 */}
      <div
        className="absolute rounded-full blur-3xl opacity-25 transition-[background] duration-1000"
        style={{
          width: 480, height: 480,
          background: `radial-gradient(circle, ${tint.b}20 0%, transparent 70%)`,
          bottom: '-12%', right: '-10%',
          animation: 'orb-drift-2 32s ease-in-out infinite',
        }}
      />
      {/* Floating orb 3 */}
      <div
        className="absolute rounded-full blur-3xl opacity-20 transition-[background] duration-1000"
        style={{
          width: 380, height: 380,
          background: `radial-gradient(circle, ${tint.c}1c 0%, transparent 70%)`,
          top: '45%', left: '55%',
          animation: 'orb-drift-3 38s ease-in-out infinite',
        }}
      />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,5,8,0.55) 100%)',
        }}
      />
    </div>
  )
}
