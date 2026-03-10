"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Check, Sparkles, Loader2, Copy, ExternalLink, AlertCircle, AlertTriangle, Info } from "lucide-react"
import confetti from "canvas-confetti"
import { useToast } from "@/hooks/use-toast"
import { DynamicFormFields, useDynamicFormState } from "@/components/onboarding/dynamic-form-fields"

type Step = 1 | 2 | 3 | 4

interface FormField {
  id: string
  field_label: string
  field_type: string
  placeholder: string | null
  is_required: boolean
  options?: unknown
  sort_order?: number
  validation_regex?: string | null
}

interface AccessDelegationItem {
  id: string
  name: string
  description: string
  email: string
  instructions_url?: string
  required: boolean
}

interface ProvisioningData {
  client_id?: string
  client_name?: string
  slack?: { ok?: boolean; skipped?: boolean; channel_id?: string; channel_name?: string; error?: string; reason?: string }
  drive?: { ok?: boolean; skipped?: boolean; folder_id?: string; folder_url?: string; error?: string; reason?: string }
  provisioned_at?: string
}

interface OnboardingData {
  instance: {
    id: string
    status: string
    client_name: string
    slack_channel_id?: string | null
    slack_channel_name?: string | null
    drive_folder_id?: string | null
    drive_folder_url?: string | null
    provisioning_data?: ProvisioningData | null
  }
  journey: {
    id: string
    name: string
    description?: string | null
    welcome_video_url?: string | null
    stages: unknown
    access_delegation_config?: AccessDelegationItem[] | null
  } | null
  agency_name?: string | null
  fields: FormField[]
}

// --- Helpers ---

function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  const loomMatch = url.match(/(?:loom\.com\/share\/|loom\.com\/embed\/)([a-zA-Z0-9]+)/)
  if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`
  if (url.includes("/embed/")) return url
  return null
}

function saveSessionProgress(token: string, data: { step: Step; formValues: Record<string, string>; accessChecks: Record<string, string> }) {
  try {
    localStorage.setItem(`onboarding_progress_${token}`, JSON.stringify(data))
  } catch { /* quota exceeded - ignore */ }
}

function loadSessionProgress(token: string): { step: Step; formValues: Record<string, string>; accessChecks: Record<string, string> } | null {
  try {
    const raw = localStorage.getItem(`onboarding_progress_${token}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function clearSessionProgress(token: string) {
  try { localStorage.removeItem(`onboarding_progress_${token}`) } catch { /* ignore */ }
}

// --- Main Component ---

function OnboardingPageContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { toast } = useToast()

  // Session restore (computed once on mount via useState initializer — must be
  // stable to avoid infinite re-render loop with useDynamicFormState's useEffect)
  const [savedProgress] = useState(() => token ? loadSessionProgress(token) : null)
  const initialFormValues = savedProgress?.formValues

  // Core state
  const [currentStep, setCurrentStep] = useState<Step>((savedProgress?.step as Step) ?? 1)
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null)
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(true)
  const [onboardingError, setOnboardingError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: Provisioning
  const [provisionStatus, setProvisionStatus] = useState<{
    clientId: "pending" | "done"
    slack: "pending" | "done" | "warning" | "skipped"
    drive: "pending" | "done" | "warning" | "skipped"
    slackError?: string
    driveError?: string
  }>({ clientId: "pending", slack: "pending", drive: "pending" })
  const isProvisioningRef = useRef(false)

  // Step 2: Dynamic form (with session restore)
  const dynamicForm = useDynamicFormState(onboardingData?.fields || [], initialFormValues)

  // Step 3: Access delegation (dynamic from journey config)
  const [accessChecks, setAccessChecks] = useState<Record<string, "unchecked" | "granted" | "na">>(
    savedProgress?.accessChecks as Record<string, "unchecked" | "granted" | "na"> ?? {}
  )

  // Derived data
  const agencyName = onboardingData?.agency_name || "Your Agency"
  const clientName = onboardingData?.instance?.client_name || "Client"
  const platforms: AccessDelegationItem[] = onboardingData?.journey?.access_delegation_config || []
  const slackChannelId = onboardingData?.instance?.slack_channel_id || null
  const slackChannelName = onboardingData?.instance?.slack_channel_name || null

  const allProvisioningDone = provisionStatus.clientId === "done" &&
    provisionStatus.slack !== "pending" &&
    provisionStatus.drive !== "pending"

  const allAccessReady = platforms.length === 0 || platforms.every((p) => {
    const status = accessChecks[p.id]
    return p.required ? (status === "granted" || status === "na") : true
  })


  // Fetch onboarding data
  useEffect(() => {
    async function fetchOnboarding() {
      if (!token) {
        setIsLoadingOnboarding(false)
        setOnboardingError("No onboarding token provided. Please use the link sent to your email.")
        return
      }
      try {
        const response = await fetch(`/api/public/onboarding/${token}`)
        const result = await response.json()
        if (!response.ok) {
          setOnboardingError(result.completed ? "This onboarding has already been completed." : (result.error || "Failed to load onboarding"))
          setIsLoadingOnboarding(false)
          return
        }
        setOnboardingData(result.data)
        setIsLoadingOnboarding(false)
      } catch {
        setOnboardingError("Failed to connect to server. Please try again.")
        setIsLoadingOnboarding(false)
      }
    }
    fetchOnboarding()
  }, [token])

  // Step 1: Real provisioning
  useEffect(() => {
    if (currentStep !== 1 || !onboardingData || !token || isProvisioningRef.current) return
    isProvisioningRef.current = true

    // Check if already provisioned (idempotent)
    const cached = onboardingData.instance.provisioning_data
    if (cached?.provisioned_at) {
      setProvisionStatus({
        clientId: "done",
        slack: cached.slack?.ok ? "done" : cached.slack?.skipped ? "skipped" : "warning",
        drive: cached.drive?.ok ? "done" : cached.drive?.skipped ? "skipped" : "warning",
        slackError: cached.slack?.error,
        driveError: cached.drive?.error,
      })
      return
    }

    // Call provision endpoint
    setProvisionStatus({ clientId: "done", slack: "pending", drive: "pending" })
    fetch(`/api/public/onboarding/${token}/provision`, { method: "POST" })
      .then((res) => res.json())
      .then((result) => {
        const data: ProvisioningData = result.data || {}
        setProvisionStatus({
          clientId: "done",
          slack: data.slack?.ok ? "done" : data.slack?.skipped ? "skipped" : "warning",
          drive: data.drive?.ok ? "done" : data.drive?.skipped ? "skipped" : "warning",
          slackError: data.slack?.error,
          driveError: data.drive?.error,
        })
        // Update local onboarding data with provisioning results
        if (data.slack?.channel_id) {
          setOnboardingData((prev) => prev ? {
            ...prev,
            instance: {
              ...prev.instance,
              slack_channel_id: data.slack?.channel_id || null,
              slack_channel_name: data.slack?.channel_name || null,
            }
          } : prev)
        }
      })
      .catch(() => {
        setProvisionStatus((p) => ({
          ...p,
          slack: p.slack === "pending" ? "warning" : p.slack,
          drive: p.drive === "pending" ? "warning" : p.drive,
        }))
      })
  }, [currentStep, onboardingData, token])

  // Session persistence (save on meaningful state changes)
  const saveProgress = useCallback(() => {
    if (!token || currentStep === 4) return
    saveSessionProgress(token, {
      step: currentStep,
      formValues: dynamicForm.values,
      accessChecks: accessChecks as Record<string, string>,
    })
  }, [token, currentStep, dynamicForm.values, accessChecks])

  useEffect(() => { saveProgress() }, [saveProgress])

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    toast({ title: "Copied to clipboard", description: email })
  }

  const handleFinish = async () => {
    if (!token) return
    setIsSubmitting(true)

    try {
      const responses = dynamicForm.getResponses()
      // Add access check statuses
      responses.push({ field_id: "access_checks", value: JSON.stringify(accessChecks) })

      const response = await fetch(`/api/public/onboarding/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses }),
      })

      if (!response.ok) {
        const result = await response.json()
        toast({ title: "Submission Failed", description: result.error || "Failed to submit onboarding", variant: "destructive" })
        setIsSubmitting(false)
        return
      }

      // Clear session progress on success
      clearSessionProgress(token)

      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ["#10b981", "#34d399", "#6ee7b7"] })
      setCurrentStep(4)
    } catch {
      toast({ title: "Connection Error", description: "Failed to connect to server. Please try again.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Loading ---
  if (isLoadingOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur p-8 max-w-md">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
            <p className="text-slate-300">Loading your onboarding...</p>
          </div>
        </Card>
      </div>
    )
  }

  // --- Error ---
  if (onboardingError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur p-8 max-w-md">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-100">Onboarding Unavailable</h2>
            <p className="text-slate-400 text-center">{onboardingError}</p>
          </div>
        </Card>
      </div>
    )
  }

  // --- Video embed ---
  const videoUrl = onboardingData?.journey?.welcome_video_url
  const embedUrl = videoUrl ? getVideoEmbedUrl(videoUrl) : null

  // --- Provisioning status icon ---
  const ProvisionIcon = ({ status, error }: { status: string; error?: string }) => {
    if (status === "done") return <Check className="h-5 w-5 text-emerald-500 shrink-0" />
    if (status === "pending") return <Loader2 className="h-5 w-5 text-amber-500 animate-spin shrink-0" />
    if (status === "warning") return (
      <span title={error}>
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
      </span>
    )
    if (status === "skipped") return <span className="h-5 w-5 text-slate-500 shrink-0">—</span>
    return null
  }

  const statusText = (status: string, label: string, error?: string) => {
    if (status === "done") return <span className="text-emerald-400">{label} — Ready</span>
    if (status === "pending") return <span className="text-slate-300">{label}...</span>
    if (status === "warning") return <span className="text-amber-400">{label} — {error || "Setup issue (non-blocking)"}</span>
    if (status === "skipped") return <span className="text-slate-500">{label} — Not configured</span>
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Agency name header */}
        {currentStep < 4 && (
          <p className="text-center text-sm text-slate-500 mb-4">{agencyName}</p>
        )}

        {/* Stepper */}
        {currentStep < 4 && (
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((step, idx) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      currentStep >= step
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {currentStep > step ? <Check className="h-5 w-5" /> : step}
                  </div>
                  <span className="ml-2 text-sm text-slate-400 hidden sm:inline">
                    {step === 1 ? "Welcome" : step === 2 ? "Your Info" : "Platform Access"}
                  </span>
                  {idx < 2 && (
                    <div className={`w-12 h-0.5 ml-2 ${currentStep > step ? "bg-emerald-500" : "bg-slate-700"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== Step 1: Welcome ========== */}
        {currentStep === 1 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur p-8">
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-slate-100 mb-2">
                    Welcome, {clientName}!
                  </h1>
                  <p className="text-slate-400">
                    We're setting up your workspace — this only takes a moment.
                  </p>
                </div>

                {/* Provisioning status */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <ProvisionIcon status={provisionStatus.clientId} />
                    {statusText(provisionStatus.clientId, "Client profile initialized")}
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <ProvisionIcon status={provisionStatus.slack} error={provisionStatus.slackError} />
                    {statusText(
                      provisionStatus.slack,
                      provisionStatus.slack === "done"
                        ? `Slack channel #${onboardingData?.instance?.slack_channel_name || clientName.toLowerCase().replace(/\s+/g, "-")} created`
                        : "Creating Slack channel",
                      provisionStatus.slackError
                    )}
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <ProvisionIcon status={provisionStatus.drive} error={provisionStatus.driveError} />
                    {statusText(provisionStatus.drive, "Google Drive folder", provisionStatus.driveError)}
                  </div>
                </div>

                {(provisionStatus.slack === "warning" || provisionStatus.drive === "warning") && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-300">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    Some resources couldn't be set up automatically. Don't worry — our team will handle it.
                  </div>
                )}

                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!allProvisioningDone}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 text-lg disabled:opacity-50"
                >
                  {allProvisioningDone ? "Continue" : "Setting up..."}
                </Button>
              </div>
            </Card>

            {/* Video or placeholder */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur p-8">
              {embedUrl ? (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    title="Welcome video"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Info className="h-8 w-8 text-emerald-500" />
                    </div>
                    <p className="text-lg font-medium text-slate-200">Welcome to {agencyName}</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Complete the steps below and our team will take it from there.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========== Step 2: Your Info ========== */}
        {currentStep === 2 && (
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-100">Your Information</CardTitle>
              <CardDescription className="text-slate-400">
                {onboardingData?.journey?.description || "Please fill out the information below to help us get started"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {(onboardingData?.fields?.length || 0) > 0 ? (
                <DynamicFormFields
                  fields={onboardingData?.fields || []}
                  values={dynamicForm.values}
                  onChange={dynamicForm.handleChange}
                  errors={dynamicForm.errors}
                  touched={dynamicForm.touched}
                  darkMode
                />
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>No intake form has been configured for this journey yet.</p>
                  <p className="text-sm mt-1">You can skip this step and proceed.</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(3)}
                  disabled={(onboardingData?.fields?.length || 0) > 0 && !dynamicForm.isValid()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========== Step 3: Platform Access ========== */}
        {currentStep === 3 && (
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-100">Platform Access</CardTitle>
              <CardDescription className="text-slate-400">
                {platforms.length > 0
                  ? "Grant access to the platforms below so our team can set up tracking and manage your accounts"
                  : "No platform access is required for this onboarding"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {platforms.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p>No platform access required — you can submit now.</p>
                </div>
              ) : (
                platforms.map((platform) => {
                  const status = accessChecks[platform.id] || "unchecked"
                  return (
                    <div key={platform.id} className="p-5 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="flex items-start gap-3 mb-3">
                        <Checkbox
                          id={`access-${platform.id}`}
                          checked={status === "granted"}
                          disabled={status === "na"}
                          onCheckedChange={(checked) =>
                            setAccessChecks((prev) => ({ ...prev, [platform.id]: checked ? "granted" : "unchecked" }))
                          }
                          className="mt-1 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <div className="flex-1">
                          <Label htmlFor={`access-${platform.id}`} className="text-slate-200 font-medium cursor-pointer text-base">
                            {platform.name}
                            {platform.required && <span className="text-red-400 ml-1">*</span>}
                          </Label>
                          <p className="text-sm text-slate-400 mt-1">{platform.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAccessChecks((prev) => ({
                              ...prev,
                              [platform.id]: prev[platform.id] === "na" ? "unchecked" : "na",
                            }))
                          }
                          className={`text-xs px-2 py-1 rounded border shrink-0 ${
                            status === "na"
                              ? "bg-slate-700 border-slate-600 text-slate-300"
                              : "border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          N/A
                        </button>
                      </div>

                      {status !== "na" && (
                        <>
                          <div className="flex items-center gap-2 ml-8">
                            <code className="flex-1 p-2 bg-slate-950 border border-slate-700 rounded text-emerald-400 text-sm">
                              {platform.email}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyEmail(platform.email)}
                              className="border-slate-700 text-slate-300 hover:bg-slate-800"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          {platform.instructions_url && (
                            <a
                              href={platform.instructions_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 ml-8 mt-2 text-xs text-emerald-400 hover:text-emerald-300"
                            >
                              <ExternalLink className="h-3 w-3" />
                              How to grant access
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  )
                })
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Back
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={!allAccessReady || isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Onboarding"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========== Step 4: Success ========== */}
        {currentStep === 4 && (
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-emerald-500" />
                </div>
              </div>
              <CardTitle className="text-3xl text-slate-100">Onboarding Complete!</CardTitle>
              <CardDescription className="text-slate-400 text-base mt-3">
                Your information has been submitted to the {agencyName} team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Submitted responses summary */}
              {dynamicForm.getResponses().length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Submitted Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dynamicForm.getResponses().map((r) => {
                      const field = onboardingData?.fields?.find((f) => f.id === r.field_id)
                      return (
                        <div key={r.field_id} className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                          <p className="text-xs text-slate-400 mb-1">{field?.field_label || r.field_id}</p>
                          <p className="text-sm font-medium text-emerald-400 truncate">{r.value}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Next steps */}
              <div className="p-5 rounded-lg bg-slate-950 border border-slate-800">
                <h4 className="text-sm font-medium text-slate-200 mb-3">What Happens Next</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Our team will review your submission and verify platform access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>You'll receive updates{slackChannelName ? ` in your Slack channel #${slackChannelName}` : " via email"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Expect to hear from us within 3-5 business days</span>
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {slackChannelId && (
                  <Button
                    onClick={() => window.open(`https://slack.com/app_redirect?channel=${slackChannelId}`, "_blank")}
                    variant="outline"
                    className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Slack Channel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function OnboardingLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur p-8 max-w-md">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
          <p className="text-slate-300">Loading your onboarding...</p>
        </div>
      </Card>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoadingFallback />}>
      <OnboardingPageContent />
    </Suspense>
  )
}
