'use client'

const PENDING_ACTIONS = new Map<string, number>()

export function markMyAction(id: string, ttlMs = 3000) {
  const expires = Date.now() + ttlMs
  PENDING_ACTIONS.set(id, expires)
  setTimeout(() => {
    if (PENDING_ACTIONS.get(id) === expires) PENDING_ACTIONS.delete(id)
  }, ttlMs + 50)
}

export function isMyRecentAction(id: string): boolean {
  const exp = PENDING_ACTIONS.get(id)
  if (!exp) return false
  if (Date.now() > exp) {
    PENDING_ACTIONS.delete(id)
    return false
  }
  return true
}

export function getNotifyPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function ensureNotifyPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission()
    return result
  }
  return Notification.permission
}

export function notify(title: string, body: string, opts?: { silent?: boolean; tag?: string }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, silent: opts?.silent ?? false, tag: opts?.tag })
  } catch {
    /* ignore */
  }
  if (!opts?.silent) playDing()
}

let _audioCtx: AudioContext | null = null
export function playDing() {
  if (typeof window === 'undefined') return
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    if (!_audioCtx) _audioCtx = new Ctx()
    const ctx = _audioCtx
    if (ctx.state === 'suspended') ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)
    osc.start(now)
    osc.stop(now + 0.34)
  } catch {
    /* ignore */
  }
}
