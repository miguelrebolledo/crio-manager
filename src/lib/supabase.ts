// ============================================================
//  src/lib/supabase.ts
//  Cliente Supabase — singleton para toda la app
// ============================================================
//
//  SETUP:
//  1. Crea archivo .env.local en la raíz del proyecto:
//
//     VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
//     VITE_SUPABASE_ANON_KEY=eyJhbGci...
//
//  2. Obtén estos valores en:
//     Supabase Dashboard → Project Settings → API
//
// ============================================================

import { createClient, SupabaseClient, User } from '@supabase/supabase-js'
import type { UserRoleEnum } from './database.types'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY.\n' +
    'Crea un archivo .env.local en la raíz del proyecto con estos valores.'
  )
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// ── Auth helpers ─────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentUserProfile() {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
}

// ── Role helpers ─────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRoleEnum, string> = {
  ADMIN:            'Administrador',
  PM_CRIO:          'PM / Gestor CRO',
  INVESTIGATOR:     'Investigador',
  COORDINATOR:      'Coordinadora',
  SPONSOR:          'Sponsor',
  EXTERNAL_MONITOR: 'Monitor Externo',
  FINANCE:          'Finanzas',
  LAB:              'Laboratorio',
}

export const MANAGEMENT_ROLES: UserRoleEnum[]    = ['ADMIN', 'PM_CRIO']
export const PROJECT_WRITE_ROLES: UserRoleEnum[] = ['ADMIN', 'PM_CRIO']
export const BUDGET_ROLES: UserRoleEnum[]        = ['ADMIN', 'PM_CRIO', 'FINANCE']
export const AE_WRITE_ROLES: UserRoleEnum[]      = ['ADMIN', 'PM_CRIO', 'COORDINATOR', 'INVESTIGATOR']

export function hasRole(userRole: UserRoleEnum, allowedRoles: UserRoleEnum[]): boolean {
  return allowedRoles.includes(userRole)
}