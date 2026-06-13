import { useState } from 'react'
import { useLocation } from 'wouter'
import { dbInsert, storageUpload } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useOffices } from '@/hooks/useOffices'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ChevronLeft, ChevronRight, Check, Loader2, Upload, X } from 'lucide-react'
import { LIMAY_BARANGAYS } from '@/types'

const STEPS = ['Case Info', 'Victim / Biktima', 'Respondent', 'Narrative / Salaysay', 'Attachments', 'Review & Submit']

interface FormData {
  case_type: string
  date_of_incident: string
  time_of_incident: string
  priority_level: string
  is_confidential: boolean
  assigned_to_office_id: string
  victim_last_name: string
  victim_first_name: string
  victim_middle_name: string
  victim_age: string
  victim_sex: string
  victim_civil_status: string
  victim_birthdate: string
  victim_address_barangay: string
  victim_contact_number: string
  victim_occupation: string
  victim_relationship_to_respondent: string
  respondent_unknown: boolean
  respondent_last_name: string
  respondent_first_name: string
  respondent_middle_name: string
  respondent_age: string
  respondent_sex: string
  respondent_address: string
  respondent_contact_number: string
  respondent_occupation: string
  narrative_text: string
  attachments: File[]
}

const initial: FormData = {
  case_type: '', date_of_incident: '', time_of_incident: '', priority_level: 'medium',
  is_confidential: false, assigned_to_office_id: '',
  victim_last_name: '', victim_first_name: '', victim_middle_name: '',
  victim_age: '', victim_sex: '', victim_civil_status: '',
  victim_birthdate: '', victim_address_barangay: '', victim_contact_number: '',
  victim_occupation: '', victim_relationship_to_respondent: '',
  respondent_unknown: false, respondent_last_name: '', respondent_first_name: '',
  respondent_middle_name: '', respondent_age: '', respondent_sex: '',
  respondent_address: '', respondent_contact_number: '', respondent_occupation: '',
  narrative_text: '', attachments: [],
}

// F component defined OUTSIDE to prevent re-mount on every render
function F({ label, sub, error, children }: { label: string; sub?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{sub && <span className="text-muted-foreground ml-1 text-xs">/ {sub}</span>}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export default function NewCasePage() {
  const { profile } = useAuth()
  const { offices } = useOffices()
  const [, setLocation] = useLocation()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function set(field: keyof FormData, value: unknown) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => { const next = { ...e }; delete next[field]; return next })
  }

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {}
    if (s === 0) {
      if (!form.case_type) errs.case_type = 'Required'
      if (!form.priority_level) errs.priority_level = 'Required'
    }
    if (s === 1) {
      if (!form.victim_last_name.trim()) errs.victim_last_name = 'Required'
      if (!form.victim_first_name.trim()) errs.victim_first_name = 'Required'
    }
    if (s === 3) {
      if (form.narrative_text.trim().length < 20) errs.narrative_text = 'Narrative must be at least 20 characters'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function next() {
    if (validateStep(step)) setStep(s => Math.min(s + 1, STEPS.length - 1))
  }
  function prev() { setStep(s => Math.max(s - 1, 0)) }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const { data: caseArr, error: caseErr } = await dbInsert<{ id: string }[]>('cases', {
        case_type: form.case_type,
        date_of_incident: form.date_of_incident || null,
        time_of_incident: form.time_of_incident || null,
        priority_level: form.priority_level,
        is_confidential: form.is_confidential,
        assigned_to_office_id: form.assigned_to_office_id || null,
        filed_by_office_id: profile?.office_id ?? null,
        created_by_user_id: profile?.id ?? null,
        status: 'open',
      })

      if (caseErr || !caseArr?.[0]) throw new Error(caseErr ?? 'Failed to create case')
      const caseId = caseArr[0].id

      await dbInsert('victims', {
        case_id: caseId,
        last_name: form.victim_last_name,
        first_name: form.victim_first_name,
        middle_name: form.victim_middle_name || null,
        age: form.victim_age ? parseInt(form.victim_age) : null,
        sex: form.victim_sex || null,
        civil_status: form.victim_civil_status || null,
        birthdate: form.victim_birthdate || null,
        address_barangay: form.victim_address_barangay || null,
        address_municipality: 'Limay',
        address_province: 'Bataan',
        contact_number: form.victim_contact_number || null,
        occupation: form.victim_occupation || null,
        relationship_to_respondent: form.victim_relationship_to_respondent || null,
      })

      if (!form.respondent_unknown) {
        await dbInsert('respondents', {
          case_id: caseId,
          last_name: form.respondent_last_name || null,
          first_name: form.respondent_first_name || null,
          middle_name: form.respondent_middle_name || null,
          age: form.respondent_age ? parseInt(form.respondent_age) : null,
          sex: form.respondent_sex || null,
          address: form.respondent_address || null,
          contact_number: form.respondent_contact_number || null,
          occupation: form.respondent_occupation || null,
          is_known: true,
        })
      } else {
        await dbInsert('respondents', { case_id: caseId, is_known: false })
      }

      if (form.narrative_text.trim()) {
        await dbInsert('case_narratives', {
          case_id: caseId,
          narrative_text: form.narrative_text,
          written_by_user_id: profile?.id ?? null,
        })
      }

      for (const file of form.attachments) {
        const path = `${caseId}/${Date.now()}_${file.name}`
        const { data: uploadData } = await storageUpload('case-attachments', path, file)
        if (uploadData) {
          await dbInsert('case_attachments', {
            case_id: caseId,
            file_name: file.name,
            file_url: path,
            file_type: file.type,
            file_size: file.size,
            uploaded_by_user_id: profile?.id ?? null,
          })
        }
      }

      if (form.assigned_to_office_id) {
        await dbInsert('notifications', {
          recipient_office_id: form.assigned_to_office_id,
          case_id: caseId,
          message: 'New case assigned to your office',
          type: 'new_case',
        })
      }

      setLocation(`/cases/${caseId}`)
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to submit case' })
    }
    setSubmitting(false)
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Case / Bagong Kaso</h1>
          <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>

        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">{step + 1}</span>
              {STEPS[step]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {step === 0 && (
              <>
                <F label="Case Type / Uri ng Kaso" error={errors.case_type}>
                  <Select value={form.case_type} onValueChange={v => set('case_type', v)}>
                    <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vawc">VAWC</SelectItem>
                      <SelectItem value="blotter">Blotter</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="incident">Incident</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Date of Incident / Petsa">
                    <Input type="date" value={form.date_of_incident} onChange={e => set('date_of_incident', e.target.value)} />
                  </F>
                  <F label="Time / Oras">
                    <Input type="time" value={form.time_of_incident} onChange={e => set('time_of_incident', e.target.value)} />
                  </F>
                </div>
                <F label="Priority Level / Antas ng Priyoridad" error={errors.priority_level}>
                  <Select value={form.priority_level} onValueChange={v => set('priority_level', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low / Mababa</SelectItem>
                      <SelectItem value="medium">Medium / Katamtaman</SelectItem>
                      <SelectItem value="high">High / Mataas</SelectItem>
                      <SelectItem value="urgent">Urgent / Apurahan</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
                <F label="Assign to Office">
                  <Select value={form.assigned_to_office_id} onValueChange={v => set('assigned_to_office_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Select office..." /></SelectTrigger>
                    <SelectContent>
                      {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </F>
                <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-md">
                  <Switch checked={form.is_confidential} onCheckedChange={v => set('is_confidential', v)} />
                  <div>
                    <p className="text-sm font-medium">Confidential / Lihim</p>
                    <p className="text-xs text-muted-foreground">Mark this case as confidential</p>
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <F label="Last Name / Apelyido" error={errors.victim_last_name}>
                    <Input value={form.victim_last_name} onChange={e => set('victim_last_name', e.target.value)} />
                  </F>
                  <F label="First Name / Pangalan" error={errors.victim_first_name}>
                    <Input value={form.victim_first_name} onChange={e => set('victim_first_name', e.target.value)} />
                  </F>
                  <F label="Middle Name">
                    <Input value={form.victim_middle_name} onChange={e => set('victim_middle_name', e.target.value)} />
                  </F>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Age / Edad">
                    <Input type="number" min="0" value={form.victim_age} onChange={e => set('victim_age', e.target.value)} />
                  </F>
                  <F label="Birthdate / Kaarawan">
                    <Input type="date" value={form.victim_birthdate} onChange={e => set('victim_birthdate', e.target.value)} />
                  </F>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Sex / Kasarian">
                    <Select value={form.victim_sex} onValueChange={v => set('victim_sex', v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male / Lalaki</SelectItem>
                        <SelectItem value="female">Female / Babae</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </F>
                  <F label="Civil Status / Katayuang Sibil">
                    <Select value={form.victim_civil_status} onValueChange={v => set('victim_civil_status', v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married / May Asawa</SelectItem>
                        <SelectItem value="widowed">Widowed / Biyudo/a</SelectItem>
                        <SelectItem value="separated">Separated / Hiwalay</SelectItem>
                        <SelectItem value="live-in">Live-in</SelectItem>
                      </SelectContent>
                    </Select>
                  </F>
                </div>
                <F label="Barangay">
                  <Select value={form.victim_address_barangay} onValueChange={v => set('victim_address_barangay', v)}>
                    <SelectTrigger><SelectValue placeholder="Select barangay..." /></SelectTrigger>
                    <SelectContent>
                      {LIMAY_BARANGAYS.map(b => <SelectItem key={b} value={b}>Brgy. {b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </F>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Contact Number">
                    <Input value={form.victim_contact_number} onChange={e => set('victim_contact_number', e.target.value)} placeholder="09XX XXX XXXX" />
                  </F>
                  <F label="Occupation / Hanapbuhay">
                    <Input value={form.victim_occupation} onChange={e => set('victim_occupation', e.target.value)} />
                  </F>
                </div>
                <F label="Relationship to Respondent">
                  <Input value={form.victim_relationship_to_respondent} onChange={e => set('victim_relationship_to_respondent', e.target.value)} placeholder="e.g. Spouse, Neighbor..." />
                </F>
              </>
            )}

            {step === 2 && (
              <>
                <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-md">
                  <Switch checked={form.respondent_unknown} onCheckedChange={v => set('respondent_unknown', v)} />
                  <div>
                    <p className="text-sm font-medium">Unknown Respondent / Hindi Kilala</p>
                    <p className="text-xs text-muted-foreground">Toggle if respondent identity is unknown</p>
                  </div>
                </div>
                {!form.respondent_unknown && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <F label="Last Name"><Input value={form.respondent_last_name} onChange={e => set('respondent_last_name', e.target.value)} /></F>
                      <F label="First Name"><Input value={form.respondent_first_name} onChange={e => set('respondent_first_name', e.target.value)} /></F>
                      <F label="Middle Name"><Input value={form.respondent_middle_name} onChange={e => set('respondent_middle_name', e.target.value)} /></F>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <F label="Age"><Input type="number" min="0" value={form.respondent_age} onChange={e => set('respondent_age', e.target.value)} /></F>
                      <F label="Sex">
                        <Select value={form.respondent_sex} onValueChange={v => set('respondent_sex', v)}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </F>
                    </div>
                    <F label="Address"><Input value={form.respondent_address} onChange={e => set('respondent_address', e.target.value)} /></F>
                    <div className="grid grid-cols-2 gap-4">
                      <F label="Contact Number"><Input value={form.respondent_contact_number} onChange={e => set('respondent_contact_number', e.target.value)} /></F>
                      <F label="Occupation"><Input value={form.respondent_occupation} onChange={e => set('respondent_occupation', e.target.value)} /></F>
                    </div>
                  </>
                )}
              </>
            )}

            {step === 3 && (
              <F label="Salaysay / Incident Narrative" error={errors.narrative_text}>
                <Textarea
                  value={form.narrative_text}
                  onChange={e => set('narrative_text', e.target.value)}
                  placeholder="Ilarawan ang insidente / Describe the incident in detail..."
                  className="min-h-[200px] resize-y"
                />
                <p className="text-xs text-muted-foreground">{form.narrative_text.length} characters</p>
              </F>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <Label>Attachments / Mga Kalakip</Label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:bg-muted/20 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload files</p>
                  <p className="text-xs text-muted-foreground mt-1">Images, PDFs, documents accepted</p>
                  <input type="file" multiple className="hidden" onChange={e => {
                    const files = Array.from(e.target.files ?? [])
                    set('attachments', [...form.attachments, ...files])
                  }} />
                </label>
                {form.attachments.length > 0 && (
                  <div className="space-y-2">
                    {form.attachments.map((f, i) => (
                      <div key={i} className="flex items-center justify-between border border-border rounded-md px-3 py-2">
                        <span className="text-sm truncate max-w-[80%]">{f.name}</span>
                        <button onClick={() => set('attachments', form.attachments.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 bg-muted/30 rounded-lg p-4">
                  <div><span className="text-muted-foreground">Case Type:</span> <span className="font-medium capitalize">{form.case_type}</span></div>
                  <div><span className="text-muted-foreground">Priority:</span> <span className="font-medium capitalize">{form.priority_level}</span></div>
                  <div><span className="text-muted-foreground">Date of Incident:</span> <span className="font-medium">{form.date_of_incident || '—'}</span></div>
                  <div><span className="text-muted-foreground">Confidential:</span> <span className="font-medium">{form.is_confidential ? 'Yes' : 'No'}</span></div>
                  <div><span className="text-muted-foreground">Victim:</span> <span className="font-medium">{form.victim_last_name}, {form.victim_first_name}</span></div>
                  <div><span className="text-muted-foreground">Respondent:</span> <span className="font-medium">{form.respondent_unknown ? 'Unknown' : `${form.respondent_last_name}, ${form.respondent_first_name}`}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Attachments:</span> <span className="font-medium">{form.attachments.length} file(s)</span></div>
                </div>
                {form.narrative_text && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-muted-foreground mb-1 font-medium text-xs uppercase tracking-wide">Narrative</p>
                    <p className="text-sm leading-relaxed line-clamp-5">{form.narrative_text}</p>
                  </div>
                )}
                {errors.submit && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">{errors.submit}</div>
                )}
              </div>
            )}

          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={prev} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : <><Check className="h-4 w-4 mr-1" /> Submit Case</>}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  )
}
