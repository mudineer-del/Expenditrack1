import { cn } from "@/lib/utils"
import { useDisplayStore } from "@/store/useDisplayStore"

export function ContractorLogo({
  vendor,
  logo,
  color,
  size = "md",
}: {
  vendor: string
  logo?: string
  color: string
  size?: "sm" | "md" | "lg" | "xl"
}) {
  const shape = useDisplayStore((s) => s.contractorLogoShape)
  const initials = vendor.slice(0, 2).toUpperCase() || "?"
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden text-xs font-bold text-white",
        // A percentage radius (not rounded-lg) so "square" stays a visibly soft-cornered
        // square at every size instead of scaling with the app-wide Radius setting — at
        // small sizes (the sm/md chips used in invoice rows/cards) --radius alone can
        // exceed half the box and round it all the way into a circle, which is exactly
        // the "square" option is supposed to avoid.
        shape === "square" ? "rounded-[22%]" : "rounded-full",
        size === "sm" && "size-6 text-[10px]",
        size === "md" && "size-8",
        size === "lg" && "size-12 text-base",
        size === "xl" && "size-16 text-lg"
      )}
      style={{
        background: `linear-gradient(155deg, color-mix(in oklch, ${color} 45%, white), ${color})`,
        boxShadow: `0 3px 8px -2px color-mix(in oklch, ${color} 45%, transparent)`,
      }}
      title={logo ? `${vendor} logo` : vendor}
    >
      {logo ? <img src={logo} alt={`${vendor} logo`} className="size-full object-contain bg-white" /> : initials}
    </span>
  )
}
