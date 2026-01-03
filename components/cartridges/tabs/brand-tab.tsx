"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Check, Edit, Trash2, Loader2, Zap, FileText, Building2 } from "lucide-react"
import { type BrandCartridge } from "@/types/cartridges"

export function BrandTab() {
  const [brandCartridge, setBrandCartridge] = useState<BrandCartridge | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    companyDescription: "",
    companyTagline: "",
    industry: "",
    targetAudience: "",
    coreMessaging: "",
  })

  const updateFormData = <K extends keyof typeof formData>(
    key: K,
    value: typeof formData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    // TODO: API call to save brand cartridge
    setIsEditing(false)
  }

  const handleDelete = async () => {
    // TODO: API call to delete brand
    setBrandCartridge(null)
  }

  const handleGenerateBlueprint = async () => {
    setIsGeneratingBlueprint(true)
    // TODO: API call to generate 112-point blueprint
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setIsGeneratingBlueprint(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // TODO: API call to upload logo
  }

  // Calculate word count for core messaging
  const wordCount = formData.coreMessaging.split(/\s+/).filter(Boolean).length
  const charCount = formData.coreMessaging.length

  return (
    <div className="space-y-6">
      {/* Brand Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Brand Information
          </CardTitle>
          <CardDescription>
            Define your company brand and visual identity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing || !brandCartridge ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brandName">Brand Name</Label>
                  <Input
                    id="brandName"
                    placeholder="Your Brand"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="Company Inc."
                    value={formData.companyName}
                    onChange={(e) => updateFormData("companyName", e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="companyDescription">Company Description</Label>
                  <Textarea
                    id="companyDescription"
                    placeholder="What does your company do?"
                    value={formData.companyDescription}
                    onChange={(e) => updateFormData("companyDescription", e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    placeholder="Your memorable tagline"
                    value={formData.companyTagline}
                    onChange={(e) => updateFormData("companyTagline", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    placeholder="Technology, Healthcare, etc."
                    value={formData.industry}
                    onChange={(e) => updateFormData("industry", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Input
                    id="targetAudience"
                    placeholder="B2B SaaS, Consumers, etc."
                    value={formData.targetAudience}
                    onChange={(e) => updateFormData("targetAudience", e.target.value)}
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="logo">Brand Logo</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                />
                {brandCartridge?.logoUrl && (
                  <p className="text-sm text-muted-foreground">Logo uploaded</p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave}>
                  <Check className="mr-2 h-4 w-4" />
                  Save Brand
                </Button>
                {brandCartridge && (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium">Brand Name</p>
                  <p className="text-sm text-muted-foreground">{brandCartridge.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Company</p>
                  <p className="text-sm text-muted-foreground">
                    {brandCartridge.companyName || "Not set"}
                  </p>
                </div>
                {brandCartridge.companyDescription && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm text-muted-foreground">
                      {brandCartridge.companyDescription}
                    </p>
                  </div>
                )}
                {brandCartridge.companyTagline && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium">Tagline</p>
                    <p className="text-sm text-muted-foreground">
                      {brandCartridge.companyTagline}
                    </p>
                  </div>
                )}
                {brandCartridge.industry && (
                  <div>
                    <p className="text-sm font-medium">Industry</p>
                    <p className="text-sm text-muted-foreground">{brandCartridge.industry}</p>
                  </div>
                )}
                {brandCartridge.targetAudience && (
                  <div>
                    <p className="text-sm font-medium">Target Audience</p>
                    <p className="text-sm text-muted-foreground">{brandCartridge.targetAudience}</p>
                  </div>
                )}
              </div>
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Brand
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Core Messaging Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Core Messaging
          </CardTitle>
          <CardDescription>
            Comprehensive marketing messaging (10k+ words): mission, vision, target audience,
            core values, avatar stories, market narrative, promises, objections, and marketing frameworks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`Paste your complete core messaging here...

Example format:
**[Your Company] Core Messaging Sheet**

**Project Name:** [Your Project Name]
**URL:** [Your Website]
**Niche:** [Your Industry/Niche]
**Key Thematics:** [Your Key Themes]
**Core Keywords:** [Your Target Keywords]
**Mission:** [Your Mission Statement]

(Continue with your full messaging including target audience, values, avatar stories, and marketing frameworks)`}
            value={formData.coreMessaging}
            onChange={(e) => updateFormData("coreMessaging", e.target.value)}
            className="min-h-[400px] font-mono text-sm"
          />
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>{charCount.toLocaleString()} characters</span>
            <span>{(wordCount / 1000).toFixed(1)}k words</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave}>
              <Check className="mr-2 h-4 w-4" />
              Save Core Messaging
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateBlueprint}
              disabled={isGeneratingBlueprint}
            >
              {isGeneratingBlueprint ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate 112-Point Blueprint
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Blueprint Preview (if exists) */}
      {brandCartridge?.bensonBlueprint && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              112-Point Benson Blueprint
            </CardTitle>
            <CardDescription>
              Your comprehensive marketing blueprint based on Jon Benson's methodology
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Bio Section */}
              {brandCartridge.bensonBlueprint.bio && (
                <div>
                  <h4 className="font-medium mb-2">Bio & Credentials</h4>
                  <div className="p-3 bg-muted rounded text-sm">
                    <p><strong>Name:</strong> {brandCartridge.bensonBlueprint.bio.name}</p>
                    {brandCartridge.bensonBlueprint.bio.credentials.length > 0 && (
                      <p><strong>Credentials:</strong> {brandCartridge.bensonBlueprint.bio.credentials.join(", ")}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Positioning Section */}
              {brandCartridge.bensonBlueprint.positioning && (
                <div>
                  <h4 className="font-medium mb-2">Positioning</h4>
                  <div className="p-3 bg-muted rounded text-sm">
                    <p><strong>Niche:</strong> {brandCartridge.bensonBlueprint.positioning.niche}</p>
                    <p><strong>Market Position:</strong> {brandCartridge.bensonBlueprint.positioning.marketPosition}</p>
                  </div>
                </div>
              )}

              {/* Pain Points */}
              {brandCartridge.bensonBlueprint.painAndObjections && (
                <div>
                  <h4 className="font-medium mb-2">Pain Points & Objections</h4>
                  <div className="p-3 bg-muted rounded text-sm">
                    {brandCartridge.bensonBlueprint.painAndObjections.painPoints.length > 0 && (
                      <div className="mb-2">
                        <strong>Pain Points:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {brandCartridge.bensonBlueprint.painAndObjections.painPoints.slice(0, 5).map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hooks */}
              {brandCartridge.bensonBlueprint.hooks && (
                <div>
                  <h4 className="font-medium mb-2">Hooks</h4>
                  <div className="flex flex-wrap gap-2">
                    {brandCartridge.bensonBlueprint.hooks.attentionGrabbers.slice(0, 5).map((hook, i) => (
                      <Badge key={i} variant="secondary">{hook}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100 text-base">
            About the 112-Point Blueprint
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>
            The 112-point marketing blueprint is based on Jon Benson's comprehensive marketing
            framework. It covers:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Bio:</strong> Credentials, backstory, unique journey</li>
            <li><strong>Positioning:</strong> Niche, avatars, market position</li>
            <li><strong>Pain & Objections:</strong> Pain points, fears, desires</li>
            <li><strong>Lies & Truths:</strong> Industry myths, truth bombs</li>
            <li><strong>Offer:</strong> Pricing, guarantees, urgency</li>
            <li><strong>Hooks:</strong> Attention grabbers, curiosity hooks</li>
            <li><strong>Sales:</strong> Closing techniques, proof elements</li>
            <li>And 9 more sections...</li>
          </ul>
          <p className="pt-2">
            Fill in your core messaging and click "Generate Blueprint" to create a personalized
            marketing blueprint.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
