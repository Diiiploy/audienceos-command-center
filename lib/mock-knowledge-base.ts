/**
 * Mock data for Knowledge Base feature
 * Based on features/knowledge-base.md spec
 *
 * WARNING: This file contains hardcoded mock data for development purposes.
 * In production, documents should come from Supabase.
 */

// Guard: Warn if mock data is accessed in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  console.warn(
    '[MOCK DATA] Warning: mock-knowledge-base.ts is being accessed in production. ' +
    'This should only happen as a fallback when Supabase returns no data.'
  )
}

import type { KnowledgeBaseDocument, CategoryWithCount, DocumentSearchResult } from '@/types/knowledge-base'
import type { DocumentCategory, IndexStatus } from '@/types/database'

// Mock documents
export const mockDocuments: KnowledgeBaseDocument[] = [
  {
    id: 'doc-001',
    agency_id: 'agency-001',
    title: 'Meta Pixel Installation Guide',
    file_name: 'meta-pixel-guide.pdf',
    file_size: 2457600, // 2.4 MB
    mime_type: 'application/pdf',
    storage_path: 'agencies/agency-001/documents/2024-11-25/doc-001-meta-pixel-guide.pdf',
    category: 'installation',
    client_id: null,
    client_name: undefined,
    page_count: 24,
    word_count: 8500,
    index_status: 'indexed',
    gemini_file_id: 'gemini-file-001',
    uploaded_by: 'user-001',
    uploader_name: 'Brent CEO',
    is_active: true,
    created_at: '2024-11-25T10:30:00Z',
    updated_at: '2024-11-25T10:35:00Z',
    tags: ['meta', 'pixel', 'shopify', 'installation'],
    description: 'Step-by-step guide for installing Meta Pixel on Shopify stores with custom themes.',
    usage_count: 45,
  },
  {
    id: 'doc-002',
    agency_id: 'agency-001',
    title: 'GTM Container Setup Process',
    file_name: 'gtm-setup.docx',
    file_size: 1843200, // 1.8 MB
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    storage_path: 'agencies/agency-001/documents/2024-11-20/doc-002-gtm-setup.docx',
    category: 'installation',
    client_id: null,
    client_name: undefined,
    page_count: 18,
    word_count: 6200,
    index_status: 'indexed',
    gemini_file_id: 'gemini-file-002',
    uploaded_by: 'user-002',
    uploader_name: 'Roderic Andrews',
    is_active: true,
    created_at: '2024-11-20T14:15:00Z',
    updated_at: '2024-11-20T14:20:00Z',
    tags: ['gtm', 'google tag manager', 'setup', 'container'],
    description: 'Complete walkthrough of Google Tag Manager container configuration and deployment.',
    usage_count: 38,
  },
  {
    id: 'doc-003',
    agency_id: 'agency-001',
    title: 'iOS 17 Tracking Changes',
    file_name: 'ios17-tracking.md',
    file_size: 45056, // 44 KB
    mime_type: 'text/markdown',
    storage_path: 'agencies/agency-001/documents/2024-11-28/doc-003-ios17-tracking.md',
    category: 'tech',
    client_id: null,
    client_name: undefined,
    page_count: null,
    word_count: 3200,
    index_status: 'indexed',
    gemini_file_id: 'gemini-file-003',
    uploaded_by: 'user-001',
    uploader_name: 'Brent CEO',
    is_active: true,
    created_at: '2024-11-28T09:00:00Z',
    updated_at: '2024-11-28T09:05:00Z',
    tags: ['ios', 'privacy', 'tracking', 'apple', 'ios17'],
    description: 'Understanding how iOS 17 privacy changes affect ad tracking and conversions.',
    usage_count: 62,
  },
  {
    id: 'doc-004',
    agency_id: 'agency-001',
    title: 'Client Onboarding Checklist',
    file_name: 'onboarding-checklist.pdf',
    file_size: 512000, // 500 KB
    mime_type: 'application/pdf',
    storage_path: 'agencies/agency-001/documents/2024-11-15/doc-004-onboarding-checklist.pdf',
    category: 'process',
    client_id: null,
    client_name: undefined,
    page_count: 8,
    word_count: 2800,
    index_status: 'indexed',
    gemini_file_id: 'gemini-file-004',
    uploaded_by: 'user-003',
    uploader_name: 'Trevor Team',
    is_active: true,
    created_at: '2024-11-15T11:30:00Z',
    updated_at: '2024-11-15T11:35:00Z',
    tags: ['onboarding', 'checklist', 'process', 'new client'],
    description: 'Standard operating procedure for new client onboarding from contract to kickoff.',
    usage_count: 89,
  },
  {
    id: 'doc-005',
    agency_id: 'agency-001',
    title: 'Troubleshooting Pixel Misfires',
    file_name: 'pixel-troubleshooting.pdf',
    file_size: 1024000, // 1 MB
    mime_type: 'application/pdf',
    storage_path: 'agencies/agency-001/documents/2024-11-22/doc-005-pixel-troubleshooting.pdf',
    category: 'support',
    client_id: null,
    client_name: undefined,
    page_count: 15,
    word_count: 5400,
    index_status: 'indexed',
    gemini_file_id: 'gemini-file-005',
    uploaded_by: 'user-004',
    uploader_name: 'Chase Client',
    is_active: true,
    created_at: '2024-11-22T16:45:00Z',
    updated_at: '2024-11-22T16:50:00Z',
    tags: ['troubleshooting', 'pixel', 'debugging', 'support'],
    description: 'Common causes and solutions for pixel events not firing correctly.',
    usage_count: 54,
  },
  {
    id: 'doc-006',
    agency_id: 'agency-001',
    title: 'Conversion API Setup Tutorial',
    file_name: 'capi-setup.pdf',
    file_size: 3145728, // 3 MB
    mime_type: 'application/pdf',
    storage_path: 'agencies/agency-001/documents/2024-11-18/doc-006-capi-setup.pdf',
    category: 'installation',
    client_id: null,
    client_name: undefined,
    page_count: 32,
    word_count: 12000,
    index_status: 'indexed',
    gemini_file_id: 'gemini-file-006',
    uploaded_by: 'user-001',
    uploader_name: 'Brent CEO',
    is_active: true,
    created_at: '2024-11-18T08:00:00Z',
    updated_at: '2024-11-18T08:10:00Z',
    tags: ['capi', 'conversions api', 'server-side', 'meta'],
    description: 'Complete guide for Meta Conversions API server-side implementation.',
    usage_count: 71,
  },
  {
    id: 'doc-007',
    agency_id: 'agency-001',
    title: 'Alo Yoga Custom Tracking Setup',
    file_name: 'aloyoga-tracking.docx',
    file_size: 768000, // 750 KB
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    storage_path: 'agencies/agency-001/documents/2024-11-10/doc-007-aloyoga-tracking.docx',
    category: 'client_specific',
    client_id: 'client-002',
    client_name: 'Alo Yoga',
    page_count: 12,
    word_count: 4100,
    index_status: 'indexed',
    gemini_file_id: 'gemini-file-007',
    uploaded_by: 'user-001',
    uploader_name: 'Brent CEO',
    is_active: true,
    created_at: '2024-11-10T13:20:00Z',
    updated_at: '2024-11-10T13:25:00Z',
    tags: ['alo yoga', 'custom', 'tracking', 'client'],
    description: 'Custom tracking implementation documentation for Alo Yoga.',
    usage_count: 23,
  },
  {
    id: 'doc-008',
    agency_id: 'agency-001',
    title: 'Emergency Escalation Protocol',
    file_name: 'escalation-protocol.txt',
    file_size: 15360, // 15 KB
    mime_type: 'text/plain',
    storage_path: 'agencies/agency-001/documents/2024-10-05/doc-008-escalation-protocol.txt',
    category: 'process',
    client_id: null,
    client_name: undefined,
    page_count: null,
    word_count: 1200,
    index_status: 'indexed',
    gemini_file_id: 'gemini-file-008',
    uploaded_by: 'user-004',
    uploader_name: 'Chase Client',
    is_active: true,
    created_at: '2024-10-05T10:00:00Z',
    updated_at: '2024-10-05T10:05:00Z',
    tags: ['escalation', 'emergency', 'protocol', 'urgent'],
    description: 'Protocol for handling urgent client escalations and critical issues.',
    usage_count: 34,
  },
  {
    id: 'doc-009',
    agency_id: 'agency-001',
    title: 'Data Layer Implementation Guide',
    file_name: 'data-layer-guide.pdf',
    file_size: 2048000, // 2 MB
    mime_type: 'application/pdf',
    storage_path: 'agencies/agency-001/documents/2024-11-12/doc-009-data-layer-guide.pdf',
    category: 'tech',
    client_id: null,
    client_name: undefined,
    page_count: 28,
    word_count: 9800,
    index_status: 'indexing',
    gemini_file_id: null,
    uploaded_by: 'user-002',
    uploader_name: 'Roderic Andrews',
    is_active: true,
    created_at: '2024-11-12T15:30:00Z',
    updated_at: '2024-11-29T08:00:00Z',
    tags: ['data layer', 'gtm', 'ecommerce', 'events'],
    description: 'Comprehensive guide for implementing e-commerce data layers.',
    usage_count: 47,
  },
  {
    id: 'doc-010',
    agency_id: 'agency-001',
    title: 'Monthly Reporting Template',
    file_name: 'monthly-report-template.docx',
    file_size: 409600, // 400 KB
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    storage_path: 'agencies/agency-001/documents/2024-09-01/doc-010-monthly-report-template.docx',
    category: 'process',
    client_id: null,
    client_name: undefined,
    page_count: 6,
    word_count: 1800,
    index_status: 'indexed',
    gemini_file_id: 'gemini-file-010',
    uploaded_by: 'user-003',
    uploader_name: 'Trevor Team',
    is_active: true,
    created_at: '2024-09-01T09:00:00Z',
    updated_at: '2024-09-01T09:05:00Z',
    tags: ['reporting', 'template', 'monthly', 'client'],
    description: 'Standard template for monthly client performance reports.',
    usage_count: 112,
  },
  {
    id: 'doc-011',
    agency_id: 'agency-001',
    title: 'RTA Outdoor Custom Events',
    file_name: 'rta-custom-events.pdf',
    file_size: 614400, // 600 KB
    mime_type: 'application/pdf',
    storage_path: 'agencies/agency-001/documents/2024-11-08/doc-011-rta-custom-events.pdf',
    category: 'client_specific',
    client_id: 'client-001',
    client_name: 'RTA Outdoor Living',
    page_count: 10,
    word_count: 3500,
    index_status: 'failed',
    gemini_file_id: null,
    uploaded_by: 'user-001',
    uploader_name: 'Brent CEO',
    is_active: true,
    created_at: '2024-11-08T14:00:00Z',
    updated_at: '2024-11-29T10:00:00Z',
    tags: ['rta', 'custom events', 'tracking', 'client'],
    description: 'Custom event tracking documentation for RTA Outdoor Living.',
    usage_count: 8,
  },
  {
    id: 'doc-012',
    agency_id: 'agency-001',
    title: 'Server-Side Tagging Best Practices',
    file_name: 'sst-best-practices.md',
    file_size: 32768, // 32 KB
    mime_type: 'text/markdown',
    storage_path: 'agencies/agency-001/documents/2024-11-25/doc-012-sst-best-practices.md',
    category: 'tech',
    client_id: null,
    client_name: undefined,
    page_count: null,
    word_count: 4500,
    index_status: 'pending',
    gemini_file_id: null,
    uploaded_by: 'user-002',
    uploader_name: 'Roderic Andrews',
    is_active: true,
    created_at: '2024-11-29T16:00:00Z',
    updated_at: '2024-11-29T16:00:00Z',
    tags: ['sst', 'server-side', 'tagging', 'best practices'],
    description: 'Best practices for server-side tagging implementation.',
    usage_count: 0,
  },
]

// Calculate category counts
export function getCategoryCounts(documents: KnowledgeBaseDocument[]): CategoryWithCount[] {
  const counts: Record<string, number> = {
    all: documents.length,
    installation: 0,
    tech: 0,
    support: 0,
    process: 0,
    client_specific: 0,
  }

  documents.forEach((doc) => {
    if (counts[doc.category] !== undefined) {
      counts[doc.category]++
    }
  })

  return [
    { category: 'all', count: counts.all, label: 'All Categories' },
    { category: 'installation', count: counts.installation, label: 'Installation' },
    { category: 'tech', count: counts.tech, label: 'Technical' },
    { category: 'support', count: counts.support, label: 'Support' },
    { category: 'process', count: counts.process, label: 'Process' },
    { category: 'client_specific', count: counts.client_specific, label: 'Client-Specific' },
  ]
}

// Filter and search documents
export function filterDocuments(
  documents: KnowledgeBaseDocument[],
  filters: {
    query?: string
    category?: DocumentCategory | 'all'
    indexStatus?: IndexStatus | 'all'
    clientId?: string | 'global' | 'all'
  }
): KnowledgeBaseDocument[] {
  return documents.filter((doc) => {
    // Search query
    if (filters.query) {
      const query = filters.query.toLowerCase()
      const matchesTitle = doc.title.toLowerCase().includes(query)
      const matchesDescription = doc.description?.toLowerCase().includes(query)
      const matchesTags = doc.tags.some((tag) => tag.toLowerCase().includes(query))
      if (!matchesTitle && !matchesDescription && !matchesTags) {
        return false
      }
    }

    // Category filter
    if (filters.category && filters.category !== 'all' && doc.category !== filters.category) {
      return false
    }

    // Index status filter
    if (filters.indexStatus && filters.indexStatus !== 'all' && doc.index_status !== filters.indexStatus) {
      return false
    }

    // Client filter
    if (filters.clientId) {
      if (filters.clientId === 'global' && doc.client_id !== null) {
        return false
      }
      if (filters.clientId !== 'all' && filters.clientId !== 'global' && doc.client_id !== filters.clientId) {
        return false
      }
    }

    return true
  })
}

// Sort documents
export function sortDocuments(
  documents: KnowledgeBaseDocument[],
  sortBy: 'title' | 'created_at' | 'updated_at' | 'file_size' | 'usage_count',
  direction: 'asc' | 'desc'
): KnowledgeBaseDocument[] {
  return [...documents].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title)
        break
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
      case 'updated_at':
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        break
      case 'file_size':
        comparison = a.file_size - b.file_size
        break
      case 'usage_count':
        comparison = a.usage_count - b.usage_count
        break
    }

    return direction === 'desc' ? -comparison : comparison
  })
}

// Add search highlighting
export function addHighlighting(
  documents: KnowledgeBaseDocument[],
  query: string
): DocumentSearchResult[] {
  if (!query) {
    return documents.map((doc) => ({ ...doc }))
  }

  const terms = query.toLowerCase().split(' ').filter(Boolean)

  return documents.map((doc) => {
    const result: DocumentSearchResult = { ...doc }

    // Simple highlighting by wrapping matches in <mark> tags
    const highlightText = (text: string | null | undefined): string | undefined => {
      if (!text) return undefined
      let highlighted = text
      terms.forEach((term) => {
        const regex = new RegExp(`(${term})`, 'gi')
        highlighted = highlighted.replace(regex, '<mark>$1</mark>')
      })
      return highlighted
    }

    result.highlights = {
      title: highlightText(doc.title),
      description: highlightText(doc.description),
    }

    return result
  })
}

// Quick links data
export const quickLinks = [
  { title: 'Shopify Partner Portal', url: 'https://partners.shopify.com' },
  { title: 'Meta Business Suite', url: 'https://business.facebook.com' },
  { title: 'Google Tag Manager', url: 'https://tagmanager.google.com' },
  { title: 'Training Videos', url: '#' },
]
