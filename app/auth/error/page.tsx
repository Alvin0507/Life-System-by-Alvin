'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

const MESSAGES: Record<string, { title: string; body: string }> = {
  'not-invited': {
    title: '尚未受邀',
    body: '你的帳號還不在白名單內。請聯絡系統管理員取得存取權限。',
  },
  'no-code': {
    title: '登入流程中斷',
    body: 'OAuth 回傳缺少授權碼。請重新嘗試登入。',
  },
}

function ErrorContent() {
  const params = useSearchParams()
  const reason = params.get('reason') || ''
  const preset = MESSAGES[reason]
  const title = preset?.title ?? '登入失敗'
  const body = preset?.body ?? reason ?? '未知錯誤，請稍後再試。'

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-card/80 backdrop-blur-sm border border-accent-red/30 rounded-2xl p-8 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-accent-red/10 border border-accent-red/30 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-accent-red" />
        </div>
        <h1 className="font-display text-accent-red text-lg tracking-widest mb-2">
          {title}
        </h1>
        <p className="font-body text-sm text-ink-secondary leading-relaxed mb-6">
          {body}
        </p>
        <Link
          href="/login"
          className="inline-block font-display text-xs tracking-[0.2em] text-accent-blue hover:text-ink-primary transition-colors"
        >
          ← 回到登入頁
        </Link>
      </motion.div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ErrorContent />
    </Suspense>
  )
}
