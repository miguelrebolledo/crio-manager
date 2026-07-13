// ============================================================
//  src/hooks/useProjects.ts
//  Hook principal para gestión de proyectos
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type {
  Project,
  ProjectInsert,
  ProjectUpdate,
  ProjectStatusEnum,
  StudyTypeEnum,
  PriorityEnum,
} from '../lib/database.types'

// ── Filtros disponibles ──────────────────────────────────────

export interface ProjectFilters {
  search?:    string               // busca en codigo_proyecto y titulo
  status?:    ProjectStatusEnum
  studyType?: StudyTypeEnum
  priority?:  PriorityEnum
  disease?:   string
  clientOrgId?: string
}

// ── Hook: lista de proyectos ─────────────────────────────────

export function useProjects(filters: ProjectFilters = {}) {
  const [projects, setProjects]   = useState<Project[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('projects')
        .select(`
          *,
          client_org:organizations(id, name, sponsor_type),
          principal_investigator:users!principal_investigator_id(id, full_name, email)
        `)
        .order('created_at', { ascending: false })

      // aplicar filtros
      if (filters.status)
        query = query.eq('status', filters.status)

      if (filters.studyType)
        query = query.eq('study_type', filters.studyType)

      if (filters.priority)
        query = query.eq('priority', filters.priority)

      if (filters.disease)
        query = query.eq('disease', filters.disease)

      if (filters.clientOrgId)
        query = query.eq('client_org_id', filters.clientOrgId)

      if (filters.search) {
        query = query.or(
          `codigo_proyecto.ilike.%${filters.search}%,titulo.ilike.%${filters.search}%`
        )
      }

      const { data, error: err } = await query

      if (err) throw err
      setProjects(data as Project[])
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar proyectos')
    } finally {
      setLoading(false)
    }
  }, [
    filters.search,
    filters.status,
    filters.studyType,
    filters.priority,
    filters.disease,
    filters.clientOrgId,
  ])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // suscripción en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjects()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchProjects])

  return { projects, loading, error, refetch: fetchProjects }
}

// ── Hook: detalle de un proyecto ─────────────────────────────

export function useProjectDetail(projectId: string | null) {
  const [project, setProject]   = useState<Project | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const fetchProject = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)

    try {
      const { data, error: err } = await supabase
        .from('projects')
        .select(`
          *,
          client_org:organizations(*),
          principal_investigator:users!principal_investigator_id(*),
          co_investigator:users!co_investigator_id(*),
          team_members:project_team_members(
            *,
            user:users(id, full_name, email, specialty)
          ),
          milestones(*)
        `)
        .eq('id', projectId)
        .single()

      if (err) throw err
      setProject(data as Project)
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar el proyecto')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  return { project, loading, error, refetch: fetchProject }
}

// ── Hook: CRUD de proyectos ───────────────────────────────────

export function useProjectMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  /** Crear proyecto nuevo */
  const createProject = async (data: ProjectInsert): Promise<Project | null> => {
    setLoading(true)
    setError(null)
    try {
      const { data: created, error: err } = await supabase
        .from('projects')
        .insert(data)
        .select()
        .single()

      if (err) throw err
      return created as Project
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  /** Actualizar proyecto existente */
  const updateProject = async (id: string, data: ProjectUpdate): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const { error: err } = await supabase
        .from('projects')
        .update(data)
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

  /** Cambiar estado del proyecto */
  const updateProjectStatus = async (
    id: string,
    status: ProjectStatusEnum
  ): Promise<boolean> => {
    return updateProject(id, { status })
  }

  /** Eliminar proyecto (solo ADMIN) */
  const deleteProject = async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const { error: err } = await supabase
        .from('projects')
        .delete()
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

  return {
    createProject,
    updateProject,
    updateProjectStatus,
    deleteProject,
    loading,
    error,
  }
}

// ── Helpers de display ────────────────────────────────────────

export const PROJECT_STATUS_LABELS: Record<ProjectStatusEnum, string> = {
  LEAD:        'Lead',
  PROPOSAL:    'Propuesta',
  CONTRACTED:  'Contratado',
  ACTIVE:      'Activo',
  PAUSED:      'En pausa',
  CLOSED:      'Cerrado',
  COMPLETED:   'Completado',
  CANCELLED:   'Cancelado',
}

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  INTERVENTIONAL_TRIAL: 'Ensayo Intervencional',
  OBSERVATIONAL_TRIAL:  'Ensayo Observacional',
  SAMPLE_COLLECTION:    'Colección de Muestras',
  SERVICE_OTHER:        'Servicio / Otro',
}

export const STUDY_TYPE_LABELS: Record<string, string> = {
  INTERVENTIONAL:  'Intervencional',
  OBSERVATIONAL:   'Observacional',
  CLINICAL_SERIES: 'Serie Clínica',
  SERVICE:         'Servicio',
}

export const PRIORITY_LABELS: Record<string, string> = {
  LOW:      'Baja',
  MEDIUM:   'Media',
  HIGH:     'Alta',
  CRITICAL: 'Crítica',
}

export const DISEASE_LABELS: Record<string, string> = {
  CANCER:        'Cáncer',
  PERINATAL:     'Perinatales',
  AUTOIMMUNE:    'Autoinmune',
  MENTAL_HEALTH: 'Salud Mental',
  PULMONARY:     'Pulmonar',
  OTHER:         'Otros',
}

export const TRIAL_PHASE_LABELS: Record<string, string> = {
  PHASE_0:        'Fase 0',
  PHASE_I:        'Fase I',
  PHASE_II:       'Fase II',
  PHASE_IIA:      'Fase IIa',
  PHASE_IIB:      'Fase IIb',
  PHASE_III:      'Fase III',
  PHASE_IV:       'Fase IV',
  NOT_APPLICABLE: 'No aplica',
}

/** Genera el siguiente código de proyecto para el año actual */
export async function generateNextProjectCode(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `${year}CR`

  const { data } = await supabase
    .from('projects')
    .select('codigo_proyecto')
    .ilike('codigo_proyecto', `${prefix}%`)
    .order('codigo_proyecto', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return `${prefix}001`

  const lastCode = data[0].codigo_proyecto
  const lastNum = parseInt(lastCode.replace(prefix, ''), 10)
  const nextNum = (lastNum + 1).toString().padStart(3, '0')
  return `${prefix}${nextNum}`
}
