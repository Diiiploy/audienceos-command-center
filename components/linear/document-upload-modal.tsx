'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDocumentUpload } from '@/hooks/use-document-upload'
import { Upload, AlertCircle, CheckCircle } from 'lucide-react'
import type { DocumentCategory } from '@/types/database'

interface ClientOption {
  id: string
  name: string
}

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'installation', label: 'Installation' },
  { value: 'tech', label: 'Technical' },
  { value: 'support', label: 'Support' },
  { value: 'process', label: 'Process' },
  { value: 'client_specific', label: 'Client Specific' },
]

interface DocumentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  clientId?: string
}

export function DocumentUploadModal({ isOpen, onClose, clientId }: DocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('installation')
  const [selectedClientId, setSelectedClientId] = useState<string>(clientId || '')
  const [clients, setClients] = useState<ClientOption[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { uploadDocument, isUploading, progress, error } = useDocumentUpload()

  // Fetch clients for the dropdown
  useEffect(() => {
    if (!isOpen) return
    async function loadClients() {
      try {
        const response = await fetch('/api/v1/clients?is_active=true', { credentials: 'include' })
        if (!response.ok) return
        const { data } = await response.json()
        if (data) {
          setClients((data as { id: string; name: string }[]).map(c => ({ id: c.id, name: c.name })))
        }
      } catch { /* ignore */ }
    }
    loadClients()
  }, [isOpen])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      return
    }

    const result = await uploadDocument(file, {
      title: title || file.name,
      category,
      clientId: selectedClientId || clientId,
    })

    if (result) {
      // Reset form and close modal
      setFile(null)
      setTitle('')
      setCategory('installation')
      setSelectedClientId(clientId || '')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>Upload a document to your knowledge base. Supports PDF, DOC, DOCX, and TXT files up to 50MB.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">File</label>
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {file ? file.name : 'Click to select a file or drag and drop'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, TXT • Up to 50MB</p>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title (optional)"
              disabled={isUploading}
            />
          </div>

          {/* Category Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={(val) => setCategory(val as DocumentCategory)} disabled={isUploading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Select (optional) */}
          {clients.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Client <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId} disabled={isUploading}>
                <SelectTrigger>
                  <SelectValue placeholder="No client — global document" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No client — global document</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Message */}
          {!isUploading && progress === 100 && !error && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md flex gap-2 items-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-600">Upload successful!</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" type="button" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file || !title.trim() || isUploading}>
              {isUploading ? `Uploading... ${progress}%` : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
