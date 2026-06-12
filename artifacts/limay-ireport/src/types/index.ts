export type UserRole = 'super_admin' | 'encoder' | 'viewer'
export type OfficeType = 'barangay' | 'pnp' | 'mswd' | 'munisipyo'
export type CaseType = 'vawc' | 'blotter' | 'referral' | 'incident'
export type CaseStatus = 'open' | 'ongoing' | 'resolved' | 'referred' | 'closed'
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent'
export type ReferralStatus = 'sent' | 'received' | 'acknowledged' | 'completed'
export type NotificationType = 'new_case' | 'referral_received' | 'referral_update' | 'status_change'
export type Sex = 'male' | 'female' | 'other'
export type CivilStatus = 'single' | 'married' | 'widowed' | 'separated' | 'live-in'

export interface Office {
  id: string
  name: string
  office_type: OfficeType
  address?: string
  contact_number?: string
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  office_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
  office?: Office
}

export interface Case {
  id: string
  case_number?: string
  case_type: CaseType
  status: CaseStatus
  priority_level: PriorityLevel
  date_filed: string
  date_of_incident?: string
  time_of_incident?: string
  is_confidential: boolean
  filed_by_office_id?: string
  assigned_to_office_id?: string
  created_by_user_id?: string
  created_at: string
  updated_at: string
  filed_by_office?: Office
  assigned_to_office?: Office
}

export interface CaseWithVictim extends Case {
  victim_name?: string
}

export interface Victim {
  id: string
  case_id: string
  last_name: string
  first_name: string
  middle_name?: string
  age?: number
  sex?: Sex
  civil_status?: CivilStatus
  birthdate?: string
  address_barangay?: string
  address_municipality: string
  address_province: string
  contact_number?: string
  occupation?: string
  relationship_to_respondent?: string
  created_at: string
}

export interface Respondent {
  id: string
  case_id: string
  last_name?: string
  first_name?: string
  middle_name?: string
  age?: number
  sex?: Sex
  address?: string
  contact_number?: string
  occupation?: string
  is_known: boolean
  created_at: string
}

export interface CaseNarrative {
  id: string
  case_id: string
  narrative_text: string
  written_by_user_id?: string
  created_at: string
}

export interface Referral {
  id: string
  case_id: string
  from_office_id: string
  to_office_id: string
  referral_reason?: string
  referral_date: string
  received_at?: string
  received_by_user_id?: string
  status: ReferralStatus
  notes?: string
  created_at: string
  from_office?: Office
  to_office?: Office
  case?: Case
}

export interface CaseAttachment {
  id: string
  case_id: string
  file_name: string
  file_url: string
  file_type?: string
  file_size?: number
  uploaded_by_user_id?: string
  created_at: string
}

export interface CaseStatusLog {
  id: string
  case_id: string
  old_status?: string
  new_status: string
  changed_by_user_id?: string
  notes?: string
  created_at: string
}

export interface Notification {
  id: string
  recipient_office_id?: string
  recipient_user_id?: string
  case_id?: string
  message: string
  type: NotificationType
  is_read: boolean
  created_at: string
}

export const LIMAY_BARANGAYS = [
  'Alangan',
  'Bilolo',
  'Builder',
  'Duale',
  'Lote',
  'Pag-asa',
  'Poblacion',
  'Reformista',
  'San Francisco de Asis',
  'Saysain',
  'Wawa',
]

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  vawc: 'VAWC',
  blotter: 'Blotter',
  referral: 'Referral',
  incident: 'Incident',
}

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  open: 'Open',
  ongoing: 'Ongoing',
  resolved: 'Resolved',
  referred: 'Referred',
  closed: 'Closed',
}

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  sent: 'Sent',
  received: 'Received',
  acknowledged: 'Acknowledged',
  completed: 'Completed',
}
