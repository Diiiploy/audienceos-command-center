"use client"

import type React from "react"
import { Inter } from "next/font/google"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import "./globals.css"
import { ChatInterface } from "@/components/chat/chat-interface"

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
  const [chatPortalHost, setChatPortalHost] = useState<HTMLElement | null>(null)
  const [showChat, setShowChat] = useState(true)
  const [chatContext, setChatContext] = useState<any>(null)

  // Initialize portal host after DOM is ready
  useEffect(() => {
    setChatPortalHost(document.body)
  }, [])

  // Make setChatContext available globally for pages to set context
  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).setChatContext = setChatContext
    }
  }, [])

  // Determine if chat should be visible
  const shouldShowChat =
    chatPortalHost &&
    !EXCLUDED_PATHS.some((path) => pathname.startsWith(path))

  return (
    <html lang="en">
      <body className={`font-sans antialiased ${inter.variable}`} suppressHydrationWarning>
        {children}
        {shouldShowChat &&
          createPortal(
            <ChatInterface
              agencyId="11111111-1111-1111-1111-111111111111"
              userId="user"
              context={chatContext}
            />,
            chatPortalHost
          )}
      </body>
    </html>
  )
}
