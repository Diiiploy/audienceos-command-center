"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useSettingsStore } from "@/stores/settings-store"
import { createClient } from "@/lib/supabase"
import {
  Bot,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react"

export function PersonalAISection() {
  const { toast } = useToast()
  const { setHasUnsavedChanges } = useSettingsStore()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // AI preferences
  const [assistantName, setAssistantName] = useState("")
  const [agencyDefault, setAgencyDefault] = useState("Diii")

  const saveAbortControllerRef = useRef<AbortController | null>(null)

  // Load preferences on mount
  const loadPreferences = useCallback(async (currentUserId: string, signal?: AbortSignal) => {
    try {
      // Fetch user preferences
      const response = await fetch(`/api/v1/settings/users/${currentUserId}/preferences`, { signal })
      if (!response.ok) throw new Error('Failed to load preferences')

      const data = await response.json()
      const aiPrefs = data?.preferences?.ai || {}
      setAssistantName(aiPrefs.assistant_name || "")

      // Also fetch agency default for placeholder
      const agencyResponse = await fetch('/api/v1/settings/agency', { signal, credentials: 'include' })
      if (agencyResponse.ok) {
        const agencyData = await agencyResponse.json()
        const agencyName = agencyData?.data?.ai_config?.assistant_name
        if (agencyName) setAgencyDefault(agencyName)
      }

      setLoadError(null)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      const msg = error instanceof Error ? error.message : 'Failed to load preferences'
      console.error('[PersonalAISection] Load error:', msg)
      setLoadError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        if (controller.signal.aborted) return
        if (error || !user?.id) throw new Error('Failed to get current user')

        setUserId(user.id)
        await loadPreferences(user.id, controller.signal)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('[PersonalAISection] Init error:', error)
        setIsLoading(false)
      }
    }

    init()
    return () => { controller.abort() }
  }, [loadPreferences])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveAbortControllerRef.current) {
        saveAbortControllerRef.current.abort()
        saveAbortControllerRef.current = null
      }
    }
  }, [])

  const handleSave = async () => {
    if (!userId) {
      toast({ title: "Error", description: "User ID not loaded. Please refresh.", variant: "destructive" })
      return
    }

    if (saveAbortControllerRef.current) saveAbortControllerRef.current.abort()
    const saveController = new AbortController()
    saveAbortControllerRef.current = saveController

    setIsSaving(true)
    try {
      const response = await fetch(`/api/v1/settings/users/${userId}/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai: {
            assistant_name: assistantName.trim() || null,
          },
        }),
        signal: saveController.signal,
      })

      if (saveController !== saveAbortControllerRef.current) return

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to save preferences')
      }

      setHasUnsavedChanges(false)
      toast({
        title: "Settings saved",
        description: assistantName.trim()
          ? `Your AI assistant will now introduce itself as "${assistantName.trim()}".`
          : `Your AI assistant will use the default name "${agencyDefault}".`,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      const msg = error instanceof Error ? error.message : 'Failed to save'
      console.error('[PersonalAISection] Save error:', msg)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setIsSaving(false)
      if (saveController === saveAbortControllerRef.current) {
        saveAbortControllerRef.current = null
      }
    }
  }

  const handleCancel = () => {
    setAssistantName("")
    setHasUnsavedChanges(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-secondary rounded" />
            <div className="h-3 w-48 bg-secondary rounded" />
          </div>
        </div>
        <div className="h-32 rounded-lg bg-secondary" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground mb-1">Failed to Load Preferences</h2>
            <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoading(true)
                setLoadError(null)
                if (userId) loadPreferences(userId)
              }}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Bot className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">AI Preferences</h1>
            <p className="text-sm text-muted-foreground">Personalize your AI assistant experience</p>
          </div>
        </div>
      </header>

      {/* Assistant Name */}
      <section className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-secondary/30 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Assistant Name</h3>
              <p className="text-xs text-muted-foreground">
                Give your AI assistant a custom name. Other team members can choose their own.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex-1 pr-4">
              <h4 className="text-sm text-foreground">Custom Name</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Leave empty to use the default: <span className="font-medium">{agencyDefault}</span>
              </p>
            </div>
            <div className="shrink-0">
              <Input
                value={assistantName}
                onChange={(e) => {
                  setAssistantName(e.target.value)
                  setHasUnsavedChanges(true)
                }}
                placeholder={agencyDefault}
                className="bg-secondary border-border max-w-xs h-8 text-sm"
                maxLength={50}
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground border-t border-border pt-3">
            This only affects your chat experience. The agency default can be changed by admins in AI Configuration.
          </p>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
