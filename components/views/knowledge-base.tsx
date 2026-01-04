"use client"

import React, { useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useSlideTransition } from "@/hooks/use-slide-transition"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  DocumentCard,
  type DocumentCategory,
  categoryLabels,
} from "@/components/linear/document-card"
import { DocumentPreviewPanel, type Document } from "@/components/linear/document-preview-panel"
import { DocumentUploadModal } from "@/components/linear/document-upload-modal"
import { DriveLinkModal } from "@/components/knowledge-base/drive-link-modal"
import { ProcessingPanel } from "@/components/knowledge-base/processing-panel"
import { SearchPanel } from "@/components/knowledge-base/search-panel"
import { ListHeader } from "@/components/linear"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Upload,
  FolderOpen,
  Star,
  Clock,
  Search,
  Settings,
  Cloud,
} from "lucide-react"

// Diiiploy - Knowledge Base Documents (initial data, will be replaced by API)
const initialDocuments: Document[] = [
  {
    id: "doc-1",
    name: "New Client Onboarding Playbook",
    type: "document",
    category: "onboarding",
    description: "Complete onboarding workflow: kickoff call → brand audit → campaign setup → reporting cadence",
    updatedAt: "2 hours ago",
    createdAt: "Dec 10, 2025",
    updatedBy: "Jordan Rivera",
    createdBy: "Alex Morgan",
    size: "48 KB",
    shared: true,
    starred: true,
    useForTraining: true,
    tags: ["onboarding", "playbook", "process"],
    viewCount: 342,
    downloadCount: 89,
  },
  {
    id: "doc-2",
    name: "Monthly ROI Dashboard Template",
    type: "spreadsheet",
    category: "reporting",
    description: "Client-facing performance dashboard with ROAS, CPA, and conversion tracking",
    updatedAt: "1 day ago",
    createdAt: "Nov 15, 2025",
    updatedBy: "Taylor Kim",
    createdBy: "Jordan Rivera",
    size: "256 KB",
    shared: true,
    starred: true,
    useForTraining: true,
    tags: ["dashboard", "roi", "template"],
    viewCount: 567,
    downloadCount: 234,
  },
  {
    id: "doc-3",
    name: "Sunrise Wellness Brand Kit",
    type: "pdf",
    category: "creative",
    description: "Logo usage, color palette (#2E7D32, #81C784), typography (Poppins), and image guidelines",
    updatedAt: "3 days ago",
    createdAt: "Oct 28, 2025",
    updatedBy: "Casey Chen",
    size: "12.4 MB",
    shared: true,
    starred: false,
    clientName: "Sunrise Wellness",
    tags: ["brand", "wellness", "healthcare"],
    viewCount: 156,
    downloadCount: 45,
  },
  {
    id: "doc-4",
    name: "Q1 2026 Growth Strategy",
    type: "presentation",
    category: "strategy",
    description: "Cross-channel expansion plan: Google Ads + Meta + LinkedIn for B2B lead gen clients",
    updatedAt: "1 week ago",
    createdAt: "Dec 5, 2025",
    updatedBy: "Alex Morgan",
    createdBy: "Alex Morgan",
    size: "8.7 MB",
    shared: true,
    starred: true,
    tags: ["strategy", "q1-2026", "growth"],
    viewCount: 89,
    downloadCount: 23,
  },
  {
    id: "doc-5",
    name: "Media Buying Agreement v3",
    type: "document",
    category: "contracts",
    description: "Standard contract for ad spend management: fee structure, reporting SLAs, termination clauses",
    updatedAt: "2 weeks ago",
    createdAt: "Aug 20, 2025",
    updatedBy: "Legal Team",
    createdBy: "Alex Morgan",
    size: "124 KB",
    shared: true,
    starred: false,
    tags: ["contract", "legal", "media-buying"],
    viewCount: 234,
    downloadCount: 78,
  },
  {
    id: "doc-6",
    name: "Google Ads Certification Prep Guide",
    type: "document",
    category: "training",
    description: "Study materials for Search, Display, Video, and Shopping certifications",
    updatedAt: "3 weeks ago",
    createdAt: "Jul 15, 2025",
    updatedBy: "Taylor Kim",
    createdBy: "Taylor Kim",
    size: "2.3 MB",
    shared: true,
    starred: true,
    useForTraining: true,
    tags: ["google-ads", "certification", "training"],
    viewCount: 678,
    downloadCount: 312,
  },
  {
    id: "doc-7",
    name: "Content Calendar Master",
    type: "spreadsheet",
    category: "templates",
    description: "12-month social media planning template with platform-specific posting schedules",
    updatedAt: "1 month ago",
    createdAt: "Jun 10, 2025",
    updatedBy: "Casey Chen",
    createdBy: "Casey Chen",
    size: "89 KB",
    shared: true,
    starred: false,
    tags: ["social-media", "content", "calendar"],
    viewCount: 445,
    downloadCount: 267,
  },
  {
    id: "doc-8",
    name: "Metro Realty Campaign Assets",
    type: "folder",
    category: "creative",
    description: "Winter 2025 campaign: video ads, display banners, landing page designs",
    updatedAt: "5 days ago",
    createdAt: "Nov 20, 2025",
    updatedBy: "Creative Team",
    size: "456 MB",
    shared: true,
    starred: false,
    clientName: "Metro Realty",
    tags: ["real-estate", "campaign", "creative"],
    viewCount: 123,
  },
  {
    id: "doc-9",
    name: "Meta Ads Manager Walkthrough",
    type: "document",
    category: "training",
    description: "Business Manager setup, pixel installation, custom audience building, and campaign structure",
    updatedAt: "2 months ago",
    createdAt: "May 25, 2025",
    updatedBy: "Jordan Rivera",
    createdBy: "Jordan Rivera",
    size: "1.8 MB",
    shared: true,
    starred: false,
    useForTraining: true,
    tags: ["meta", "facebook", "training"],
    viewCount: 389,
    downloadCount: 145,
  },
]

type ViewFilter = "all" | "starred" | "recent"

interface FilterConfig {
  id: ViewFilter
  label: string
  icon: React.ReactNode
}

const viewFilters: FilterConfig[] = [
  { id: "all", label: "All Files", icon: <FolderOpen className="w-4 h-4" /> },
  { id: "starred", label: "Starred", icon: <Star className="w-4 h-4" /> },
  { id: "recent", label: "Recent", icon: <Clock className="w-4 h-4" /> },
]

const categories: (DocumentCategory | "all")[] = [
  "all",
  "onboarding",
  "reporting",
  "creative",
  "strategy",
  "contracts",
  "templates",
  "training",
]

export function KnowledgeBase() {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | "all">("all")
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isDriveLinkModalOpen, setIsDriveLinkModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("documents")

  const slideTransition = useSlideTransition()

  // Filter documents
  const filteredDocuments = useMemo((): Document[] => {
    let result: Document[] = documents

    // Apply view filter
    switch (viewFilter) {
      case "starred":
        result = result.filter((d) => d.starred)
        break
      case "recent":
        // Already sorted by recent, just show top items
        result = result.slice(0, 6)
        break
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      result = result.filter((d) => d.category === categoryFilter)
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query) ||
          d.tags?.some((t) => t.toLowerCase().includes(query))
      )
    }

    return result
  }, [documents, viewFilter, categoryFilter, searchQuery])

  // Toggle star status on a document
  const handleStar = useCallback((docId: string) => {
    setDocuments(prev => {
      const updated = prev.map(doc =>
        doc.id === docId ? { ...doc, starred: !doc.starred } : doc
      )
      const doc = updated.find(d => d.id === docId)
      toast({
        title: doc?.starred ? "Added to starred" : "Removed from starred",
        description: doc?.name,
      })
      return updated
    })
    // Update selected document if it's the one being starred
    setSelectedDocument(prev =>
      prev?.id === docId ? { ...prev, starred: !prev.starred } : prev
    )
    // TODO: Persist to API when backend is ready
    // fetchWithCsrf(`/api/v1/documents/${docId}/star`, { method: 'POST' })
  }, [])

  // Toggle AI training status on a document
  const handleToggleTraining = useCallback((docId: string) => {
    setDocuments(prev => {
      const updated = prev.map(doc =>
        doc.id === docId ? { ...doc, useForTraining: !doc.useForTraining } : doc
      )
      const doc = updated.find(d => d.id === docId)
      toast({
        title: doc?.useForTraining ? "Enabled for AI training" : "Disabled for AI training",
        description: doc?.name,
      })
      return updated
    })
    // Update selected document if it's the one being toggled
    setSelectedDocument(prev =>
      prev?.id === docId ? { ...prev, useForTraining: !prev.useForTraining } : prev
    )
    // TODO: Persist to API when backend is ready
    // fetchWithCsrf(`/api/v1/documents/${docId}/training`, { method: 'POST' })
  }, [])

  // Add a document from Google Drive
  const handleAddDriveLink = useCallback(async (url: string, displayName?: string) => {
    // Extract file ID from URL for display purposes
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    const fileId = fileIdMatch?.[1] || `drive-${Date.now()}`

    // Create new document entry (in production, this would come from API response)
    const newDoc: Document = {
      id: `drive-${fileId}`,
      name: displayName || "Google Drive Document",
      type: "document",
      category: "templates",
      description: "Imported from Google Drive",
      updatedAt: "Just now",
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      updatedBy: "You",
      size: "Processing...",
      shared: false,
      starred: false,
      useForTraining: false,
      tags: ["drive-import"],
      viewCount: 0,
    }

    // Add to documents list
    setDocuments(prev => [newDoc, ...prev])

    toast({
      title: "Document added",
      description: `"${newDoc.name}" has been imported from Google Drive`,
    })

    // TODO: Actually process the file via API when backend is ready
    // const response = await fetchWithCsrf('/api/v1/documents/drive-import', {
    //   method: 'POST',
    //   body: JSON.stringify({ url, displayName }),
    // })
  }, [])

  // Helper to render document cards with proper typing
  const renderDocumentCard = (doc: Document, mode: "compact" | "grid" | "list") => (
    <DocumentCard
      key={doc.id}
      {...doc}
      viewMode={mode}
      selected={selectedDocument?.id === doc.id}
      onClick={() => setSelectedDocument(doc)}
      onStar={() => handleStar(doc.id)}
      onToggleTraining={() => handleToggleTraining(doc.id)}
    />
  )

  return (
    <div className="flex h-full overflow-hidden">
      {/* Document list - shrinks when preview panel is open */}
      <motion.div
        initial={false}
        animate={{ width: selectedDocument ? 280 : "100%" }}
        transition={slideTransition}
        className="flex flex-col border-r border-border overflow-hidden"
        style={{ minWidth: selectedDocument ? 280 : undefined, flexShrink: selectedDocument ? 0 : undefined }}
      >
        <ListHeader
          title="Knowledge Base"
          count={activeTab === "documents" ? filteredDocuments.length : undefined}
          onSearch={activeTab === "documents" ? setSearchQuery : undefined}
          searchValue={activeTab === "documents" ? searchQuery : ""}
          searchPlaceholder="Search documents..."
          viewMode={!selectedDocument && activeTab === "documents" ? (viewMode === "grid" ? "board" : "list") : undefined}
          onViewModeChange={!selectedDocument && activeTab === "documents" ? (mode) => setViewMode(mode === "board" ? "grid" : "list") : undefined}
          actions={
            !selectedDocument && activeTab === "documents" && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setIsDriveLinkModalOpen(true)}>
                  <Cloud className="h-4 w-4" />
                  From Drive
                </Button>
                <Button size="sm" className="h-8 gap-1.5" onClick={() => setIsUploadModalOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </div>
            )
          }
        />

        {/* Tabs Navigation */}
        {!selectedDocument && (
          <div className="px-4 py-2 border-b border-border">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="documents" className="flex items-center gap-1.5">
                  <FolderOpen className="w-3 h-3" />
                  Documents
                </TabsTrigger>
                <TabsTrigger value="search" className="flex items-center gap-1.5">
                  <Search className="w-3 h-3" />
                  Search
                </TabsTrigger>
                <TabsTrigger value="processing" className="flex items-center gap-1.5">
                  <Settings className="w-3 h-3" />
                  Processing
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Filters - only for documents tab */}
        {!selectedDocument && activeTab === "documents" && (
          <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
            {/* View filters */}
            <div className="flex items-center gap-1">
              {viewFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setViewFilter(filter.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    viewFilter === filter.id
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {filter.icon}
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Category filter */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "px-2.5 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
                    categoryFilter === cat
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {cat === "all" ? "All" : categoryLabels[cat]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {!selectedDocument ? (
            // Tab content when no document is selected
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsContent value="documents" className="mt-0 h-full">
                {filteredDocuments.length > 0 ? (
                  viewMode === "grid" ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                      {filteredDocuments.map((doc) => renderDocumentCard(doc, "grid"))}
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-lg overflow-hidden m-4">
                      {filteredDocuments.map((doc) => renderDocumentCard(doc, "list"))}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <FolderOpen className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No documents found</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="search" className="mt-0 h-full">
                <div className="p-4">
                  <SearchPanel />
                </div>
              </TabsContent>

              <TabsContent value="processing" className="mt-0 h-full">
                <div className="p-4">
                  <ProcessingPanel onProcessingComplete={() => {
                    // Refresh document list after processing
                    // In a real app, this would refetch from API
                  }} />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            // Compact list when document is selected
            <div>
              {filteredDocuments.map((doc) => renderDocumentCard(doc, "compact"))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Preview/Editor panel */}
      <AnimatePresence mode="wait">
        {selectedDocument && (
          <motion.div
            key="document-preview"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 600, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={slideTransition}
            className="flex flex-col bg-background overflow-hidden"
            style={{ minWidth: 0 }}
          >
            <DocumentPreviewPanel
              document={selectedDocument}
              onClose={() => setSelectedDocument(null)}
              onStar={() => handleStar(selectedDocument.id)}
              onDownload={() => { /* TODO: Implement download */ }}
              onShare={() => { /* TODO: Implement share */ }}
              onDelete={() => { /* TODO: Implement delete */ }}
              onToggleTraining={() => handleToggleTraining(selectedDocument.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />

      {/* Drive Link Modal */}
      <DriveLinkModal
        isOpen={isDriveLinkModalOpen}
        onClose={() => setIsDriveLinkModalOpen(false)}
        onAddDriveLink={handleAddDriveLink}
      />
    </div>
  )
}
