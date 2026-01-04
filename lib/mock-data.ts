/**
 * MOCK DATA - Development and Demo Only
 *
 * WARNING: This file contains hardcoded mock data for development purposes.
 * In production, all data should come from Supabase.
 *
 * The pipeline store (stores/pipeline-store.ts) fetches from /api/v1/clients
 * which queries Supabase directly. Components should use that store, not this file.
 */

// Guard: Warn if mock data is accessed in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  console.warn(
    '[MOCK DATA] Warning: mock-data.ts is being accessed in production. ' +
    'This should only happen as a fallback when Supabase returns no data. ' +
    'If you see this frequently, check Supabase connection and data seeding.'
  )
}

export type Stage = "Onboarding" | "Installation" | "Audit" | "Live" | "Needs Support" | "Off-boarding"
export type HealthStatus = "Green" | "Yellow" | "Red" | "Blocked"
export type Owner = "Brent" | "Roderic" | "Trevor" | "Chase"
export type Tier = "Enterprise" | "Core" | "Starter"

export type TicketStatus = "New" | "In Progress" | "Waiting on Client" | "Resolved"
export type TicketPriority = "High" | "Medium" | "Low"

export interface Client {
  id: string
  name: string
  logo: string
  stage: Stage
  health: HealthStatus
  owner: Owner
  daysInStage: number
  supportTickets: number
  installTime: number
  statusNote?: string
  shopifyUrl?: string
  gtmContainerId?: string
  metaPixelId?: string
  tasks: Task[]
  comms: CommMessage[]
  tier: Tier
  performanceData?: PerformanceData[]
  metaAds?: AdMetrics
  googleAds?: AdMetrics
  onboardingData?: {
    shopifyUrl: string
    gtmContainerId: string
    metaPixelId: string
    klaviyoApiKey: string
    submittedAt: string
    contactEmail: string // Added contactEmail field
    metaAccessVerified: boolean
    gtmAccessVerified: boolean
    shopifyAccessVerified: boolean
    accessGrants: {
      // Added accessGrants for onboarding management view
      meta: boolean
      gtm: boolean
      shopify: boolean
    }
  }
  blocker?: "WAITING ON ACCESS" | "WAITING ON DNS" | "DATA LAYER ERROR" | "CODE NOT INSTALLED" | null
}

export interface Task {
  id: string
  name: string
  completed: boolean
  assignee?: Owner
  dueDate?: string
  stage?: string
}

export interface CommMessage {
  id: string
  sender: string
  avatar: string
  message: string
  timestamp: string
  isInternal?: boolean
  source?: "slack" | "email"
  channel?: string
  subject?: string
  aiTags?: string[]
}

export interface PerformanceData {
  date: string
  adSpend: number
  roas: number
}

export interface AdMetrics {
  spend: number
  roas: number
  cpa: number
  impressions: number
  clicks: number
  conversions: number
  trend: "up" | "down" | "neutral"
}

export interface SupportTicket {
  id: string
  title: string
  clientId: string
  clientName: string
  status: TicketStatus
  priority: TicketPriority
  source: string
  assignee: Owner
  createdAt: string
  description: string
}

export interface ZoomRecording {
  id: string
  title: string
  date: string
  duration: string
  aiSummary: string[]
  transcriptUrl?: string
}

export const owners: { name: Owner; avatar: string; color: string }[] = [
  { name: "Brent", avatar: "B", color: "bg-emerald-500" },
  { name: "Roderic", avatar: "R", color: "bg-blue-500" },
  { name: "Trevor", avatar: "T", color: "bg-amber-500" },
  { name: "Chase", avatar: "C", color: "bg-purple-500" },
]

export const stages: Stage[] = ["Onboarding", "Installation", "Audit", "Live", "Needs Support", "Off-boarding"]
export const ticketStatuses: TicketStatus[] = ["New", "In Progress", "Waiting on Client", "Resolved"]

function generatePerformanceData(): PerformanceData[] {
  const data: PerformanceData[] = []
  const baseDate = new Date("2024-10-30")
  for (let i = 0; i < 30; i++) {
    const date = new Date(baseDate)
    date.setDate(baseDate.getDate() + i)
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      adSpend: Math.floor(Math.random() * 5000) + 2000,
      roas: Number((Math.random() * 3 + 1.5).toFixed(2)),
    })
  }
  return data
}

function generateAdMetrics(): AdMetrics {
  return {
    spend: Math.floor(Math.random() * 15000) + 5000,
    roas: Number((Math.random() * 3 + 1.5).toFixed(2)),
    cpa: Math.floor(Math.random() * 50) + 15,
    impressions: Math.floor(Math.random() * 500000) + 100000,
    clicks: Math.floor(Math.random() * 15000) + 3000,
    conversions: Math.floor(Math.random() * 500) + 100,
    trend: ["up", "down", "neutral"][Math.floor(Math.random() * 3)] as "up" | "down" | "neutral",
  }
}

export const mockClients: Client[] = [
  {
    id: "1",
    name: "RTA Outdoor Living",
    logo: "RTA",
    stage: "Installation",
    health: "Blocked",
    owner: "Brent",
    daysInStage: 20,
    supportTickets: 3,
    installTime: 20,
    statusNote: "Waiting on Access",
    shopifyUrl: "rta-outdoor.myshopify.com",
    gtmContainerId: "GTM-ABC123",
    metaPixelId: "1234567890",
    tier: "Enterprise",
    blocker: "WAITING ON DNS", // Added blocker
    tasks: [
      { id: "1", name: "Initial Setup Call", completed: true, assignee: "Brent", stage: "Onboarding" },
      {
        id: "2",
        name: "DNS Configuration",
        completed: false,
        assignee: "Brent",
        dueDate: "Nov 25",
        stage: "Installation",
      },
      {
        id: "3",
        name: "Pixel Installation",
        completed: false,
        assignee: "Roderic",
        dueDate: "Nov 27",
        stage: "Installation",
      },
      { id: "4", name: "GTM Setup", completed: false, assignee: "Roderic", dueDate: "Nov 29", stage: "Installation" },
    ],
    comms: [
      {
        id: "1",
        sender: "Brent",
        avatar: "L",
        message: "Sent DNS instructions to client - still waiting on access credentials",
        timestamp: "5d ago",
        isInternal: true,
        source: "slack",
        channel: "#client-rta-outdoor",
      },
      {
        id: "2",
        sender: "Mark (Client)",
        avatar: "M",
        message: "IT department is on vacation, will get back next week",
        timestamp: "4d ago",
        source: "email",
        subject: "Re: DNS Access Required",
        aiTags: ["Blocker", "Delay"],
      },
      {
        id: "3",
        sender: "Brent",
        avatar: "L",
        message: "Following up again - this is becoming critical",
        timestamp: "1d ago",
        isInternal: true,
        source: "slack",
        channel: "#client-rta-outdoor",
        aiTags: ["Urgent"],
      },
    ],
    performanceData: generatePerformanceData(),
    metaAds: { spend: 12400, roas: 3.4, cpa: 28, impressions: 450000, clicks: 12000, conversions: 443, trend: "down" },
    googleAds: {
      spend: 8200,
      roas: 2.8,
      cpa: 35,
      impressions: 320000,
      clicks: 8500,
      conversions: 234,
      trend: "neutral",
    },
    onboardingData: {
      shopifyUrl: "rta-outdoor.myshopify.com",
      gtmContainerId: "GTM-ABC123",
      metaPixelId: "1234567890",
      klaviyoApiKey: "KL-KEY123",
      submittedAt: "Nov 1, 2024",
      contactEmail: "info@rtaoutdoor.com", // Updated contact email
      metaAccessVerified: false,
      gtmAccessVerified: false,
      shopifyAccessVerified: false,
      accessGrants: {
        meta: false,
        gtm: false,
        shopify: false,
      },
    },
  },
  {
    id: "2",
    name: "Alo Yoga",
    logo: "VS",
    stage: "Audit",
    health: "Yellow",
    owner: "Brent",
    daysInStage: 3,
    supportTickets: 1,
    installTime: 6,
    shopifyUrl: "vshred.myshopify.com",
    gtmContainerId: "GTM-VSHRED1",
    metaPixelId: "9876543210",
    tier: "Enterprise",
    blocker: null, // Added blocker
    tasks: [
      { id: "1", name: "Initial Audit", completed: true, assignee: "Brent", stage: "Audit" },
      { id: "2", name: "Pixel Verification", completed: true, assignee: "Brent", stage: "Audit" },
      {
        id: "3",
        name: "Conversion Tracking Test",
        completed: false,
        assignee: "Trevor",
        dueDate: "Nov 30",
        stage: "Audit",
      },
      { id: "4", name: "Final Report", completed: false, assignee: "Brent", dueDate: "Dec 2", stage: "Audit" },
    ],
    comms: [
      {
        id: "1",
        sender: "Brent",
        avatar: "L",
        message: "Audit started, looking good so far",
        timestamp: "2d ago",
        isInternal: true,
        source: "slack",
        channel: "#client-vshred",
      },
      {
        id: "2",
        sender: "Client (Alo Yoga)",
        avatar: "S",
        message: "Thanks team! When can we expect the final report?",
        timestamp: "1d ago",
        source: "email",
        subject: "Audit Timeline",
        aiTags: ["Question"],
      },
    ],
    performanceData: generatePerformanceData(),
    metaAds: { spend: 45000, roas: 4.2, cpa: 22, impressions: 1200000, clicks: 35000, conversions: 2045, trend: "up" },
    googleAds: { spend: 28000, roas: 3.8, cpa: 25, impressions: 890000, clicks: 24000, conversions: 1120, trend: "up" },
    onboardingData: {
      shopifyUrl: "vshred.myshopify.com",
      gtmContainerId: "GTM-VSHRED1",
      metaPixelId: "9876543210",
      klaviyoApiKey: "KL-VSHRED789",
      submittedAt: "Nov 12, 2024",
      contactEmail: "ops@vshred.com",
      metaAccessVerified: true,
      gtmAccessVerified: true,
      shopifyAccessVerified: false,
      accessGrants: {
        meta: true,
        gtm: true,
        shopify: false,
      },
    },
  },
  {
    id: "3",
    name: "Terren",
    logo: "TR",
    stage: "Live",
    health: "Green",
    owner: "Roderic",
    daysInStage: 45,
    supportTickets: 0,
    installTime: 5,
    shopifyUrl: "terren.myshopify.com",
    gtmContainerId: "GTM-TERREN99",
    metaPixelId: "5555666677",
    tier: "Core",
    blocker: null, // Added blocker
    tasks: [
      { id: "1", name: "Initial Setup Call", completed: true, assignee: "Roderic", stage: "Onboarding" },
      { id: "2", name: "DNS Configuration", completed: true, assignee: "Roderic", stage: "Installation" },
      { id: "3", name: "Pixel Installation", completed: true, assignee: "Roderic", stage: "Installation" },
      { id: "4", name: "GTM Setup", completed: true, assignee: "Roderic", stage: "Installation" },
    ],
    comms: [
      {
        id: "1",
        sender: "Roderic",
        avatar: "G",
        message: "Client fully onboarded and happy with results",
        timestamp: "1w ago",
        isInternal: true,
        source: "slack",
        channel: "#client-terren",
      },
    ],
    performanceData: generatePerformanceData(),
    metaAds: generateAdMetrics(),
    googleAds: generateAdMetrics(),
    onboardingData: {
      shopifyUrl: "terren.myshopify.com",
      gtmContainerId: "GTM-TERREN99",
      metaPixelId: "5555666677",
      klaviyoApiKey: "KL-TERREN456",
      submittedAt: "Oct 10, 2024",
      contactEmail: "support@terren.com",
      metaAccessVerified: true,
      gtmAccessVerified: true,
      shopifyAccessVerified: true,
      accessGrants: {
        meta: true,
        gtm: true,
        shopify: true,
      },
    },
  },
  {
    id: "4",
    name: "Glow Recipe",
    logo: "GR",
    stage: "Onboarding",
    health: "Green",
    owner: "Trevor",
    daysInStage: 2,
    supportTickets: 0,
    installTime: 0,
    shopifyUrl: "glowrecipe.myshopify.com",
    gtmContainerId: "",
    metaPixelId: "",
    tier: "Core",
    blocker: null, // Added blocker
    tasks: [
      { id: "1", name: "Welcome Email Sent", completed: true, assignee: "Trevor", stage: "Onboarding" },
      { id: "2", name: "Kickoff Call Scheduled", completed: true, assignee: "Trevor", stage: "Onboarding" },
      {
        id: "3",
        name: "Access Credentials Received",
        completed: false,
        assignee: "Trevor",
        dueDate: "Dec 1",
        stage: "Onboarding",
      },
    ],
    comms: [
      {
        id: "1",
        sender: "Trevor",
        avatar: "J",
        message: "Kickoff call scheduled for Thursday",
        timestamp: "1d ago",
        isInternal: true,
        source: "slack",
        channel: "#client-glow-recipe",
      },
    ],
    performanceData: generatePerformanceData(),
    metaAds: generateAdMetrics(),
    googleAds: generateAdMetrics(),
    onboardingData: {
      shopifyUrl: "glowrecipe.myshopify.com",
      gtmContainerId: "",
      metaPixelId: "",
      klaviyoApiKey: "KL-KEY012",
      submittedAt: "Nov 4, 2024",
      contactEmail: "contact@glowrecipe.com",
      metaAccessVerified: false,
      gtmAccessVerified: false,
      shopifyAccessVerified: false,
      accessGrants: {
        meta: false,
        gtm: false,
        shopify: false,
      },
    },
  },
  {
    id: "5",
    name: "Alo Yoga",
    logo: "AY",
    stage: "Installation",
    health: "Green",
    owner: "Brent",
    daysInStage: 3,
    supportTickets: 0,
    installTime: 3,
    shopifyUrl: "aloyoga.myshopify.com",
    gtmContainerId: "GTM-ALO321",
    metaPixelId: "1122334455",
    tier: "Enterprise",
    blocker: null, // Added blocker
    tasks: [
      { id: "1", name: "Initial Setup Call", completed: true, assignee: "Brent", stage: "Onboarding" },
      { id: "2", name: "DNS Configuration", completed: true, assignee: "Brent", stage: "Installation" },
      { id: "3", name: "Pixel Installation", completed: true, assignee: "Brent", stage: "Installation" },
      { id: "4", name: "GTM Setup", completed: false, assignee: "Brent", dueDate: "Nov 30", stage: "Installation" },
    ],
    comms: [
      {
        id: "1",
        sender: "Brent",
        avatar: "L",
        message: "Making great progress, GTM setup tomorrow",
        timestamp: "5h ago",
        isInternal: true,
        source: "slack",
        channel: "#client-alo-yoga",
      },
    ],
    performanceData: generatePerformanceData(),
    metaAds: generateAdMetrics(),
    googleAds: generateAdMetrics(),
    onboardingData: {
      shopifyUrl: "aloyoga.myshopify.com",
      gtmContainerId: "GTM-ALO321",
      metaPixelId: "1122334455",
      klaviyoApiKey: "KL-KEY345",
      submittedAt: "Nov 5, 2024",
      contactEmail: "contact@aloyoga.com",
      metaAccessVerified: true,
      gtmAccessVerified: true,
      shopifyAccessVerified: true,
      accessGrants: {
        meta: true,
        gtm: true,
        shopify: true,
      },
    },
  },
  {
    id: "6",
    name: "Beardbrand",
    logo: "BB",
    stage: "Needs Support",
    health: "Red",
    owner: "Chase",
    daysInStage: 6,
    supportTickets: 5,
    installTime: 8,
    statusNote: "Conversion tracking broken",
    shopifyUrl: "beardbrand.myshopify.com",
    gtmContainerId: "GTM-BBR654",
    metaPixelId: "6677889900",
    tier: "Core",
    blocker: null, // Added blocker
    tasks: [
      { id: "1", name: "Diagnose Tracking Issue", completed: true, assignee: "Chase", stage: "Support" },
      {
        id: "2",
        name: "Rebuild Pixel Events",
        completed: false,
        assignee: "Chase",
        dueDate: "Nov 29",
        stage: "Support",
      },
      {
        id: "3",
        name: "Test All Conversions",
        completed: false,
        assignee: "Trevor",
        dueDate: "Nov 30",
        stage: "Support",
      },
    ],
    comms: [
      {
        id: "1",
        sender: "Chase",
        avatar: "JF",
        message: "Client escalated, needs resolution by EOD Friday",
        timestamp: "30m ago",
        isInternal: true,
        source: "slack",
        channel: "#client-beardbrand",
        aiTags: ["Urgent", "Escalation"],
      },
      {
        id: "2",
        sender: "Eric (Client)",
        avatar: "E",
        message: "Our ROAS tanked after the site redesign, this is urgent",
        timestamp: "2h ago",
        source: "email",
        subject: "URGENT: Tracking Issues",
        aiTags: ["Urgent", "Bug"],
      },
    ],
    performanceData: generatePerformanceData(),
    metaAds: { spend: 18500, roas: 1.2, cpa: 65, impressions: 380000, clicks: 9200, conversions: 285, trend: "down" },
    googleAds: { spend: 12000, roas: 1.5, cpa: 52, impressions: 290000, clicks: 7100, conversions: 231, trend: "down" },
    onboardingData: {
      shopifyUrl: "beardbrand.myshopify.com",
      gtmContainerId: "GTM-BBR654",
      metaPixelId: "6677889900",
      klaviyoApiKey: "KL-KEY678",
      submittedAt: "Nov 6, 2024",
      contactEmail: "contact@beardbrand.com",
      metaAccessVerified: false,
      gtmAccessVerified: false,
      shopifyAccessVerified: false,
      accessGrants: {
        meta: false,
        gtm: false,
        shopify: false,
      },
    },
  },
  {
    id: "7",
    name: "MVMT Watches",
    logo: "MV",
    stage: "Live",
    health: "Green",
    owner: "Brent",
    daysInStage: 120,
    supportTickets: 0,
    installTime: 4,
    shopifyUrl: "mvmt.myshopify.com",
    gtmContainerId: "GTM-MVM987",
    metaPixelId: "2233445566",
    tier: "Enterprise",
    blocker: null, // Added blocker
    tasks: [
      { id: "1", name: "Initial Setup Call", completed: true, assignee: "Brent", stage: "Onboarding" },
      { id: "2", name: "DNS Configuration", completed: true, assignee: "Brent", stage: "Installation" },
      { id: "3", name: "Pixel Installation", completed: true, assignee: "Brent", stage: "Installation" },
      { id: "4", name: "GTM Setup", completed: true, assignee: "Brent", stage: "Installation" },
    ],
    comms: [],
    performanceData: generatePerformanceData(),
    metaAds: generateAdMetrics(),
    googleAds: generateAdMetrics(),
    onboardingData: {
      shopifyUrl: "mvmt.myshopify.com",
      gtmContainerId: "GTM-MVM987",
      metaPixelId: "2233445566",
      klaviyoApiKey: "KL-KEY901",
      submittedAt: "Nov 7, 2024",
      contactEmail: "contact@mvmt.myshopify.com",
      metaAccessVerified: true,
      gtmAccessVerified: true,
      shopifyAccessVerified: true,
      accessGrants: {
        meta: true,
        gtm: true,
        shopify: true,
      },
    },
  },
  {
    id: "8",
    name: "Ruggable",
    logo: "RG",
    stage: "Audit",
    health: "Green",
    owner: "Trevor",
    daysInStage: 2,
    supportTickets: 0,
    installTime: 6,
    shopifyUrl: "ruggable.myshopify.com",
    gtmContainerId: "GTM-RUG159",
    metaPixelId: "7788990011",
    tier: "Core",
    blocker: null, // Added blocker
    tasks: [
      { id: "1", name: "Initial Audit", completed: true, assignee: "Trevor", stage: "Audit" },
      { id: "2", name: "Pixel Verification", completed: true, assignee: "Trevor", stage: "Audit" },
      {
        id: "3",
        name: "Conversion Tracking Test",
        completed: false,
        assignee: "Trevor",
        dueDate: "Dec 1",
        stage: "Audit",
      },
    ],
    comms: [
      {
        id: "1",
        sender: "Trevor",
        avatar: "J",
        message: "Audit looking clean so far",
        timestamp: "1d ago",
        isInternal: true,
        source: "slack",
        channel: "#client-ruggable",
      },
    ],
    performanceData: generatePerformanceData(),
    metaAds: generateAdMetrics(),
    googleAds: generateAdMetrics(),
    onboardingData: {
      shopifyUrl: "ruggable.myshopify.com",
      gtmContainerId: "GTM-RUG159",
      metaPixelId: "7788990011",
      klaviyoApiKey: "KL-KEY234",
      submittedAt: "Nov 8, 2024",
      contactEmail: "contact@ruggable.com",
      metaAccessVerified: true,
      gtmAccessVerified: true,
      shopifyAccessVerified: true,
      accessGrants: {
        meta: true,
        gtm: true,
        shopify: true,
      },
    },
  },
  {
    id: "9",
    name: "Bombas",
    logo: "BO",
    stage: "Off-boarding",
    health: "Yellow",
    owner: "Chase",
    daysInStage: 3,
    supportTickets: 0,
    installTime: 6,
    statusNote: "Contract ended",
    shopifyUrl: "bombas.myshopify.com",
    gtmContainerId: "GTM-CAR753",
    metaPixelId: "3344556677",
    tier: "Starter",
    blocker: null, // Added blocker
    tasks: [
      { id: "1", name: "Final Report Generated", completed: true, assignee: "Chase", stage: "Off-boarding" },
      {
        id: "2",
        name: "Remove Tracking Code",
        completed: false,
        assignee: "Chase",
        dueDate: "Dec 1",
        stage: "Off-boarding",
      },
      {
        id: "3",
        name: "Archive Client Data",
        completed: false,
        assignee: "Chase",
        dueDate: "Dec 5",
        stage: "Off-boarding",
      },
    ],
    comms: [],
    performanceData: generatePerformanceData(),
    metaAds: generateAdMetrics(),
    googleAds: generateAdMetrics(),
    onboardingData: {
      shopifyUrl: "bombas.myshopify.com",
      gtmContainerId: "GTM-CAR753",
      metaPixelId: "3344556677",
      klaviyoApiKey: "KL-KEY567",
      submittedAt: "Nov 9, 2024",
      contactEmail: "contact@bombas.com",
      metaAccessVerified: true,
      gtmAccessVerified: true,
      shopifyAccessVerified: true,
      accessGrants: {
        meta: true,
        gtm: true,
        shopify: true,
      },
    },
  },
  {
    id: "10",
    name: "Caraway Home",
    logo: "CH",
    stage: "Off-boarding",
    health: "Yellow",
    owner: "Chase",
    daysInStage: 3,
    supportTickets: 0,
    installTime: 6,
    statusNote: "Contract ended",
    shopifyUrl: "carawayhome.myshopify.com",
    gtmContainerId: "GTM-CAR753",
    metaPixelId: "3344556677",
    tier: "Starter",
    blocker: null, // Added blocker
    tasks: [
      { id: "1", name: "Final Report Generated", completed: true, assignee: "Chase", stage: "Off-boarding" },
      {
        id: "2",
        name: "Remove Tracking Code",
        completed: false,
        assignee: "Chase",
        dueDate: "Dec 1",
        stage: "Off-boarding",
      },
      {
        id: "3",
        name: "Archive Client Data",
        completed: false,
        assignee: "Chase",
        dueDate: "Dec 5",
        stage: "Off-boarding",
      },
    ],
    comms: [],
    performanceData: generatePerformanceData(),
    metaAds: generateAdMetrics(),
    googleAds: generateAdMetrics(),
    onboardingData: {
      shopifyUrl: "carawayhome.myshopify.com",
      gtmContainerId: "GTM-CAR753",
      metaPixelId: "3344556677",
      klaviyoApiKey: "KL-KEY890",
      submittedAt: "Nov 10, 2024",
      contactEmail: "contact@carawayhome.com",
      metaAccessVerified: true,
      gtmAccessVerified: true,
      shopifyAccessVerified: true,
      accessGrants: {
        meta: true,
        gtm: true,
        shopify: true,
      },
    },
  },
  {
    id: "11",
    name: "Brooklinen",
    logo: "BL",
    stage: "Installation",
    health: "Red",
    owner: "Trevor",
    daysInStage: 15,
    supportTickets: 2,
    installTime: 15,
    statusNote: "Theme compatibility issues",
    shopifyUrl: "brooklinen.myshopify.com",
    gtmContainerId: "GTM-BRK852",
    metaPixelId: "8899001122",
    tier: "Core",
    blocker: null, // Added blocker
    tasks: [
      { id: "1", name: "Initial Setup Call", completed: true, assignee: "Trevor", stage: "Onboarding" },
      { id: "2", name: "DNS Configuration", completed: true, assignee: "Trevor", stage: "Installation" },
      {
        id: "3",
        name: "Pixel Installation",
        completed: false,
        assignee: "Trevor",
        dueDate: "Nov 28",
        stage: "Installation",
      },
      { id: "4", name: "GTM Setup", completed: false, assignee: "Trevor", dueDate: "Dec 1", stage: "Installation" },
    ],
    comms: [
      {
        id: "1",
        sender: "Trevor",
        avatar: "J",
        message: "Custom theme is blocking standard install, need dev help",
        timestamp: "6h ago",
        isInternal: true,
        source: "slack",
        channel: "#client-brooklinen",
        aiTags: ["Bug", "Technical"],
      },
    ],
    performanceData: generatePerformanceData(),
    metaAds: generateAdMetrics(),
    googleAds: generateAdMetrics(),
    onboardingData: {
      shopifyUrl: "brooklinen.myshopify.com",
      gtmContainerId: "GTM-BRK852",
      metaPixelId: "8899001122",
      klaviyoApiKey: "KL-KEY124",
      submittedAt: "Nov 11, 2024",
      contactEmail: "contact@brooklinen.com",
      metaAccessVerified: true,
      gtmAccessVerified: true,
      shopifyAccessVerified: true,
      accessGrants: {
        meta: true,
        gtm: true,
        shopify: true,
      },
    },
  },
  {
    id: "12",
    name: "Gymshark",
    logo: "GS",
    stage: "Live",
    health: "Green",
    owner: "Brent",
    daysInStage: 90,
    supportTickets: 0,
    installTime: 4,
    shopifyUrl: "gymshark.myshopify.com",
    gtmContainerId: "GTM-GYM951",
    metaPixelId: "4455667788",
    tier: "Enterprise",
    blocker: null, // Added blocker
    tasks: [
      { id: "1", name: "Initial Setup Call", completed: true, assignee: "Brent", stage: "Onboarding" },
      { id: "2", name: "DNS Configuration", completed: true, assignee: "Brent", stage: "Installation" },
      { id: "3", name: "Pixel Installation", completed: true, assignee: "Brent", stage: "Installation" },
      { id: "4", name: "GTM Setup", completed: true, assignee: "Brent", stage: "Installation" },
    ],
    comms: [],
    performanceData: generatePerformanceData(),
    metaAds: generateAdMetrics(),
    googleAds: generateAdMetrics(),
    onboardingData: {
      shopifyUrl: "gymshark.myshopify.com",
      gtmContainerId: "GTM-GYM951",
      metaPixelId: "4455667788",
      klaviyoApiKey: "KL-KEY346",
      submittedAt: "Nov 12, 2024",
      contactEmail: "contact@gymshark.com",
      metaAccessVerified: true,
      gtmAccessVerified: true,
      shopifyAccessVerified: true,
      accessGrants: {
        meta: true,
        gtm: true,
        shopify: true,
      },
    },
  },
  {
    id: "13",
    name: "Allbirds",
    logo: "AB",
    stage: "Needs Support",
    health: "Yellow",
    owner: "Chase",
    daysInStage: 2,
    supportTickets: 1,
    installTime: 5,
    statusNote: "iOS tracking questions",
    shopifyUrl: "allbirds.myshopify.com",
    gtmContainerId: "GTM-ALL357",
    metaPixelId: "9900112233",
    tier: "Core",
    blocker: null, // Added blocker
    tasks: [
      {
        id: "1",
        name: "Respond to iOS Question",
        completed: false,
        assignee: "Chase",
        dueDate: "Nov 29",
        stage: "Support",
      },
      { id: "2", name: "Update Documentation", completed: false, assignee: "Chase", dueDate: "Dec 2", stage: "Support" },
    ],
    comms: [
      {
        id: "1",
        sender: "Client Contact",
        avatar: "S",
        message: "How does iOS 17 affect our tracking?",
        timestamp: "4h ago",
        source: "email",
        subject: "iOS 17 Tracking Question",
        aiTags: ["Question", "Technical"],
      },
    ],
    performanceData: generatePerformanceData(),
    metaAds: generateAdMetrics(),
    googleAds: generateAdMetrics(),
    onboardingData: {
      shopifyUrl: "allbirds.myshopify.com",
      gtmContainerId: "GTM-ALL357",
      metaPixelId: "9900112233",
      klaviyoApiKey: "KL-KEY457",
      submittedAt: "Nov 13, 2024",
      contactEmail: "contact@allbirds.com",
      metaAccessVerified: true,
      gtmAccessVerified: true,
      shopifyAccessVerified: true,
      accessGrants: {
        meta: true,
        gtm: true,
        shopify: true,
      },
    },
  },
  {
    id: "14",
    name: "Casper",
    logo: "CA",
    stage: "Onboarding",
    health: "Green",
    owner: "Roderic",
    daysInStage: 1,
    supportTickets: 0,
    installTime: 0,
    shopifyUrl: "casper.myshopify.com",
    gtmContainerId: "",
    metaPixelId: "",
    tier: "Enterprise",
    blocker: null, // Added blocker
    tasks: [
      { id: "1", name: "Welcome Email Sent", completed: true, assignee: "Roderic", stage: "Onboarding" },
      {
        id: "2",
        name: "Kickoff Call Scheduled",
        completed: false,
        assignee: "Roderic",
        dueDate: "Dec 1",
        stage: "Onboarding",
      },
      {
        id: "3",
        name: "Access Credentials Received",
        completed: false,
        assignee: "Roderic",
        dueDate: "Dec 3",
        stage: "Onboarding",
      },
    ],
    comms: [
      {
        id: "1",
        sender: "Roderic",
        avatar: "G",
        message: "New high-value client, prioritizing onboarding",
        timestamp: "2h ago",
        isInternal: true,
        source: "slack",
        channel: "#client-casper",
      },
    ],
    performanceData: generatePerformanceData(),
    metaAds: generateAdMetrics(),
    googleAds: generateAdMetrics(),
    onboardingData: {
      shopifyUrl: "casper.myshopify.com",
      gtmContainerId: "",
      metaPixelId: "",
      klaviyoApiKey: "KL-KEY568",
      submittedAt: "Nov 14, 2024",
      contactEmail: "contact@casper.com",
      metaAccessVerified: false,
      gtmAccessVerified: false,
      shopifyAccessVerified: false,
      accessGrants: {
        meta: false,
        gtm: false,
        shopify: false,
      },
    },
  },
]

export const mockTickets: SupportTicket[] = [
  {
    id: "T001",
    title: "Pixel misfiring on checkout",
    clientId: "6",
    clientName: "Beardbrand",
    status: "In Progress",
    priority: "High",
    source: "Detected via Slack",
    assignee: "Chase",
    createdAt: "2h ago",
    description: "Conversion pixel not firing on checkout confirmation page after theme update.",
  },
  {
    id: "T002",
    title: "iOS 17 tracking documentation needed",
    clientId: "13",
    clientName: "Allbirds",
    status: "New",
    priority: "Medium",
    source: "Client Email",
    assignee: "Trevor",
    createdAt: "4h ago",
    description: "Client requesting clarification on iOS 17 changes and impact on their tracking setup.",
  },
  {
    id: "T003",
    title: "GTM container access request",
    clientId: "1",
    clientName: "RTA Outdoor Living",
    status: "Waiting on Client",
    priority: "High",
    source: "Internal",
    assignee: "Brent",
    createdAt: "5d ago",
    description: "Waiting for client IT team to provide GTM admin access for pixel installation.",
  },
  {
    id: "T004",
    title: "Theme compatibility debugging",
    clientId: "11",
    clientName: "Brooklinen",
    status: "In Progress",
    priority: "High",
    source: "Detected via AI",
    assignee: "Brent",
    createdAt: "1d ago",
    description: "Custom Shopify theme blocking standard pixel installation methods.",
  },
  {
    id: "T005",
    title: "Monthly report generation",
    clientId: "12",
    clientName: "Gymshark",
    status: "Resolved",
    priority: "Low",
    source: "Scheduled Task",
    assignee: "Trevor",
    createdAt: "3d ago",
    description: "Generate and send November performance report to client.",
  },
  {
    id: "T006",
    title: "Conversion value discrepancy",
    clientId: "2",
    clientName: "Alo Yoga",
    status: "New",
    priority: "Medium",
    source: "Client Email",
    assignee: "Brent",
    createdAt: "6h ago",
    description: "Client reporting 12% difference between Meta reported conversions and Shopify orders.",
  },
]

export const mockRecordings: Record<string, ZoomRecording[]> = {
  "1": [
    {
      id: "Z001",
      title: "RTA Outdoor - Kickoff Call",
      date: "Nov 8, 2024",
      duration: "45 min",
      aiSummary: [
        "Client wants to prioritize Meta pixel installation first",
        "IT team availability limited - main blocker identified",
        "Target launch date: November 30th",
      ],
    },
    {
      id: "Z002",
      title: "RTA Outdoor - Technical Deep Dive",
      date: "Nov 15, 2024",
      duration: "32 min",
      aiSummary: [
        "Reviewed current Shopify setup and theme customizations",
        "Identified need for custom pixel implementation",
        "Client to follow up with IT for access credentials",
      ],
    },
  ],
  "2": [
    {
      id: "Z003",
      title: "Alo Yoga - Audit Review",
      date: "Nov 27, 2024",
      duration: "28 min",
      aiSummary: [
        "Pixel implementation verified and working correctly",
        "ROAS trending up 15% since implementation",
        "Client happy with results, discussing expansion",
      ],
    },
  ],
  "6": [
    {
      id: "Z004",
      title: "Beardbrand - Emergency Support Call",
      date: "Nov 28, 2024",
      duration: "52 min",
      aiSummary: [
        "Tracking broke after site redesign pushed to production",
        "Client frustrated with ROAS decline",
        "Action items: rebuild pixel events, test all conversion points",
      ],
    },
  ],
}

export const chartData = [
  { date: "Nov 1", newClients: 2, completedInstalls: 1 },
  { date: "Nov 5", newClients: 1, completedInstalls: 2 },
  { date: "Nov 10", newClients: 3, completedInstalls: 1 },
  { date: "Nov 15", newClients: 2, completedInstalls: 3 },
  { date: "Nov 20", newClients: 4, completedInstalls: 2 },
  { date: "Nov 25", newClients: 1, completedInstalls: 4 },
  { date: "Nov 29", newClients: 2, completedInstalls: 2 },
]

// ============================================================================
// MOCK WORKFLOWS
// ============================================================================

export interface MockWorkflow {
  id: string
  agency_id: string
  name: string
  description: string | null
  triggers: unknown[]
  actions: unknown[]
  is_active: boolean
  created_by: string
  last_run_at: string | null
  run_count: number
  success_count: number
  created_at: string
  updated_at: string
  runs?: MockWorkflowRun[]
}

export interface MockWorkflowRun {
  id: string
  agency_id: string
  workflow_id: string
  trigger_data: Record<string, unknown>
  status: 'running' | 'completed' | 'failed' | 'pending_approval' | 'skipped'
  executed_actions: unknown[]
  error_message: string | null
  started_at: string
  completed_at: string | null
  results: Record<string, unknown> | null
  created_at: string
}

export const mockWorkflows: MockWorkflow[] = [
  {
    id: 'wf-001',
    agency_id: 'demo-agency',
    name: 'Client Health Alert',
    description: 'Send Slack notification when client health drops to Red',
    triggers: [
      {
        id: 'tr-001',
        type: 'kpi_threshold',
        name: 'Health Score Drop',
        config: { metric: 'health_score', operator: 'below', value: 50 }
      }
    ],
    actions: [
      {
        id: 'ac-001',
        type: 'send_notification',
        name: 'Slack Alert',
        config: { channel: 'slack', message: 'Client {{client.name}} health dropped to {{client.health}}', recipients: ['#alerts'] }
      },
      {
        id: 'ac-002',
        type: 'create_task',
        name: 'Follow-up Task',
        config: { title: 'Check in with {{client.name}}', priority: 'high', dueInDays: 1 }
      }
    ],
    is_active: true,
    created_by: 'user-001',
    last_run_at: '2024-12-01T14:30:00Z',
    run_count: 24,
    success_count: 22,
    created_at: '2024-10-15T09:00:00Z',
    updated_at: '2024-11-28T16:45:00Z'
  },
  {
    id: 'wf-002',
    agency_id: 'demo-agency',
    name: 'Inactivity Follow-up',
    description: 'Auto-create task when no client communication for 7 days',
    triggers: [
      {
        id: 'tr-002',
        type: 'inactivity',
        name: '7 Day Silence',
        config: { days: 7, activityTypes: ['communication'] }
      }
    ],
    actions: [
      {
        id: 'ac-003',
        type: 'create_task',
        name: 'Check-in Task',
        config: { title: 'Follow up with {{client.name}} - no contact in 7 days', priority: 'medium', dueInDays: 2, assignToTriggeredUser: true }
      }
    ],
    is_active: true,
    created_by: 'user-001',
    last_run_at: '2024-12-02T08:15:00Z',
    run_count: 45,
    success_count: 45,
    created_at: '2024-09-20T11:30:00Z',
    updated_at: '2024-11-15T10:20:00Z'
  },
  {
    id: 'wf-003',
    agency_id: 'demo-agency',
    name: 'Stage Change Notification',
    description: 'Notify team when client moves to Live stage',
    triggers: [
      {
        id: 'tr-003',
        type: 'stage_change',
        name: 'Move to Live',
        config: { toStage: 'Live' }
      }
    ],
    actions: [
      {
        id: 'ac-004',
        type: 'send_notification',
        name: 'Team Celebration',
        config: { channel: 'slack', message: '{{client.name}} is now LIVE! Great work team.', recipients: ['#wins'] }
      },
      {
        id: 'ac-005',
        type: 'draft_communication',
        name: 'Welcome Email Draft',
        config: { platform: 'gmail', template: 'Congratulations on going live!', tone: 'friendly' }
      }
    ],
    is_active: true,
    created_by: 'user-002',
    last_run_at: '2024-11-30T16:00:00Z',
    run_count: 12,
    success_count: 12,
    created_at: '2024-10-01T14:00:00Z',
    updated_at: '2024-11-30T16:00:00Z'
  },
  {
    id: 'wf-004',
    agency_id: 'demo-agency',
    name: 'Support Ticket Escalation',
    description: 'Create alert for high priority tickets',
    triggers: [
      {
        id: 'tr-004',
        type: 'ticket_created',
        name: 'High Priority Ticket',
        config: { priorities: ['high', 'critical'] }
      }
    ],
    actions: [
      {
        id: 'ac-006',
        type: 'create_alert',
        name: 'Priority Alert',
        config: { title: 'High priority ticket: {{trigger.title}}', type: 'risk_detected', severity: 'high' }
      }
    ],
    is_active: false,
    created_by: 'user-001',
    last_run_at: null,
    run_count: 0,
    success_count: 0,
    created_at: '2024-11-20T09:00:00Z',
    updated_at: '2024-11-20T09:00:00Z'
  }
]

export const mockWorkflowRuns: MockWorkflowRun[] = [
  {
    id: 'run-001',
    agency_id: 'demo-agency',
    workflow_id: 'wf-001',
    trigger_data: { client_id: '6', client_name: 'Beardbrand', old_health: 'Yellow', new_health: 'Red' },
    status: 'completed',
    executed_actions: [{ action_id: 'ac-001', status: 'completed' }, { action_id: 'ac-002', status: 'completed' }],
    error_message: null,
    started_at: '2024-12-01T14:30:00Z',
    completed_at: '2024-12-01T14:30:05Z',
    results: { slack_message_id: 'msg-123', task_id: 'task-456' },
    created_at: '2024-12-01T14:30:00Z'
  },
  {
    id: 'run-002',
    agency_id: 'demo-agency',
    workflow_id: 'wf-002',
    trigger_data: { client_id: '1', client_name: 'RTA Outdoor Living', days_inactive: 8 },
    status: 'completed',
    executed_actions: [{ action_id: 'ac-003', status: 'completed' }],
    error_message: null,
    started_at: '2024-12-02T08:15:00Z',
    completed_at: '2024-12-02T08:15:02Z',
    results: { task_id: 'task-789' },
    created_at: '2024-12-02T08:15:00Z'
  },
  {
    id: 'run-003',
    agency_id: 'demo-agency',
    workflow_id: 'wf-003',
    trigger_data: { client_id: '3', client_name: 'Terren', from_stage: 'Audit', to_stage: 'Live' },
    status: 'completed',
    executed_actions: [{ action_id: 'ac-004', status: 'completed' }, { action_id: 'ac-005', status: 'completed' }],
    error_message: null,
    started_at: '2024-11-30T16:00:00Z',
    completed_at: '2024-11-30T16:00:08Z',
    results: { slack_message_id: 'msg-456', draft_id: 'draft-123' },
    created_at: '2024-11-30T16:00:00Z'
  },
  {
    id: 'run-004',
    agency_id: 'demo-agency',
    workflow_id: 'wf-001',
    trigger_data: { client_id: '11', client_name: 'Brooklinen', old_health: 'Yellow', new_health: 'Red' },
    status: 'failed',
    executed_actions: [{ action_id: 'ac-001', status: 'failed' }],
    error_message: 'Slack API rate limit exceeded',
    started_at: '2024-11-29T10:00:00Z',
    completed_at: '2024-11-29T10:00:03Z',
    results: null,
    created_at: '2024-11-29T10:00:00Z'
  },
  {
    id: 'run-005',
    agency_id: 'demo-agency',
    workflow_id: 'wf-002',
    trigger_data: { client_id: '7', client_name: 'MVMT Watches', days_inactive: 10 },
    status: 'completed',
    executed_actions: [{ action_id: 'ac-003', status: 'completed' }],
    error_message: null,
    started_at: '2024-11-28T09:00:00Z',
    completed_at: '2024-11-28T09:00:02Z',
    results: { task_id: 'task-321' },
    created_at: '2024-11-28T09:00:00Z'
  }
]

// Helper to get workflows with their runs attached
export function getMockWorkflowsWithRuns(includeRuns: boolean = false, runsLimit: number = 5): MockWorkflow[] {
  if (!includeRuns) return mockWorkflows

  return mockWorkflows.map(workflow => ({
    ...workflow,
    runs: mockWorkflowRuns
      .filter(run => run.workflow_id === workflow.id)
      .slice(0, runsLimit)
  }))
}

export function getKPIs(clients: Client[]) {
  const activeOnboardings = clients.filter((c) => c.stage === "Onboarding" || c.stage === "Installation").length
  const clientsAtRisk = clients.filter((c) => c.health === "Red" || c.health === "Blocked").length
  const avgInstallTime = Math.round(
    clients.filter((c) => c.installTime > 0).reduce((acc, c) => acc + c.installTime, 0) /
      clients.filter((c) => c.installTime > 0).length,
  )
  const supportHours = 12

  return { activeOnboardings, clientsAtRisk, avgInstallTime, supportHours }
}

// ============================================================================
// MOCK CLIENT DETAIL (for demo mode)
// ============================================================================

export interface MockClientDetail {
  id: string
  agency_id: string
  name: string
  contact_email: string | null
  contact_name: string | null
  stage: string
  health_status: string
  days_in_stage: number
  notes: string | null
  tags: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  assignments: {
    id: string
    role: string
    user: {
      id: string
      first_name: string
      last_name: string
      avatar_url: string | null
    }
  }[]
  tickets: {
    id: string
    number: number
    title: string
    status: string
    priority: string
    category: string
    created_at: string
  }[]
  communications: {
    id: string
    platform: string
    message_preview: string
    sent_at: string
  }[]
  stage_events: {
    id: string
    from_stage: string | null
    to_stage: string
    moved_at: string
    notes: string | null
    moved_by: {
      id: string
      first_name: string
      last_name: string
    } | null
  }[]
  tasks: {
    id: string
    name: string
    description: string | null
    stage: string | null
    is_completed: boolean
    due_date: string | null
    assigned_to: string | null
    sort_order: number
  }[]
}

// Map mock health status to API format
function mapHealthStatus(health: HealthStatus): 'green' | 'yellow' | 'red' {
  const mapping: Record<HealthStatus, 'green' | 'yellow' | 'red'> = {
    'Green': 'green',
    'Yellow': 'yellow',
    'Red': 'red',
    'Blocked': 'red'
  }
  return mapping[health]
}

// Generate mock stage events from client data
function generateMockStageEvents(client: Client): MockClientDetail['stage_events'] {
  const stages: Stage[] = ['Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-boarding']
  const currentIndex = stages.indexOf(client.stage)
  const events: MockClientDetail['stage_events'] = []

  // Generate stage history based on current stage
  for (let i = 0; i <= currentIndex && i < stages.length; i++) {
    const daysAgo = (currentIndex - i) * 7 + client.daysInStage
    const movedAt = new Date()
    movedAt.setDate(movedAt.getDate() - daysAgo)

    events.push({
      id: `se-${client.id}-${i}`,
      from_stage: i === 0 ? null : stages[i - 1],
      to_stage: stages[i],
      moved_at: movedAt.toISOString(),
      notes: i === currentIndex ? client.statusNote || null : null,
      moved_by: {
        id: `user-${client.owner.toLowerCase()}`,
        first_name: client.owner,
        last_name: 'Demo'
      }
    })
  }

  return events.reverse() // Most recent first
}

// Generate mock tickets for client
function generateMockTickets(client: Client): MockClientDetail['tickets'] {
  const clientTickets = mockTickets.filter(t => t.clientId === client.id)
  return clientTickets.map((t, i) => ({
    id: t.id,
    number: 1000 + parseInt(client.id) * 10 + i,
    title: t.title,
    status: t.status.toLowerCase().replace(/ /g, '_'),
    priority: t.priority.toLowerCase(),
    category: 'support',
    created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
  }))
}

// Convert mock client to API detail format
export function getMockClientDetail(id: string): MockClientDetail | null {
  const client = mockClients.find(c => c.id === id)
  if (!client) return null

  return {
    id: client.id,
    agency_id: 'demo-agency',
    name: client.name,
    contact_email: client.onboardingData?.contactEmail || null,
    contact_name: null,
    stage: client.stage,
    health_status: mapHealthStatus(client.health),
    days_in_stage: client.daysInStage,
    notes: client.statusNote || null,
    tags: client.tier ? [client.tier] : [],
    is_active: client.stage !== 'Off-boarding',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    assignments: [
      {
        id: `assign-${client.id}`,
        role: 'account_manager',
        user: {
          id: `user-${client.owner.toLowerCase()}`,
          first_name: client.owner,
          last_name: 'Demo',
          avatar_url: null
        }
      }
    ],
    tickets: generateMockTickets(client),
    communications: client.comms.map(c => ({
      id: c.id,
      platform: c.source || 'slack',
      message_preview: c.message.slice(0, 100),
      sent_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    })),
    stage_events: generateMockStageEvents(client),
    tasks: client.tasks.map((t, i) => ({
      id: t.id,
      name: t.name,
      description: null,
      stage: t.stage || client.stage,
      is_completed: t.completed,
      due_date: t.dueDate ? new Date(t.dueDate + ', 2024').toISOString() : null,
      assigned_to: t.assignee ? `user-${t.assignee.toLowerCase()}` : null,
      sort_order: i
    }))
  }
}
