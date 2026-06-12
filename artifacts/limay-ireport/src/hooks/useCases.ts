import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Case, Victim, Respondent, CaseNarrative, CaseAttachment, CaseStatusLog } from '@/types'

export interface CaseFilters {
  search?: string
  case_type?: string
  status?: string
  priority_level?: string
  page?: number
}

export function useCases(filters: CaseFilters = {}) {
  const [cases, setCases] = useState<Case[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pageSize = 10
  const page = filters.page ?? 1

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      let query = supabase
        .from('cases')
        .select('*, filed_by_office:offices!cases_filed_by_office_id_fkey(*), assigned_to_office:offices!cases_assigned_to_office_id_fkey(*)', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (filters.case_type) query = query.eq('case_type', filters.case_type)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.priority_level) query = query.eq('priority_level', filters.priority_level)

      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1)

      const { data, error: err, count } = await query
      if (err) {
        setError(err.message)
      } else {
        setCases((data ?? []) as Case[])
        setTotal(count ?? 0)
      }
      setLoading(false)
    }
    fetch()
  }, [filters.case_type, filters.status, filters.priority_level, page])

  return { cases, total, loading, error, pageSize }
}

export function useCase(id: string | null) {
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [victims, setVictims] = useState<Victim[]>([])
  const [respondents, setRespondents] = useState<Respondent[]>([])
  const [narratives, setNarratives] = useState<CaseNarrative[]>([])
  const [attachments, setAttachments] = useState<CaseAttachment[]>([])
  const [statusLogs, setStatusLogs] = useState<CaseStatusLog[]>([])
  const [loading, setLoading] = useState(true)

  const loadCase = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [caseRes, victimsRes, respondentsRes, narrativesRes, attachmentsRes, logsRes] = await Promise.all([
      supabase.from('cases').select('*, filed_by_office:offices!cases_filed_by_office_id_fkey(*), assigned_to_office:offices!cases_assigned_to_office_id_fkey(*)').eq('id', id).single(),
      supabase.from('victims').select('*').eq('case_id', id),
      supabase.from('respondents').select('*').eq('case_id', id),
      supabase.from('case_narratives').select('*').eq('case_id', id).order('created_at'),
      supabase.from('case_attachments').select('*').eq('case_id', id).order('created_at'),
      supabase.from('case_status_logs').select('*').eq('case_id', id).order('created_at'),
    ])
    if (caseRes.data) setCaseData(caseRes.data as Case)
    setVictims((victimsRes.data ?? []) as Victim[])
    setRespondents((respondentsRes.data ?? []) as Respondent[])
    setNarratives((narrativesRes.data ?? []) as CaseNarrative[])
    setAttachments((attachmentsRes.data ?? []) as CaseAttachment[])
    setStatusLogs((logsRes.data ?? []) as CaseStatusLog[])
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadCase()

    if (!id) return
    const channel = supabase
      .channel(`case-detail-realtime-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases', filter: `id=eq.${id}` }, () => loadCase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'case_status_logs', filter: `case_id=eq.${id}` }, () => loadCase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'case_narratives', filter: `case_id=eq.${id}` }, () => loadCase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'case_attachments', filter: `case_id=eq.${id}` }, () => loadCase())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, loadCase])

  return { caseData, victims, respondents, narratives, attachments, statusLogs, loading, reload: loadCase }
}

export async function updateCaseStatus(
  caseId: string,
  oldStatus: string,
  newStatus: string,
  userId: string,
  notes?: string
) {
  const { error: caseError } = await supabase
    .from('cases')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', caseId)
  if (caseError) return { error: caseError.message }

  const { error: logError } = await supabase.from('case_status_logs').insert({
    case_id: caseId,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by_user_id: userId,
    notes,
  })
  if (logError) return { error: logError.message }
  return { error: null }
}

export async function createReferralForCase(
  caseId: string,
  fromOfficeId: string,
  toOfficeId: string,
  reason: string,
  userId: string
) {
  const { data: referral, error } = await supabase.from('referrals').insert({
    case_id: caseId,
    from_office_id: fromOfficeId,
    to_office_id: toOfficeId,
    referral_reason: reason,
  }).select().single()
  if (error) return { error: error.message }

  await supabase.from('notifications').insert({
    recipient_office_id: toOfficeId,
    case_id: caseId,
    message: `New referral received for case`,
    type: 'referral_received',
  })

  await supabase.from('cases').update({ status: 'referred', updated_at: new Date().toISOString() }).eq('id', caseId)
  await supabase.from('case_status_logs').insert({
    case_id: caseId,
    old_status: 'open',
    new_status: 'referred',
    changed_by_user_id: userId,
    notes: `Referred to office`,
  })

  return { error: null, referral }
}
