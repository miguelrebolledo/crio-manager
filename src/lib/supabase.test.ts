import { describe, it, expect } from 'vitest'
import {
  hasRole,
  ROLE_LABELS,
  MANAGEMENT_ROLES,
  PROJECT_WRITE_ROLES,
  BUDGET_ROLES,
  AE_WRITE_ROLES,
} from './supabase'

describe('hasRole', () => {
  it('returns true when the role is in the allowed list', () => {
    expect(hasRole('ADMIN', MANAGEMENT_ROLES)).toBe(true)
  })

  it('returns false when the role is not in the allowed list', () => {
    expect(hasRole('SPONSOR', MANAGEMENT_ROLES)).toBe(false)
  })

  it('returns false for an empty allowed list', () => {
    expect(hasRole('ADMIN', [])).toBe(false)
  })
})

describe('role constant lists', () => {
  it('every role referenced in the write/budget lists has a label', () => {
    const allReferenced = [
      ...MANAGEMENT_ROLES,
      ...PROJECT_WRITE_ROLES,
      ...BUDGET_ROLES,
      ...AE_WRITE_ROLES,
    ]
    for (const role of allReferenced) {
      expect(ROLE_LABELS[role]).toBeDefined()
    }
  })
})
