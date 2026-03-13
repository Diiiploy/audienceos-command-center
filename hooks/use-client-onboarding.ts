"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { fetchWithCsrf } from "@/lib/csrf"
import { toast } from "sonner"
import type { OnboardingInstanceWithRelations, Stage } from "@/stores/onboarding-store"
import type { Database } from "@/types/database"

type StageStatus = Database["public"]["Enums"]["stage_status"]

interface IntakeResponse {
  label: string
  value: string
  type: string
}

interface UseClientOnboardingReturn {
  instance: OnboardingInstanceWithRelations | null
  stages: Stage[]
  stageStatusMap: Map<string, string>
  intakeResponses: IntakeResponse[]
  isLoading: boolean
  error: string | null
  toggleStageStatus: (stageId: string) => Promise<void>
  refetch: () => void
}

export function useClientOnboarding(clientId: string | null): UseClientOnboardingReturn {
  const [instance, setInstance] = useState<OnboardingInstanceWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOnboarding = useCallback(async () => {
    if (!clientId) {
      setInstance(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Get instances for this client
      const listRes = await fetchWithCsrf(`/api/v1/onboarding/instances?client_id=${clientId}`)
      if (!listRes.ok) throw new Error("Failed to fetch onboarding instances")

      const listData = await listRes.json()
      const instances = listData.data || listData

      if (!Array.isArray(instances) || instances.length === 0) {
        setInstance(null)
        setIsLoading(false)
        return
      }

      // Use the first active/in_progress instance (most recent by triggered_at)
      const activeInstance = instances.find(
        (i: OnboardingInstanceWithRelations) => i.status === "in_progress"
      ) || instances[0]

      // Step 2: Get full details with responses
      const detailRes = await fetchWithCsrf(`/api/v1/onboarding/instances/${activeInstance.id}`)
      if (!detailRes.ok) throw new Error("Failed to fetch onboarding details")

      const detailData = await detailRes.json()
      setInstance(detailData.data || detailData)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load onboarding data"
      setError(message)
      setInstance(null)
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchOnboarding()
  }, [fetchOnboarding])

  // Parse stages from journey JSONB
  const stages = useMemo<Stage[]>(() => {
    if (!instance?.journey?.stages) return []
    try {
      const raw = instance.journey.stages
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
      return Array.isArray(parsed)
        ? parsed.sort((a: Stage, b: Stage) => a.order - b.order)
        : []
    } catch {
      return []
    }
  }, [instance?.journey?.stages])

  // Build stage status map
  const stageStatusMap = useMemo(() => {
    const map = new Map<string, string>()
    if (instance?.stage_statuses) {
      for (const ss of instance.stage_statuses) {
        map.set(ss.stage_id, ss.status)
      }
    }
    return map
  }, [instance?.stage_statuses])

  // Map intake responses using API-joined field labels
  const intakeResponses = useMemo<IntakeResponse[]>(() => {
    if (!instance?.responses) return []
    return instance.responses
      .filter((r) => r.value && r.field?.field_label)
      .map((r) => ({
        label: r.field!.field_label,
        value: r.value!,
        type: r.field!.field_type,
      }))
  }, [instance?.responses])

  // Toggle stage status with optimistic update
  const toggleStageStatus = useCallback(
    async (stageId: string) => {
      if (!instance) return

      const currentStatus = (stageStatusMap.get(stageId) || "pending") as StageStatus
      const newStatus: StageStatus = currentStatus === "completed" ? "pending" : "completed"

      // Optimistic update
      setInstance((prev) => {
        if (!prev?.stage_statuses) return prev
        return {
          ...prev,
          stage_statuses: prev.stage_statuses.map((ss) =>
            ss.stage_id === stageId ? { ...ss, status: newStatus } : ss
          ),
        }
      })

      try {
        const res = await fetchWithCsrf(
          `/api/v1/onboarding/instances/${instance.id}/stage`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage_id: stageId, status: newStatus }),
          }
        )

        if (!res.ok) throw new Error("Failed to update stage status")
      } catch {
        // Rollback on failure
        setInstance((prev) => {
          if (!prev?.stage_statuses) return prev
          return {
            ...prev,
            stage_statuses: prev.stage_statuses.map((ss) =>
              ss.stage_id === stageId ? { ...ss, status: currentStatus } : ss
            ),
          }
        })
        toast.error("Failed to update stage status. Please try again.")
      }
    },
    [instance, stageStatusMap]
  )

  return {
    instance,
    stages,
    stageStatusMap,
    intakeResponses,
    isLoading,
    error,
    toggleStageStatus,
    refetch: fetchOnboarding,
  }
}
