import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, Link } from 'wouter'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { dbGet } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { CASE_TYPE_LABELS, CASE_STATUS_LABELS, PRIORITY_LABELS } from '@/types'
import type { Case, CaseType, CaseStatus, PriorityLevel, Victim } from '@/types'

const STATUS_BADGE: Record<CaseStatus, string> = {
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  ongoing: 'bg-amber-100 text-amber-700 border-amber-200',
  resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  referred: 'bg-purple-100 text-purple-700 border-purple-200',
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
}

const PRIORITY_BADGE: Record<PriorityLevel, string> = {
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
}

const PAGE_SIZE = 10

interface CaseRow extends Case {
  victim_name?: string
}

export default function CasesPage() {
  const { profile } = useAuth()
  const [, setLocation] = useLocation()
  const [cases, setCases] = useState<CaseRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [pulse, setPulse] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isEncoder = profile?.role === 'encoder' && !!profile.office_id

  const load = useCallback(async () => {
    setLoading(true)

    const params = new URLSearchParams()
    params.set('select', '*,filed_by_office:offices!cases_filed_by_office_id_fkey(name)')
    params.set('order', 'created_at.desc')
    params.set('offset', String((page - 1) * PAGE_SIZE))
    params.set('limit', String(PAGE_SIZE))
    if (filterType !== 'all') params.set('case_type', `eq.${filterType}`)
    if (filterStatus !== 'all') params.set('status', `eq.${filterStatus}`)
    if (filterPriority !== 'all') params.set('priority_level', `eq.${filterPriority}`)
    if (isEncoder) {
      params.set('or', `(filed_by_office_id.eq.${profile!.office_id},assigned_to_office_id.eq.${profile!.office_id})`)
    }

    const { data, count, error } = await dbGet<Case[]>('cases', params, true)
    if (!error && data) {
      const caseList = data
      const caseIds = caseList.map(c => c.id)

      let victimMap: Record<string, string> = {}
      if (caseIds.length > 0) {
        const vParams = new URLSearchParams()
        vParams.set('select', 'case_id,last_name,first_name')
        vParams.set('case_id', `in.(${caseIds.join(',')})`)
        const { data: victims } = await dbGet<Pick<Victim, 'case_id' | 'last_name' | 'first_name'>[]>('victims', vParams)
        ;(victims ?? []).forEach(v => {
          if (!victimMap[v.case_id]) victimMap[v.case_id] = `${v.last_name}, ${v.first_name}`
        })
      }

      setCases(caseList.map(c => ({ ...c, victim_name: victimMap[c.id] })))
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [filterType, filterStatus, filterPriority, page, isEncoder, profile?.office_id])

  useEffect(() => {
    load()

    intervalRef.current = setInterval(() => {
      setPulse(true)
      load()
      setTimeout(() => setPulse(false), 1200)
    }, 30_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const canWrite = profile?.role !== 'viewer'

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cases / Kaso</h1>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {total} case{total !== 1 ? 's' : ''} found
                {isEncoder && profile?.office?.name ? ` — ${profile.office.name}` : ''}
              </p>
              <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium" data-testid="cases-live-indicator">
                <span className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${pulse ? 'animate-ping' : 'animate-pulse'}`} />
                LIVE
              </div>
            </div>
          </div>
          {canWrite && (
            <Button asChild data-testid="button-new-case">
              <Link href="/cases/new">
                <Plus className="h-4 w-4 mr-1" /> New Case
              </Link>
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1) }}>
                <SelectTrigger className="w-36" data-testid="select-filter-type">
                  <SelectValue placeholder="Case Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(CASE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1) }}>
                <SelectTrigger className="w-36" data-testid="select-filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={v => { setFilterPriority(v); setPage(1) }}>
                <SelectTrigger className="w-36" data-testid="select-filter-priority">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Case No.</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Victim / Biktima</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Priority</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Filed By</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date Filed</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      Walang datos / No cases found
                    </td>
                  </tr>
                ) : (
                  cases.map(c => (
                    <tr
                      key={c.id}
                      className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/cases/${c.id}`)}
                      data-testid={`row-case-${c.id}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium text-primary">
                        {c.case_number ?? '—'}
                      </td>
                      <td className="px-4 py-3">{CASE_TYPE_LABELS[c.case_type as CaseType]}</td>
                      <td className="px-4 py-3">{c.victim_name ?? <span className="text-muted-foreground italic">Unknown</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[c.status]}`}>
                          {CASE_STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_BADGE[c.priority_level]}`}>
                          {PRIORITY_LABELS[c.priority_level]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {(c as any).filed_by_office?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(c.date_filed).toLocaleDateString('en-PH')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1} data-testid="button-prev-page">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages} data-testid="button-next-page">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}
