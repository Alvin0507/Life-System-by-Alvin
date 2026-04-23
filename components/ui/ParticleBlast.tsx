'use client'
import { useEffect, useRef } from 'react'
import { useAppStore } from '@/stores/useAppStore'

interface Particle {
  x: number; y: number
  vx: number; vy: number
  size: number; color: string; alpha: number
}

const COLORS = ['#00d4ff', '#ffd700', '#00ff88', '#ff8c42', '#ffffff']

export default function ParticleBlast() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const celebrationActive = useAppStore((s) => s.celebrationActive)

  useEffect(() => {
    if (!celebrationActive) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const cx = canvas.width / 2
    const cy = canvas.height * 0.45

    const particles: Particle[] = Array.from({ length: 140 }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 14 + 3
      return {
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: Math.random() * 4 + 1.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 1,
      }
    })

    let rafId: number

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const p of particles) {
        p.vy += 0.28
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.alpha -= 0.016
        if (p.alpha <= 0) continue
        alive = true
        ctx.globalAlpha = p.alpha
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (alive) rafId = requestAnimationFrame(draw)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [celebrationActive])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999 }}
    />
  )
}
