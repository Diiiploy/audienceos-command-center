"use client"

/**
 * MemoryPanel - Inline panel for viewing and managing AI memories
 *
 * Designed to live inside Intelligence > Configuration > Memory.
 * Matches the SettingsContentSection styling patterns.
 *
 * Features:
 * - Browse all stored memories with type/importance badges
 * - Search memories by keyword
 * - Delete individual memories ("forget this")
 * - Delete all memories ("reset my memory")
 */

import React, { useState, useEffect, useCallback } from "react"
import {
  Brain,
  Search,
  Trash2,
  AlertTriangle,
  Loader2,
  MessageCircle,
  Lightbulb,
  CheckCircle2,
  FolderOpen,
  Zap,
  ClipboardList,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { fetchWithCsrf } from "@/lib/csrf"

interface MemoryItem {
  id: string
  content: string
  metadata: {
    type?: string
    importance?: string
    topic?: string
    agencyId?: string
    userId?: string
  }
  score?: number
  createdAt?: string
  updatedAt?: string
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  conversation: <MessageCircle className="w-3 h-3" />,
  decision: <CheckCircle2 className="w-3 h-3" />,
  preference: <Lightbulb className="w-3 h-3" />,
  project: <FolderOpen className="w-3 h-3" />,
  insight: <Zap className="w-3 h-3" />,
  task: <ClipboardList className="w-3 h-3" />,
}

const TYPE_COLORS: Record<string, string> = {
  conversation: "bg-blue-500/10 text-blue-500",
  decision: "bg-green-500/10 text-green-500",
  preference: "bg-amber-500/10 text-amber-500",
  project: "bg-purple-500/10 text-purple-500",
  insight: "bg-orange-500/10 text-orange-500",
  task: "bg-red-500/10 text-red-500",
}

export function MemoryPanel() {
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fetchMemories = useCallback(async (search?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("pageSize", "100")

      const response = await fetch(`/api/v1/memory?${params}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      setMemories(data.memories || [])
      setTotal(data.total || data.memories?.length || 0)
    } catch (err) {
      console.error("[MemoryPanel] Fetch error:", err)
      setError("Failed to load memories. Make sure the gateway is connected.")
      setMemories([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    fetchMemories()
  }, [fetchMemories])

  // Debounced search
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)
      if (searchTimeout) clearTimeout(searchTimeout)

      const timeout = setTimeout(() => {
        fetchMemories(query || undefined)
      }, 300)
      setSearchTimeout(timeout)
    },
    [fetchMemories, searchTimeout]
  )

  const handleDeleteMemory = async (memoryId: string) => {
    setDeletingId(memoryId)
    try {
      const response = await fetchWithCsrf("/api/v1/memory", {
        method: "DELETE",
        body: JSON.stringify({ memoryId }),
      })
      if (response.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== memoryId))
        setTotal((prev) => prev - 1)
      }
    } catch (err) {
      console.error("[MemoryPanel] Delete error:", err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteAll = async () => {
    setLoading(true)
    try {
      const response = await fetchWithCsrf("/api/v1/memory", {
        method: "DELETE",
        body: JSON.stringify({ deleteAll: true }),
      })
      if (response.ok) {
        setMemories([])
        setTotal(0)
        setShowDeleteAll(false)
      }
    } catch (err) {
      console.error("[MemoryPanel] Delete all error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Group memories by type for summary
  const typeCounts = memories.reduce<Record<string, number>>((acc, m) => {
    const type = m.metadata.type || "conversation"
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Brain className="w-4 h-4" />
          <span className="text-xs font-medium">
            {total > 0 ? `${total} memories` : "No memories yet"}
          </span>
        </div>
        {Object.entries(typeCounts).map(([type, count]) => (
          <Badge
            key={type}
            variant="secondary"
            className={cn("text-[10px] gap-1", TYPE_COLORS[type] || "bg-secondary")}
          >
            {TYPE_ICONS[type]}
            {type}: {count}
          </Badge>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-auto"
          onClick={() => fetchMemories(searchQuery || undefined)}
          disabled={loading}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 h-8 text-[11px] bg-secondary border-border"
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-500">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && memories.length === 0 && !error && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Loading memories...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && memories.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">
            {searchQuery ? "No Matching Memories" : "No Memories Yet"}
          </h3>
          <p className="text-muted-foreground text-sm mb-2">
            {searchQuery
              ? "Try a different search term."
              : "Start chatting with the AI assistant to build cross-session memory."}
          </p>
          <p className="text-xs text-muted-foreground">
            Memories are automatically created when the AI detects decisions, preferences, tasks, and important conversations.
          </p>
        </div>
      )}

      {/* Memory list */}
      {memories.length > 0 && (
        <div className="max-h-[calc(100vh-24rem)] overflow-y-auto space-y-2 pr-1">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="group flex items-start gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
            >
              {/* Type icon */}
              <div
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                  TYPE_COLORS[memory.metadata.type || "conversation"] || "bg-secondary"
                )}
              >
                {TYPE_ICONS[memory.metadata.type || "conversation"] || <Brain className="w-3 h-3" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed">{memory.content}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {memory.metadata.type && (
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {memory.metadata.type}
                    </span>
                  )}
                  {memory.metadata.importance && memory.metadata.importance !== "medium" && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] px-1 py-0 h-4",
                        memory.metadata.importance === "high" && "bg-red-500/10 text-red-500",
                        memory.metadata.importance === "low" && "bg-gray-500/10 text-gray-500"
                      )}
                    >
                      {memory.metadata.importance}
                    </Badge>
                  )}
                  {memory.metadata.topic && (
                    <span className="text-[10px] text-muted-foreground truncate">
                      {memory.metadata.topic}
                    </span>
                  )}
                  {memory.score !== undefined && memory.score > 0 && (
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {Math.round(memory.score * 100)}% match
                    </span>
                  )}
                </div>
              </div>

              {/* Delete */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                onClick={() => handleDeleteMemory(memory.id)}
                disabled={deletingId === memory.id}
              >
                {deletingId === memory.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Delete all */}
      {memories.length > 0 && (
        <div className="pt-2 border-t border-border">
          {showDeleteAll ? (
            <div className="flex items-center gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">
                This will permanently delete all {total} memories. This cannot be undone.
              </span>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-[11px]"
                onClick={handleDeleteAll}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Delete All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => setShowDeleteAll(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] text-muted-foreground hover:text-destructive"
              onClick={() => setShowDeleteAll(true)}
            >
              <Trash2 className="w-3 h-3 mr-1.5" />
              Reset all memory
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
