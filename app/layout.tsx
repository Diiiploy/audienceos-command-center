"use client"

import type React from "react"
import { Inter } from "next/font/google"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import "./globals.css"
import { ChatInterface } from "@/components/chat/chat-interface"
import { useAuth } from "@/hooks/use-auth"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

// Pages where chat should NOT render
const EXCLUDED_PATHS = ["/login", "/invite", "/onboarding"]

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const { profile, agencyId, isLoading, isAuthenticated } = useAuth()
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
  // 3. Auth check complete (not loading)
  // Note: We don't require isAuthenticated because auth can timeout.
  // The API will handle authentication - the UI should always be available.
  const shouldShowChat =
    chatPortalHost &&
    !EXCLUDED_PATHS.some((path) => pathname.startsWith(path)) &&
    !isLoading

  // DIAGNOSTIC: Log chat visibility decision
  useEffect(() => {
    console.log('[CHAT-VIS] Visibility decision:', {
      chatPortalHost: !!chatPortalHost,
      excludedPath: EXCLUDED_PATHS.some((path) => pathname.startsWith(path)),
      isLoading,
      shouldShowChat,
      pathname,
    })
  }, [chatPortalHost, shouldShowChat, isLoading, pathname])

  return (
    <html lang="en">
      <body className={`font-sans antialiased ${inter.variable}`} suppressHydrationWarning>
        {children}
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
      </body>
    </html>
  )
}
