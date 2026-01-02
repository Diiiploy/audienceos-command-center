"use client"

import { useState, use, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  Minus,
  Send,
  Sparkles,
  RefreshCw,
  Play,
  Check,
  Share2,
} from "lucide-react"
import { owners } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { usePipelineStore } from "@/stores/pipeline-store"
import { useAuth } from "@/hooks/use-auth"

export default function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const clientId = resolvedParams.id

  // Auth and pipeline store
  const { isAuthenticated } = useAuth()
  const { clients, isLoading, fetchClients } = usePipelineStore()

  // Fetch clients if not already loaded
  useEffect(() => {
    if (isAuthenticated && clients.length === 0) {
      fetchClients()
    }
  }, [isAuthenticated, clients.length, fetchClients])

  // Find client from store (transforms to UI format)
  const storeClient = clients.find((c) => c.id === clientId)

  // Types for UI client fields not yet in API
  type Task = { id: string; name: string; completed: boolean; stage: string; assignee: string; dueDate?: string }
  type Comm = { id: string; sender: string; avatar: string; message: string; timestamp: string; isInternal: boolean; subject?: string }

  // Transform store client to UI client format
  const client = storeClient ? {
    id: storeClient.id,
    name: storeClient.name,
    logo: storeClient.name.substring(0, 2).toUpperCase(),
    stage: storeClient.stage,
    health: storeClient.health_status,
    owner: storeClient.owner || 'Unassigned',
    daysInStage: storeClient.days_in_stage,
    tier: "Core" as const,
    tasks: [] as Task[],
    comms: [] as Comm[],
    // Extended fields from store
    contact_email: storeClient.contact_email,
    contact_name: storeClient.contact_name,
    notes: storeClient.notes,
    tags: storeClient.tags,
    // Placeholder fields - will be fetched from dedicated APIs later
    metaAds: null as { spend: number; roas: number; cpa: number; trend: 'up' | 'down' | 'flat' } | null,
    googleAds: null as { impressions: number; clicks: number; conversions: number; trend: 'up' | 'down' | 'flat' } | null,
    performanceData: [] as { date: string; adSpend: number; roas: number }[],
    onboardingData: null as { shopifyUrl: string; gtmContainerId: string; metaPixelId: string; klaviyoApiKey: string } | null,
  } : null

  const [message, setMessage] = useState("")
  const [accessStatus, setAccessStatus] = useState({
    meta: false,
    gtm: false,
    shopify: false,
  })

  // Show loading state while fetching
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading client...</div>
      </div>
    )
  }

  // Show not found after loading completes
  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-lg font-semibold text-foreground mb-4">Client Not Found</h1>
          <p className="text-sm text-muted-foreground mb-4">
            {!isAuthenticated ? "Please sign in to view client details." : "This client doesn't exist or you don't have access."}
          </p>
          <Button onClick={() => router.push("/")}>Return to Dashboard</Button>
        </Card>
      </div>
    )
  }

  const owner = owners.find((o) => o.name === client.owner)

  const handleVerifyAccess = (platform: "meta" | "gtm" | "shopify") => {
    setAccessStatus((prev) => ({ ...prev, [platform]: true }))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                <span className="text-[11px] font-bold text-secondary-foreground">{client.logo}</span>
              </div>

              <div>
                <h1 className="text-lg font-semibold text-foreground">{client.name}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {client.tier}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {client.stage}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{client.daysInStage} days in stage</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Avatar className={cn("h-8 w-8", owner?.color)}>
                <AvatarFallback className={cn(owner?.color, "text-xs text-white")}>{owner?.avatar}</AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground">Owner: {client.owner}</span>

              <Button variant="outline" size="sm" className="ml-4 gap-2 bg-transparent">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <ExternalLink className="h-4 w-4" />
                Open Shopify
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comms">Communications</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="media">Media & Files</TabsTrigger>
            <TabsTrigger value="techsetup">Tech Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Health Status</p>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      client.health === "Green"
                        ? "bg-emerald-500"
                        : client.health === "Yellow"
                          ? "bg-amber-500"
                          : client.health === "Red"
                            ? "bg-rose-500"
                            : "bg-purple-500",
                    )}
                  />
                  <p className="text-lg font-semibold text-foreground">{client.health}</p>
                </div>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Support Tickets</p>
                <p className="text-lg font-semibold text-foreground">2</p>
                <p className="text-xs text-muted-foreground mt-1">1 open, 1 resolved</p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Last Contact</p>
                <p className="text-lg font-semibold text-foreground">2 hours ago</p>
                <p className="text-xs text-muted-foreground mt-1">Slack message</p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Install Progress</p>
                <p className="text-lg font-semibold text-foreground">75%</p>
                <p className="text-xs text-muted-foreground mt-1">3 of 4 steps complete</p>
              </Card>
            </div>

            {/* Timeline */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Client Timeline</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    <div className="w-0.5 h-full bg-border" />
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-medium text-foreground">Pixel Installation Completed</p>
                    <p className="text-xs text-muted-foreground">2 hours ago by Luke</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <div className="w-0.5 h-full bg-border" />
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-medium text-foreground">Access Verified</p>
                    <p className="text-xs text-muted-foreground">5 hours ago</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full" />
                    <div className="w-0.5 h-full bg-border" />
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-medium text-foreground">Onboarding Form Submitted</p>
                    <p className="text-xs text-muted-foreground">2 days ago</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-muted rounded-full" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Client Created</p>
                    <p className="text-xs text-muted-foreground">3 days ago</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="comms" className="space-y-4">
            {/* Full communications tab content from client-detail-sheet */}
            <Card className="p-6">
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {client.comms.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No communications yet.</p>
                    <p className="text-xs mt-1">Connect Slack or Gmail to sync messages.</p>
                  </div>
                ) : (
                  client.comms.map((comm) => (
                    <div
                      key={comm.id}
                      className={cn(
                        "p-4 rounded-lg border",
                        comm.isInternal ? "bg-secondary/50 border-border" : "bg-blue-500/10 border-blue-500/30",
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6 bg-secondary">
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                            {comm.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground">{comm.sender}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{comm.timestamp}</span>
                      </div>
                      {comm.subject && <p className="text-xs text-muted-foreground mb-1 pl-6">Subject: {comm.subject}</p>}
                      <p className="text-sm text-muted-foreground pl-6">{comm.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-border mt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" className="w-full bg-transparent">
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Draft Reply
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            {/* Full tasks content */}
            <Card className="p-6">
              {client.tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No tasks yet.</p>
                  <p className="text-xs mt-1">Tasks will appear as client progresses through stages.</p>
                </div>
              ) : (
                Array.from(new Set(client.tasks.map((t) => t.stage))).map((stage) => (
                  <div key={stage} className="mb-6">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{stage}</h4>
                    <div className="space-y-2">
                      {client.tasks
                        .filter((t) => t.stage === stage)
                        .map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between gap-3 p-4 rounded-lg bg-secondary/30 border border-border"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {task.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                              <span
                                className={cn(
                                  "text-sm",
                                  task.completed ? "text-muted-foreground line-through" : "text-foreground",
                                )}
                              >
                                {task.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select defaultValue={task.assignee}>
                                <SelectTrigger className="w-[120px] h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {owners.map((o) => (
                                    <SelectItem key={o.name} value={o.name}>
                                      {o.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {task.dueDate && <span className="text-xs text-muted-foreground">{task.dueDate}</span>}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))
              )}
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {/* Performance charts and metrics */}
            {!client.metaAds && !client.googleAds && client.performanceData.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No performance data yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Connect Google Ads or Meta to sync performance metrics.</p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {client.metaAds && (
                    <Card className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-foreground">Meta Ads</h4>
                        {client.metaAds.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : client.metaAds.trend === "down" ? (
                          <TrendingDown className="h-4 w-4 text-rose-500" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Spend</p>
                          <p className="text-lg font-semibold text-foreground">${client.metaAds.spend.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">ROAS</p>
                          <p
                            className={cn(
                              "text-lg font-semibold",
                              client.metaAds.roas >= 2 ? "text-emerald-400" : "text-rose-400",
                            )}
                          >
                            {client.metaAds.roas}x
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">CPA</p>
                          <p className="text-lg font-semibold text-foreground">${client.metaAds.cpa}</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {client.googleAds && (
                    <Card className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-foreground">Google Ads</h4>
                        {client.googleAds.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : client.googleAds.trend === "down" ? (
                          <TrendingDown className="h-4 w-4 text-rose-500" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Impressions</p>
                          <p className="text-lg font-semibold text-foreground">
                            {(client.googleAds.impressions / 1000).toFixed(0)}k
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Clicks</p>
                          <p className="text-lg font-semibold text-foreground">
                            {(client.googleAds.clicks / 1000).toFixed(1)}k
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Conversions</p>
                          <p className="text-lg font-semibold text-foreground">{client.googleAds.conversions}</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                {client.performanceData.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-foreground">Performance Over Time</h4>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-3.5 w-3.5 mr-2" />
                        Sync Now
                      </Button>
                    </div>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={client.performanceData}>
                          <defs>
                            <linearGradient id="adSpendGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="roasGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} />
                          <YAxis yAxisId="left" tick={{ fill: "#71717a", fontSize: 10 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: "#71717a", fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#18181b",
                              border: "1px solid #27272a",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="adSpend"
                            stroke="#10b981"
                            fill="url(#adSpendGradient)"
                            name="Ad Spend"
                          />
                          <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="roas"
                            stroke="#3b82f6"
                            fill="url(#roasGradient)"
                            name="ROAS"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            {/* Media and recordings */}
            <Card className="p-6">
              <h4 className="text-sm font-medium text-foreground mb-4">Zoom Recordings</h4>
              <div className="space-y-3">
                {/* Sample recordings */}
                <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Kickoff Call Recording</p>
                      <p className="text-xs text-muted-foreground">Dec 1, 2024 • 45:32</p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Play className="h-3.5 w-3.5 mr-1" />
                      Play
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="techsetup" className="space-y-4">
            {/* Tech setup details */}
            {client.onboardingData ? (
              <>
                <Card className="p-6 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Onboarding Submission
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-secondary/30 border border-border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Shopify Store URL</p>
                      <p className="text-sm font-mono text-foreground">{client.onboardingData.shopifyUrl}</p>
                    </div>
                    <div className="p-3 bg-secondary/30 border border-border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">GTM Container ID</p>
                      <p className="text-sm font-mono text-foreground">{client.onboardingData.gtmContainerId}</p>
                    </div>
                    <div className="p-3 bg-secondary/30 border border-border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Meta Pixel ID</p>
                      <p className="text-sm font-mono text-foreground">{client.onboardingData.metaPixelId}</p>
                    </div>
                    <div className="p-3 bg-secondary/30 border border-border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Klaviyo API Key</p>
                      <p className="text-sm font-mono text-foreground">{client.onboardingData.klaviyoApiKey}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Access Status</h4>
                  <div className="space-y-2">
                    {[
                      { key: "meta", label: "Meta Business Manager" },
                      { key: "gtm", label: "Google Tag Manager" },
                      { key: "shopify", label: "Shopify Staff Account" },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-4 bg-secondary/30 border border-border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              accessStatus[item.key as keyof typeof accessStatus]
                                ? "bg-emerald-500"
                                : "bg-amber-500 animate-pulse"
                            }`}
                          />
                          <span className="text-sm text-foreground">{item.label}</span>
                        </div>
                        {!accessStatus[item.key as keyof typeof accessStatus] ? (
                          <Button size="sm" variant="outline" onClick={() => handleVerifyAccess(item.key as any)}>
                            Verify Access
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No onboarding data submitted yet.</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
