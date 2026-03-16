"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Mic, X, Check, Loader2, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase"
import { type VoiceParams, getDefaultVoiceParams } from "@/types/cartridges"

export function VoiceTab() {
  const { toast } = useToast()
  const [voiceParams, setVoiceParams] = useState<VoiceParams>(getDefaultVoiceParams())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const savedParamsRef = useRef<VoiceParams | null>(null)
  const saveAbortRef = useRef<AbortController | null>(null)

  // Load user's saved voice settings on mount
  const loadVoiceSettings = useCallback(async (currentUserId: string, signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/v1/settings/users/${currentUserId}/preferences`, { signal })
      if (!response.ok) throw new Error('Failed to load voice settings')

      const data = await response.json()
      const voicePrefs = data?.preferences?.ai?.voice
      if (voicePrefs) {
        // Merge with defaults to handle any missing fields
        const loaded = {
          ...getDefaultVoiceParams(),
          ...voicePrefs,
          tone: { ...getDefaultVoiceParams().tone, ...(voicePrefs.tone || {}) },
          style: { ...getDefaultVoiceParams().style, ...(voicePrefs.style || {}) },
          personality: { ...getDefaultVoiceParams().personality, ...(voicePrefs.personality || {}) },
          vocabulary: { ...getDefaultVoiceParams().vocabulary, ...(voicePrefs.vocabulary || {}) },
        }
        setVoiceParams(loaded)
        savedParamsRef.current = loaded
      } else {
        savedParamsRef.current = getDefaultVoiceParams()
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('[VoiceTab] Failed to load voice settings:', error)
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
        await loadVoiceSettings(user.id, controller.signal)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('[VoiceTab] Init error:', error)
        setIsLoading(false)
      }
    }
    init()
    return () => { controller.abort() }
  }, [loadVoiceSettings])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (saveAbortRef.current) {
        saveAbortRef.current.abort()
        saveAbortRef.current = null
      }
    }
  }, [])

  // Track changes vs saved state
  useEffect(() => {
    if (savedParamsRef.current) {
      setHasChanges(JSON.stringify(voiceParams) !== JSON.stringify(savedParamsRef.current))
    }
  }, [voiceParams])

  const updateVoiceParams = (updates: Partial<VoiceParams>) => {
    setVoiceParams((prev) => ({
      ...prev,
      ...updates,
    }))
  }

  const addTrait = (trait: string) => {
    if (!trait.trim()) return
    setVoiceParams((prev) => ({
      ...prev,
      personality: {
        ...prev.personality,
        traits: [...prev.personality.traits, trait.trim()],
      },
    }))
  }

  const removeTrait = (index: number) => {
    setVoiceParams((prev) => ({
      ...prev,
      personality: {
        ...prev.personality,
        traits: prev.personality.traits.filter((_, i) => i !== index),
      },
    }))
  }

  const saveVoiceSettings = async (params: VoiceParams) => {
    if (!userId) {
      toast({ title: "Error", description: "User ID not loaded. Please refresh.", variant: "destructive" })
      return false
    }

    if (saveAbortRef.current) saveAbortRef.current.abort()
    const controller = new AbortController()
    saveAbortRef.current = controller

    try {
      const response = await fetch(`/api/v1/settings/users/${userId}/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai: { voice: params },
        }),
        signal: controller.signal,
      })

      if (controller !== saveAbortRef.current) return false

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to save voice settings')
      }

      savedParamsRef.current = params
      setHasChanges(false)
      return true
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return false
      const msg = error instanceof Error ? error.message : 'Failed to save'
      console.error('[VoiceTab] Save error:', msg)
      toast({ title: "Error", description: msg, variant: "destructive" })
      return false
    } finally {
      if (controller === saveAbortRef.current) {
        saveAbortRef.current = null
      }
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    const success = await saveVoiceSettings(voiceParams)
    setIsSaving(false)
    if (success) {
      toast({
        title: "Voice settings saved",
        description: "Your AI communication preferences have been updated.",
      })
    }
  }

  const handleReset = async () => {
    setIsResetting(true)
    const defaults = getDefaultVoiceParams()
    const success = await saveVoiceSettings(defaults)
    setIsResetting(false)
    setShowResetDialog(false)
    if (success) {
      setVoiceParams(defaults)
      toast({
        title: "Voice settings reset",
        description: "Your AI communication preferences have been restored to defaults.",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice & Tone
          </CardTitle>
          <CardDescription>
            These settings control how the AI communicates in chat and when drafting replies on your behalf.
            Changes are personal to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Voice Parameters */}
          <Accordion type="multiple" defaultValue={["tone", "style", "personality", "vocabulary"]} className="w-full">
            {/* Tone Section */}
            <AccordionItem value="tone">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <span>Tone & Attitude</span>
                  <Badge variant="outline" className="text-xs">
                    {voiceParams.tone.formality}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Formality Level</Label>
                  <Select
                    value={voiceParams.tone.formality}
                    onValueChange={(value: "professional" | "casual" | "friendly") =>
                      updateVoiceParams({ tone: { ...voiceParams.tone, formality: value } })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Enthusiasm Level</Label>
                    <span className="text-sm text-muted-foreground">{voiceParams.tone.enthusiasm}/10</span>
                  </div>
                  <Slider
                    value={[voiceParams.tone.enthusiasm]}
                    onValueChange={(values: number[]) =>
                      updateVoiceParams({ tone: { ...voiceParams.tone, enthusiasm: values[0] } })
                    }
                    min={0}
                    max={10}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Empathy Level</Label>
                    <span className="text-sm text-muted-foreground">{voiceParams.tone.empathy}/10</span>
                  </div>
                  <Slider
                    value={[voiceParams.tone.empathy]}
                    onValueChange={(values: number[]) =>
                      updateVoiceParams({ tone: { ...voiceParams.tone, empathy: values[0] } })
                    }
                    min={0}
                    max={10}
                    step={1}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Style Section */}
            <AccordionItem value="style">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <span>Writing Style</span>
                  <Badge variant="outline" className="text-xs">
                    {voiceParams.style.sentenceLength}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Sentence Length</Label>
                  <Select
                    value={voiceParams.style.sentenceLength}
                    onValueChange={(value: "short" | "medium" | "long") =>
                      updateVoiceParams({ style: { ...voiceParams.style, sentenceLength: value } })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (Punchy)</SelectItem>
                      <SelectItem value="medium">Medium (Balanced)</SelectItem>
                      <SelectItem value="long">Long (Detailed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Paragraph Structure</Label>
                  <Select
                    value={voiceParams.style.paragraphStructure}
                    onValueChange={(value: "single" | "multi") =>
                      updateVoiceParams({ style: { ...voiceParams.style, paragraphStructure: value } })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single sentence paragraphs</SelectItem>
                      <SelectItem value="multi">Multi-sentence paragraphs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="emojis">Use Emojis</Label>
                  <Switch
                    id="emojis"
                    checked={voiceParams.style.useEmojis}
                    onCheckedChange={(checked) =>
                      updateVoiceParams({ style: { ...voiceParams.style, useEmojis: checked } })
                    }
                  />
                </div>

                {/* Note: useHashtags removed — not relevant for direct client communications */}
              </AccordionContent>
            </AccordionItem>

            {/* Personality Section */}
            <AccordionItem value="personality">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <span>Personality</span>
                  <Badge variant="outline" className="text-xs">
                    {voiceParams.personality.traits.length} traits
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Voice Description</Label>
                  <Textarea
                    placeholder="Describe the personality in one or two sentences..."
                    value={voiceParams.personality.voiceDescription}
                    onChange={(e) =>
                      updateVoiceParams({
                        personality: { ...voiceParams.personality, voiceDescription: e.target.value },
                      })
                    }
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Personality Traits</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {voiceParams.personality.traits.map((trait, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {trait}
                        <button
                          type="button"
                          onClick={() => removeTrait(i)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Add a trait (e.g., 'confident', 'warm') and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addTrait(e.currentTarget.value)
                        e.currentTarget.value = ""
                      }
                    }}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Vocabulary Section */}
            <AccordionItem value="vocabulary">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <span>Vocabulary</span>
                  <Badge variant="outline" className="text-xs">
                    {voiceParams.vocabulary.complexity}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Complexity Level</Label>
                  <Select
                    value={voiceParams.vocabulary.complexity}
                    onValueChange={(value: "simple" | "moderate" | "advanced") =>
                      updateVoiceParams({ vocabulary: { ...voiceParams.vocabulary, complexity: value } })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple (Everyday language)</SelectItem>
                      <SelectItem value="moderate">Moderate (Professional)</SelectItem>
                      <SelectItem value="advanced">Advanced (Specialized)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>

            <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isResetting}>
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset to Default
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset to default settings?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will restore all voice settings to their default values. Your current
                    customizations will be lost. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>
                    Reset Settings
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
