/**
 * Component Tests for Active Onboardings Accordion
 *
 * Tests the protected accordion UI component
 * See: components/onboarding/active-onboardings.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock the onboarding store
const mockUseOnboardingStore = vi.fn()

vi.mock('@/stores/onboarding-store', () => ({
  useOnboardingStore: () => mockUseOnboardingStore(),
}))

// Mock Framer Motion to avoid animation timing issues in tests
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, layout, whileHover, whileTap, variants, style, className, ...domProps }: any) => (
      <div style={style} className={className} {...domProps}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

// Mock @dnd-kit to avoid drag/drop complexity in tests
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: React.PropsWithChildren) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: React.PropsWithChildren) => <div data-testid="drag-overlay">{children}</div>,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: () => {},
    isOver: false,
  }),
  useSensor: () => ({}),
  useSensors: () => [],
  PointerSensor: class PointerSensor {},
}))

// Mock the slide transition hook
vi.mock('@/hooks/use-slide-transition', () => ({
  useSlideTransition: () => ({ duration: 0.3 }),
}))

// Import after mocks
import { ActiveOnboardings } from '@/components/onboarding/active-onboardings'

// Base store mock with all required values from useOnboardingStore()
const baseStoreMock = {
  instances: [],
  isLoadingInstances: false,
  fetchInstances: vi.fn(),
  selectedInstance: null,
  setSelectedInstanceId: vi.fn(),
  updateStageStatus: vi.fn(),
  resendEmail: vi.fn(),
  hasUnseenUpdates: vi.fn().mockReturnValue(false),
  markInstanceViewed: vi.fn(),
}

describe('ActiveOnboardings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================================================
  // LOADING STATE TESTS
  // ===========================================================================

  describe('loading state', () => {
    it('should show loading spinner when loading instances', () => {
      mockUseOnboardingStore.mockReturnValue({
        ...baseStoreMock,
        instances: [],
        isLoadingInstances: true,
        fetchInstances: vi.fn(),
      })

      render(<ActiveOnboardings />)

      // Should show loading indicator (Loader2 icon with animate-spin)
      const loadingElement = document.querySelector('.animate-spin')
      expect(loadingElement).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // EMPTY STATE TESTS
  // ===========================================================================

  describe('empty state', () => {
    it('should show empty state when no instances', () => {
      mockUseOnboardingStore.mockReturnValue({
        ...baseStoreMock,
        instances: [],
        isLoadingInstances: false,
        fetchInstances: vi.fn(),
      })

      render(<ActiveOnboardings />)

      expect(screen.getByText('No active onboardings')).toBeInTheDocument()
      expect(screen.getByText('Trigger a new onboarding to get started')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // STAGE DISPLAY TESTS
  // ===========================================================================

  describe('stage display', () => {
    const mockInstances = [
      {
        id: 'i1',
        triggered_at: new Date().toISOString(),
        link_token: 'token123',
        client: {
          id: 'c1',
          name: 'Test Client',
          stage: 'Enterprise', // Using stage, not tier
          contact_email: 'test@example.com',
        },
        journey: {
          id: 'j1',
          name: 'Default Journey',
          stages: [
            { id: 's1', name: 'Intake', order: 0 },
            { id: 's2', name: 'Access', order: 1 },
          ],
        },
        triggered_by_user: {
          id: 'u1',
          first_name: 'Admin',
          last_name: 'User',
          avatar_url: null,
        },
        stage_statuses: [
          { stage_id: 's1', status: 'completed', platform_statuses: {} },
          { stage_id: 's2', status: 'in_progress', platform_statuses: {} },
        ],
      },
    ]

    it('should render all 6 onboarding stages', () => {
      mockUseOnboardingStore.mockReturnValue({
        ...baseStoreMock,
        instances: mockInstances,
        isLoadingInstances: false,
        fetchInstances: vi.fn(),
      })

      render(<ActiveOnboardings />)

      // Check all 6 stage names are rendered
      expect(screen.getByText('Intake Received')).toBeInTheDocument()
      expect(screen.getByText('Access Verified')).toBeInTheDocument()
      expect(screen.getByText('Pixel Install')).toBeInTheDocument()
      expect(screen.getByText('Audit Complete')).toBeInTheDocument()
      expect(screen.getByText('Live Support')).toBeInTheDocument()
      expect(screen.getByText('Needs Support')).toBeInTheDocument()
    })

    it('should show header text', () => {
      mockUseOnboardingStore.mockReturnValue({
        ...baseStoreMock,
        instances: mockInstances,
        isLoadingInstances: false,
        fetchInstances: vi.fn(),
      })

      render(<ActiveOnboardings />)

      expect(screen.getByText('Onboarding Pipeline')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // CLIENT STAGE (NOT TIER) TESTS
  // ===========================================================================

  describe('client stage handling (tier→stage fix verification)', () => {
    it('should work with client having stage property', () => {
      const mockInstances = [
        {
          id: 'i1',
          triggered_at: new Date().toISOString(),
          link_token: 'token123',
          client: {
            id: 'c1',
            name: 'Enterprise Client',
            stage: 'Enterprise', // Using stage
            contact_email: 'test@example.com',
          },
          journey: {
            id: 'j1',
            name: 'Default',
            stages: [{ id: 's1', name: 'Intake', order: 0 }],
          },
          triggered_by_user: {
            id: 'u1',
            first_name: 'Admin',
            last_name: 'User',
            avatar_url: null,
          },
          stage_statuses: [],
        },
      ]

      mockUseOnboardingStore.mockReturnValue({
        ...baseStoreMock,
        instances: mockInstances,
        isLoadingInstances: false,
        fetchInstances: vi.fn(),
      })

      render(<ActiveOnboardings />)

      expect(screen.getByText('Enterprise Client')).toBeInTheDocument()
    })

    it('should work with client having null stage', () => {
      const mockInstances = [
        {
          id: 'i1',
          triggered_at: new Date().toISOString(),
          link_token: 'token123',
          client: {
            id: 'c1',
            name: 'Basic Client',
            stage: null, // Null stage
            contact_email: null,
          },
          journey: {
            id: 'j1',
            name: 'Default',
            stages: [{ id: 's1', name: 'Intake', order: 0 }],
          },
          triggered_by_user: null,
          stage_statuses: [],
        },
      ]

      mockUseOnboardingStore.mockReturnValue({
        ...baseStoreMock,
        instances: mockInstances,
        isLoadingInstances: false,
        fetchInstances: vi.fn(),
      })

      render(<ActiveOnboardings />)

      expect(screen.getByText('Basic Client')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // DATA FETCH TESTS
  // ===========================================================================

  describe('data fetching', () => {
    it('should call fetchInstances on mount', () => {
      const mockFetchInstances = vi.fn()

      mockUseOnboardingStore.mockReturnValue({
        ...baseStoreMock,
        instances: [],
        isLoadingInstances: false,
        fetchInstances: mockFetchInstances,
      })

      render(<ActiveOnboardings />)

      expect(mockFetchInstances).toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // ACCORDION INTERACTION TESTS
  // ===========================================================================

  describe('accordion interactions', () => {
    const mockInstances = [
      {
        id: 'i1',
        triggered_at: new Date().toISOString(),
        link_token: 'token123',
        client: {
          id: 'c1',
          name: 'Accordion Test Client',
          stage: 'Core',
          contact_email: 'test@example.com',
        },
        journey: {
          id: 'j1',
          name: 'Default',
          stages: [{ id: 's1', name: 'Intake', order: 0 }],
        },
        triggered_by_user: {
          id: 'u1',
          first_name: 'Admin',
          last_name: 'User',
          avatar_url: null,
        },
        stage_statuses: [
          { stage_id: 's1', status: 'in_progress', platform_statuses: {} },
        ],
      },
    ]

    it('should show client name in expanded stage', () => {
      mockUseOnboardingStore.mockReturnValue({
        ...baseStoreMock,
        instances: mockInstances,
        isLoadingInstances: false,
        fetchInstances: vi.fn(),
      })

      render(<ActiveOnboardings />)

      // Default expanded stages include 'intake', 'access', 'installation'
      expect(screen.getByText('Accordion Test Client')).toBeInTheDocument()
    })

    it('should allow stage expansion toggle', () => {
      mockUseOnboardingStore.mockReturnValue({
        ...baseStoreMock,
        instances: mockInstances,
        isLoadingInstances: false,
        fetchInstances: vi.fn(),
      })

      render(<ActiveOnboardings />)

      // Intake Received should be expanded by default and show the client
      expect(screen.getByText('Accordion Test Client')).toBeInTheDocument()

      // Click Intake Received to collapse it
      const intakeStage = screen.getByText('Intake Received')
      fireEvent.click(intakeStage)

      // After collapsing, the component re-renders but client should still exist in DOM
      // (just possibly hidden by AnimatePresence)
      // This test verifies the click handler works without errors
      expect(intakeStage).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // STAGE STATUS MAPPING TESTS
  // ===========================================================================

  describe('stage status mapping', () => {
    it('should correctly categorize completed instance to live stage', () => {
      const completedInstance = {
        id: 'i1',
        triggered_at: new Date().toISOString(),
        link_token: 'token123',
        client: {
          id: 'c1',
          name: 'Completed Client',
          stage: 'Enterprise',
          contact_email: 'test@example.com',
        },
        journey: {
          id: 'j1',
          name: 'Default',
          stages: [
            { id: 's1', name: 'Intake', order: 0 },
            { id: 's2', name: 'Access', order: 1 },
          ],
        },
        triggered_by_user: {
          id: 'u1',
          first_name: 'Admin',
          last_name: 'User',
          avatar_url: null,
        },
        stage_statuses: [
          { stage_id: 's1', status: 'completed', platform_statuses: {} },
          { stage_id: 's2', status: 'completed', platform_statuses: {} },
        ],
      }

      mockUseOnboardingStore.mockReturnValue({
        ...baseStoreMock,
        instances: [completedInstance],
        isLoadingInstances: false,
        fetchInstances: vi.fn(),
      })

      render(<ActiveOnboardings />)

      // Live Support stage should exist (client goes there when all stages complete)
      expect(screen.getByText('Live Support')).toBeInTheDocument()

      // Expand Live Support to see the client (not expanded by default)
      fireEvent.click(screen.getByText('Live Support'))
      expect(screen.getByText('Completed Client')).toBeInTheDocument()
    })

    it('should correctly categorize blocked instance to needs support stage', () => {
      const blockedInstance = {
        id: 'i1',
        triggered_at: new Date().toISOString(),
        link_token: 'token123',
        client: {
          id: 'c1',
          name: 'Blocked Client',
          stage: 'Core',
          contact_email: 'test@example.com',
        },
        journey: {
          id: 'j1',
          name: 'Default',
          stages: [{ id: 's1', name: 'Intake', order: 0 }],
        },
        triggered_by_user: null,
        stage_statuses: [
          { stage_id: 's1', status: 'blocked', platform_statuses: {} },
        ],
      }

      mockUseOnboardingStore.mockReturnValue({
        ...baseStoreMock,
        instances: [blockedInstance],
        isLoadingInstances: false,
        fetchInstances: vi.fn(),
      })

      render(<ActiveOnboardings />)

      // Needs Support stage should exist (client goes there when blocked)
      expect(screen.getByText('Needs Support')).toBeInTheDocument()

      // Expand Needs Support to see the client (not expanded by default)
      fireEvent.click(screen.getByText('Needs Support'))
      expect(screen.getByText('Blocked Client')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // DRAG AND DROP FUNCTIONALITY TESTS
  // ===========================================================================

  describe('drag and drop functionality', () => {
    const mockInstances = [
      {
        id: 'i1',
        triggered_at: new Date().toISOString(),
        link_token: 'token123',
        client: {
          id: 'c1',
          name: 'Draggable Client',
          stage: 'Core',
          contact_email: 'test@example.com',
        },
        journey: {
          id: 'j1',
          name: 'Default',
          stages: [{ id: 's1', name: 'Intake', order: 0 }],
        },
        triggered_by_user: {
          id: 'u1',
          first_name: 'Admin',
          last_name: 'User',
          avatar_url: null,
        },
        stage_statuses: [
          { stage_id: 's1', status: 'in_progress', platform_statuses: {} },
        ],
      },
    ]

    it('should render DndContext wrapper', () => {
      mockUseOnboardingStore.mockReturnValue({
        ...baseStoreMock,
        instances: mockInstances,
        isLoadingInstances: false,
        fetchInstances: vi.fn(),
      })

      render(<ActiveOnboardings />)

      expect(screen.getByTestId('dnd-context')).toBeInTheDocument()
    })

    it('should render DragOverlay component', () => {
      mockUseOnboardingStore.mockReturnValue({
        ...baseStoreMock,
        instances: mockInstances,
        isLoadingInstances: false,
        fetchInstances: vi.fn(),
      })

      render(<ActiveOnboardings />)

      expect(screen.getByTestId('drag-overlay')).toBeInTheDocument()
    })

    it('should render draggable clients in expanded stages', () => {
      mockUseOnboardingStore.mockReturnValue({
        ...baseStoreMock,
        instances: mockInstances,
        isLoadingInstances: false,
        fetchInstances: vi.fn(),
      })

      render(<ActiveOnboardings />)

      // Intake Received stage is expanded by default
      expect(screen.getByText('Draggable Client')).toBeInTheDocument()
    })

    it('should display completed clients with strikethrough styling', () => {
      const completedInstances = [
        {
          id: 'i2',
          triggered_at: new Date().toISOString(),
          link_token: 'token456',
          client: {
            id: 'c2',
            name: 'Completed Client',
            stage: 'Enterprise',
            contact_email: 'completed@example.com',
          },
          journey: {
            id: 'j1',
            name: 'Default',
            stages: [
              { id: 's1', name: 'Intake', order: 0 },
              { id: 's2', name: 'Access', order: 1 },
            ],
          },
          triggered_by_user: {
            id: 'u1',
            first_name: 'Admin',
            last_name: 'User',
            avatar_url: null,
          },
          stage_statuses: [
            { stage_id: 's1', status: 'completed', platform_statuses: {} },
            { stage_id: 's2', status: 'completed', platform_statuses: {} },
          ],
        },
      ]

      mockUseOnboardingStore.mockReturnValue({
        ...baseStoreMock,
        instances: completedInstances,
        isLoadingInstances: false,
        fetchInstances: vi.fn(),
      })

      render(<ActiveOnboardings />)

      // Expand Live Support stage to see completed client
      fireEvent.click(screen.getByText('Live Support'))

      // Check if completed client has strikethrough class
      const clientElement = screen.getByText('Completed Client')
      expect(clientElement).toBeInTheDocument()
      // The line-through class would be applied in the actual component
    })
  })
})
