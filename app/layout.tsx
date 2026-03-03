"use client"

import type React from "react"
import { Inter, Poppins } from "next/font/google"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { ThemeProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "./globals.css"
import { Toaster } from "sonner"
import { ChatInterface } from "@/components/chat/chat-interface"
import { ThemeSync } from "@/components/theme-sync"
import { useAuth } from "@/hooks/use-auth"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
})

// Pages where chat should NOT render (auth pages, public pages)
const EXCLUDED_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/invite", "/onboarding"]

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const { profile, agencyId, isLoading, isAuthenticated: _isAuthenticated } = useAuth()
  const [queryClient] = useState(() => new QueryClient())
  const [chatPortalHost, setChatPortalHost] = useState<HTMLElement | null>(null)
  const [chatContext, setChatContext] = useState<any>(null)

  // DIAGNOSTIC: Log initial render
  useEffect(() => {
    console.log('[CHAT-INIT] RootLayout mounted')
  }, [])

  // Initialize portal host after DOM is ready
  useEffect(() => {
    const startTime = performance.now()
    console.log('[CHAT-INIT] Setting portal host')
    setChatPortalHost(document.body)
    console.log('[CHAT-INIT] Portal host set in', performance.now() - startTime, 'ms')
  }, [])

  // Make setChatContext available globally for pages to set context
  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).setChatContext = setChatContext
    }
  }, [])

  // Determine if chat should be visible
  // Show chat when:
  // 1. Portal host is ready
  // 2. Not on excluded paths (login, invite, onboarding)
  //
  // NOTE: Deliberately NOT waiting for isLoading=false
  // Chat must appear immediately for good UX, auth happens in background.
  // API endpoints validate auth; chat UI shows graceful fallback if unauthenticated.
  const shouldShowChat =
    chatPortalHost &&
    !EXCLUDED_PATHS.some((path) => pathname.startsWith(path))

  // DIAGNOSTIC: Log chat visibility decision
  // eslint-disable-next-line react-hooks/exhaustive-deps -- isLoading intentionally excluded to prevent re-render loop
  useEffect(() => {
    console.log('[CHAT-VIS] Visibility decision:', {
      chatPortalHost: !!chatPortalHost,
      excludedPath: EXCLUDED_PATHS.some((path) => pathname.startsWith(path)),
      isLoading, // Auth status - shown for info, NOT used to gate chat
      shouldShowChat,
      pathname,
    })
  }, [chatPortalHost, shouldShowChat, pathname])

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased ${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <ThemeSync />
            {children}
            <Toaster richColors position="top-right" />
            {shouldShowChat && (
              <>
                {console.log('[CHAT-PORTAL] Rendering ChatInterface into portal')}
                {createPortal(
                  <ChatInterface
                    agencyId={agencyId || 'demo-agency'}
                    userId={profile?.id || 'anonymous'}
                    context={chatContext}
                  />,
                  chatPortalHost
                )}
              </>
            )}
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
