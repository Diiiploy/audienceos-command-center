"use client"

import React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  X,
  Download,
  ExternalLink,
  MoreHorizontal,
  Star,
  Share2,
  Trash2,
  Copy,
  FileText,
  Edit,
  History,
  FolderInput,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SendToAiButton } from "@/components/ui/send-to-ai-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type DocumentType, type DocumentCategory, categoryLabels, categoryColors } from "./document-card"

interface Document {
  id: string
  name: string
  type: DocumentType
  category?: DocumentCategory
  description?: string
  thumbnail?: string
  content?: string
  updatedAt: string
  createdAt: string
  updatedBy?: string
  createdBy?: string
  size?: string
  shared?: boolean
  starred?: boolean
  useForTraining?: boolean
  tags?: string[]
  clientName?: string
  viewCount?: number
  downloadCount?: number
}

interface DocumentPreviewPanelProps {
  document: Document
  onClose: () => void
  onStar?: () => void
  onDownload?: () => void
  onShare?: () => void
  onDelete?: () => void
  onToggleTraining?: () => void
  className?: string
}

export function DocumentPreviewPanel({
  document,
  onClose,
  onStar,
  onDownload,
  onShare,
  onDelete,
  onToggleTraining,
  className,
}: DocumentPreviewPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background border-l border-border",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {document.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onStar}
            className={cn(
              "p-1.5 rounded transition-colors cursor-pointer",
              document.starred
                ? "text-yellow-500"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Star className={cn("w-4 h-4", document.starred && "fill-yellow-500")} />
          </button>
          <button
            onClick={onDownload}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors cursor-pointer">
            <ExternalLink className="w-4 h-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="w-4 h-4 mr-2" />
                Make a copy
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FolderInput className="w-4 h-4 mr-2" />
                Move to folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <History className="w-4 h-4 mr-2" />
                Version history
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview area - fills available space */}
      <div className="flex-1 bg-secondary/50 flex items-center justify-center min-h-0">
        {document.thumbnail ? (
          <div className="relative w-full h-full">
            <Image
              src={document.thumbnail}
              alt={document.name}
              fill
              className="object-contain"
            />
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Preview not available</p>
          </div>
        )}
      </div>

      {/* Document info + Metadata - anchored to bottom */}
      <div className="border-t border-border">
        {/* Document title and description */}
        <div className="px-3 py-2 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            {document.name}
          </h2>
          {document.description && (
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">{document.description}</p>
          )}
        </div>

        {/* Metadata - Single Column Key-Value List */}
        <div className="px-3 py-2 max-h-[220px] overflow-y-auto">
          <div className="space-y-1">
            {/* Category */}
            {document.category && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Category</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-medium",
                    categoryColors[document.category]
                  )}
                >
                  {categoryLabels[document.category]}
                </span>
              </div>
            )}

            {/* Size */}
            {document.size && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Size</span>
                <span className="text-xs text-foreground">{document.size}</span>
              </div>
            )}

            {/* Views */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Views</span>
              <span className="text-xs text-foreground">{document.viewCount ?? 0}</span>
            </div>

            {/* Downloads */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Downloads</span>
              <span className="text-xs text-foreground">{document.downloadCount ?? 0}</span>
            </div>

            {/* Created */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Created</span>
              <span className="text-xs text-foreground text-right">
                {document.createdAt}
                {document.createdBy && (
                  <span className="text-muted-foreground"> by {document.createdBy}</span>
                )}
              </span>
            </div>

            {/* Updated */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Updated</span>
              <span className="text-xs text-foreground text-right">
                {document.updatedAt}
                {document.updatedBy && (
                  <span className="text-muted-foreground"> by {document.updatedBy}</span>
                )}
              </span>
            </div>

            {/* Client */}
            {document.clientName && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Client</span>
                <span className="text-xs text-foreground">{document.clientName}</span>
              </div>
            )}

            {/* AI Training */}
            {onToggleTraining && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">AI Training</span>
                <button
                  onClick={onToggleTraining}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer",
                    document.useForTraining
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  {document.useForTraining ? (
                    <>
                      <Check className="w-3 h-3" />
                      Enabled
                    </>
                  ) : (
                    "Enable"
                  )}
                </button>
              </div>
            )}

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <div className="flex items-start justify-between">
                <span className="text-xs text-muted-foreground pt-0.5">Tags</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-[70%]">
                  {document.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - 2x2 Grid */}
        <div className="p-3 border-t border-border">
          <div className="grid grid-cols-2 gap-2">
            <SendToAiButton
              context={{
                type: "document",
                id: document.id,
                title: document.name,
                metadata: {
                  category: document.category,
                  tags: document.tags,
                },
              }}
              label="Send to AI"
              className="h-9 text-xs"
            />
            <button
              onClick={onShare}
              className="flex items-center justify-center gap-1.5 h-9 bg-secondary text-foreground rounded-md text-xs font-medium hover:bg-secondary/80 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
            <button
              onClick={onDownload}
              className="flex items-center justify-center gap-1.5 h-9 bg-secondary text-foreground rounded-md text-xs font-medium hover:bg-secondary/80 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-1.5 h-9 text-red-500 border border-red-500/30 hover:bg-red-500/10 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export type { Document }
