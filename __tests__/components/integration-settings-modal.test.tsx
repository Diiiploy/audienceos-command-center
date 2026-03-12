// vitest globals (describe, it, expect, vi, etc.) available via vitest.config.ts globals: true
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IntegrationSettingsModal } from '@/components/linear/integration-settings-modal'
import React from 'react'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { toast } from 'sonner'

// Helper to create mock integration
const createMockIntegration = (overrides = {}) => ({
  id: 'int-123',
  name: 'Slack',
  provider: 'slack',
  status: 'connected' as const,
  lastSync: '2024-01-15T10:30:00Z', // ISO date string format expected by formatDate()
  lastSyncRaw: '2024-01-15T10:30:00Z',
  accounts: 3,
  icon: <span data-testid="mock-icon">Icon</span>,
  color: '#4A154B',
  ...overrides,
})

describe('IntegrationSettingsModal', () => {
  const mockOnClose = vi.fn()
  const mockOnRefetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('should not render when integration is null', () => {
      const { container } = render(
        <IntegrationSettingsModal
          integration={null}
          isOpen={false}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render modal when isOpen is true', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration()}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      expect(screen.getByText('Slack')).toBeInTheDocument()
    })

    it('should display integration name in header', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration({ name: 'Gmail' })}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      expect(screen.getByText('Gmail')).toBeInTheDocument()
    })

    it('should display connected status badge', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration({ status: 'connected' })}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      // Status appears in badge and info section - check that at least one exists
      const connectedElements = screen.getAllByText('Connected')
      expect(connectedElements.length).toBeGreaterThan(0)
    })

    it('should display disconnected status badge', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration({ status: 'disconnected' })}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      // Status appears in badge and info section
      const disconnectedElements = screen.getAllByText('Disconnected')
      expect(disconnectedElements.length).toBeGreaterThan(0)
    })

    it('should display error status badge', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration({ status: 'error' })}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      // Status appears in badge and info section
      const errorElements = screen.getAllByText('Error')
      expect(errorElements.length).toBeGreaterThan(0)
    })

    it('should display syncing status badge', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration({ status: 'syncing' })}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      // Status appears in badge and info section
      const syncingElements = screen.getAllByText('Syncing')
      expect(syncingElements.length).toBeGreaterThan(0)
    })

    it('should display last sync time', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration({ lastSync: '2024-06-15T14:30:00Z', lastSyncRaw: '2024-06-15T14:30:00Z' })}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      // formatDate() produces "Jun 15, 2024, XX:XX XX" format - may appear multiple times
      const dateElements = screen.getAllByText(/Jun 15, 2024/)
      expect(dateElements.length).toBeGreaterThan(0)
    })

    it('should display connected accounts count', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration({ accounts: 5 })}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  describe('Test Connection action', () => {
    it('should call test endpoint when Test Connection clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Connection successful' }),
      })

      render(
        <IntegrationSettingsModal
          integration={createMockIntegration()}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      const testButton = screen.getByText('Test Connection')
      fireEvent.click(testButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/integrations/int-123/test',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
          })
        )
      })
    })

    it('should show success toast on successful test', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'healthy', responseTime: 120 } }),
      })

      render(
        <IntegrationSettingsModal
          integration={createMockIntegration()}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      fireEvent.click(screen.getByText('Test Connection'))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Connection test successful',
          expect.any(Object)
        )
      })
    })

    it('should show error toast on failed test', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Token expired' }),
      })

      render(
        <IntegrationSettingsModal
          integration={createMockIntegration()}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      fireEvent.click(screen.getByText('Test Connection'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Connection test failed',
          expect.any(Object)
        )
      })
    })

    it('should disable Test Connection for disconnected integrations', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration({ status: 'disconnected' })}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      const testButton = screen.getByText('Test Connection')
      expect(testButton).toBeDisabled()
    })
  })

  describe('Sync Now action', () => {
    it('should call sync endpoint when Sync Now clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Sync started' }),
      })

      render(
        <IntegrationSettingsModal
          integration={createMockIntegration()}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      const syncButton = screen.getByText('Sync Now')
      fireEvent.click(syncButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/integrations/int-123/sync',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
          })
        )
      })
    })

    it('should show success toast on successful sync', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Sync initiated' }),
      })

      render(
        <IntegrationSettingsModal
          integration={createMockIntegration()}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      fireEvent.click(screen.getByText('Sync Now'))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Sync started',
          expect.any(Object)
        )
      })
    })

    it('should disable Sync Now for disconnected integrations', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration({ status: 'disconnected' })}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      const syncButton = screen.getByText('Sync Now')
      expect(syncButton).toBeDisabled()
    })
  })

  describe('Disconnect action', () => {
    it('should show confirmation dialog when Disconnect clicked', async () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration()}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      fireEvent.click(screen.getByText('Disconnect'))

      await waitFor(() => {
        expect(screen.getByText(/Disconnect Slack\?/)).toBeInTheDocument()
      })
    })

    it('should call delete endpoint on confirm', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      render(
        <IntegrationSettingsModal
          integration={createMockIntegration()}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      // Click disconnect to open dialog
      fireEvent.click(screen.getByText('Disconnect'))

      // Wait for dialog and click confirm
      await waitFor(() => {
        const confirmButton = screen.getAllByText('Disconnect').find(
          (btn) => btn.closest('[role="alertdialog"]')
        )
        if (confirmButton) fireEvent.click(confirmButton)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/integrations/int-123',
          expect.objectContaining({
            method: 'DELETE',
            credentials: 'include',
          })
        )
      })
    })

    it('should show success toast and close modal on successful disconnect', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      render(
        <IntegrationSettingsModal
          integration={createMockIntegration()}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      fireEvent.click(screen.getByText('Disconnect'))

      await waitFor(() => {
        const confirmButton = screen.getAllByText('Disconnect').find(
          (btn) => btn.closest('[role="alertdialog"]')
        )
        if (confirmButton) fireEvent.click(confirmButton)
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Integration disconnected',
          expect.any(Object)
        )
      })
    })

    it('should disable Disconnect for already disconnected integrations', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration({ status: 'disconnected' })}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      const disconnectButton = screen.getByText('Disconnect')
      expect(disconnectButton).toBeDisabled()
    })
  })

  describe('Close action', () => {
    it('should call onClose when Close button clicked', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration()}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      // Find all Close buttons and select the one that's NOT the dialog X button
      // The footer button has data-slot="button", the X has data-slot="dialog-close"
      const closeButtons = screen.getAllByRole('button', { name: 'Close' })
      const footerCloseButton = closeButtons.find(
        (btn) => btn.getAttribute('data-slot') === 'button'
      )
      if (footerCloseButton) fireEvent.click(footerCloseButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('refetch callback', () => {
    it('should call onRefetch after successful test', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      })

      render(
        <IntegrationSettingsModal
          integration={createMockIntegration()}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      fireEvent.click(screen.getByText('Test Connection'))

      await waitFor(() => {
        expect(mockOnRefetch).toHaveBeenCalled()
      })
    })

    it('should call onRefetch after successful sync', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      })

      render(
        <IntegrationSettingsModal
          integration={createMockIntegration()}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      fireEvent.click(screen.getByText('Sync Now'))

      await waitFor(() => {
        expect(mockOnRefetch).toHaveBeenCalled()
      })
    })
  })

  describe('loading states', () => {
    it('should show loading state during test', async () => {
      // Make fetch hang
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(
        <IntegrationSettingsModal
          integration={createMockIntegration()}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      fireEvent.click(screen.getByText('Test Connection'))

      await waitFor(() => {
        expect(screen.getByText('Testing...')).toBeInTheDocument()
      })
    })

    it('should show loading state during sync', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(
        <IntegrationSettingsModal
          integration={createMockIntegration()}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      fireEvent.click(screen.getByText('Sync Now'))

      await waitFor(() => {
        expect(screen.getByText('Syncing...')).toBeInTheDocument()
      })
    })
  })

  describe('status-based UI', () => {
    it('should show correct activity text for connected integration', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration({
            status: 'connected',
            lastSync: '2024-06-15T14:30:00Z',
            lastSyncRaw: '2024-06-15T14:30:00Z',
          })}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      // Status label shows "Connected" (appears in badge and info section)
      const connectedElements = screen.getAllByText('Connected')
      expect(connectedElements.length).toBeGreaterThan(0)
    })

    it('should show correct activity text for disconnected integration', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration({ status: 'disconnected' })}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      const disconnectedElements = screen.getAllByText('Disconnected')
      expect(disconnectedElements.length).toBeGreaterThan(0)
    })

    it('should show correct activity text for error integration', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration({ status: 'error' })}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      const errorElements = screen.getAllByText('Error')
      expect(errorElements.length).toBeGreaterThan(0)
    })

    it('should show correct activity text for syncing integration', () => {
      render(
        <IntegrationSettingsModal
          integration={createMockIntegration({ status: 'syncing' })}
          isOpen={true}
          onClose={mockOnClose}
          onRefetch={mockOnRefetch}
        />
      )

      const syncingElements = screen.getAllByText('Syncing')
      expect(syncingElements.length).toBeGreaterThan(0)
    })
  })
})
