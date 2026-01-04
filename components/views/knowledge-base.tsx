"use client"

import React, { useState, useMemo } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useSlideTransition } from "@/hooks/use-slide-transition"
import { cn } from "@/lib/utils"
import {
  DocumentCard,
  type DocumentCategory,
  categoryLabels,
} from "@/components/linear/document-card"
import { DocumentPreviewPanel, type Document } from "@/components/linear/document-preview-panel"
import { DocumentUploadModal } from "@/components/linear/document-upload-modal"
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
} from "lucide-react"

// Mock documents
const mockDocuments: Document[] = [
  {
    id: "doc-1",
    name: "Client Onboarding Checklist",
    type: "document",
    category: "onboarding",
    description: "Step-by-step checklist for onboarding new clients to the platform",
    updatedAt: "2 hours ago",
    createdAt: "Dec 15, 2024",
    updatedBy: "Sarah Chen",
    createdBy: "Mike Wilson",
    size: "24 KB",
    shared: true,
    starred: true,
    tags: ["checklist", "process"],
    viewCount: 156,
    downloadCount: 42,
  },
  {
    id: "doc-2",
    name: "Monthly Performance Report Template",
    type: "spreadsheet",
    category: "reporting",
    description: "Standard template for client monthly performance reports",
    updatedAt: "1 day ago",
    createdAt: "Nov 1, 2024",
    updatedBy: "Alex Kim",
    createdBy: "Sarah Chen",
    size: "156 KB",
    shared: true,
    starred: false,
    tags: ["template", "reports"],
    viewCount: 89,
    downloadCount: 67,
  },
  {
    id: "doc-3",
    name: "Brand Guidelines - Acme Corp",
    type: "pdf",
    category: "creative",
    description: "Complete brand guidelines including logos, colors, and typography",
    updatedAt: "3 days ago",
    createdAt: "Oct 20, 2024",
    updatedBy: "Emily Davis",
    size: "8.5 MB",
    shared: false,
    starred: false,
    clientName: "Acme Corp",
    tags: ["brand", "guidelines"],
    viewCount: 34,
    downloadCount: 12,
  },
  {
    id: "doc-4",
    name: "Q4 2024 Strategy Deck",
    type: "presentation",
    category: "strategy",
    description: "Quarterly strategy presentation for leadership review",
    updatedAt: "1 week ago",
    createdAt: "Sep 28, 2024",
    updatedBy: "Mike Wilson",
    createdBy: "Mike Wilson",
    size: "4.2 MB",
    shared: true,
    starred: true,
    tags: ["strategy", "quarterly"],
    viewCount: 203,
    downloadCount: 28,
  },
  {
    id: "doc-5",
    name: "Master Services Agreement Template",
    type: "document",
    category: "contracts",
    description: "Standard MSA template for new client engagements",
    updatedAt: "2 weeks ago",
    createdAt: "Aug 15, 2024",
    updatedBy: "Legal Team",
    createdBy: "Legal Team",
    size: "89 KB",
    shared: true,
    starred: false,
    tags: ["legal", "contract", "template"],
    viewCount: 78,
    downloadCount: 45,
  },
  {
    id: "doc-6",
    name: "Google Ads Best Practices Guide",
    type: "document",
    category: "training",
    description: "Comprehensive guide to Google Ads optimization and management",
    updatedAt: "3 weeks ago",
    createdAt: "Jul 10, 2024",
    updatedBy: "Sarah Chen",
    createdBy: "Sarah Chen",
    size: "1.2 MB",
    shared: true,
    starred: true,
    tags: ["google-ads", "training", "guide"],
    viewCount: 412,
    downloadCount: 156,
  },
  {
    id: "doc-7",
    name: "Social Media Calendar Template",
    type: "spreadsheet",
    category: "templates",
    description: "Content calendar template for social media planning",
    updatedAt: "1 month ago",
    createdAt: "Jun 5, 2024",
    updatedBy: "Emily Davis",
    createdBy: "Emily Davis",
    size: "45 KB",
    shared: true,
    starred: false,
    tags: ["social", "calendar", "template"],
    viewCount: 234,
    downloadCount: 189,
  },
  {
    id: "doc-8",
    name: "Creative Assets - TechStart Campaign",
    type: "folder",
    category: "creative",
    description: "All creative assets for the TechStart Q4 campaign",
    updatedAt: "5 days ago",
    createdAt: "Nov 15, 2024",
    updatedBy: "Creative Team",
    size: "245 MB",
    shared: true,
    starred: false,
    clientName: "TechStart Inc",
    tags: ["assets", "campaign"],
    viewCount: 67,
  },
  {
    id: "doc-9",
    name: "Meta Ads Setup Guide",
    type: "document",
    category: "training",
    description: "Step-by-step guide for setting up Meta advertising campaigns",
    updatedAt: "2 months ago",
    createdAt: "May 20, 2024",
    updatedBy: "Alex Kim",
    createdBy: "Alex Kim",
    size: "890 KB",
    shared: true,
    starred: false,
    tags: ["meta", "training", "setup"],
    viewCount: 189,
    downloadCount: 72,
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
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | "all">("all")
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("documents")

  const slideTransition = useSlideTransition()

  // Filter documents
  const filteredDocuments = useMemo((): Document[] => {
    let result: Document[] = mockDocuments

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
  }, [viewFilter, categoryFilter, searchQuery])

  const handleStar = (_docId: string) => {
    // TODO: Implement star toggle API call
  }

  // Helper to render document cards with proper typing
  const renderDocumentCard = (doc: Document, mode: "compact" | "grid" | "list") => (
    <DocumentCard
      key={doc.id}
      {...doc}
      viewMode={mode}
      selected={selectedDocument?.id === doc.id}
      onClick={() => setSelectedDocument(doc)}
      onStar={() => handleStar(doc.id)}
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
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setIsUploadModalOpen(true)}>
                <Upload className="h-4 w-4" />
                Upload
              </Button>
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
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  )
}
