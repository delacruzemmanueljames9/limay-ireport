import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Referral } from '@/types'

export function useReferrals(officeId?: string) {
  const [sent, setSent] = useState<Referral[]>([])
  const [received, setReceived] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [pulse, setPulse] = useState(false)

  const load = useCallback(async () => {
    if (!officeId) { setLoading(false); return }
    setLoading(true)
    const [sentRes, receivedRes] = await Promise.all([
      supabase
        .from('referrals')
        .select('*, from_office:offices!referrals_from_office_id_fkey(*), to_office:offices!referrals_to_office_id_fkey(*), case:cases(*)')
        .eq('from_office_id', officeId)
        .order('created_at', { ascending: false }),
      supabase
        .from('referrals')
        .select('*, from_office:offices!referrals_from_office_id_fkey(*), to_office:offices!referrals_to_office_id_fkey(*), case:cases(*)')
        .eq('to_office_id', officeId)
        .order('created_at', { ascending: false }),
    ])
    setSent((sentRes.data ?? []) as Referral[])
    setReceived((receivedRes.data ?? []) as Referral[])
    setLoading(false)
  }, [officeId])

  useEffect(() => {
    load()

    if (!officeId) return
    const channel = supabase
      .channel(`referrals-realtime-${officeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => {
        setPulse(true)
        load()
        setTimeout(() => setPulse(false), 1200)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [officeId, load])

  async function updateStatus(referralId: string, status: string) {
    const updateData: Record<string, string> = { status }
    if (status === 'received') updateData['received_at'] = new Date().toISOString()
    const { error } = await supabase.from('referrals').update(updateData).eq('id', referralId)
    if (!error) load()
    return { error: error?.message ?? null }
  }

  return { sent, received, loading, pulse, reload: load, updateStatus }
}
