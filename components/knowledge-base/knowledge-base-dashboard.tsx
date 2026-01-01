"use client"

import type { ReactNode } from "react"
import { useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  FileText,
  Upload,
  Filter,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  FolderOpen,
  RefreshCw,
  MoreVertical,
  Eye,
  Download,
  Trash2,
  Edit,
  Clock,
  FileType,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { KnowledgeBaseDocument, DocumentSortField } from "@/types/knowledge-base"
import type { DocumentCategory, IndexStatus } from "@/types/database"
import { quickLinks } from "@/lib/mock-knowledge-base"
import {
  formatFileSize,
  FILE_TYPE_INFO,
  INDEX_STATUS_INFO,
} from "@/types/knowledge-base"
import { useKnowledgeBaseStore } from "@/stores/knowledge-base-store"
import { DocumentUploadModal } from "./document-upload-modal"
import { DocumentPreviewModal } from "./document-preview-modal"

// Sort option labels
const SORT_OPTIONS: { value: DocumentSortField; label: string }[] = [
  { value: "updated_at", label: "Recently Updated" },
  { value: "created_at", label: "Date Added" },
  { value: "title", label: "Title" },
  { value: "file_size", label: "File Size" },
  { value: "usage_count", label: "Most Used" },
]

export function KnowledgeBaseDashboard() {
  // Get state and actions from store
  const {
    filteredDocuments,
    selectedDocument,
    isLoading,
    categories,
    filters,
    sort,
    viewMode,
    isUploadModalOpen,
    isPreviewModalOpen,
    setSearchQuery,
    setCategory,
    setIndexStatus,
    setSortField,
    toggleSortDirection,
    setViewMode,
    openUploadModal,
    closeUploadModal,
    openPreviewModal,
    closePreviewModal,
    reindexDocument,
  } = useKnowledgeBaseStore()

  // Handle document actions
  const handlePreview = useCallback((doc: KnowledgeBaseDocument) => {
    openPreviewModal(doc)
  }, [openPreviewModal])

  const handleReindex = useCallback((doc: KnowledgeBaseDocument) => {
    reindexDocument(doc.id)
  }, [reindexDocument])

  // Get file type icon and color
  const getFileTypeInfo = (mimeType: string) => {
    return FILE_TYPE_INFO[mimeType] || {
      label: "File",
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
    }
  }

  // Get index status info
  const getIndexStatusInfo = (status: IndexStatus) => {
    return INDEX_STATUS_INFO[status]
  }

  // Render index status badge
  const renderIndexStatus = (status: IndexStatus) => {
    const info = getIndexStatusInfo(status)
    return (
      <Badge
        variant="outline"
        className={cn("text-xs", info.color, info.bgColor, "border-transparent")}
      >
        {status === "indexing" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        {status === "indexed" && <CheckCircle2 className="mr-1 h-3 w-3" />}
        {status === "failed" && <AlertCircle className="mr-1 h-3 w-3" />}
        {info.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">
            SOPs, training materials, and documentation for AI-powered search
          </p>
        </div>
        <Button onClick={openUploadModal}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={filters.query}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.category}
              variant="outline"
              size="sm"
              className={cn(
                "h-8",
                filters.category === cat.category
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent"
              )}
              onClick={() => setCategory(cat.category as DocumentCategory | "all")}
            >
              {cat.label}
              <Badge
                variant="secondary"
                className="ml-2 h-5 px-1.5 text-xs bg-background/50"
              >
                {cat.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Secondary Filters & View Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <Select
            value={filters.indexStatus}
            onValueChange={(value) => setIndexStatus(value as IndexStatus | "all")}
          >
            <SelectTrigger className="w-[140px] h-8">
              <Filter className="mr-2 h-3.5 w-3.5" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="indexed">Indexed</SelectItem>
              <SelectItem value="indexing">Indexing</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sort.field} onValueChange={(value) => setSortField(value as DocumentSortField)}>
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleSortDirection}
          >
            {sort.direction === "asc" ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", viewMode === "grid" && "bg-background shadow-sm")}
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", viewMode === "list" && "bg-background shadow-sm")}
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredDocuments.length} document{filteredDocuments.length !== 1 ? "s" : ""} found
      </div>

      {/* Documents Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onPreview={handlePreview}
              onReindex={handleReindex}
              getFileTypeInfo={getFileTypeInfo}
              renderIndexStatus={renderIndexStatus}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocuments.map((doc) => (
            <DocumentListItem
              key={doc.id}
              document={doc}
              onPreview={handlePreview}
              onReindex={handleReindex}
              getFileTypeInfo={getFileTypeInfo}
              renderIndexStatus={renderIndexStatus}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredDocuments.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No documents found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {filters.query
              ? "Try adjusting your search or filters"
              : "Upload your first document to get started"}
          </p>
          {!filters.query && (
            <Button onClick={openUploadModal}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          )}
        </div>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Quick Links</CardTitle>
          <CardDescription>Frequently accessed resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickLinks.map((link) => (
              <Button
                key={link.title}
                variant="outline"
                className="justify-start h-auto py-3"
                asChild
              >
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2 shrink-0" />
                  <span className="text-sm truncate">{link.title}</span>
                </a>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={closeUploadModal}
        onUploadComplete={() => {
          // Document will be added via store in future API integration
          closeUploadModal()
        }}
      />

      {/* Preview Modal */}
      {selectedDocument && (
        <DocumentPreviewModal
          document={selectedDocument}
          isOpen={isPreviewModalOpen}
          onClose={closePreviewModal}
        />
      )}
    </div>
  )
}

// Document Card Component (Grid View)
interface DocumentCardProps {
  document: KnowledgeBaseDocument
  onPreview: (doc: KnowledgeBaseDocument) => void
  onReindex: (doc: KnowledgeBaseDocument) => void
  getFileTypeInfo: (mimeType: string) => { label: string; color: string; bgColor: string }
  renderIndexStatus: (status: IndexStatus) => ReactNode
}

function DocumentCard({
  document: doc,
  onPreview,
  onReindex,
  getFileTypeInfo,
  renderIndexStatus,
}: DocumentCardProps) {
  const fileInfo = getFileTypeInfo(doc.mime_type)

  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Badge
            variant="outline"
            className={cn("text-xs", fileInfo.color, fileInfo.bgColor, "border-transparent")}
          >
            <FileType className="mr-1 h-3 w-3" />
            {fileInfo.label}
          </Badge>
          <div className="flex items-center gap-1">
            {renderIndexStatus(doc.index_status)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onPreview(doc)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                {doc.index_status === "failed" && (
                  <DropdownMenuItem onClick={() => onReindex(doc)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-index
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CardTitle
          className="text-base font-medium text-foreground group-hover:text-primary transition-colors cursor-pointer line-clamp-2"
          onClick={() => onPreview(doc)}
        >
          {doc.title}
        </CardTitle>
        <CardDescription className="line-clamp-2">{doc.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Tags */}
        {doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {doc.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {doc.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                +{doc.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(doc.updated_at).toLocaleDateString()}
            </span>
            <span>{formatFileSize(doc.file_size)}</span>
          </div>
          {doc.client_name && (
            <Badge variant="outline" className="text-xs">
              {doc.client_name}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Document List Item Component (List View)
function DocumentListItem({
  document: doc,
  onPreview,
  onReindex,
  getFileTypeInfo,
  renderIndexStatus,
}: DocumentCardProps) {
  const fileInfo = getFileTypeInfo(doc.mime_type)

  return (
    <div className="group flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors">
      {/* File Type Icon */}
      <div className={cn("p-2 rounded-md shrink-0", fileInfo.bgColor)}>
        <FileText className={cn("h-5 w-5", fileInfo.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3
            className="text-sm font-medium text-foreground group-hover:text-primary transition-colors cursor-pointer truncate"
            onClick={() => onPreview(doc)}
          >
            {doc.title}
          </h3>
          {renderIndexStatus(doc.index_status)}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">{doc.description}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>{fileInfo.label}</span>
          <span>{formatFileSize(doc.file_size)}</span>
          <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
          {doc.client_name && <Badge variant="outline" className="text-xs">{doc.client_name}</Badge>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPreview(doc)}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Download className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {doc.index_status === "failed" && (
              <DropdownMenuItem onClick={() => onReindex(doc)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-index
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
