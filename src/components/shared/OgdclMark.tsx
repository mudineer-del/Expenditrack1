import ogdclLogo from "@/assets/ogdcl-logo.png"
import { cn } from "@/lib/utils"

const SIZES = {
  sm: "size-7 rounded-md",
  md: "size-9 rounded-lg",
}

/**
 * Sidebar/header brand mark — a cropped square showing just the icon portion
 * of the real OGDCL logo (src/assets/ogdcl-logo.png), since the full lockup
 * (icon + "the energy" wordmark) is a wide rectangle that doesn't fit a
 * square badge. Cropping is done in CSS (height:100% + overflow-hidden)
 * rather than pre-cutting the source file, so it stays in sync if the logo
 * asset is ever replaced.
 */
export function OgdclMark({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  return (
    <div className={cn("shrink-0 overflow-hidden bg-[#0086C6]", SIZES[size], className)}>
      <img src={ogdclLogo} alt="OGDCL" className="h-full w-auto max-w-none object-cover object-left" />
    </div>
  )
}

/** Full logo lockup (icon + "the energy") for larger, roomier spots like the login screen. */
export function OgdclLogoFull({ className }: { className?: string }) {
  return <img src={ogdclLogo} alt="OGDCL — the energy" className={cn("h-auto w-48 rounded-lg shadow-sm", className)} />
}
