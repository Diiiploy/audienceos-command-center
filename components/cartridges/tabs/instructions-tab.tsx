"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, Upload, Eye, Trash2, Loader2, FileText, BookOpen } from "lucide-react"
import { type InstructionCartridge } from "@/types/cartridges"

export function InstructionsTab() {
  const [instructionCartridges, setInstructionCartridges] = useState<InstructionCartridge[]>([])
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const handleCreate = async () => {
    if (!newName.trim()) return
    // TODO: API call to create instruction set
    setNewName("")
    setNewDescription("")
  }

  const handleUpload = async (_instructionId: string) => {
    const input = document.createElement("input")
    input.type = "file"
    input.multiple = true
    input.accept = ".pdf,.txt,.docx,.md"

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files || files.length === 0) return
      // TODO: API call to upload documents for instruction: ${instructionId}
    }

    input.click()
  }

  const handleProcess = async (instructionId: string) => {
    setProcessingIds((prev) => new Set(prev).add(instructionId))
    // TODO: API call to process instruction
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setProcessingIds((prev) => {
      const next = new Set(prev)
      next.delete(instructionId)
      return next
    })
  }

  const handleDelete = async (instructionId: string) => {
    // TODO: API call to delete instruction
    setInstructionCartridges((prev) => prev.filter((i) => i.id !== instructionId))
  }

  const getStatusColor = (status: InstructionCartridge["processStatus"]) => {
    switch (status) {
      case "completed":
        return "default"
      case "processing":
        return "secondary"
      case "failed":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketing Instructions</CardTitle>
        <CardDescription>
          Upload training documents to teach specific marketing frameworks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create New */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <Label className="text-base font-medium">Create New Instruction Set</Label>
          <Input
            placeholder="Name (e.g., 'StoryBrand Framework')"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Textarea
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="min-h-[80px]"
          />
          <Button onClick={handleCreate} disabled={!newName.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Instruction Set
          </Button>
        </div>

        {/* Existing Instructions */}
        {instructionCartridges.length > 0 && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Instruction Sets</Label>
            {instructionCartridges.map((instruction) => (
              <Card key={instruction.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      {instruction.name}
                    </CardTitle>
                    <Badge variant={getStatusColor(instruction.processStatus)}>
                      {instruction.processStatus}
                    </Badge>
                  </div>
                  {instruction.description && (
                    <CardDescription>{instruction.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Document Count */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {instruction.trainingDocs?.length || 0} document(s)
                    </div>

                    {/* Processing Progress */}
                    {instruction.processStatus === "processing" && (
                      <div className="space-y-1">
                        <Progress value={50} />
                        <p className="text-xs text-muted-foreground text-center">
                          Processing documents...
                        </p>
                      </div>
                    )}

                    {/* Extracted Knowledge Preview */}
                    {instruction.extractedKnowledge && (
                      <div className="p-3 bg-muted rounded text-sm">
                        <p className="font-medium mb-1">Extracted Knowledge:</p>
                        <ul className="list-disc list-inside text-muted-foreground">
                          {instruction.extractedKnowledge.frameworks?.slice(0, 3).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                          {(instruction.extractedKnowledge.frameworks?.length || 0) > 3 && (
                            <li className="text-muted-foreground">
                              +{(instruction.extractedKnowledge.frameworks?.length || 0) - 3} more...
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpload(instruction.id)}
                      >
                        <Upload className="mr-2 h-3 w-3" />
                        Upload Docs
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleProcess(instruction.id)}
                        disabled={
                          processingIds.has(instruction.id) ||
                          instruction.processStatus === "processing" ||
                          !instruction.trainingDocs?.length
                        }
                      >
                        {processingIds.has(instruction.id) ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-3 w-3" />
                            Process
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(instruction.id)}
                      >
                        <Trash2 className="mr-2 h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {instructionCartridges.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No instruction sets created yet</p>
            <p className="text-sm mt-1">Create an instruction set and upload training documents</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
