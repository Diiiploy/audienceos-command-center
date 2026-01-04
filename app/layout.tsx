import type React from "react"
import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-poppins",
})

// <CHANGE> Updated metadata for AudienceOS
export const metadata: Metadata = {
  title: "AudienceOS Command Center",
  description: "Client Fulfillment Command Center",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${poppins.variable}`} suppressHydrationWarning>{children}</body>
    </html>
  )
}
