"use client"

/**
 * ChatInterface - War Room style glassmorphism chat (DARK THEME)
 *
 * Architecture:
 * 1. Persistent Input Bar - always visible at bottom
 * 2. Slide-up Message Panel - appears when input is focused
 *
 * Ported from Holy Grail Chat with dark theme adaptations.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import {
  MessageSquare,
  Send,
  Sparkles,
  Loader2,
  Maximize2,
  Minimize2,
  Paperclip,
  Globe,
  Database,
  MessageCircle,
  LayoutDashboard,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useStreamingText } from "./use-streaming-text"
import { TypingCursor } from "./typing-cursor"
import type { ChatMessage as ChatMessageType, RouteType, Citation, SessionContext } from "@/lib/chat/types"

// Panel dimensions
const PANEL_WIDTH = "85%"
const MAX_PANEL_WIDTH = "1000px"

// Safe markdown elements - XSS protection
const SAFE_MARKDOWN_ELEMENTS = [
  "p", "br", "strong", "em", "b", "i", "u",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "code", "pre",
  "a", "hr",
]

interface ChatInterfaceProps {
  agencyId: string
  userId?: string
  context?: SessionContext
  onSendMessage?: (message: string) => void
}

export function ChatInterface({
  agencyId,
  userId = "user",
  context,
  onSendMessage,
}: ChatInterfaceProps) {
  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [panelHeight, setPanelHeight] = useState(60)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ y: number; height: number } | null>(null)

  // Chat state
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => crypto.randomUUID()) // Generate session ID once

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Streaming text hook
  const streaming = useStreamingText({ charsPerSecond: 40 })

  // Track if user has manually scrolled up
  const [userScrolledUp, setUserScrolledUp] = useState(false)

  // Drag handle functionality
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = { y: e.clientY, height: panelHeight }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return
      const deltaY = dragStartRef.current.y - e.clientY
      const deltaVh = (deltaY / window.innerHeight) * 100
      const newHeight = Math.min(90, Math.max(30, dragStartRef.current.height + deltaVh))
      setPanelHeight(newHeight)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      dragStartRef.current = null
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  // Detect when user scrolls up manually
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    setUserScrolledUp(!isAtBottom)
  }, [])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isPanelOpen && !userScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages.length, isPanelOpen, userScrolledUp])

  // Load messages from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`cc-chat-${agencyId}-${userId}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setMessages(
          parsed.map((m: ChatMessageType) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
        )
      } catch {
        // Invalid stored data
      }
    }
  }, [agencyId, userId])

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        `cc-chat-${agencyId}-${userId}`,
        JSON.stringify(messages)
      )
    }
  }, [messages, agencyId, userId])

  // Handle input focus - opens panel
  const handleInputFocus = () => {
    if (!isPanelOpen) {
      setIsPanelOpen(true)
      setIsClosing(false)
    }
  }

  // Close panel with animation
  const closePanel = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsPanelOpen(false)
      setIsClosing(false)
    }, 200)
  }

  // Handle textarea change with auto-resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
  }

  // Core chat function
  const sendChatMessage = async (messageContent: string) => {
    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    streaming.reset()

    try {
      const response = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Send auth cookies
        body: JSON.stringify({
          message: messageContent,
          sessionId,
          agencyId,
          userId,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const assistantMessage: ChatMessageType = {
        id: data.id || crypto.randomUUID(),
        role: "assistant",
        content: data.content || "I received your message.",
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        route: data.route,
        citations: data.citations || [],
        suggestions: data.suggestions,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        timestamp: new Date(),
        route: "casual",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle send button / Enter key
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const message = inputValue.trim()
    setInputValue("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    onSendMessage?.(message)
    await sendChatMessage(message)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle suggestion pill click
  const handleSuggestionSelect = async (suggestion: string) => {
    if (isLoading) return
    await sendChatMessage(suggestion)
  }

  // CSS Keyframes for slide animations
  useEffect(() => {
    const styleId = "cc-chat-animations"
    const refCountAttr = "data-ref-count"
    let existingStyle = document.getElementById(styleId) as HTMLStyleElement | null

    if (!existingStyle) {
      existingStyle = document.createElement("style")
      existingStyle.id = styleId
      existingStyle.setAttribute(refCountAttr, "1")
      existingStyle.textContent = `
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(100%); opacity: 0; }
        }
      `
      document.head.appendChild(existingStyle)
    } else {
      const count = parseInt(existingStyle.getAttribute(refCountAttr) || "0", 10)
      existingStyle.setAttribute(refCountAttr, String(count + 1))
    }

    return () => {
      const style = document.getElementById(styleId)
      if (style) {
        const count = parseInt(style.getAttribute(refCountAttr) || "1", 10)
        if (count <= 1) {
          style.remove()
        } else {
          style.setAttribute(refCountAttr, String(count - 1))
        }
      }
    }
  }, [])

  return (
    <div className="relative h-[600px]">
      {/* SLIDE-UP MESSAGE PANEL */}
      {isPanelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 rounded-lg z-10"
            onClick={closePanel}
          />

          {/* Message Panel */}
          <div
            className="absolute left-1/2 bottom-[72px] z-20 flex flex-col"
            style={{
              width: PANEL_WIDTH,
              maxWidth: MAX_PANEL_WIDTH,
              height: `${panelHeight}%`,
              maxHeight: "85%",
              transform: "translateX(-50%)",
              background: "rgba(30, 30, 35, 0.85)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "16px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              animation: isClosing
                ? "slideDown 0.2s ease-out forwards"
                : "slideUp 0.35s ease-out forwards",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header with Handle */}
            <div className="border-b border-white/10 relative">
              {/* Handle Bar */}
              <div
                className={`flex items-center justify-center pt-3 pb-3 px-8 group ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                onMouseDown={handleDragStart}
              >
                <div className={`w-12 h-1 rounded-full pointer-events-none transition-colors ${isDragging ? "bg-blue-500" : "bg-gray-500 group-hover:bg-gray-400"}`} />
              </div>

              {/* Close Button */}
              <button
                onClick={closePanel}
                className="absolute top-2.5 right-2 text-gray-400 hover:text-gray-200 transition-colors p-1 rounded hover:bg-white/5"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Expand Button */}
              <button
                onClick={() => setPanelHeight(panelHeight === 85 ? 50 : 85)}
                className="absolute top-2.5 right-10 text-gray-400 hover:text-gray-200 transition-colors p-1 rounded hover:bg-white/5"
                title={panelHeight === 85 ? "Minimize" : "Expand"}
              >
                {panelHeight === 85 ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Messages Area */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
              style={{ minHeight: 0 }}
            >
              {messages.length === 0 && !isLoading && (
                <div className="text-gray-400 text-center py-8">
                  <div className="flex flex-col items-center">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 mb-4">
                      <Sparkles className="h-8 w-8 text-blue-400" />
                    </div>
                    <p className="text-sm text-gray-400 max-w-[400px]">
                      Ask me anything about your clients, alerts, or agency data.
                      I can search your knowledge base and help with insights.
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg, msgIndex) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  {/* Timestamp and Route Indicator */}
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {msg.role === "assistant" && msg.route && (
                      <RouteIndicator route={msg.route} />
                    )}
                  </div>

                  {/* Message bubble */}
                  <div
                    className={cn(
                      "relative w-full max-w-[80%] p-3 rounded-lg",
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white/5 text-gray-100 border border-white/10"
                    )}
                  >
                    <div className="text-[14px] leading-[1.5]">
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          <MessageContent
                            content={msg.content}
                            citations={msg.citations}
                          />
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      )}
                    </div>
                  </div>

                  {/* Suggestion Pills */}
                  {msg.role === "assistant" &&
                    msg.suggestions &&
                    msg.suggestions.length > 0 &&
                    msgIndex === messages.length - 1 && (
                      <div className="max-w-[80%] mt-2">
                        <SuggestionPills
                          suggestions={msg.suggestions}
                          onSelect={handleSuggestionSelect}
                          disabled={isLoading}
                        />
                      </div>
                    )}
                </div>
              ))}

              {/* Streaming message */}
              {isLoading && streaming.displayedText && (
                <div className="flex flex-col items-start">
                  <div className="max-w-[80%] p-3 rounded-lg bg-white/5 text-gray-100 border border-white/10">
                    <p className="text-[14px] leading-[1.5]">
                      {streaming.displayedText}
                      {streaming.isAnimating && <TypingCursor visible />}
                    </p>
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && !streaming.displayedText && (
                <div className="flex items-center gap-3 text-gray-400">
                  <div className="p-2 rounded-lg bg-white/5">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <span className="text-sm">Thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
              <div style={{ height: "16px", flexShrink: 0 }} />
            </div>
          </div>
        </>
      )}

      {/* PERSISTENT CHAT BAR */}
      <div
        className="absolute bottom-0 left-1/2 flex items-center gap-3 z-30"
        style={{
          width: PANEL_WIDTH,
          maxWidth: MAX_PANEL_WIDTH,
          transform: "translateX(-50%)",
          background: "rgba(30, 30, 35, 0.9)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3)",
          padding: "12px 16px",
        }}
      >
        {/* Stacked Buttons */}
        <div className="flex flex-col gap-1.5">
          <button
            className="w-8 h-8 rounded-md border border-white/20 flex items-center justify-center text-gray-400 hover:text-gray-200 hover:border-white/30 transition-colors cursor-pointer"
            title="Chat History"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            className="w-8 h-8 rounded-md border border-white/10 flex items-center justify-center text-gray-500 cursor-not-allowed"
            disabled
            title="Attachments (coming soon)"
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          placeholder="Ask about clients, alerts, or anything..."
          value={inputValue}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          disabled={isLoading}
          className="flex-1 min-h-[48px] max-h-[120px] p-3 bg-white/5 border border-white/10 rounded-xl text-gray-100 text-[14px] leading-[1.5] resize-none outline-none transition-colors placeholder:text-gray-500 focus:border-white/20 hover:border-white/15"
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
          className={cn(
            "w-12 h-12 rounded-xl border flex items-center justify-center transition-all cursor-pointer",
            isLoading || !inputValue.trim()
              ? "border-white/10 text-gray-500 cursor-not-allowed"
              : "border-white/20 text-gray-200 hover:border-white/30 hover:text-white"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  )
}

/**
 * CitationBadge - Inline citation marker
 */
function CitationBadge({
  index,
  citation,
}: {
  index: number
  citation?: Citation
}) {
  const handleClick = () => {
    if (citation?.url) {
      window.open(citation.url, "_blank", "noopener,noreferrer")
    }
  }

  const hasValidUrl = !!citation?.url

  return (
    <button
      type="button"
      onClick={handleClick}
      title={citation?.title || `Source ${index}`}
      className={cn(
        "inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-sm mx-0.5 align-middle transition-colors",
        hasValidUrl
          ? "bg-green-500/30 text-green-400 border border-green-500/30 hover:bg-green-500/50 cursor-pointer"
          : "bg-gray-500/30 text-gray-400 border border-gray-500/30 cursor-default"
      )}
      style={{ position: "relative", top: "-1px" }}
    >
      {index}
    </button>
  )
}

/**
 * MessageContent - Renders markdown content with inline citations
 */
function MessageContent({
  content,
  citations = [],
}: {
  content: string
  citations?: Citation[]
}) {
  const getCitation = useCallback((displayIndex: number): Citation | undefined => {
    let citation = citations.find((c) => c.index === displayIndex)
    if (citation?.url) return citation

    if (citations[displayIndex - 1]?.url) {
      return citations[displayIndex - 1]
    }

    if (citations.length > 0) {
      const wrappedIndex = (displayIndex - 1) % citations.length
      if (citations[wrappedIndex]?.url) {
        return citations[wrappedIndex]
      }
    }

    return undefined
  }, [citations])

  const renderContent = useMemo(() => {
    const citationRegex = /\[(\d+(?:\.\d+)?)\]/g
    const elements: React.ReactNode[] = []
    let lastIndex = 0
    let match
    let sequentialIndex = 1

    while ((match = citationRegex.exec(content)) !== null) {
      const textBefore = content.slice(lastIndex, match.index)

      if (textBefore) {
        elements.push(
          <ReactMarkdown
            key={`text-${elements.length}`}
            allowedElements={SAFE_MARKDOWN_ELEMENTS}
            unwrapDisallowed
            components={{ p: ({ children }) => <>{children}</> }}
          >
            {textBefore}
          </ReactMarkdown>
        )
      }

      elements.push(
        <CitationBadge
          key={`cite-${elements.length}`}
          index={sequentialIndex}
          citation={getCitation(sequentialIndex)}
        />
      )

      sequentialIndex++
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < content.length) {
      elements.push(
        <ReactMarkdown
          key={`text-${elements.length}`}
          allowedElements={SAFE_MARKDOWN_ELEMENTS}
          unwrapDisallowed
          components={{ p: ({ children }) => <>{children}</> }}
        >
          {content.slice(lastIndex)}
        </ReactMarkdown>
      )
    }

    return elements
  }, [content, getCitation])

  return <>{renderContent}</>
}

/**
 * SuggestionPills - Clickable suggestion buttons
 */
function SuggestionPills({
  suggestions,
  onSelect,
  disabled = false,
}: {
  suggestions: string[]
  onSelect: (suggestion: string) => void
  disabled?: boolean
}) {
  if (!suggestions || suggestions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className={cn(
            "px-3 py-1.5 text-xs text-blue-300 bg-blue-500/15 border border-blue-500/20 rounded-full transition-all",
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-blue-500/25 hover:border-blue-500/30 cursor-pointer"
          )}
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}

/**
 * RouteIndicator - Shows which source was used for the response
 */
function RouteIndicator({ route }: { route?: RouteType }) {
  if (!route) return null

  const config: Record<RouteType, { icon: React.ReactNode; label: string; color: string }> = {
    web: {
      icon: <Globe className="w-3 h-3" />,
      label: "Web",
      color: "bg-blue-500/30 text-blue-400",
    },
    rag: {
      icon: <Database className="w-3 h-3" />,
      label: "Knowledge",
      color: "bg-purple-500/30 text-purple-400",
    },
    memory: {
      icon: <Sparkles className="w-3 h-3" />,
      label: "Memory",
      color: "bg-pink-500/30 text-pink-400",
    },
    casual: {
      icon: <MessageCircle className="w-3 h-3" />,
      label: "Chat",
      color: "bg-green-500/30 text-green-400",
    },
    dashboard: {
      icon: <LayoutDashboard className="w-3 h-3" />,
      label: "Dashboard",
      color: "bg-orange-500/30 text-orange-400",
    },
  }

  const { icon, label, color } = config[route]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
        color
      )}
      title={`Response from: ${label}`}
    >
      {icon}
      {label}
    </span>
  )
}
