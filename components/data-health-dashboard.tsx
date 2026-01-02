"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts"
import { Activity, Gauge, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const signalRecoveryData = [
  { name: "Browser Events", value: 8500, color: "#64748b" },
  { name: "Server Events", value: 9775, color: "#10b981" },
]

export function DataHealthDashboard() {
  const { toast } = useToast()

  const handleReauth = () => {
    toast({
      title: "Re-authentication Started",
      description: "Reconnecting to Klaviyo API...",
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Widget A: Signal Recovery */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[11px] font-medium flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Signal Recovery
            </CardTitle>
            <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-500 border-emerald-500/30">
              +15%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={signalRecoveryData}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {signalRecoveryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">+15% Data Recovered via Server-Side</p>
        </CardContent>
      </Card>

      {/* Widget B: Event Match Quality */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[11px] font-medium flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-primary" />
            Event Match Quality (EMQ)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-3 px-3">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="oklch(0.22 0.005 260)" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="oklch(0.72 0.17 162)"
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 * (1 - 0.82)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-primary">8.2</span>
              <span className="text-[10px] text-muted-foreground">/10</span>
            </div>
          </div>
          <Badge className="mt-3 text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Excellent (Top 10%)</Badge>
        </CardContent>
      </Card>

      {/* Widget C: API Uptime */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[11px] font-medium">API Uptime</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3">
          <div className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-foreground">Meta CAPI</span>
            </div>
            <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-500 border-emerald-500/30">
              Active
            </Badge>
          </div>
          <div className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-foreground">Google EC</span>
            </div>
            <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-500 border-emerald-500/30">
              Active
            </Badge>
          </div>
          <div className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-[11px] text-foreground">Klaviyo Sync</span>
            </div>
            <Button variant="outline" className="h-6 text-[9px] px-2 bg-transparent" onClick={handleReauth}>
              <RefreshCw className="h-2.5 w-2.5 mr-1" />
              Re-auth
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
