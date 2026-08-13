import { cn } from "@/lib/utils"

export function ContractorLogo({
  vendor,
  logo,
  color,
  size = "md",
}: {
  vendor: string
  logo?: string
  color: string
  size?: "sm" | "md"
}) {
  const initials = vendor.slice(0, 2).toUpperCase() || "?"
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white",
        size === "sm" ? "size-6 text-[10px]" : "size-8"
      )}
      style={{ backgroundColor: color }}
      title={logo ? `${vendor} logo` : vendor}
    >
      {logo ? <img src={logo} alt={`${vendor} logo`} className="size-full object-contain bg-white" /> : initials}
    </span>
  )
}
