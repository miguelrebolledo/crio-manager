// ============================================================
//  CRIO Manager — Database Types
//  Generado manualmente desde crio_schema.sql
//  Actualizar si se modifica el schema.
//  Tip: en producción usar `supabase gen types typescript`
//  para regenerar automáticamente desde el schema real.
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Enums ────────────────────────────────────────────────────

export type ProjectTypeEnum =
  | 'INTERVENTIONAL_TRIAL'
  | 'OBSERVATIONAL_TRIAL'
  | 'SAMPLE_COLLECTION'
  | 'SERVICE_OTHER'

export type ProjectStatusEnum =
  | 'LEAD'
  | 'PROPOSAL'
  | 'CONTRACTED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CLOSED'
  | 'COMPLETED'
  | 'CANCELLED'

export type PriorityEnum = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type SponsorTypeEnum = 'INTERNAL' | 'EXTERNAL'

export type TrialPhaseEnum =
  | 'PHASE_0'
  | 'PHASE_I'
  | 'PHASE_II'
  | 'PHASE_IIA'
  | 'PHASE_IIB'
  | 'PHASE_III'
  | 'PHASE_IV'
  | 'NOT_APPLICABLE'

export type DiseaseEnum =
  | 'CANCER'
  | 'PERINATAL'
  | 'AUTOIMMUNE'
  | 'MENTAL_HEALTH'
  | 'PULMONARY'
  | 'OTHER'

export type StudyTypeEnum =
  | 'INTERVENTIONAL'
  | 'OBSERVATIONAL'
  | 'CLINICAL_SERIES'
  | 'SERVICE'

export type UserRoleEnum =
  | 'ADMIN'
  | 'PM_CRIO'
  | 'INVESTIGATOR'
  | 'COORDINATOR'
  | 'SPONSOR'
  | 'EXTERNAL_MONITOR'
  | 'FINANCE'
  | 'LAB'

export type TeamRoleEnum =
  | 'PRINCIPAL_INVESTIGATOR'
  | 'CO_INVESTIGATOR'
  | 'COORDINATOR_PRINCIPAL'
  | 'COORDINATOR_BACKUP'
  | 'EXTERNAL_MONITOR'
  | 'LAB_TECHNICIAN'
  | 'FINANCE'
  | 'OTHER'

export type MilestoneStatusEnum = 'PENDING' | 'COMPLETED' | 'OVERDUE'

export type MonitoringVisitTypeEnum = 'INITIATION' | 'FOLLOW_UP' | 'CLOSE_OUT'

export type MonitoringVisitStatusEnum = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

export type FindingCategoryEnum = 'CRITICAL' | 'MAJOR' | 'MINOR'

export type FindingStatusEnum = 'OPEN' | 'RESPONDED' | 'APPROVED' | 'REJECTED'

export type AdverseEventTypeEnum = 'AE' | 'SAE'

export type AdverseEventStatusEnum = 'REPORTED' | 'FOLLOW_UP' | 'CLOSED'

export type AERelationEnum =
  | 'DEFINITELY_RELATED'
  | 'PROBABLY_RELATED'
  | 'POSSIBLY_RELATED'
  | 'NOT_RELATED'
  | 'NOT_EVALUABLE'

export type AEGradeEnum = 'GRADE_1' | 'GRADE_2' | 'GRADE_3' | 'GRADE_4'

export type SampleTypeEnum =
  | 'BLOOD'
  | 'URINE'
  | 'TISSUE'
  | 'BONE_MARROW'
  | 'CSF'
  | 'OTHER'

export type SampleStatusEnum =
  | 'PENDING'
  | 'COLLECTED'
  | 'PROCESSING'
  | 'STORED'
  | 'SHIPPED'
  | 'OMISSION'

export type OrgTypeEnum =
  | 'PHARMA'
  | 'BIOTECH'
  | 'ACADEMIC'
  | 'HOSPITAL'
  | 'FOUNDATION'
  | 'GOVERNMENT'
  | 'OTHER'

export type DocumentTypeEnum =
  | 'PROTOCOL'
  | 'INVESTIGATORS_BROCHURE'
  | 'ETHICS_APPROVAL'
  | 'INFORMED_CONSENT'
  | 'CRF'
  | 'SAFETY_REPORT'
  | 'MONITORING_REPORT'
  | 'CONTRACT'
  | 'OTHER'

// ── Row types ────────────────────────────────────────────────

export interface User {
  id: string
  full_name: string
  email: string
  role: UserRoleEnum
  specialty: string | null
  institution: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  org_type: OrgTypeEnum
  sponsor_type: SponsorTypeEnum
  country: string
  city: string | null
  website: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CrmInteraction {
  id: string
  org_id: string
  author_id: string
  interaction_date: string
  notes: string
  created_at: string
  // joined
  author?: User
}

export interface Project {
  id: string
  codigo_proyecto: string
  titulo: string
  study_type: StudyTypeEnum
  project_type: ProjectTypeEnum
  trial_phase: TrialPhaseEnum | null
  disease: DiseaseEnum | null
  therapeutic_area: string | null
  status: ProjectStatusEnum
  priority: PriorityEnum
  sponsor_type: SponsorTypeEnum
  client_org_id: string | null
  principal_investigator_id: string | null
  co_investigator_id: string | null
  start_date: string
  estimated_end_date: string | null
  first_patient_recruited_date: string | null
  recruitment_target: number | null
  recruited_current: number
  dropouts_current: number
  excluded_current: number
  recruitment_last_updated: string | null
  ethics_approval_date: string | null
  ethics_renewal_date: string | null
  ethics_committee: string | null
  ethics_code: string | null
  budget_total: number | null
  budget_executed: number | null
  primary_endpoint: string | null
  created_at: string
  updated_at: string
  // joined (optional — select explícito)
  client_org?: Organization
  principal_investigator?: User
  co_investigator?: User
  team_members?: ProjectTeamMember[]
  milestones?: Milestone[]
}

export interface ProjectTrialDetails {
  project_id: string
  sample_size_target: number | null
  sample_type: string | null
  recruitment_start: string | null
  recruitment_end: string | null
  ethics_submission_date: string | null
  primary_endpoint: string | null
  secondary_endpoints: string | null
  inclusion_criteria: string | null
  exclusion_criteria: string | null
  updated_at: string
}

export interface ProjectSampleCollectionDetails {
  project_id: string
  sample_type: string | null
  collection_protocol: string | null
  n_samples_target: number | null
  processing_required: boolean
  cold_chain_required: boolean
  storage_conditions: string | null
  updated_at: string
}

export interface ProjectServiceDetails {
  project_id: string
  service_category: string | null
  deliverables: string | null
  sla_due_date: string | null
  estimated_hours: number | null
  updated_at: string
}

export interface ProjectTeamMember {
  id: string
  project_id: string
  user_id: string
  team_role: TeamRoleEnum
  assigned_date: string
  is_active: boolean
  // joined
  user?: User
}

export interface Milestone {
  id: string
  project_id: string
  name: string
  due_date: string
  completed_date: string | null
  status: MilestoneStatusEnum
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RecruitmentUpdate {
  id: string
  project_id: string
  reported_by: string
  period_year: number
  period_month: number
  report_date: string
  enrolled_total: number
  dropouts_total: number
  excluded_total: number
  new_this_period: number | null
  notes: string | null
  created_at: string
  // joined
  reporter?: User
}

export interface MonitoringVisit {
  id: string
  project_id: string
  monitor_id: string
  visit_type: MonitoringVisitTypeEnum
  status: MonitoringVisitStatusEnum
  scheduled_date: string
  actual_date: string | null
  training_date: string | null
  report_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  monitor?: User
  findings?: MonitoringFinding[]
}

export interface MonitoringFinding {
  id: string
  visit_id: string
  description: string
  category: FindingCategoryEnum
  status: FindingStatusEnum
  response_text: string | null
  response_by: string | null
  response_date: string | null
  decision_approved: boolean | null
  decision_text: string | null
  decision_by: string | null
  decision_date: string | null
  created_at: string
  updated_at: string
  // joined
  responder?: User
  decider?: User
}

export interface AdverseEvent {
  id: string
  project_id: string
  reported_by: string
  event_type: AdverseEventTypeEnum
  grade: AEGradeEnum
  patient_id: string
  detection_date: string
  description: string
  relation_to_treatment: AERelationEnum
  actions_taken: string | null
  status: AdverseEventStatusEnum
  pi_notified_at: string | null
  sponsor_notified_at: string | null
  ethics_notified_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
  // joined
  reporter?: User
}

export interface SampleCollection {
  id: string
  project_id: string
  patient_id: string
  sample_type: SampleTypeEnum
  visit_timepoint: string | null
  scheduled_date: string
  collected_date: string | null
  volume_quantity: string | null
  cold_chain_required: boolean
  processing_required: boolean
  status: SampleStatusEnum
  storage_location: string | null
  shipping_destination: string | null
  notes: string | null
  registered_by: string
  updated_by: string | null
  hours_open: number
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  project_id: string
  name: string
  doc_type: DocumentTypeEnum
  storage_path: string
  file_size_bytes: number | null
  mime_type: string | null
  visible_to_sponsor: boolean
  uploaded_by: string
  created_at: string
  // joined
  uploader?: User
}

export interface ProjectNote {
  id: string
  project_id: string
  author_id: string
  content: string
  created_at: string
  // joined
  author?: User
}

// ── View types ───────────────────────────────────────────────

export interface EthicsAlert {
  id: string
  codigo_proyecto: string
  titulo: string
  ethics_renewal_date: string
  ethics_committee: string | null
  ethics_code: string | null
  days_until_renewal: number
  renewal_alert_level: 'EXPIRED' | 'URGENT' | 'WARNING' | 'OK'
}

export interface RecruitmentDashboard {
  id: string
  codigo_proyecto: string
  titulo: string
  recruitment_target: number | null
  recruited_current: number
  dropouts_current: number
  excluded_current: number
  active_net: number
  pct_recruited: number | null
  recruitment_last_updated: string | null
  status: ProjectStatusEnum
  first_patient_recruited_date: string | null
}

export interface OpenFindingSummary {
  id: string
  description: string
  category: FindingCategoryEnum
  status: FindingStatusEnum
  created_at: string
  project_id: string
  visit_date: string
  monitor_id: string
  codigo_proyecto: string
  project_title: string
  monitor_name: string
}

// ── Insert/Update types ──────────────────────────────────────

export type ProjectInsert = Omit<Project,
  'id' | 'created_at' | 'updated_at' |
  'recruited_current' | 'dropouts_current' | 'excluded_current' |
  'recruitment_last_updated' | 'client_org' | 'principal_investigator' |
  'co_investigator' | 'team_members' | 'milestones'
>

export type ProjectUpdate = Partial<ProjectInsert>

export type MilestoneInsert = Omit<Milestone, 'id' | 'created_at' | 'updated_at'>
export type MilestoneUpdate = Partial<MilestoneInsert>

export type RecruitmentUpdateInsert = Omit<RecruitmentUpdate,
  'id' | 'created_at' | 'new_this_period' | 'reporter'
>

export type MonitoringFindingInsert = Omit<MonitoringFinding,
  'id' | 'created_at' | 'updated_at' | 'responder' | 'decider'
>

export type AdverseEventInsert = Omit<AdverseEvent,
  'id' | 'created_at' | 'updated_at' | 'reporter'
>

export type SampleCollectionInsert = Omit<SampleCollection,
  'id' | 'created_at' | 'updated_at' | 'hours_open'
>

export type DocumentInsert = Omit<Document, 'id' | 'created_at' | 'uploader'>
