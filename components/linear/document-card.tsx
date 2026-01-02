"use client"

import React from "react"
import { cn } from "@/lib/utils"
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  File,
  Folder,
  MoreHorizontal,
  Star,
  Clock,
  Users,
} from "lucide-react"

export type DocumentType = "document" | "spreadsheet" | "presentation" | "image" | "video" | "pdf" | "folder" | "other"
export type DocumentCategory = "onboarding" | "reporting" | "creative" | "strategy" | "contracts" | "templates" | "training"

interface DocumentCardProps {
  id: string
  name: string
  type: DocumentType
  category?: DocumentCategory
  description?: string
  thumbnail?: string
  updatedAt: string
  updatedBy?: string
  size?: string
  shared?: boolean
  starred?: boolean
  selected?: boolean
  onClick?: () => void
  onStar?: () => void
  viewMode?: "grid" | "list"
}

const getTypeIcon = (type: DocumentType, size: "sm" | "lg" = "sm") => {
  const className = size === "lg" ? "w-8 h-8" : "w-5 h-5"
  const icons: Record<DocumentType, React.ReactNode> = {
    document: <FileText className={className} />,
    spreadsheet: <FileSpreadsheet className={className} />,
    presentation: <FileText className={className} />,
    image: <FileImage className={className} />,
    video: <FileVideo className={className} />,
    pdf: <FileText className={className} />,
    folder: <Folder className={className} />,
    other: <File className={className} />,
  }
  return icons[type]
}

const typeColors: Record<DocumentType, string> = {
  document: "bg-blue-500/10 text-blue-500",
  spreadsheet: "bg-emerald-500/10 text-emerald-500",
  presentation: "bg-orange-500/10 text-orange-500",
  image: "bg-pink-500/10 text-pink-500",
  video: "bg-purple-500/10 text-purple-500",
  pdf: "bg-red-500/10 text-red-500",
  folder: "bg-yellow-500/10 text-yellow-500",
  other: "bg-slate-500/10 text-slate-400",
}

const categoryLabels: Record<DocumentCategory, string> = {
  onboarding: "Onboarding",
  reporting: "Reporting",
  creative: "Creative",
  strategy: "Strategy",
  contracts: "Contracts",
  templates: "Templates",
  training: "Training",
}

const categoryColors: Record<DocumentCategory, string> = {
  onboarding: "bg-blue-500/10 text-blue-500",
  reporting: "bg-emerald-500/10 text-emerald-500",
  creative: "bg-pink-500/10 text-pink-500",
  strategy: "bg-purple-500/10 text-purple-500",
  contracts: "bg-orange-500/10 text-orange-500",
  templates: "bg-cyan-500/10 text-cyan-500",
  training: "bg-yellow-500/10 text-yellow-500",
}

export function DocumentCard({
  id,
  name,
  type,
  category,
  description,
  thumbnail,
  updatedAt,
  updatedBy,
  size,
  shared = false,
  starred = false,
  selected = false,
  onClick,
  onStar,
  viewMode = "grid",
}: DocumentCardProps) {
  if (viewMode === "list") {
    return (
      <div
        className={cn(
          "flex items-center gap-4 px-4 py-3 border-b border-border cursor-pointer transition-colors",
          selected ? "bg-secondary" : "hover:bg-secondary/50"
        )}
        onClick={onClick}
      >
        {/* Icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            typeColors[type]
          )}
        >
          {getTypeIcon(type)}
        </div>

        {/* Name and meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">{name}</span>
            {starred && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          )}
        </div>

        {/* Category */}
        {category && (
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded font-medium flex-shrink-0",
              categoryColors[category]
            )}
          >
            {categoryLabels[category]}
          </span>
        )}

        {/* Shared indicator */}
        {shared && (
          <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}

        {/* Updated */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span>{updatedAt}</span>
        </div>

        {/* Size */}
        {size && (
          <span className="text-xs text-muted-foreground w-16 text-right flex-shrink-0">
            {size}
          </span>
        )}

        {/* Actions */}
        <button
          onClick={(e) => {
            e.stopPropagation()
          }}
          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors flex-shrink-0"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // Grid view
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg overflow-hidden cursor-pointer transition-all group",
        selected ? "border-primary ring-1 ring-primary" : "hover:border-primary/50"
      )}
      onClick={onClick}
    >
      {/* Thumbnail or icon */}
      <div className="aspect-[4/3] bg-secondary/50 flex items-center justify-center relative">
        {thumbnail ? (
          <img src={thumbnail} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center", typeColors[type])}>
            {getTypeIcon(type, "lg")}
          </div>
        )}

        {/* Star button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStar?.()
          }}
          className={cn(
            "absolute top-2 right-2 p-1.5 rounded transition-all",
            starred
              ? "text-yellow-500"
              : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
          )}
        >
          <Star className={cn("w-4 h-4", starred && "fill-yellow-500")} />
        </button>

        {/* Folder icon overlay */}
        {type === "folder" && (
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            Folder
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-medium text-foreground text-sm truncate">{name}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation()
            }}
            className="p-0.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {category && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded font-medium",
                  categoryColors[category]
                )}
              >
                {categoryLabels[category]}
              </span>
            )}
            {shared && <Users className="w-3.5 h-3.5" />}
          </div>
          <span>{updatedAt}</span>
        </div>
      </div>
    </div>
  )
}

// Skeleton for loading state
export function DocumentCardSkeleton({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          <div className="h-3 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-5 w-16 bg-muted rounded animate-pulse" />
        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="aspect-[4/3] bg-muted animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
      </div>
    </div>
  )
}

export { categoryLabels, categoryColors }
