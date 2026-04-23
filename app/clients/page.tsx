'use client'
import { useEffect } from 'react'
import { motion, type MotionProps } from 'framer-motion'
import { useClientStore } from '@/stores/useClientStore'
import RevenueBoard from '@/components/clients/RevenueBoard'
import OutputTracker from '@/components/clients/OutputTracker'
import FieldTrips from '@/components/clients/FieldTrips'
import DeadlineAlert from '@/components/clients/DeadlineAlert'
import LoadingScreen from '@/components/ui/LoadingScreen'

const fadeUp = (delay: number): MotionProps => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: 'easeOut' },
})

export default function ClientsPage() {
  const loadAll = useClientStore(s => s.loadAll)
  const loaded = useClientStore(s => s.loaded)

  useEffect(() => { loadAll() }, [loadAll])

  if (!loaded) return <LoadingScreen label="SYNCING CLIENTS" />

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 space-y-8 pb-24">
      <motion.div {...fadeUp(0)}>
        <div className="mb-4">
          <p className="font-display text-[10px] tracking-[0.3em] text-ink-muted mb-1">CLIENT COMMAND CENTER</p>
          <h1 className="font-display text-2xl md:text-3xl text-ink-primary tracking-wider">接案營運中樞</h1>
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.05)}>
        <RevenueBoard />
      </motion.div>

      <motion.div {...fadeUp(0.1)}>
        <OutputTracker />
      </motion.div>

      <motion.div {...fadeUp(0.15)}>
        <FieldTrips />
      </motion.div>

      <motion.div {...fadeUp(0.2)}>
        <DeadlineAlert />
      </motion.div>
    </div>
  )
}
