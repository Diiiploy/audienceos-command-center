// Logo Component — Kaizen / AudienceOS
// Toggle USE_KAIZEN_BRANDING to switch between brands

import Image from "next/image"

export const USE_KAIZEN_BRANDING = false

type LogoVariant = "auth" | "sidebar" | "icon"

interface KaizenLogoProps {
  className?: string
  variant?: LogoVariant
}

export function KaizenLogo({ className = "", variant = "auth" }: KaizenLogoProps) {
  if (USE_KAIZEN_BRANDING) {
    return <KaizenBrand className={className} variant={variant} />
  }
  return <AudienceOSBrand className={className} variant={variant} />
}

// --- Kaizen branding ---

function KaizenBrand({ className, variant }: { className: string; variant: LogoVariant }) {
  if (variant === "icon") {
    return (
      <span className={`text-[15px] font-bold text-foreground ${className}`}>
        K
      </span>
    )
  }

  const sizes = variant === "auth"
    ? { width: 160, height: 45 }
    : { width: 100, height: 28 }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Image
        src="/kaizen-logo.png"
        alt="Kaizen"
        width={sizes.width}
        height={sizes.height}
        priority
      />
    </div>
  )
}

// --- AudienceOS branding (original) ---

function AudienceOSBrand({ className, variant }: { className: string; variant: LogoVariant }) {
  if (variant === "icon") {
    return (
      <span
        className={`text-[15px] font-semibold ${className}`}
        style={{
          background: "linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #06b6d4 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        A
      </span>
    )
  }

  const textSize = variant === "auth" ? "text-3xl" : "text-[17px]"
  const textColor = variant === "auth" ? "text-white" : "text-foreground dark:text-white"

  return (
    <div className={`flex items-center justify-center gap-0 ${className}`} style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
      <span className={`${textSize} font-semibold tracking-tight ${textColor}`}>audience</span>
      <span
        className={`${textSize} font-light tracking-tight`}
        style={{
          background: "linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #06b6d4 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        OS
      </span>
    </div>
  )
}
