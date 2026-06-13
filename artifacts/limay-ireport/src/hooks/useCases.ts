import { useState, useEffect, useCallback } from 'react'
import { dbGet, dbInsert, dbUpdate } from '@/lib/api'
import type { Case, Victim, Respondent, CaseNarrative, CaseAttachment, CaseStatusLog } from '@/types'

export interface CaseFilters {
  search?: string
  case_type?: string
  status?: string
  priority_level?: string
  page?: number
}

const JOINS = '*,filed_by_office:offices!cases_filed_by_office_id_fkey(*),assigned_to_office:offices!cases_assigned_to_office_id_fkey(*)'

export function useCases(filters: CaseFilters = {}) {
  const [cases, setCases] = useState<Case[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pageSize = 10
  const page = filters.page ?? 1

  useEffect(() => {
    async function load() {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('select', JOINS)
      params.set('order', 'created_at.desc')
      params.set('offset', String((page - 1) * pageSize))
      params.set('limit', String(pageSize))
      if (filters.case_type) params.set('case_type', `eq.${filters.case_type}`)
      if (filters.status) params.set('status', `eq.${filters.status}`)
      if (filters.priority_level) params.set('priority_level', `eq.${filters.priority_level}`)

      const { data, count, error: err } = await dbGet<Case[]>('cases', params, true)
      if (err) {
        setError(err)
      } else {
        setCases(data ?? [])
        setTotal(count ?? 0)
      }
      setLoading(false)
    }
    load()
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

    const caseParams = new URLSearchParams({ select: JOINS, id: `eq.${id}` })
    const victimsParams = new URLSearchParams({ select: '*', case_id: `eq.${id}` })
    const respondentsParams = new URLSearchParams({ select: '*', case_id: `eq.${id}` })
    const narrativesParams = new URLSearchParams({ select: '*', case_id: `eq.${id}`, order: 'created_at.asc' })
    const attachmentsParams = new URLSearchParams({ select: '*', case_id: `eq.${id}`, order: 'created_at.asc' })
    const logsParams = new URLSearchParams({ select: '*', case_id: `eq.${id}`, order: 'created_at.asc' })

    const [caseRes, victimsRes, respondentsRes, narrativesRes, attachmentsRes, logsRes] = await Promise.all([
      dbGet<Case[]>('cases', caseParams),
      dbGet<Victim[]>('victims', victimsParams),
      dbGet<Respondent[]>('respondents', respondentsParams),
      dbGet<CaseNarrative[]>('case_narratives', narrativesParams),
      dbGet<CaseAttachment[]>('case_attachments', attachmentsParams),
      dbGet<CaseStatusLog[]>('case_status_logs', logsParams),
    ])

    setCaseData((caseRes.data ?? [])[0] ?? null)
    setVictims(victimsRes.data ?? [])
    setRespondents(respondentsRes.data ?? [])
    setNarratives(narrativesRes.data ?? [])
    setAttachments(attachmentsRes.data ?? [])
    setStatusLogs(logsRes.data ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadCase()
  }, [loadCase])

  return { caseData, victims, respondents, narratives, attachments, statusLogs, loading, reload: loadCase }
}

export async function updateCaseStatus(
  caseId: string,
  oldStatus: string,
  newStatus: string,
  userId: string,
  notes?: string
) {
  const { error: caseError } = await dbUpdate(
    'cases',
    new URLSearchParams({ id: `eq.${caseId}` }),
    { status: newStatus, updated_at: new Date().toISOString() }
  )
  if (caseError) return { error: caseError }

  const { error: logError } = await dbInsert('case_status_logs', {
    case_id: caseId,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by_user_id: userId,
    notes: notes ?? null,
  })
  if (logError) return { error: logError }
  return { error: null }
}

export async function createReferralForCase(
  caseId: string,
  fromOfficeId: string,
  toOfficeId: string,
  reason: string,
  userId: string
) {
  const { data: referralArr, error } = await dbInsert<{ id: string }[]>('referrals', {
    case_id: caseId,
    from_office_id: fromOfficeId,
    to_office_id: toOfficeId,
    referral_reason: reason,
  })
  if (error) return { error, referral: null }
  const referral = referralArr?.[0] ?? null

  await dbInsert('notifications', {
    recipient_office_id: toOfficeId,
    case_id: caseId,
    message: 'New referral received for case',
    type: 'referral_received',
  })

  await dbUpdate(
    'cases',
    new URLSearchParams({ id: `eq.${caseId}` }),
    { status: 'referred', updated_at: new Date().toISOString() }
  )

  await dbInsert('case_status_logs', {
    case_id: caseId,
    old_status: 'open',
    new_status: 'referred',
    changed_by_user_id: userId,
    notes: 'Referred to office',
  })

  return { error: null, referral }
}
