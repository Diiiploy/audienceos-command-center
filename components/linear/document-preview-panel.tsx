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
  Clock,
  User,
  Folder,
  Tag,
  FileText,
  Eye,
  Edit,
  History,
  FolderInput,
  BrainCircuit,
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
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{document.description}</p>
          )}
        </div>

        {/* Metadata - Two Column Layout */}
        <div className="px-3 py-2 max-h-[220px] overflow-y-auto">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {/* Left Column */}
            <div className="space-y-2">
              {/* Category */}
              {document.category && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Category</p>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-medium inline-block",
                      categoryColors[document.category]
                    )}
                  >
                    {categoryLabels[document.category]}
                  </span>
                </div>
              )}

              {/* Size */}
              {document.size && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Size</p>
                  <p className="text-xs text-foreground font-medium">{document.size}</p>
                </div>
              )}

              {/* Created */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Created</p>
                <p className="text-xs text-foreground font-medium">
                  {document.createdAt}
                  {document.createdBy && (
                    <span className="text-muted-foreground font-normal"> by {document.createdBy}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-2">
              {/* Views */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Views</p>
                <p className="text-xs text-foreground font-medium">{document.viewCount ?? 0}</p>
              </div>

              {/* Downloads */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Downloads</p>
                <p className="text-xs text-foreground font-medium">{document.downloadCount ?? 0}</p>
              </div>

              {/* Updated */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Updated</p>
                <p className="text-xs text-foreground font-medium">
                  {document.updatedAt}
                  {document.updatedBy && (
                    <span className="text-muted-foreground font-normal"> by {document.updatedBy}</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Tags - Two Column Distribution */}
          {document.tags && document.tags.length > 0 && (
            <div className="mt-3 pt-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground mb-1.5">Tags</p>
              <div className="grid grid-cols-2 gap-1">
                {document.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground truncate"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Client & AI Training Row */}
          {(document.clientName || onToggleTraining) && (
            <div className="mt-3 pt-2 border-t border-border grid grid-cols-2 gap-x-4">
              {document.clientName && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Client</p>
                  <p className="text-xs text-foreground font-medium">{document.clientName}</p>
                </div>
              )}
              {onToggleTraining && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">AI Training</p>
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
            </div>
          )}
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
