// TEMPORARY: Kaizen logo for demo (2026-01-14)
// REVERT TO AudienceOS LOGO AFTER DEMO - see RUNBOOK.md

export function KaizenLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {/* Kaizen Symbol */}
      <svg
        height={32}
        viewBox="0 0 60 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="0" y="0" width="8" height="40" fill="#B91C1C" />
        <rect x="0" y="0" width="35" height="8" fill="#B91C1C" />
        <rect x="27" y="0" width="8" height="24" fill="#B91C1C" />
        <polygon points="50,8 60,20 50,32 50,24 42,20 50,16" fill="#B91C1C" />
      </svg>
      <span
        className="text-2xl font-medium tracking-tight"
        style={{ color: '#B91C1C' }}
      >
        kaizen
      </span>
    </div>
  );
}

// ORIGINAL AUDIENCEOS LOGO - RESTORE AFTER DEMO:
// function AudienceOSLogo({ className = "" }: { className?: string }) {
//   return (
//     <div className={`flex items-center justify-center gap-0 ${className}`} style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
//       <span className="text-3xl font-semibold tracking-tight text-white">audience</span>
//       <span
//         className="text-3xl font-light tracking-tight"
//         style={{
//           background: "linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #06b6d4 100%)",
//           WebkitBackgroundClip: "text",
//           WebkitTextFillColor: "transparent",
//           backgroundClip: "text",
//         }}
//       >
//         OS
//       </span>
//     </div>
//   )
// }
