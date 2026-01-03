'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CommunicationsTimeline } from './communications-timeline'
import { SourceFilter } from './source-filter'
import { SearchInput } from './search-input'
import { NeedsReplyBadge } from './needs-reply-badge'
import { ReplyComposer } from './reply-composer'
import {
  useCommunicationsStore,
  filterCommunications,
  type SourceFilter as SourceFilterType,
  type CommunicationWithMeta,
} from '@/stores/communications-store'
import { cn } from '@/lib/utils'

interface CommunicationsHubProps {
  clientId: string
  className?: string
}

export function CommunicationsHub({ clientId: _clientId, className }: CommunicationsHubProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Store state
  const {
    communications,
    threads,
    filters,
    selectedMessageId,
    isLoading,
    hasMore,
    needsReplyCount,
    setCommunications: _setCommunications,
    addCommunication,
    updateCommunication,
    setThreads: _setThreads,
    toggleThreadExpanded,
    setFilters,
    setSelectedMessage,
    setLoading,
    setCursor: _setCursor,
    setHasMore: _setHasMore,
    markAsRead,
    markAsReplied,
  } = useCommunicationsStore()

  // Local state for reply composer
  const [replyingToId, setReplyingToId] = useState<string | null>(null)

  // Get the message being replied to
  const replyingToMessage = useMemo(() => {
    if (!replyingToId) return null
    return communications.find(c => c.id === replyingToId) || null
  }, [replyingToId, communications])

  // Sync URL params to filters on mount
  useEffect(() => {
    const source = searchParams.get('source') as SourceFilterType | null
    const needsReply = searchParams.get('needsReply') === 'true'
    const search = searchParams.get('q') || ''

    setFilters({
      source: source || 'all',
      needsReply,
      searchQuery: search,
    })
  }, [searchParams, setFilters])

  // Update URL when filters change
  const updateUrlParams = useCallback(
    (newFilters: Partial<typeof filters>) => {
      const params = new URLSearchParams(searchParams.toString())

      if (newFilters.source !== undefined) {
        if (newFilters.source === 'all') {
          params.delete('source')
        } else {
          params.set('source', newFilters.source)
        }
      }

      if (newFilters.needsReply !== undefined) {
        if (newFilters.needsReply) {
          params.set('needsReply', 'true')
        } else {
          params.delete('needsReply')
        }
      }

      if (newFilters.searchQuery !== undefined) {
        if (newFilters.searchQuery) {
          params.set('q', newFilters.searchQuery)
        } else {
          params.delete('q')
        }
      }

      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname

      router.replace(newUrl, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  // Filter handlers
  const handleSourceChange = useCallback(
    (source: SourceFilterType) => {
      setFilters({ source })
      updateUrlParams({ source })
    },
    [setFilters, updateUrlParams]
  )

  const handleNeedsReplyToggle = useCallback(() => {
    const newValue = !filters.needsReply
    setFilters({ needsReply: newValue })
    updateUrlParams({ needsReply: newValue })
  }, [filters.needsReply, setFilters, updateUrlParams])

  const handleSearchChange = useCallback(
    (searchQuery: string) => {
      setFilters({ searchQuery })
      updateUrlParams({ searchQuery })
    },
    [setFilters, updateUrlParams]
  )

  // Message actions
  const handleSelectMessage = useCallback(
    (id: string) => {
      setSelectedMessage(id)
      markAsRead(id)
    },
    [setSelectedMessage, markAsRead]
  )

  const handleReply = useCallback((id: string) => {
    setReplyingToId(id)
  }, [])

  const handleCloseReply = useCallback(() => {
    setReplyingToId(null)
  }, [])

  const handleSendReply = useCallback(
    async (content: string) => {
      if (!replyingToMessage) return

      // TODO: Call API to send reply
      // For now, just mark as replied
      markAsReplied(replyingToMessage.id, 'current-user-id')

      // Optimistic update - add the sent message
      const newMessage: CommunicationWithMeta = {
        id: `temp-${Date.now()}`,
        agency_id: replyingToMessage.agency_id,
        client_id: replyingToMessage.client_id,
        platform: replyingToMessage.platform,
        thread_id: replyingToMessage.thread_id || replyingToMessage.id,
        message_id: `sent-${Date.now()}`,
        sender_email: null, // Current user
        sender_name: 'You',
        subject: replyingToMessage.subject
          ? `Re: ${replyingToMessage.subject}`
          : null,
        content,
        is_inbound: false,
        needs_reply: false,
        replied_at: null,
        replied_by: null,
        received_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        is_read: true,
        reply_to_id: replyingToMessage.id,
      }

      addCommunication(newMessage)
    },
    [replyingToMessage, markAsReplied, addCommunication]
  )

  const handleGenerateDraft = useCallback(
    async (tone: 'professional' | 'casual'): Promise<string> => {
      if (!replyingToMessage) return ''

      // TODO: Call AI API to generate draft
      // For now, return a placeholder
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (tone === 'professional') {
        return `Thank you for reaching out. I've reviewed your message and wanted to follow up.\n\nI'll look into this and get back to you with more details shortly.\n\nBest regards`
      } else {
        return `Hey! Thanks for the message.\n\nLet me check on this and I'll get back to you soon.\n\nCheers`
      }
    },
    [replyingToMessage]
  )

  const handleMarkNeedsReply = useCallback(
    (id: string, needsReply: boolean) => {
      updateCommunication(id, { needs_reply: needsReply })
    },
    [updateCommunication]
  )

  const handleLoadMore = useCallback(() => {
    // TODO: Implement pagination with cursor
  }, [])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    // TODO: Fetch fresh data from API
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setLoading(false)
  }, [setLoading])

  // Filtered threads
  const filteredCommunications = useMemo(
    () => filterCommunications(communications, filters),
    [communications, filters]
  )

  // Platform counts for filter badges
  const slackCount = useMemo(
    () => communications.filter((c) => c.platform === 'slack').length,
    [communications]
  )
  const gmailCount = useMemo(
    () => communications.filter((c) => c.platform === 'gmail').length,
    [communications]
  )

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with filters */}
      <div className="flex flex-col gap-3 p-4 border-b">
        {/* Top row: Source filter + Refresh */}
        <div className="flex items-center justify-between gap-4">
          <SourceFilter
            value={filters.source}
            onChange={handleSourceChange}
            slackCount={slackCount}
            gmailCount={gmailCount}
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw
              className={cn('h-4 w-4', isLoading && 'animate-spin')}
            />
          </Button>
        </div>

        {/* Second row: Search + Needs Reply */}
        <div className="flex items-center gap-3">
          <SearchInput
            value={filters.searchQuery}
            onChange={handleSearchChange}
            placeholder="Search messages..."
            className="flex-1"
          />

          <NeedsReplyBadge
            count={needsReplyCount}
            active={filters.needsReply}
            onClick={handleNeedsReplyToggle}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 min-h-0">
        <CommunicationsTimeline
          threads={threads.filter((t) =>
            filteredCommunications.some((c) => c.id === t.rootMessage.id)
          )}
          isLoading={isLoading}
          hasMore={hasMore}
          selectedMessageId={selectedMessageId}
          onSelectMessage={handleSelectMessage}
          onReply={handleReply}
          onMarkAsRead={markAsRead}
          onMarkNeedsReply={handleMarkNeedsReply}
          onToggleThreadExpanded={toggleThreadExpanded}
          onLoadMore={handleLoadMore}
          className="h-full"
        />
      </div>

      {/* Reply composer */}
      {replyingToMessage && (
        <div className="p-4 border-t">
          <ReplyComposer
            message={replyingToMessage}
            onSend={handleSendReply}
            onGenerateDraft={handleGenerateDraft}
            onClose={handleCloseReply}
          />
        </div>
      )}
    </div>
  )
}
