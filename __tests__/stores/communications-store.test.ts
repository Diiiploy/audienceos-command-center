/**
 * Communications Store Tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useCommunicationsStore, filterCommunications, type CommunicationWithMeta, type CommunicationsFilters } from '@/stores/communications-store'

describe('Communications Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCommunicationsStore.setState({
      communications: [],
      threads: [],
      filters: {
        source: 'all',
        needsReply: false,
        searchQuery: '',
        isRead: null,
      },
      selectedMessageId: null,
      expandedThreadIds: new Set(),
      isLoading: false,
      error: null,
      cursor: null,
      hasMore: true,
      unreadCount: 0,
      needsReplyCount: 0,
    })
  })

  const createMockCommunication = (overrides: Partial<CommunicationWithMeta> = {}): CommunicationWithMeta => ({
    id: `comm-${Math.random().toString(36).substr(2, 9)}`,
    agency_id: 'agency-1',
    client_id: 'client-1',
    platform: 'gmail',
    message_id: 'msg-1',
    thread_id: null,
    sender_email: 'sender@example.com',
    sender_name: 'Test Sender',
    subject: 'Test Subject',
    content: 'Test content',
    is_inbound: true,
    needs_reply: false,
    received_at: new Date().toISOString(),
    replied_at: null,
    replied_by: null,
    created_at: new Date().toISOString(),
    is_read: false,
    ...overrides,
  })

  describe('setCommunications', () => {
    it('should set communications and calculate counts', () => {
      const comms = [
        createMockCommunication({ is_read: false, needs_reply: true }),
        createMockCommunication({ is_read: true, needs_reply: false }),
        createMockCommunication({ is_read: false, needs_reply: true }),
      ]

      useCommunicationsStore.getState().setCommunications(comms)
      const state = useCommunicationsStore.getState()

      expect(state.communications).toHaveLength(3)
      expect(state.unreadCount).toBe(2)
      expect(state.needsReplyCount).toBe(2)
    })

    it('should build thread hierarchy', () => {
      const threadId = 'thread-1'
      const comms = [
        createMockCommunication({ id: 'msg-1', thread_id: threadId, received_at: '2024-01-01T10:00:00Z' }),
        createMockCommunication({ id: 'msg-2', thread_id: threadId, received_at: '2024-01-01T11:00:00Z' }),
        createMockCommunication({ id: 'msg-3', thread_id: threadId, received_at: '2024-01-01T12:00:00Z' }),
      ]

      useCommunicationsStore.getState().setCommunications(comms)
      const state = useCommunicationsStore.getState()

      expect(state.threads).toHaveLength(1)
      expect(state.threads[0].id).toBe(threadId)
      expect(state.threads[0].rootMessage.id).toBe('msg-1')
      expect(state.threads[0].replies).toHaveLength(2)
    })
  })

  describe('addCommunication', () => {
    it('should add new communication to the beginning', () => {
      const existing = createMockCommunication({ id: 'existing' })
      useCommunicationsStore.getState().setCommunications([existing])

      const newComm = createMockCommunication({ id: 'new' })
      useCommunicationsStore.getState().addCommunication(newComm)

      const state = useCommunicationsStore.getState()
      expect(state.communications).toHaveLength(2)
      expect(state.communications[0].id).toBe('new')
    })

    it('should update counts when adding communication', () => {
      const existing = createMockCommunication({ is_read: true, needs_reply: false })
      useCommunicationsStore.getState().setCommunications([existing])

      const newComm = createMockCommunication({ is_read: false, needs_reply: true })
      useCommunicationsStore.getState().addCommunication(newComm)

      const state = useCommunicationsStore.getState()
      expect(state.unreadCount).toBe(1)
      expect(state.needsReplyCount).toBe(1)
    })
  })

  describe('updateCommunication', () => {
    it('should update specific communication', () => {
      const comm = createMockCommunication({ id: 'test', is_read: false })
      useCommunicationsStore.getState().setCommunications([comm])

      useCommunicationsStore.getState().updateCommunication('test', { is_read: true })

      const state = useCommunicationsStore.getState()
      expect(state.communications[0].is_read).toBe(true)
    })

    it('should recalculate counts after update', () => {
      const comm = createMockCommunication({ id: 'test', is_read: false, needs_reply: true })
      useCommunicationsStore.getState().setCommunications([comm])

      expect(useCommunicationsStore.getState().unreadCount).toBe(1)
      expect(useCommunicationsStore.getState().needsReplyCount).toBe(1)

      useCommunicationsStore.getState().updateCommunication('test', { is_read: true, needs_reply: false })

      const state = useCommunicationsStore.getState()
      expect(state.unreadCount).toBe(0)
      expect(state.needsReplyCount).toBe(0)
    })
  })

  describe('setFilters', () => {
    it('should update filters partially', () => {
      useCommunicationsStore.getState().setFilters({ source: 'slack' })

      const state = useCommunicationsStore.getState()
      expect(state.filters.source).toBe('slack')
      expect(state.filters.needsReply).toBe(false) // unchanged
    })

    it('should reset pagination when filters change', () => {
      useCommunicationsStore.setState({ cursor: 'old-cursor', hasMore: false })

      useCommunicationsStore.getState().setFilters({ needsReply: true })

      const state = useCommunicationsStore.getState()
      expect(state.cursor).toBeNull()
      expect(state.hasMore).toBe(true)
    })
  })

  describe('resetFilters', () => {
    it('should reset all filters to defaults', () => {
      useCommunicationsStore.getState().setFilters({
        source: 'slack',
        needsReply: true,
        searchQuery: 'test',
        isRead: true,
      })

      useCommunicationsStore.getState().resetFilters()

      const state = useCommunicationsStore.getState()
      expect(state.filters.source).toBe('all')
      expect(state.filters.needsReply).toBe(false)
      expect(state.filters.searchQuery).toBe('')
      expect(state.filters.isRead).toBeNull()
    })
  })

  describe('toggleThreadExpanded', () => {
    it('should expand collapsed thread', () => {
      const comm = createMockCommunication({ id: 'thread-1', thread_id: null })
      useCommunicationsStore.getState().setCommunications([comm])

      useCommunicationsStore.getState().toggleThreadExpanded('thread-1')

      const state = useCommunicationsStore.getState()
      expect(state.expandedThreadIds.has('thread-1')).toBe(true)
    })

    it('should collapse expanded thread', () => {
      const comm = createMockCommunication({ id: 'thread-1', thread_id: null })
      useCommunicationsStore.getState().setCommunications([comm])
      useCommunicationsStore.setState({
        expandedThreadIds: new Set(['thread-1']),
      })

      useCommunicationsStore.getState().toggleThreadExpanded('thread-1')

      const state = useCommunicationsStore.getState()
      expect(state.expandedThreadIds.has('thread-1')).toBe(false)
    })
  })

  describe('markAsRead', () => {
    it('should mark communication as read', () => {
      const comm = createMockCommunication({ id: 'test', is_read: false })
      useCommunicationsStore.getState().setCommunications([comm])

      useCommunicationsStore.getState().markAsRead('test')

      const state = useCommunicationsStore.getState()
      expect(state.communications[0].is_read).toBe(true)
    })
  })

  describe('markAsReplied', () => {
    it('should mark communication as replied', () => {
      const comm = createMockCommunication({ id: 'test', needs_reply: true })
      useCommunicationsStore.getState().setCommunications([comm])

      useCommunicationsStore.getState().markAsReplied('test', 'user-1')

      const state = useCommunicationsStore.getState()
      expect(state.communications[0].needs_reply).toBe(false)
      expect(state.communications[0].replied_by).toBe('user-1')
      expect(state.communications[0].replied_at).not.toBeNull()
    })
  })
})

describe('filterCommunications', () => {
  const createMockCommunication = (overrides: Partial<CommunicationWithMeta> = {}): CommunicationWithMeta => ({
    id: `comm-${Math.random().toString(36).substr(2, 9)}`,
    agency_id: 'agency-1',
    client_id: 'client-1',
    platform: 'gmail',
    message_id: 'msg-1',
    thread_id: null,
    sender_email: 'sender@example.com',
    sender_name: 'Test Sender',
    subject: 'Test Subject',
    content: 'Test content',
    is_inbound: true,
    needs_reply: false,
    received_at: new Date().toISOString(),
    replied_at: null,
    replied_by: null,
    created_at: new Date().toISOString(),
    is_read: false,
    ...overrides,
  })

  const defaultFilters: CommunicationsFilters = {
    source: 'all',
    needsReply: false,
    searchQuery: '',
    isRead: null,
  }

  describe('source filter', () => {
    it('should return all when source is "all"', () => {
      const comms = [
        createMockCommunication({ platform: 'gmail' }),
        createMockCommunication({ platform: 'slack' }),
      ]

      const result = filterCommunications(comms, { ...defaultFilters, source: 'all' })
      expect(result).toHaveLength(2)
    })

    it('should filter by gmail', () => {
      const comms = [
        createMockCommunication({ platform: 'gmail' }),
        createMockCommunication({ platform: 'slack' }),
      ]

      const result = filterCommunications(comms, { ...defaultFilters, source: 'gmail' })
      expect(result).toHaveLength(1)
      expect(result[0].platform).toBe('gmail')
    })

    it('should filter by slack', () => {
      const comms = [
        createMockCommunication({ platform: 'gmail' }),
        createMockCommunication({ platform: 'slack' }),
      ]

      const result = filterCommunications(comms, { ...defaultFilters, source: 'slack' })
      expect(result).toHaveLength(1)
      expect(result[0].platform).toBe('slack')
    })
  })

  describe('needsReply filter', () => {
    it('should not filter when needsReply is false', () => {
      const comms = [
        createMockCommunication({ needs_reply: true }),
        createMockCommunication({ needs_reply: false }),
      ]

      const result = filterCommunications(comms, { ...defaultFilters, needsReply: false })
      expect(result).toHaveLength(2)
    })

    it('should filter to only needs reply when true', () => {
      const comms = [
        createMockCommunication({ needs_reply: true }),
        createMockCommunication({ needs_reply: false }),
      ]

      const result = filterCommunications(comms, { ...defaultFilters, needsReply: true })
      expect(result).toHaveLength(1)
      expect(result[0].needs_reply).toBe(true)
    })
  })

  describe('isRead filter', () => {
    it('should not filter when isRead is null', () => {
      const comms = [
        createMockCommunication({ is_read: true }),
        createMockCommunication({ is_read: false }),
      ]

      const result = filterCommunications(comms, { ...defaultFilters, isRead: null })
      expect(result).toHaveLength(2)
    })

    it('should filter to only read when isRead is true', () => {
      const comms = [
        createMockCommunication({ is_read: true }),
        createMockCommunication({ is_read: false }),
      ]

      const result = filterCommunications(comms, { ...defaultFilters, isRead: true })
      expect(result).toHaveLength(1)
      expect(result[0].is_read).toBe(true)
    })

    it('should filter to only unread when isRead is false', () => {
      const comms = [
        createMockCommunication({ is_read: true }),
        createMockCommunication({ is_read: false }),
      ]

      const result = filterCommunications(comms, { ...defaultFilters, isRead: false })
      expect(result).toHaveLength(1)
      expect(result[0].is_read).toBe(false)
    })
  })

  describe('searchQuery filter', () => {
    it('should not filter when searchQuery is empty', () => {
      const comms = [
        createMockCommunication({ content: 'Hello world' }),
        createMockCommunication({ content: 'Goodbye world' }),
      ]

      const result = filterCommunications(comms, { ...defaultFilters, searchQuery: '' })
      expect(result).toHaveLength(2)
    })

    it('should filter by content', () => {
      const comms = [
        createMockCommunication({ content: 'Hello world' }),
        createMockCommunication({ content: 'Goodbye world' }),
      ]

      const result = filterCommunications(comms, { ...defaultFilters, searchQuery: 'Hello' })
      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('Hello world')
    })

    it('should filter by subject', () => {
      const comms = [
        createMockCommunication({ subject: 'Important meeting' }),
        createMockCommunication({ subject: 'Casual chat' }),
      ]

      const result = filterCommunications(comms, { ...defaultFilters, searchQuery: 'meeting' })
      expect(result).toHaveLength(1)
    })

    it('should filter by sender name', () => {
      const comms = [
        createMockCommunication({ sender_name: 'John Doe' }),
        createMockCommunication({ sender_name: 'Jane Smith' }),
      ]

      const result = filterCommunications(comms, { ...defaultFilters, searchQuery: 'john' })
      expect(result).toHaveLength(1)
    })

    it('should filter by sender email', () => {
      const comms = [
        createMockCommunication({ sender_email: 'john@example.com' }),
        createMockCommunication({ sender_email: 'jane@example.com' }),
      ]

      const result = filterCommunications(comms, { ...defaultFilters, searchQuery: 'john@' })
      expect(result).toHaveLength(1)
    })

    it('should be case insensitive', () => {
      const comms = [
        createMockCommunication({ content: 'UPPERCASE content' }),
      ]

      const result = filterCommunications(comms, { ...defaultFilters, searchQuery: 'uppercase' })
      expect(result).toHaveLength(1)
    })
  })

  describe('combined filters', () => {
    it('should apply all filters together', () => {
      const comms = [
        createMockCommunication({ platform: 'gmail', needs_reply: true, is_read: false, content: 'urgent message' }),
        createMockCommunication({ platform: 'gmail', needs_reply: true, is_read: false, content: 'not matching' }),
        createMockCommunication({ platform: 'slack', needs_reply: true, is_read: false, content: 'urgent message' }),
        createMockCommunication({ platform: 'gmail', needs_reply: false, is_read: false, content: 'urgent message' }),
      ]

      const result = filterCommunications(comms, {
        source: 'gmail',
        needsReply: true,
        isRead: false,
        searchQuery: 'urgent',
      })

      expect(result).toHaveLength(1)
      expect(result[0].platform).toBe('gmail')
      expect(result[0].needs_reply).toBe(true)
      expect(result[0].content).toContain('urgent')
    })
  })
})
