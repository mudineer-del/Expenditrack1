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
        // Bumped up a size step from the old size-6/8/12/16 scale — at the old sizes an
        // actual logo image (vs. plain initials) read as an illegible smudge, especially
        // in dense contexts like the invoices table.
        size === "sm" && "size-8 text-xs",
        size === "md" && "size-10 text-sm",
        size === "lg" && "size-14 text-lg",
        size === "xl" && "size-20 text-xl"
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
