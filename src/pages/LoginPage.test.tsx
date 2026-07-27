import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'
import { useAuth } from '../hooks/index'

vi.mock('../hooks/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/index')>()
  return { ...actual, useAuth: vi.fn() }
})

const mockedUseAuth = vi.mocked(useAuth)

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockedUseAuth.mockReset()
  })

  it('calls signIn with the entered credentials on submit', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined)
    mockedUseAuth.mockReturnValue({ user: null, loading: false, signIn, signOut: vi.fn() })

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByPlaceholderText('tu@uandes.cl'), 'coordinadora@uandes.cl')
    await user.type(screen.getByPlaceholderText('••••••••'), 'secreto123')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(signIn).toHaveBeenCalledWith('coordinadora@uandes.cl', 'secreto123')
  })

  it('shows the error message when signIn fails', async () => {
    const signIn = vi.fn().mockRejectedValue(new Error('Credenciales inválidas'))
    mockedUseAuth.mockReturnValue({ user: null, loading: false, signIn, signOut: vi.fn() })

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByPlaceholderText('tu@uandes.cl'), 'a@b.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrong')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument()
    })
  })
})
