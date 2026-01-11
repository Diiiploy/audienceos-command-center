/**
 * Login Page Tests
 * Tests the login page component including OAuth error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => mockSearchParams,
}))

// Mock Supabase client
const mockSignInWithPassword = vi.fn()
const mockSignInWithOAuth = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}))

// Import after mocks
import LoginPage from '@/app/login/page'

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams = new URLSearchParams()
  })

  describe('OAuth Error Display', () => {
    it('should display error when redirected with no_code error', async () => {
      mockSearchParams = new URLSearchParams('error=no_code')

      render(<LoginPage />)

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveTextContent(
          'Authentication failed. Please try again.'
        )
      })
    })

    it('should display error when redirected with auth_callback_error', async () => {
      // Note: We no longer expose internal error messages for security
      mockSearchParams = new URLSearchParams('error=auth_callback_error')

      render(<LoginPage />)

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveTextContent(
          'Authentication failed. Please try again.'
        )
      })
    })

    it('should display error when redirected with access_denied', async () => {
      mockSearchParams = new URLSearchParams('error=access_denied')

      render(<LoginPage />)

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveTextContent(
          'Access was denied. Please try again.'
        )
      })
    })

    it('should display error_description when provided', async () => {
      mockSearchParams = new URLSearchParams(
        'error=unknown_error&error_description=Something%20went%20wrong'
      )

      render(<LoginPage />)

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveTextContent(
          'Something went wrong'
        )
      })
    })

    it('should display generic error for unrecognized error codes', async () => {
      mockSearchParams = new URLSearchParams('error=some_random_error')

      render(<LoginPage />)

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveTextContent(
          'Authentication failed'
        )
      })
    })
  })

  describe('Email/Password Login', () => {
    it('should render login form', () => {
      render(<LoginPage />)

      expect(screen.getByTestId('login-email')).toBeInTheDocument()
      expect(screen.getByTestId('login-password')).toBeInTheDocument()
      expect(screen.getByTestId('login-submit')).toBeInTheDocument()
    })

    it('should display error on failed login', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Invalid credentials' },
      })

      render(<LoginPage />)

      const emailInput = screen.getByTestId('login-email')
      const passwordInput = screen.getByTestId('login-password')
      const submitButton = screen.getByTestId('login-submit')

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'wrongpassword')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveTextContent(
          'Invalid credentials'
        )
      })
    })

    it('should redirect to dashboard on successful login', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null })

      render(<LoginPage />)

      const emailInput = screen.getByTestId('login-email')
      const passwordInput = screen.getByTestId('login-password')
      const submitButton = screen.getByTestId('login-submit')

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'correctpassword')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
        expect(mockRefresh).toHaveBeenCalled()
      })
    })
  })

  describe('Google OAuth', () => {
    it('should render Google sign-in button', () => {
      render(<LoginPage />)

      expect(screen.getByText(/sign in with google/i)).toBeInTheDocument()
    })

    it('should initiate OAuth flow when Google button clicked', async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null })

      render(<LoginPage />)

      const googleButton = screen.getByText(/sign in with google/i)
      await userEvent.click(googleButton)

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: expect.objectContaining({
            redirectTo: expect.stringContaining('/auth/callback'),
          }),
        })
      })
    })

    it('should display error if OAuth initiation fails', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        error: { message: 'OAuth provider unavailable' },
      })

      render(<LoginPage />)

      const googleButton = screen.getByText(/sign in with google/i)
      await userEvent.click(googleButton)

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveTextContent(
          'OAuth provider unavailable'
        )
      })
    })

    it('should pass redirect param to OAuth callback', async () => {
      mockSearchParams = new URLSearchParams('redirect=/client/settings')
      mockSignInWithOAuth.mockResolvedValue({ error: null })

      render(<LoginPage />)

      const googleButton = screen.getByText(/sign in with google/i)
      await userEvent.click(googleButton)

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: expect.objectContaining({
            redirectTo: expect.stringContaining(
              encodeURIComponent('/client/settings')
            ),
          }),
        })
      })
    })
  })

  describe('Navigation Links', () => {
    it('should have link to signup page', () => {
      render(<LoginPage />)

      const signupLink = screen.getByText(/create account/i)
      expect(signupLink).toHaveAttribute('href', '/signup')
    })

    it('should have link to forgot password page', () => {
      render(<LoginPage />)

      const forgotLink = screen.getByText(/forgot password/i)
      expect(forgotLink).toHaveAttribute('href', '/forgot-password')
    })
  })
})
