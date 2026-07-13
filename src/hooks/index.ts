// ============================================================
//  src/hooks/useRecruitment.ts
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type {
  RecruitmentUpdate,
  RecruitmentUpdateInsert,
  RecruitmentDashboard,
} from '../lib/database.types'

export function useRecruitmentHistory(projectId: string | null) {
  const [history, setHistory]   = useState<RecruitmentUpdate[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('recruitment_updates')
        .select('*, reporter:users(id, full_name)')
        .eq('project_id', projectId)
        .order('period_year', { ascending: true })
        .order('period_month', { ascending: true })

      if (err) throw err
      setHistory(data as RecruitmentUpdate[])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetch() }, [fetch])

  return { history, loading, error, refetch: fetch }
}

/** Proyectos asignados a la coordinadora actual para reporte mensual */
export function useCoordinatorProjects() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('projects')
        .select(`
          id, codigo_proyecto, titulo, recruitment_target,
          recruited_current, dropouts_current, excluded_current,
          status, ethics_renewal_date,
          team_members:project_team_members!inner(user_id, team_role)
        `)
        .eq('project_team_members.user_id', user.id)
        .in('project_team_members.team_role', ['COORDINATOR_PRINCIPAL', 'COORDINATOR_BACKUP'])
        .not('status', 'in', '("CLOSED","COMPLETED","CANCELLED")')

      setProjects(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return { projects, loading }
}

export function useRecruitmentMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const submitReport = async (data: RecruitmentUpdateInsert): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      // upsert — si ya existe reporte para ese mes/año lo actualiza
      const { error: err } = await supabase
        .from('recruitment_updates')
        .upsert(data, {
          onConflict: 'project_id,period_year,period_month',
        })

      if (err) throw err
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  return { submitReport, loading, error }
}

export function useRecruitmentDashboard() {
  const [data, setData]     = useState<RecruitmentDashboard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('recruitment_dashboard')
      .select('*')
      .then(({ data: rows }) => {
        setData((rows ?? []) as RecruitmentDashboard[])
        setLoading(false)
      })
  }, [])

  return { data, loading }
}


// ============================================================
//  src/hooks/useMonitoring.ts
// ============================================================

export function useMonitoringVisits(projectId?: string) {
  const [visits, setVisits]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('monitoring_visits')
        .select(`
          *,
          monitor:users(id, full_name, email),
          findings:monitoring_findings(*)
        `)
        .order('scheduled_date', { ascending: false })

      if (projectId) query = query.eq('project_id', projectId)

      const { data, error: err } = await query
      if (err) throw err
      setVisits(data ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetch() }, [fetch])

  return { visits, loading, error, refetch: fetch }
}

export function useOpenFindings() {
  const [findings, setFindings] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase
      .from('open_findings_summary')
      .select('*')
      .then(({ data }) => {
        setFindings(data ?? [])
        setLoading(false)
      })
  }, [])

  return { findings, loading }
}

export function useMonitoringMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  /** Coordinadora responde un hallazgo */
  const respondFinding = async (
    findingId: string,
    responseText: string
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: err } = await supabase
        .from('monitoring_findings')
        .update({
          status:        'RESPONDED',
          response_text: responseText,
          response_by:   user?.id,
          response_date: new Date().toISOString(),
        })
        .eq('id', findingId)

      if (err) throw err
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  /** Monitor aprueba o rechaza la respuesta */
  const decideFinding = async (
    findingId: string,
    approved: boolean,
    decisionText: string
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: err } = await supabase
        .from('monitoring_findings')
        .update({
          status:           approved ? 'APPROVED' : 'REJECTED',
          decision_approved: approved,
          decision_text:    decisionText,
          decision_by:      user?.id,
          decision_date:    new Date().toISOString(),
        })
        .eq('id', findingId)

      if (err) throw err
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  return { respondFinding, decideFinding, loading, error }
}


// ============================================================
//  src/hooks/useAdverseEvents.ts
// ============================================================

export function useAdverseEvents(projectId?: string) {
  const [events, setEvents]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('adverse_events')
        .select('*, reporter:users(id, full_name)')
        .order('detection_date', { ascending: false })

      if (projectId) query = query.eq('project_id', projectId)

      const { data, error: err } = await query
      if (err) throw err
      setEvents(data ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetch() }, [fetch])

  return { events, loading, error, refetch: fetch }
}

export function useAdverseEventMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const createEvent = async (data: any): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: err } = await supabase
        .from('adverse_events')
        .insert({ ...data, reported_by: user?.id })

      if (err) throw err
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const closeEvent = async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const { error: err } = await supabase
        .from('adverse_events')
        .update({ status: 'CLOSED', closed_at: new Date().toISOString() })
        .eq('id', id)

      if (err) throw err
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  return { createEvent, closeEvent, loading, error }
}


// ============================================================
//  src/hooks/useSamples.ts
// ============================================================

export function useSamples(projectId?: string) {
  const [samples, setSamples] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('sample_collections')
        .select('*')
        .order('scheduled_date', { ascending: false })

      if (projectId) query = query.eq('project_id', projectId)

      const { data, error: err } = await query
      if (err) throw err
      setSamples(data ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetch() }, [fetch])

  return { samples, loading, error, refetch: fetch }
}

export function useSampleMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const createSample = async (data: any): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: err } = await supabase
        .from('sample_collections')
        .insert({ ...data, registered_by: user?.id })

      if (err) throw err
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (
    id: string,
    status: string,
    notes?: string
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload: any = {
        status,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      }
      if (status === 'COLLECTED') payload.collected_date = new Date().toISOString().split('T')[0]
      if (notes) payload.notes = notes

      const { error: err } = await supabase
        .from('sample_collections')
        .update(payload)
        .eq('id', id)

      if (err) throw err
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  return { createSample, updateStatus, loading, error }
}


// ============================================================
//  src/hooks/useDashboard.ts
// ============================================================

export function useDashboard() {
  const [stats, setStats]       = useState<any>(null)
  const [alerts, setAlerts]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      // estadísticas de proyectos
      const { data: projects } = await supabase
        .from('projects')
        .select('status, study_type, disease, priority')

      // alertas de ética
      const { data: ethicsAlerts } = await supabase
        .from('ethics_alerts')
        .select('*')
        .in('renewal_alert_level', ['EXPIRED', 'URGENT', 'WARNING'])

      // hallazgos abiertos
      const { data: openFindings } = await supabase
        .from('open_findings_summary')
        .select('id, category')

      // muestras con omisión
      const { data: openOmissions } = await supabase
        .from('sample_collections')
        .select('id')
        .eq('status', 'OMISSION')

      // hitos vencidos
      const { data: overdueMs } = await supabase
        .from('milestones')
        .select('id')
        .eq('status', 'OVERDUE')

      const p = projects ?? []
      setStats({
        total:      p.length,
        active:     p.filter(x => x.status === 'ACTIVE').length,
        pipeline:   p.filter(x => ['LEAD','PROPOSAL','CONTRACTED'].includes(x.status)).length,
        paused:     p.filter(x => x.status === 'PAUSED').length,
        byStatus:   groupBy(p, 'status'),
        byType:     groupBy(p, 'study_type'),
        byDisease:  groupBy(p, 'disease'),
      })

      // consolidar alertas del panel
      const allAlerts: any[] = []

      ethicsAlerts?.forEach(a => {
        allAlerts.push({
          type: a.renewal_alert_level === 'EXPIRED' ? 'danger' : 'warn',
          icon: 'ti-shield-x',
          title: a.renewal_alert_level === 'EXPIRED'
            ? `Comité de Ética vencido — ${a.codigo_proyecto}`
            : `Renovación ética en ${a.days_until_renewal} días — ${a.codigo_proyecto}`,
          detail: a.ethics_committee ?? '',
          date: a.ethics_renewal_date,
        })
      })

      const criticalFindings = openFindings?.filter(f => f.category === 'CRITICAL') ?? []
      if (criticalFindings.length > 0) {
        allAlerts.push({
          type: 'danger',
          icon: 'ti-message-x',
          title: `${criticalFindings.length} hallazgo${criticalFindings.length > 1 ? 's' : ''} crítico${criticalFindings.length > 1 ? 's' : ''} sin respuesta`,
          detail: 'Requieren acción inmediata de la coordinadora',
        })
      }

      if ((overdueMs?.length ?? 0) > 0) {
        allAlerts.push({
          type: 'warn',
          icon: 'ti-flag-x',
          title: `${overdueMs!.length} hito${overdueMs!.length > 1 ? 's' : ''} vencido${overdueMs!.length > 1 ? 's' : ''}`,
          detail: 'Revisar cronograma de proyectos',
        })
      }

      if ((openOmissions?.length ?? 0) > 0) {
        allAlerts.push({
          type: 'info',
          icon: 'ti-test-pipe-off',
          title: `${openOmissions!.length} muestra${openOmissions!.length > 1 ? 's' : ''} con omisión sin atender`,
          detail: 'Coordinadoras deben actualizar estado',
        })
      }

      setAlerts(allAlerts)
      setLoading(false)
    }

    load()
  }, [])

  return { stats, alerts, loading }
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, number> {
  return arr.reduce((acc, item) => {
    const k = String(item[key] ?? 'UNKNOWN')
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
}


// ============================================================
//  src/hooks/useAuth.ts
// ============================================================

import { createContext, useContext } from 'react'
import type { UserRoleEnum } from '../lib/database.types'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: UserRoleEnum
}

export interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)

/** Guard: redirige si el usuario no tiene el rol requerido */
export function useRequireRole(allowedRoles: UserRoleEnum[]) {
  const { user } = useAuth()
  const hasAccess = user ? allowedRoles.includes(user.role) : false
  return { hasAccess, user }
}


// ============================================================
//  src/hooks/useDocuments.ts
// ============================================================

export function useDocuments(projectId: string) {
  const [docs, setDocs]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('*, uploader:users(id, full_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    setDocs(data ?? [])
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetch() }, [fetch])

  /** Subir un archivo a Supabase Storage y registrar metadata */
  const uploadDocument = async (
    file: File,
    projectId: string,
    docType: string,
    visibleToSponsor: boolean = false
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const filePath = `documents/${projectId}/${Date.now()}_${file.name}`

      // 1. subir a Storage
      const { error: storageErr } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (storageErr) throw storageErr

      // 2. registrar metadata en tabla documents
      const { error: dbErr } = await supabase
        .from('documents')
        .insert({
          project_id:         projectId,
          name:               file.name,
          doc_type:           docType,
          storage_path:       filePath,
          file_size_bytes:    file.size,
          mime_type:          file.type,
          visible_to_sponsor: visibleToSponsor,
          uploaded_by:        user?.id,
        })

      if (dbErr) throw dbErr
      await fetch()
      return true
    } catch {
      return false
    }
  }

  /** Obtener URL firmada para descarga (válida 60 minutos) */
  const getDownloadUrl = async (storagePath: string): Promise<string | null> => {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600)

    return data?.signedUrl ?? null
  }

  return { docs, loading, uploadDocument, getDownloadUrl, refetch: fetch }
}


// ============================================================
//  src/hooks/useCRM.ts
// ============================================================

export function useOrganizations() {
  const [orgs, setOrgs]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('organizations')
      .select('*, interactions:crm_interactions(*, author:users(id, full_name))')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        setOrgs(data ?? [])
        setLoading(false)
      })
  }, [])

  return { orgs, loading }
}

export function useCRMMutations() {
  const addInteraction = async (orgId: string, notes: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('crm_interactions')
        .insert({
          org_id:           orgId,
          author_id:        user?.id,
          notes,
          interaction_date: new Date().toISOString().split('T')[0],
        })

      return !error
    } catch {
      return false
    }
  }

  return { addInteraction }
}
