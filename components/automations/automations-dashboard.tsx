'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Zap,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AutomationCard } from './automation-card'
import { TriggerSelector } from './trigger-selector'
import { ActionBuilder } from './action-builder'
import type { Workflow, WorkflowTrigger, WorkflowAction, WorkflowRun } from '@/types/workflow'

interface AutomationsDashboardProps {
  pipelineStages?: string[]
}

export function AutomationsDashboard({
  pipelineStages = ['Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-Boarding'],
}: AutomationsDashboardProps) {
  const { toast } = useToast()

  // Workflows state
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Execution history state
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [runsLoading, setRunsLoading] = useState(false)

  // Builder state
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)
  const [builderName, setBuilderName] = useState('')
  const [builderDescription, setBuilderDescription] = useState('')
  const [builderTriggers, setBuilderTriggers] = useState<WorkflowTrigger[]>([])
  const [builderActions, setBuilderActions] = useState<WorkflowAction[]>([])
  const [saving, setSaving] = useState(false)

  // Fetch workflows
  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/v1/workflows')
      if (!res.ok) throw new Error('Failed to fetch workflows')
      const data = await res.json()
      setWorkflows(data.workflows || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch recent runs
  const fetchRuns = useCallback(async () => {
    try {
      setRunsLoading(true)
      // Fetch runs for all workflows (most recent 20)
      const res = await fetch('/api/v1/workflows?include_runs=true&runs_limit=20')
      if (!res.ok) throw new Error('Failed to fetch runs')
      const data = await res.json()
      // Flatten runs from all workflows
      const allRuns = (data.workflows || []).flatMap((w: Workflow & { runs?: WorkflowRun[] }) =>
        (w.runs || []).map((r: WorkflowRun) => ({ ...r, workflow_name: w.name }))
      )
      // Sort by created_at desc
      allRuns.sort((a: WorkflowRun, b: WorkflowRun) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setRuns(allRuns.slice(0, 20))
    } catch (err) {
      console.error('Failed to fetch runs:', err)
    } finally {
      setRunsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkflows()
    fetchRuns()
  }, [fetchWorkflows, fetchRuns])

  // Toggle workflow active state
  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/v1/workflows/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      })
      if (!res.ok) throw new Error('Failed to toggle workflow')

      setWorkflows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, is_active: isActive } : w))
      )
      toast({
        title: isActive ? 'Workflow enabled' : 'Workflow disabled',
        description: `The workflow has been ${isActive ? 'activated' : 'deactivated'}.`,
      })
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update workflow status',
        variant: 'destructive',
      })
    }
  }

  // Open builder for editing
  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow)
    setBuilderName(workflow.name)
    setBuilderDescription(workflow.description || '')
    setBuilderTriggers(workflow.triggers as unknown as WorkflowTrigger[])
    setBuilderActions(workflow.actions as unknown as WorkflowAction[])
    setShowBuilder(true)
  }

  // Open builder for new workflow
  const handleCreate = () => {
    setEditingWorkflow(null)
    setBuilderName('')
    setBuilderDescription('')
    setBuilderTriggers([])
    setBuilderActions([])
    setShowBuilder(true)
  }

  // Close builder
  const handleCloseBuilder = () => {
    setShowBuilder(false)
    setEditingWorkflow(null)
    setBuilderName('')
    setBuilderDescription('')
    setBuilderTriggers([])
    setBuilderActions([])
  }

  // Save workflow
  const handleSave = async () => {
    if (!builderName.trim()) {
      toast({ title: 'Error', description: 'Workflow name is required', variant: 'destructive' })
      return
    }
    if (builderTriggers.length === 0) {
      toast({ title: 'Error', description: 'At least one trigger is required', variant: 'destructive' })
      return
    }
    if (builderActions.length === 0) {
      toast({ title: 'Error', description: 'At least one action is required', variant: 'destructive' })
      return
    }

    try {
      setSaving(true)

      const payload = {
        name: builderName.trim(),
        description: builderDescription.trim() || null,
        triggers: builderTriggers,
        actions: builderActions,
        is_active: editingWorkflow?.is_active ?? true,
      }

      const url = editingWorkflow
        ? `/api/v1/workflows/${editingWorkflow.id}`
        : '/api/v1/workflows'
      const method = editingWorkflow ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save workflow')
      }

      const saved = await res.json()

      if (editingWorkflow) {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === saved.id ? saved : w))
        )
        toast({ title: 'Workflow updated', description: 'Your changes have been saved.' })
      } else {
        setWorkflows((prev) => [saved, ...prev])
        toast({ title: 'Workflow created', description: 'Your new automation is ready.' })
      }

      handleCloseBuilder()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save workflow',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Trigger handlers
  const handleAddTrigger = (trigger: WorkflowTrigger) => {
    setBuilderTriggers((prev) => [...prev, trigger])
  }

  const handleRemoveTrigger = (triggerId: string) => {
    setBuilderTriggers((prev) => prev.filter((t) => t.id !== triggerId))
  }

  const handleUpdateTrigger = (triggerId: string, config: Record<string, unknown>) => {
    setBuilderTriggers((prev) =>
      prev.map((t) => (t.id === triggerId ? { ...t, config } : t)) as WorkflowTrigger[]
    )
  }

  // Action handlers
  const handleAddAction = (action: WorkflowAction) => {
    setBuilderActions((prev) => [...prev, action])
  }

  const handleRemoveAction = (actionId: string) => {
    setBuilderActions((prev) => prev.filter((a) => a.id !== actionId))
  }

  const handleUpdateAction = (actionId: string, updates: Partial<WorkflowAction>) => {
    setBuilderActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, ...updates } : a)) as WorkflowAction[]
    )
  }

  const handleReorderActions = (reorderedActions: WorkflowAction[]) => {
    setBuilderActions(reorderedActions)
  }

  // Format relative time
  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  // Stats
  const activeCount = workflows.filter((w) => w.is_active).length
  const totalRuns = workflows.reduce((sum, w) => sum + w.run_count, 0)
  const successCount = workflows.reduce((sum, w) => sum + w.success_count, 0)
  const overallSuccessRate = totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 0

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build IF/THEN workflows to automate your client management
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Automation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Workflows</p>
                <p className="text-2xl font-bold">{workflows.length}</p>
              </div>
              <Zap className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-emerald-500">{activeCount}</p>
              </div>
              <Play className="h-8 w-8 text-emerald-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Runs</p>
                <p className="text-2xl font-bold">{totalRuns}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{overallSuccessRate}%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="workflows" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="history">Execution History</TabsTrigger>
        </TabsList>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4 mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card className="bg-destructive/10 border-destructive/30">
              <CardContent className="py-6 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={fetchWorkflows}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : workflows.length === 0 ? (
            <Card className="border-2 border-dashed border-muted-foreground/30">
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="p-4 rounded-full bg-secondary">
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-foreground">No automations yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first IF/THEN workflow to automate tasks
                  </p>
                </div>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Automation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((workflow) => (
                <AutomationCard
                  key={workflow.id}
                  workflow={workflow}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Execution History Tab */}
        <TabsContent value="history" className="space-y-4 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Recent Executions</CardTitle>
              <CardDescription>Live workflow execution history</CardDescription>
            </CardHeader>
            <CardContent>
              {runsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : runs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No executions yet. Runs will appear here when workflows are triggered.
                </div>
              ) : (
                <div className="space-y-3">
                  {runs.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {run.status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        ) : run.status === 'failed' ? (
                          <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                        ) : run.status === 'running' ? (
                          <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {(run as WorkflowRun & { workflow_name?: string }).workflow_name || 'Unknown Workflow'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {run.error_message || `Executed ${(run.results as unknown[])?.length || 0} actions`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <Badge
                          variant="outline"
                          className={
                            run.status === 'completed'
                              ? 'border-emerald-500/50 text-emerald-400'
                              : run.status === 'failed'
                              ? 'border-rose-500/50 text-rose-400'
                              : run.status === 'running'
                              ? 'border-blue-500/50 text-blue-400'
                              : 'border-amber-500/50 text-amber-400'
                          }
                        >
                          {run.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(run.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Workflow Builder Sheet */}
      <Sheet open={showBuilder} onOpenChange={setShowBuilder}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[700px] bg-background border-border overflow-y-auto"
        >
          <SheetHeader className="pb-6">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-foreground">
                {editingWorkflow ? 'Edit Workflow' : 'Create Workflow'}
              </SheetTitle>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 mr-2" />
                )}
                {editingWorkflow ? 'Save Changes' : 'Create & Activate'}
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6 pb-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Workflow Name *</Label>
                <Input
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  placeholder="e.g., New Client Welcome Sequence"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={builderDescription}
                  onChange={(e) => setBuilderDescription(e.target.value)}
                  placeholder="What does this automation do?"
                  rows={2}
                />
              </div>
            </div>

            {/* Triggers Section */}
            <div className="pt-4 border-t border-border">
              <TriggerSelector
                triggers={builderTriggers}
                onAdd={handleAddTrigger}
                onRemove={handleRemoveTrigger}
                onUpdate={handleUpdateTrigger}
                pipelineStages={pipelineStages}
                maxTriggers={2}
              />
            </div>

            {/* Actions Section */}
            <div className="pt-4 border-t border-border">
              <ActionBuilder
                actions={builderActions}
                onAdd={handleAddAction}
                onRemove={handleRemoveAction}
                onUpdate={handleUpdateAction}
                onReorder={handleReorderActions}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
