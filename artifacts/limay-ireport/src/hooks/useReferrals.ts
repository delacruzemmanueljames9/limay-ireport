import { useState, useEffect, useCallback, useRef } from 'react'
import { dbGet, dbUpdate } from '@/lib/api'
import type { Referral } from '@/types'

const REFERRAL_SELECT =
  '*,from_office:offices!referrals_from_office_id_fkey(*),to_office:offices!referrals_to_office_id_fkey(*),case:cases(*)'

export function useReferrals(officeId?: string) {
  const [sent, setSent] = useState<Referral[]>([])
  const [received, setReceived] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [pulse, setPulse] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    if (!officeId) { setLoading(false); return }
    setLoading(true)

    const sentParams = new URLSearchParams({
      select: REFERRAL_SELECT,
      from_office_id: `eq.${officeId}`,
      order: 'created_at.desc',
    })
    const receivedParams = new URLSearchParams({
      select: REFERRAL_SELECT,
      to_office_id: `eq.${officeId}`,
      order: 'created_at.desc',
    })

    const [sentRes, receivedRes] = await Promise.all([
      dbGet<Referral[]>('referrals', sentParams),
      dbGet<Referral[]>('referrals', receivedParams),
    ])

    setSent(sentRes.data ?? [])
    setReceived(receivedRes.data ?? [])
    setLoading(false)
  }, [officeId])

  useEffect(() => {
    load()

    if (!officeId) return

    intervalRef.current = setInterval(() => {
      setPulse(true)
      load()
      setTimeout(() => setPulse(false), 1200)
    }, 30_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [officeId, load])

  async function updateStatus(referralId: string, status: string) {
    const body: Record<string, unknown> = { status }
    if (status === 'received') body['received_at'] = new Date().toISOString()
    const { error } = await dbUpdate(
      'referrals',
      new URLSearchParams({ id: `eq.${referralId}` }),
      body
    )
    if (!error) load()
    return { error }
  }

  return { sent, received, loading, pulse, reload: load, updateStatus }
}
