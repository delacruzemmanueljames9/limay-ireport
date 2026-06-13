import { useState } from 'react'
import { useParams, useLocation } from 'wouter'
import { storageSignedUrl, dbDelete } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useCase, updateCaseStatus, createReferralForCase } from '@/hooks/useCases'
import { useOffices } from '@/hooks/useOffices'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Printer, ArrowLeftRight, ChevronLeft, Download, Clock, FileText, User, Users, Trash2, Lock } from 'lucide-react'
import { CASE_TYPE_LABELS, CASE_STATUS_LABELS, PRIORITY_LABELS } from '@/types'
import type { CaseStatus, PriorityLevel } from '@/types'

const CONFIDENTIAL_CODE = 'open25'

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

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium">{value ?? '—'}</span>
    </div>
  )
}

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { profile } = useAuth()
  const { offices } = useOffices()
  const [, setLocation] = useLocation()
  const { caseData, victims, respondents, narratives, attachments, statusLogs, loading, reload } = useCase(id)

  const [statusDialog, setStatusDialog] = useState(false)
  const [referralDialog, setReferralDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [referralOfficeId, setReferralOfficeId] = useState('')
  const [referralReason, setReferralReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Confidential gate
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState('')
  const [confidentialUnlocked, setConfidentialUnlocked] = useState(false)

  const canWrite = profile?.role !== 'viewer'
  const isAdmin = profile?.role === 'super_admin'
  const isLoggedIn = !!profile

  // If confidential and not admin and not unlocked — show gate
  const showConfidentialGate = caseData?.is_confidential && !isAdmin && !isLoggedIn && !confidentialUnlocked

  function handleUnlock() {
    if (codeInput === CONFIDENTIAL_CODE) {
      setConfidentialUnlocked(true)
      setCodeError('')
    } else {
      setCodeError('Invalid code. Please try again.')
    }
  }

  async function handleStatusUpdate() {
    if (!caseData || !profile || !newStatus) return
    setSaving(true)
    const { error } = await updateCaseStatus(caseData.id, caseData.status, newStatus, profile.id, statusNotes)
    setSaving(false)
    if (!error) { setStatusDialog(false); reload() }
  }

  async function handleReferral() {
    if (!caseData || !profile || !referralOfficeId) return
    setSaving(true)
    const { error } = await createReferralForCase(
      caseData.id, profile.office_id ?? '', referralOfficeId, referralReason, profile.id
    )
    setSaving(false)
    if (!error) { setReferralDialog(false); reload() }
  }

  async function handleDelete() {
    if (!caseData) return
    setDeleting(true)
    const p = new URLSearchParams()
    p.set('id', `eq.${caseData.id}`)
    const { error } = await dbDelete('cases', p)
    setDeleting(false)
    if (!error) {
      setDeleteDialog(false)
      setLocation('/cases')
    }
  }

  async function getDownloadUrl(path: string) {
    const { data } = await storageSignedUrl('case-attachments', path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Layout>
    )
  }

  if (!caseData) {
    return (
      <Layout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Case not found.</p>
          <Button variant="link" onClick={() => setLocation('/cases')}>Back to Cases</Button>
        </div>
      </Layout>
    )
  }

  // Confidential Gate Screen
  if (showConfidentialGate) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-20">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Confidential Case / Lihim na Kaso</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This case is marked confidential. Enter the access code to view.
                </p>
              </div>
              <div className="space-y-2 text-left">
                <Label>Access Code / Code ng Pahintulot</Label>
                <Input
                  type="password"
                  placeholder="Enter code..."
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                  autoFocus
                />
                {codeError && <p className="text-xs text-destructive">{codeError}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setLocation('/cases')}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleUnlock}>
                  Unlock / Buksan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  const victim = victims[0]
  const respondent = respondents[0]

  return (
    <Layout>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { font-size: 12px; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6">

        {/* Print Header */}
        <div className="print-only text-center border-b-2 border-gray-800 pb-4 mb-6">
          <p className="text-sm">Republic of the Philippines | Province of Bataan</p>
          <p className="text-xl font-bold">MUNICIPALITY OF LIMAY</p>
          <p className="text-sm">Municipal Hall, Limay, Bataan</p>
          <div className="mt-3">
            <p className="text-base font-bold">LIMAY iREPORT SYSTEM — Case Report</p>
            <p className="text-sm">Case No: {caseData.case_number ?? '—'}</p>
            <p className="text-xs text-gray-500">Printed: {new Date().toLocaleString('en-PH')}</p>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex items-start justify-between flex-wrap gap-3 no-print">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/cases')}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Cases
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground font-mono">{caseData.case_number ?? 'Pending'}</h1>
              <p className="text-sm text-muted-foreground">{CASE_TYPE_LABELS[caseData.case_type]} Case</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canWrite && (
              <>
                <Button variant="outline" size="sm" onClick={() => { setNewStatus(caseData.status); setStatusDialog(true) }}>
                  <Clock className="h-4 w-4 mr-1" /> Update Status
                </Button>
                <Button variant="outline" size="sm" onClick={() => setReferralDialog(true)}>
                  <ArrowLeftRight className="h-4 w-4 mr-1" /> Refer to Office
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
            {isAdmin && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
          </div>
        </div>

        {/* Case Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> Case Information / Impormasyon ng Kaso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Status</span>
                <div className="mt-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[caseData.status]}`}>
                    {CASE_STATUS_LABELS[caseData.status]}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Priority</span>
                <div className="mt-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_BADGE[caseData.priority_level]}`}>
                    {PRIORITY_LABELS[caseData.priority_level]}
                  </span>
                </div>
              </div>
              <InfoRow label="Date Filed" value={new Date(caseData.date_filed).toLocaleDateString('en-PH')} />
              <InfoRow label="Confidential" value={caseData.is_confidential ? 'Yes / Lihim' : 'No'} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoRow label="Case Type" value={CASE_TYPE_LABELS[caseData.case_type]} />
              <InfoRow label="Date of Incident" value={caseData.date_of_incident ? new Date(caseData.date_of_incident).toLocaleDateString('en-PH') : undefined} />
              <InfoRow label="Time of Incident" value={caseData.time_of_incident ?? undefined} />
              <InfoRow label="Filed by Office" value={(caseData.filed_by_office as any)?.name} />
              <InfoRow label="Assigned to Office" value={(caseData.assigned_to_office as any)?.name} />
            </div>
          </CardContent>
        </Card>

        {/* Victim */}
        {victim && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" /> Victim / Biktima
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoRow label="Full Name" value={`${victim.last_name}, ${victim.first_name} ${victim.middle_name ?? ''}`.trim()} />
                <InfoRow label="Age" value={victim.age?.toString()} />
                <InfoRow label="Sex" value={victim.sex} />
                <InfoRow label="Civil Status" value={victim.civil_status} />
                <InfoRow label="Barangay" value={victim.address_barangay ? `Brgy. ${victim.address_barangay}, ${victim.address_municipality}, ${victim.address_province}` : undefined} />
                <InfoRow label="Contact" value={victim.contact_number} />
                <InfoRow label="Occupation" value={victim.occupation} />
                <InfoRow label="Relationship to Respondent" value={victim.relationship_to_respondent} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Respondent */}
        {respondent && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" /> Respondent / Respondente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!respondent.is_known ? (
                <p className="text-sm text-muted-foreground italic">Unknown respondent / Hindi kilala ang respondente</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InfoRow label="Full Name" value={[respondent.last_name, respondent.first_name, respondent.middle_name].filter(Boolean).join(', ')} />
                  <InfoRow label="Age" value={respondent.age?.toString()} />
                  <InfoRow label="Sex" value={respondent.sex} />
                  <InfoRow label="Contact" value={respondent.contact_number} />
                  <InfoRow label="Address" value={respondent.address} />
                  <InfoRow label="Occupation" value={respondent.occupation} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Narrative */}
        {narratives.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Salaysay / Incident Narrative</CardTitle>
            </CardHeader>
            <CardContent>
              {narratives.map(n => (
                <div key={n.id} className="prose prose-sm max-w-none">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{n.narrative_text}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString('en-PH')}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Attachments / Mga Kalakip</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {attachments.map(a => (
                  <div key={a.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2">
                    <span className="text-sm truncate">{a.file_name}</span>
                    <Button size="sm" variant="ghost" onClick={() => getDownloadUrl(a.file_url)}>
                      <Download className="h-4 w-4 mr-1" /> Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Logs */}
        {statusLogs.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Status Timeline / Kasaysayan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {statusLogs.map(log => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-4 top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                    <div>
                      <p className="text-sm font-medium">
                        {log.old_status ? (
                          <>{CASE_STATUS_LABELS[log.old_status as CaseStatus] ?? log.old_status} → </>
                        ) : null}
                        <span className="text-primary">{CASE_STATUS_LABELS[log.new_status as CaseStatus] ?? log.new_status}</span>
                      </p>
                      {log.notes && <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>}
                      <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('en-PH')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Dialog */}
        <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Update Case Status / Baguhin ang Katayuan</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>New Status / Bagong Katayuan</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Notes / Tala (optional)</Label>
                <Textarea value={statusNotes} onChange={e => setStatusNotes(e.target.value)} placeholder="Add notes..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusDialog(false)}>Cancel</Button>
              <Button onClick={handleStatusUpdate} disabled={saving || !newStatus}>
                {saving ? 'Saving...' : 'Update Status'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Referral Dialog */}
        <Dialog open={referralDialog} onOpenChange={setReferralDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Refer to Office / I-refer sa Opisina</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Refer to / Opisina</Label>
                <Select value={referralOfficeId} onValueChange={setReferralOfficeId}>
                  <SelectTrigger><SelectValue placeholder="Select office..." /></SelectTrigger>
                  <SelectContent>
                    {offices.filter(o => o.id !== profile?.office_id).map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reason / Dahilan</Label>
                <Textarea value={referralReason} onChange={e => setReferralReason(e.target.value)} placeholder="Reason for referral..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReferralDialog(false)}>Cancel</Button>
              <Button onClick={handleReferral} disabled={saving || !referralOfficeId}>
                {saving ? 'Sending...' : 'Send Referral'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Case / Burahin ang Kaso</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete case <strong>{caseData.case_number}</strong>? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Case'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  )
}
