'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Check } from 'lucide-react'
import { createClient as createSupabase } from '@/lib/supabase/client'
import LoadingScreen from '@/components/ui/LoadingScreen'

interface ClientDraft {
  id: string
  key: string
  label: string
  color: string
  revenue: number
  script_target: number
  edit_target: number
}

const STEPS = ['WELCOME', 'PROFILE', 'MODES', 'CLIENTS', 'READY'] as const
type Step = typeof STEPS[number]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('WELCOME')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [revenueGoal, setRevenueGoal] = useState(0)
  const [clients, setClients] = useState<ClientDraft[]>([])

  useEffect(() => {
    (async () => {
      const supabase = createSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const [profileRes, clientsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('clients').select('*').eq('archived', false).order('sort_order'),
      ])

      if (profileRes.data) {
        setDisplayName(profileRes.data.display_name ?? user.email?.split('@')[0] ?? '')
        setRevenueGoal(profileRes.data.revenue_goal)
      }
      if (clientsRes.data) {
        setClients(clientsRes.data.map(c => ({
          id: c.id, key: c.key, label: c.label, color: c.color,
          revenue: c.revenue, script_target: c.script_target, edit_target: c.edit_target,
        })))
      }
      setLoaded(true)
    })()
  }, [router])

  const stepIndex = STEPS.indexOf(step)

  function goNext() {
    const next = STEPS[stepIndex + 1]
    if (next) setStep(next)
  }
  function goBack() {
    const prev = STEPS[stepIndex - 1]
    if (prev) setStep(prev)
  }

  async function saveProfile() {
    const supabase = createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      display_name: displayName.trim() || null,
      revenue_goal: Math.max(0, revenueGoal),
    }).eq('id', user.id)
  }

  async function saveClient(c: ClientDraft) {
    const supabase = createSupabase()
    await supabase.from('clients').update({
      label: c.label,
      revenue: c.revenue,
      script_target: c.script_target,
      edit_target: c.edit_target,
    }).eq('id', c.id)
  }

  async function complete() {
    setSaving(true)
    const supabase = createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    await saveProfile()
    await Promise.all(clients.map(saveClient))
    await supabase.from('profiles').update({ onboarded: true }).eq('id', user.id)
    router.replace('/today')
  }

  if (!loaded) return <LoadingScreen label="PREPARING" />

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-0.5 flex-1 rounded-full transition-all duration-500
              ${i <= stepIndex ? 'bg-accent-blue' : 'bg-elevated'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {step === 'WELCOME' && <WelcomeStep onNext={goNext} />}
            {step === 'PROFILE' && (
              <ProfileStep
                displayName={displayName}
                revenueGoal={revenueGoal}
                onDisplayName={setDisplayName}
                onRevenueGoal={setRevenueGoal}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step === 'MODES' && <ModesStep onNext={goNext} onBack={goBack} />}
            {step === 'CLIENTS' && (
              <ClientsStep
                clients={clients}
                onChange={setClients}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step === 'READY' && (
              <ReadyStep
                displayName={displayName}
                onFinish={complete}
                onBack={goBack}
                saving={saving}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ══ WELCOME ══════════════════════════════════════════════════════════ */
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <p className="font-display text-[10px] tracking-[0.3em] text-accent-blue">ALVIN OS · v3</p>
      <h1 className="font-display text-3xl md:text-4xl text-ink-primary tracking-wider">
        歡迎進入頂級生活系統
      </h1>
      <p className="font-body text-sm text-ink-secondary leading-relaxed max-w-md mx-auto">
        這是一個為你量身打造的私人作戰室：<br />
        管理接案、內容創作、學習、每日執行。<br />
        花 2 分鐘做個基本設定，然後就能上線。
      </p>
      <button
        onClick={onNext}
        className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-accent-blue/15 text-accent-blue rounded-lg
          border border-accent-blue/30 hover:bg-accent-blue/25 transition-all font-display text-xs tracking-widest"
      >
        開始設定 <ChevronRight size={14} />
      </button>
    </div>
  )
}

/* ══ PROFILE ══════════════════════════════════════════════════════════ */
function ProfileStep({
  displayName, revenueGoal, onDisplayName, onRevenueGoal, onNext, onBack,
}: {
  displayName: string
  revenueGoal: number
  onDisplayName: (v: string) => void
  onRevenueGoal: (v: number) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-display text-[10px] tracking-[0.3em] text-ink-muted mb-2">STEP 1 / 4</p>
        <h2 className="font-display text-2xl text-ink-primary tracking-wider">設定你的身份</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block font-display text-[10px] tracking-widest text-ink-secondary uppercase mb-2">
            顯示名稱
          </label>
          <input
            value={displayName}
            onChange={e => onDisplayName(e.target.value)}
            placeholder="Alvin"
            className="w-full bg-card border border-border-subtle rounded-lg px-4 py-3 text-sm
              text-ink-primary font-body outline-none focus:border-accent-blue/50 transition-colors
              placeholder:text-ink-muted"
          />
        </div>

        <div>
          <label className="block font-display text-[10px] tracking-widest text-ink-secondary uppercase mb-2">
            每月總收入目標（NT$）
          </label>
          <input
            type="number"
            value={revenueGoal || ''}
            onChange={e => onRevenueGoal(Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="67500"
            className="w-full bg-card border border-border-subtle rounded-lg px-4 py-3 text-sm
              text-ink-primary font-mono outline-none focus:border-accent-blue/50 transition-colors
              placeholder:text-ink-muted"
          />
          <p className="mt-2 text-[10px] text-ink-muted font-body">
            之後可以在 Settings 修改，每個客戶的分項目標也在那邊設。
          </p>
        </div>
      </div>

      <StepFooter onBack={onBack} onNext={onNext} />
    </div>
  )
}

/* ══ MODES ═══════════════════════════════════════════════════════════ */
function ModesStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const MODES = [
    { emoji: '⚡', label: 'NORMAL', desc: '一般工作日，看得到所有區塊' },
    { emoji: '🔥', label: 'COMBAT', desc: '專注接案、隱藏 Social / Growth' },
    { emoji: '📍', label: 'FIELD', desc: '外拍日，只顯示拍攝檢查清單' },
  ]
  return (
    <div className="space-y-6">
      <div>
        <p className="font-display text-[10px] tracking-[0.3em] text-ink-muted mb-2">STEP 2 / 4</p>
        <h2 className="font-display text-2xl text-ink-primary tracking-wider">三種工作模式</h2>
        <p className="mt-2 text-xs text-ink-secondary font-body">
          每天在 Today 頁面切換，UI 會依模式自動簡化。
        </p>
      </div>

      <div className="space-y-2">
        {MODES.map(m => (
          <div key={m.label} className="bg-card border border-border-subtle rounded-xl px-4 py-3 flex items-center gap-4">
            <span className="text-2xl">{m.emoji}</span>
            <div>
              <p className="font-display text-xs tracking-widest text-ink-primary">{m.label}</p>
              <p className="font-body text-xs text-ink-secondary mt-0.5">{m.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <StepFooter onBack={onBack} onNext={onNext} />
    </div>
  )
}

/* ══ CLIENTS ═════════════════════════════════════════════════════════ */
function ClientsStep({
  clients, onChange, onNext, onBack,
}: {
  clients: ClientDraft[]
  onChange: (c: ClientDraft[]) => void
  onNext: () => void
  onBack: () => void
}) {
  function update(id: string, patch: Partial<ClientDraft>) {
    onChange(clients.map(c => c.id === id ? { ...c, ...patch } : c))
  }
  const total = clients.reduce((sum, c) => sum + c.revenue, 0)

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display text-[10px] tracking-[0.3em] text-ink-muted mb-2">STEP 3 / 4</p>
        <h2 className="font-display text-2xl text-ink-primary tracking-wider">接案客戶</h2>
        <p className="mt-2 text-xs text-ink-secondary font-body">
          已預設 4 個客戶。現在可以調整名稱和月目標，或之後在 Settings 改。
        </p>
      </div>

      <div className="space-y-2">
        {clients.map(c => (
          <div key={c.id} className="bg-card border border-border-subtle rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <input
                value={c.label}
                onChange={e => update(c.id, { label: e.target.value })}
                className="flex-1 bg-transparent text-sm text-ink-primary font-body outline-none border-b border-dashed border-ink-muted/20 focus:border-accent-blue/50 transition-colors"
              />
              <span className="text-[10px] font-mono text-ink-muted">{c.key}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <ClientField label="收入" value={c.revenue} prefix="NT$"
                onChange={v => update(c.id, { revenue: v })} />
              <ClientField label="腳本" value={c.script_target} suffix="支"
                onChange={v => update(c.id, { script_target: v })} />
              <ClientField label="剪輯" value={c.edit_target} suffix="支"
                onChange={v => update(c.id, { edit_target: v })} />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs font-body text-ink-secondary text-center">
        月目標總額：<span className="font-mono text-accent-gold">NT$ {total.toLocaleString()}</span>
      </p>

      <StepFooter onBack={onBack} onNext={onNext} />
    </div>
  )
}

function ClientField({
  label, value, prefix, suffix, onChange,
}: {
  label: string
  value: number
  prefix?: string
  suffix?: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <p className="font-display text-[9px] tracking-wider text-ink-muted uppercase mb-1">{label}</p>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-[10px] text-ink-muted">{prefix}</span>}
        <input
          type="number"
          value={value || ''}
          onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-full bg-void border border-border-subtle rounded px-2 py-1 text-xs text-ink-primary font-mono outline-none focus:border-accent-blue/50"
        />
        {suffix && <span className="text-[10px] text-ink-muted">{suffix}</span>}
      </div>
    </div>
  )
}

/* ══ READY ═══════════════════════════════════════════════════════════ */
function ReadyStep({
  displayName, onFinish, onBack, saving,
}: {
  displayName: string
  onFinish: () => void
  onBack: () => void
  saving: boolean
}) {
  return (
    <div className="text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-green/15 border border-accent-green/40"
      >
        <Check size={32} className="text-accent-green" />
      </motion.div>
      <h2 className="font-display text-2xl text-ink-primary tracking-wider">
        {displayName || '朋友'}，系統準備完成
      </h2>
      <p className="font-body text-sm text-ink-secondary leading-relaxed max-w-md mx-auto">
        所有資料已就定位。<br />
        你可以隨時回到 Settings 調整任何設定。
      </p>
      <div className="flex items-center justify-center gap-3 pt-4">
        <button
          onClick={onBack}
          disabled={saving}
          className="px-4 py-2.5 text-xs text-ink-muted hover:text-ink-primary transition-colors font-body disabled:opacity-40"
        >
          返回
        </button>
        <button
          onClick={onFinish}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent-green/15 text-accent-green rounded-lg
            border border-accent-green/30 hover:bg-accent-green/25 transition-all font-display text-xs tracking-widest
            disabled:opacity-50"
        >
          {saving ? '啟動中...' : '進入系統'}
          {!saving && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  )
}

/* ══ Shared Footer ══ */
function StepFooter({ onBack, onNext, nextLabel = '下一步' }: {
  onBack: () => void
  onNext: () => void
  nextLabel?: string
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      <button
        onClick={onBack}
        className="px-4 py-2 text-xs text-ink-muted hover:text-ink-primary transition-colors font-body"
      >
        返回
      </button>
      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-blue/15 text-accent-blue rounded-lg
          border border-accent-blue/30 hover:bg-accent-blue/25 transition-all font-display text-xs tracking-widest"
      >
        {nextLabel} <ChevronRight size={14} />
      </button>
    </div>
  )
}
