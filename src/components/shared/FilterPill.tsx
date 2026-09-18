import { cn } from "@/lib/utils"

/** Shared look for a solid, saturated filter/tab pill — used for the desktop
 *  department/vendor pickers on the Dashboard and the report-mode tabs on the
 *  Financial Reports page. A tactile "3D" raised bottom edge flattens into a
 *  pressed/inset look for whichever one is currently selected, instead of the
 *  old pale outline-on-white treatment. */
const FILTER_PILL_CLASS = "rounded-full border-0 px-3.5 text-[13px] font-bold text-white transition-all duration-150 ease-out"
const FILTER_PILL_RAISED =
  "shadow-[0_3px_0_var(--pill-shade),0_5px_10px_-6px_var(--pill-glow)] hover:-translate-y-0.5 hover:shadow-[0_4px_0_var(--pill-shade),0_8px_14px_-6px_var(--pill-glow)] active:translate-y-0.5 active:shadow-none"
const FILTER_PILL_PRESSED = "shadow-[inset_0_2px_5px_rgba(0,0,0,0.3)] ring-2 ring-white/70"

export function filterPillProps(color: string, active: boolean): { className: string; style: React.CSSProperties } {
  return {
    className: cn(FILTER_PILL_CLASS, active ? FILTER_PILL_PRESSED : FILTER_PILL_RAISED),
    style: {
      backgroundColor: active ? color : `color-mix(in oklch, ${color} 62%, var(--card))`,
      "--pill-shade": `color-mix(in oklch, ${color} 45%, var(--border))`,
      "--pill-glow": `color-mix(in oklch, ${color} 45%, transparent)`,
    } as React.CSSProperties,
  }
}
